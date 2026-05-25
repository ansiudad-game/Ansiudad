import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Fila vertical: cartas más separadas en eje Y. */
const CARD_STACK = [
  { x: 0, y: -98, rotate: -8 },
  { x: 0, y: 0, rotate: 6 },
  { x: 0, y: 98, rotate: -7 },
];

const CARD_ENTER_X = -300;
const CARD_ENTER_Y = -140;
const STEP = 0.46;
const TITLE_EXTRA_DROP = 28;

function setCardTransform(card, slot, { alpha = 1, enter = false } = {}) {
  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: (slot?.x ?? 0) + (enter ? CARD_ENTER_X : 0),
    y: (slot?.y ?? 0) + (enter ? CARD_ENTER_Y : 0),
    rotation: (slot?.rotate ?? 0) + (enter ? -14 : 0),
    autoAlpha: alpha,
    transformOrigin: '50% 50%',
  });
}

function getTitleEndY(header, title) {
  return Math.max(0, header.offsetHeight - title.offsetHeight + TITLE_EXTRA_DROP);
}

export function initDesafioParallax() {
  const flow = document.getElementById('desafioFlow');
  if (!flow) return;

  const pin = flow.querySelector('.desafio-flow__pin');
  const header = flow.querySelector('.desafio-flow__header');
  const title = flow.querySelector('.desafio-flow__title');
  const cards = [...flow.querySelectorAll('.desafio-flow__card')];
  const textPanes = [...flow.querySelectorAll('.desafio-flow__text-pane')];
  const finale = flow.querySelector('.desafio-flow__finale');

  if (!pin || !header || !title || !cards.length || !textPanes.length || !finale) return;

  const showReduced = () => {
    gsap.set(title, { clearProps: 'all', opacity: 1, y: getTitleEndY(header, title) });
    gsap.set(textPanes, { clearProps: 'all', visibility: 'hidden', opacity: 0 });
    gsap.set(finale, { clearProps: 'all', opacity: 1, visibility: 'visible', xPercent: 0 });
    cards.forEach((card, i) => {
      setCardTransform(card, CARD_STACK[i] ?? CARD_STACK[0], { alpha: 1 });
    });
  };

  if (prefersReducedMotion.matches) {
    showReduced();
    return;
  }

  gsap.set(title, { y: 0, autoAlpha: 0 });
  textPanes.forEach((pane, i) => pane.classList.toggle('is-active', i === 0));
  gsap.set(textPanes, { xPercent: -55, autoAlpha: 0, visibility: 'visible' });
  gsap.set(textPanes[0], { xPercent: 0, autoAlpha: 1 });
  cards.forEach((card, i) => {
    setCardTransform(card, CARD_STACK[i], { alpha: 0, enter: true });
  });
  gsap.set(finale, { autoAlpha: 0, xPercent: -45, visibility: 'visible' });

  const textCount = textPanes.length;
  const totalSteps = textCount + 1.15;
  const endDistance = () => `+=${Math.round(totalSteps * STEP * 100)}%`;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: flow,
      start: 'top top',
      end: endDistance,
      pin: pin,
      pinSpacing: true,
      scrub: 0.85,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.to(
    title,
    {
      y: () => getTitleEndY(header, title),
      duration: STEP * 0.4,
      ease: 'elastic.out(1, 0.55)',
    },
    0,
  );

  cards.forEach((card, index) => {
    const slot = CARD_STACK[index] ?? { x: 0, y: 0, rotate: 0 };
    const t = index * STEP;

    if (index > 0) {
      const prevPane = textPanes[index - 1];
      const nextPane = textPanes[index];

      tl.to(
        prevPane,
        { xPercent: 35, autoAlpha: 0, duration: STEP * 0.3, ease: 'power2.in' },
        t,
      );

      tl.fromTo(
        nextPane,
        { xPercent: -50, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: STEP * 0.36, ease: 'power2.out' },
        t + 0.02,
      );

      tl.call(
        () => {
          textPanes.forEach((p, i) => p.classList.toggle('is-active', i === index));
        },
        null,
        t + 0.02,
      );
    } else {
      tl.to({}, { duration: STEP * 0.1 }, t);
    }

    tl.to(
      card,
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        rotation: slot.rotate,
        autoAlpha: 1,
        duration: STEP * 0.52,
        ease: 'power2.out',
      },
      t + STEP * 0.1,
    );

    tl.to({}, { duration: STEP * 0.18 });
  });

  const finaleT = textCount * STEP + STEP * 0.1;
  const lastPane = textPanes[textCount - 1];

  tl.to(
    lastPane,
    { xPercent: 40, autoAlpha: 0, duration: STEP * 0.3, ease: 'power2.in' },
    finaleT,
  );

  tl.to(
    textPanes.slice(0, -1),
    { autoAlpha: 0, duration: 0.01 },
    finaleT,
  );

  tl.fromTo(
    finale,
    { xPercent: -48, autoAlpha: 0 },
    { xPercent: 0, autoAlpha: 1, duration: STEP * 0.42, ease: 'power2.out' },
    finaleT + 0.04,
  );

  tl.call(
    () => {
      textPanes.forEach((p) => p.classList.remove('is-active'));
    },
    null,
    finaleT + 0.04,
  );

  tl.to({}, { duration: STEP * 0.8 });

  gsap.timeline({
    scrollTrigger: {
      trigger: flow,
      start: 'top bottom',
      end: 'top 78%',
      scrub: 0.55,
      invalidateOnRefresh: true,
    },
  }).to(title, {
    autoAlpha: 1,
    ease: 'power2.out',
  });

  ScrollTrigger.refresh();
}

/* ── Carrusel ── */
(function () {
  const thumbs = Array.from(document.querySelectorAll('.thumb'));
  const mainImg = document.getElementById('carouselMain');
  const prevBtn = document.querySelector('.carousel-arrow--prev');
  const nextBtn = document.querySelector('.carousel-arrow--next');

  if (!thumbs.length || !mainImg) return;

  let current = 0;

  function goTo(index) {
    // Rango circular
    current = (index + thumbs.length) % thumbs.length;

    // Fade out → cambiar src → fade in
    mainImg.classList.add('fade');
    setTimeout(() => {
      mainImg.src = thumbs[current].dataset.src;
      mainImg.alt = thumbs[current].querySelector('img').alt;
      mainImg.classList.remove('fade');
    }, 250);

    // Actualizar miniatura activa
    thumbs.forEach(t => t.classList.remove('active'));
    thumbs[current].classList.add('active');

    // Scroll automático de la miniatura activa al centro
    thumbs[current].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // Click en miniaturas
  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => goTo(i));
  });

  // Flechas
  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Teclado
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  // Click en imagen principal → fullscreen
  mainImg.style.cursor = 'zoom-in';
  const overlay = document.getElementById('fullscreenOverlay');
  const overlayImg = document.getElementById('fullscreenImage');

  if (overlay && overlayImg) {
    mainImg.addEventListener('click', () => {
      overlayImg.src = mainImg.src;
      overlay.classList.add('show');
    });
    overlay.addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  }
})();