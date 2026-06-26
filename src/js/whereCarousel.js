import gsap from 'gsap';

const GALLERY = [
  { src: 'img/gallery/img-1.jpg', alt: 'Galería 1' },
  { src: 'img/gallery/img-2.jpg', alt: 'Galería 2' },
  { src: 'img/gallery/img-3.jpg', alt: 'Galería 3' },
  { src: 'img/gallery/img-4.jpg', alt: 'Galería 4' },
  { src: 'img/gallery/img-5.jpg', alt: 'Galería 5' },
  { src: 'img/gallery/img-6.jpg', alt: 'Galería 6' },
];

const INTRO_STORAGE_KEY = 'ansiudad-where-carousel-intro';

/** Grados totales del abanico (−spread/2 … +spread/2). Menos = imágenes más juntas. */
const FAN_SPREAD_DEG = 150;

/** Distancia del pivote bajo cada carta (%). Menos = arco más cerrado arriba. */
const FAN_ORIGIN_Y = '235%';

function buildRotations(nCards, spread = FAN_SPREAD_DEG) {
  const rots = [];
  const half = spread / 2;
  const step = nCards > 1 ? spread / (nCards - 1) : 0;

  for (let i = 0; i < nCards; i += 1) {
    rots.push(gsap.utils.clamp(-half, half, i * step - half));
  }

  return rots;
}

function getFrontCard(cardsWrapper) {
  const cards = [...cardsWrapper.children];
  if (!cards.length) return null;

  let front = cards[0];
  let frontRotate = Math.abs(Number(gsap.getProperty(front, 'rotate')) || 0);

  cards.forEach((card) => {
    const rotate = Math.abs(Number(gsap.getProperty(card, 'rotate')) || 0);
    if (rotate < frontRotate) {
      front = card;
      frontRotate = rotate;
    }
  });

  return front;
}

function openFullscreen(src, alt) {
  const overlay = document.getElementById('fullscreenOverlay');
  const overlayImg = document.getElementById('fullscreenImage');
  if (!overlay || !overlayImg) return;

  overlayImg.src = src;
  overlayImg.alt = alt || 'Imagen ampliada';
  overlay.classList.add('show');
}

export function initWhereCarousel({ reducedMotion = false } = {}) {
  const carousel = document.querySelector('#where .carousel');
  const cardsWrapper = carousel?.querySelector('.carousel__cards-wrapper');
  const cursor = document.querySelector('.carousel-cursor');
  const status = carousel?.querySelector('.carousel__status');
  const introArrow = carousel?.querySelector('.carousel__intro-arrow');

  if (!carousel || !cardsWrapper) return;

  const nCards = GALLERY.length;
  const rots = buildRotations(nCards);
  let dir = 1;
  let pointerActive = false;
  let pointerMoved = false;
  let pointerDownX = 0;
  let introPending = !localStorage.getItem(INTRO_STORAGE_KEY);
  let introPulse = null;

  cardsWrapper.replaceChildren();

  GALLERY.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'carousel__card';
    card.dataset.index = String(i);

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt;
    img.loading = i < 2 ? 'eager' : 'lazy';
    img.draggable = false;

    card.append(img);
    cardsWrapper.append(card);

    gsap.set(card, {
      xPercent: -50,
      transformOrigin: `50% ${FAN_ORIGIN_Y}`,
      rotate: rots[i],
    });
  });

  const updateStatus = () => {
    if (!status) return;
    const front = getFrontCard(cardsWrapper);
    const index = front ? Number(front.dataset.index) + 1 : 1;
    status.textContent = `Imagen ${index} de ${nCards}`;
  };

  const syncEdgeOpacity = () => {
    const cards = cardsWrapper.children;
    const lastIndex = nCards - 1;

    for (let i = 0; i < nCards; i += 1) {
      const card = cards[i];
      const isCorner = i === 0 || i === lastIndex;
      card.classList.toggle('is-fan-edge', isCorner);
      gsap.set(card, { autoAlpha: isCorner ? 0 : 1 });
    }
  };

  const animateCards = ({ elastic = true } = {}) => {
    syncEdgeOpacity();

    const cards = cardsWrapper.children;
    const lastIndex = nCards - 1;

    for (let i = 0; i < nCards; i += 1) {
      const card = cards[i];
      const targetRotate = rots[i];
      const isEdge = i === 0 || i === lastIndex;

      if (isEdge || !elastic) {
        gsap.set(card, { rotate: targetRotate });
        continue;
      }

      let delay = gsap.utils.interpolate(0, 0.4, dir < 0 ? 1 - i / 10 : i / 10);
      delay = Math.round(delay * 1000) / 1000;

      gsap.to(card, {
        duration: 1.35,
        delay,
        rotate: targetRotate,
        ease: 'elastic.out(0.5)',
        overwrite: 'auto',
      });
    }

    gsap.delayedCall(elastic ? 0.45 : 0.12, updateStatus);
  };

  const move = () => {
    gsap.killTweensOf(cardsWrapper.children);

    if (dir > 0) cardsWrapper.append(cardsWrapper.firstElementChild);
    else cardsWrapper.prepend(cardsWrapper.lastElementChild);

    animateCards({ elastic: !reducedMotion });
  };

  const stepOnce = (direction) => {
    dir = direction;
    move();
  };

  const dismissIntro = () => {
    if (!introPending) return;

    introPending = false;
    localStorage.setItem(INTRO_STORAGE_KEY, '1');

    if (introArrow) {
      introPulse?.kill();
      gsap.to(introArrow, {
        autoAlpha: 0,
        scale: 0.85,
        duration: 0.25,
        onComplete: () => {
          introArrow.hidden = true;
        },
      });
    }
  };

  const showIntroIfNeeded = () => {
    if (!introPending || !introArrow || reducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        introArrow.hidden = false;
        gsap.set(introArrow, { autoAlpha: 1, scale: 1 });
        introPulse = gsap.to(introArrow, {
          scale: 1.14,
          duration: 0.65,
          yoyo: true,
          repeat: -1,
          ease: 'power1.inOut',
        });

        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(carousel);
  };

  updateStatus();
  syncEdgeOpacity();
  showIntroIfNeeded();

  if (reducedMotion) {
    dismissIntro();

    cardsWrapper.addEventListener('click', (event) => {
      const card = event.target.closest('.carousel__card');
      if (!card) return;

      event.stopPropagation();
      const img = card.querySelector('img');
      if (img) openFullscreen(img.src, img.alt);
    });

    carousel.addEventListener('click', (event) => {
      if (event.target.closest('.carousel__card')) return;

      const rect = carousel.getBoundingClientRect();
      const direction = event.clientX < rect.left + rect.width / 2 ? -1 : 1;
      stepOnce(direction);
    });

    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepOnce(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepOnce(1);
      }
    });

    return;
  }

  if (!cursor) return;

  const cursorX = gsap.quickTo(cursor, 'x', { ease: 'power4' });
  const cursorY = gsap.quickTo(cursor, 'y', { ease: 'power4' });
  const cursorDir = gsap.quickSetter(cursor, 'scaleX');

  const delayedMove = gsap.to(window, {
    paused: true,
    repeat: -1,
    onRepeat: move,
    onStart: move,
    duration: 0.15,
  });

  carousel.addEventListener('pointerenter', (event) => {
    if (introPending) return;

    gsap.to(cursor, { opacity: 1, duration: 0.2 });
    dir = event.clientX < window.innerWidth / 2 ? -1 : 1;
    cursorDir(dir);
    cursorX(event.clientX);
    cursorY(event.clientY);
  });

  carousel.addEventListener('pointerleave', () => {
    delayedMove.pause();
    pointerActive = false;
    gsap.to(cursor, { opacity: 0, duration: 0.2 });
  });

  carousel.addEventListener('pointermove', (event) => {
    dir = event.clientX < window.innerWidth / 2 ? -1 : 1;
    cursorDir(dir);

    if (!introPending) {
      cursorX(event.clientX);
      cursorY(event.clientY);
    }

    if (pointerActive && Math.abs(event.clientX - pointerDownX) > 6) {
      pointerMoved = true;
    }
  });

  carousel.addEventListener('pointerdown', (event) => {
    dismissIntro();

    pointerActive = true;
    pointerMoved = false;
    pointerDownX = event.clientX;
    carousel.setPointerCapture(event.pointerId);

    gsap.to(cursor, { opacity: 1, duration: 0.15 });
    cursorX(event.clientX);
    cursorY(event.clientY);

    delayedMove.play(0);
  });

  const stopPointer = (event) => {
    if (!pointerActive) return;

    delayedMove.pause();
    pointerActive = false;

    if (carousel.hasPointerCapture(event.pointerId)) {
      carousel.releasePointerCapture(event.pointerId);
    }

    if (!pointerMoved) {
      const card = event.target.closest?.('.carousel__card');
      if (card) {
        const img = card.querySelector('img');
        if (img) openFullscreen(img.src, img.alt);
      }
    }
  };

  carousel.addEventListener('pointerup', stopPointer);
  carousel.addEventListener('pointercancel', stopPointer);

  carousel.addEventListener('keydown', (event) => {
    dismissIntro();

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepOnce(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepOnce(1);
    }
  });
}
