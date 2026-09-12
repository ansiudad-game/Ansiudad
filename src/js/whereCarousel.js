import gsap from 'gsap';

const GALLERY = [
  { src: 'img/gallery/img-1.jpg', alt: 'Galería 1' },
  { src: 'img/gallery/img-2.jpg', alt: 'Galería 2' },
  { src: 'img/gallery/img-3.jpg', alt: 'Galería 3' },
  { src: 'img/gallery/img-4.jpg', alt: 'Galería 4' },
  { src: 'img/gallery/img-5.jpg', alt: 'Galería 5' },
  { src: 'img/gallery/img-6.jpg', alt: 'Galería 6' },
];

/** Grados totales del abanico (−spread/2 … +spread/2). Menos = imágenes más juntas. */
const FAN_SPREAD_DEG = 150;
const FAN_SPREAD_DEG_NARROW = 110;
const NARROW_MQ = '(max-width: 768px)';

/** Distancia del pivote bajo cada carta (%). Menos = arco más cerrado arriba. */
const FAN_ORIGIN_Y = '235%';

/**
 * Desktop: abanico simétrico (−spread/2 … +spread/2).
 * Narrow: ancla una carta en 0° para que no quede el hueco central con N par.
 */
function buildRotations(nCards, spread = FAN_SPREAD_DEG, { centerFront = false } = {}) {
  if (nCards <= 0) return [];
  if (nCards === 1) return [0];

  const half = spread / 2;

  if (!centerFront) {
    const step = spread / (nCards - 1);
    return Array.from({ length: nCards }, (_, i) =>
      gsap.utils.clamp(-half, half, i * step - half),
    );
  }

  const centerIndex = Math.floor((nCards - 1) / 2);
  const maxSteps = Math.max(centerIndex, nCards - 1 - centerIndex);
  const step = half / maxSteps;

  return Array.from({ length: nCards }, (_, i) =>
    gsap.utils.clamp(-half, half, (i - centerIndex) * step),
  );
}

function isNarrowViewport() {
  return window.matchMedia(NARROW_MQ).matches;
}

function getFanSpread() {
  return isNarrowViewport() ? FAN_SPREAD_DEG_NARROW : FAN_SPREAD_DEG;
}

function getFanRotations(nCards) {
  return buildRotations(nCards, getFanSpread(), {
    centerFront: isNarrowViewport(),
  });
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

export function initWhereCarousel({ reducedMotion = false } = {}) {
  const carousel = document.querySelector('#where .carousel');
  const cardsWrapper = carousel?.querySelector('.carousel__cards-wrapper');
  const status = carousel?.querySelector('.carousel__status');
  const whereSection = document.querySelector('#where');
  const prevBtn = whereSection?.querySelector('.carousel__nav-btn--prev');
  const nextBtn = whereSection?.querySelector('.carousel__nav-btn--next');
  const nav = whereSection?.querySelector('.carousel__nav');

  if (!carousel || !cardsWrapper) return;

  const nCards = GALLERY.length;
  let rots = getFanRotations(nCards);
  let dir = 1;
  let animating = false;

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
    animating = true;

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

    gsap.delayedCall(elastic ? 0.45 : 0.12, () => {
      updateStatus();
      animating = false;
    });
  };

  const stepOnce = (direction) => {
    if (animating) return;

    dir = direction;
    gsap.killTweensOf(cardsWrapper.children);

    if (dir > 0) cardsWrapper.append(cardsWrapper.firstElementChild);
    else cardsWrapper.prepend(cardsWrapper.lastElementChild);

    animateCards({ elastic: !reducedMotion });
  };

  const applyFanLayout = ({ elastic = false } = {}) => {
    rots = getFanRotations(nCards);
    animateCards({ elastic });
  };

  updateStatus();
  syncEdgeOpacity();

  prevBtn?.addEventListener('click', () => stepOnce(-1));
  nextBtn?.addEventListener('click', () => stepOnce(1));

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

  nav?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepOnce(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepOnce(1);
    }
  });

  // A gesture must start on a card; vertical gestures remain native page scroll.
  let gesture = null;
  cardsWrapper.addEventListener('pointerdown', (event) => {
    const card = event.target.closest('.carousel__card');
    if (!card || !event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, card };
    card.setPointerCapture(event.pointerId);
  });
  cardsWrapper.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const { x, y, card } = gesture;
    gesture = null;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      stepOnce(dx < 0 ? 1 : -1);
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      stepOnce(Number(gsap.getProperty(card, 'rotate')) < 0 ? -1 : 1);
    }
  });
  cardsWrapper.addEventListener('pointercancel', () => { gesture = null; });

  const narrowMq = window.matchMedia(NARROW_MQ);
  const onViewportChange = () => applyFanLayout({ elastic: false });
  if (typeof narrowMq.addEventListener === 'function') {
    narrowMq.addEventListener('change', onViewportChange);
  } else {
    narrowMq.addListener(onViewportChange);
  }
}
