import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const CARD_STACK = [
  { x: -10, y: 14, rotate: -8 },
  { x: 16, y: 4, rotate: 6 },
  { x: -6, y: -8, rotate: -5 },
  { x: 20, y: 10, rotate: 9 },
  { x: 2, y: -14, rotate: -7 },
  { x: 12, y: 2, rotate: 5 },
];

const CARDS_PER_TEXT = 2;
const STEP = 0.42;
const CARD_ENTER_X = 280;

function setCardTransform(card, slot, { alpha = 1, enter = false } = {}) {
  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: (slot?.x ?? 0) + (enter ? CARD_ENTER_X : 0),
    y: slot?.y ?? 0,
    rotation: (slot?.rotate ?? 0) + (enter ? 14 : 0),
    autoAlpha: alpha,
    transformOrigin: '50% 50%',
  });
}

export function initWhatParallax() {
  const flow = document.getElementById('whatFlow');
  if (!flow) return;

  const pin = flow.querySelector('.what-flow__pin');
  const title = flow.querySelector('.intro__title');
  const textPanes = [...flow.querySelectorAll('.what-flow__text-pane')];
  const cards = [...flow.querySelectorAll('.what-flow__card')];

  if (!pin || !textPanes.length || !cards.length) return;

  const showReduced = () => {
    gsap.set(textPanes, { clearProps: 'all', visibility: 'visible', opacity: 1, xPercent: 0 });
    textPanes.forEach((pane, i) => {
      pane.classList.toggle('is-active', i === 0);
      if (i > 0) pane.style.visibility = 'hidden';
    });
    cards.forEach((card, i) => {
      setCardTransform(card, CARD_STACK[i], { alpha: 1 });
    });
    if (title) gsap.set(title, { clearProps: 'all', opacity: 1, y: 0 });
  };

  if (prefersReducedMotion.matches) {
    showReduced();
    return;
  }

  if (title) {
    const section = document.getElementById('que-es');
    gsap.set(title, { autoAlpha: 0, y: 56 });

    gsap.timeline({
      scrollTrigger: {
        trigger: section || flow,
        start: 'top bottom',
        end: 'top 72%',
        scrub: 0.55,
        invalidateOnRefresh: true,
      },
    }).to(title, {
      autoAlpha: 1,
      y: 0,
      ease: 'power2.out',
    });
  }

  textPanes.forEach((pane, i) => {
    pane.classList.toggle('is-active', i === 0);
  });

  gsap.set(textPanes, { xPercent: 55, autoAlpha: 0, visibility: 'visible' });
  gsap.set(textPanes[0], { xPercent: 0, autoAlpha: 1 });

  cards.forEach((card, i) => {
    setCardTransform(card, CARD_STACK[i], { alpha: 0, enter: true });
  });

  const totalSteps = cards.length;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: flow,
      start: 'top top',
      end: () => `+=${Math.round(totalSteps * STEP * 100)}%`,
      pin: pin,
      pinSpacing: true,
      scrub: 0.85,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  cards.forEach((card, index) => {
    const slot = CARD_STACK[index] ?? { x: 0, y: 0, rotate: 0 };
    const textIndex = Math.floor(index / CARDS_PER_TEXT);
    const t = index * STEP;

    if (index % CARDS_PER_TEXT === 0 && textIndex > 0) {
      const prevPane = textPanes[textIndex - 1];
      const nextPane = textPanes[textIndex];

      tl.to(
        prevPane,
        { xPercent: -35, autoAlpha: 0, duration: STEP * 0.35, ease: 'power2.in' },
        t,
      );

      tl.fromTo(
        nextPane,
        { xPercent: 50, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: STEP * 0.4, ease: 'power2.out' },
        t + 0.02,
      );

      tl.call(
        () => {
          textPanes.forEach((pane, i) => {
            pane.classList.toggle('is-active', i === textIndex);
          });
        },
        null,
        t + 0.02,
      );
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
        duration: STEP * 0.55,
        ease: 'power2.out',
      },
      t + STEP * 0.12,
    );

    tl.to({}, { duration: STEP * 0.2 });
  });

  ScrollTrigger.refresh();
}
