import imagesLoaded from 'imagesloaded';
import { StackMotionEffect as StackMotionEffect1 } from '/js/effect-1/stackMotionEffect1.js';
import { StackMotionEffect as StackMotionEffect2 } from '/js/effect-2/stackMotionEffect2.js';
import { StackMotionEffect as StackMotionEffect3 } from '/js/effect-3/stackMotionEffect3.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import Experience from '/Experience/Experience.js';

/* =============================================================================
   EXPERIENCE (juego / canvas)
============================================================================= */
let experience = null;
if (window.location.pathname.includes('juego') && !experience) {
  experience = new Experience(document.querySelector('canvas.webgl'));
}

if (experience && !window.location.pathname.includes('juego')) {
  experience.destroy();
}

/* =============================================================================
   MAIN / UTILS
============================================================================= */
const preloadImages = (selector = 'img') =>
  new Promise((resolve) => {
    imagesLoaded(document.querySelectorAll(selector), { background: true }, resolve);
  });

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* =============================================================================
   MENU
============================================================================= */
const toggleButtonCheckbox = document.querySelector('.menu__toggle-checkbox');
const menu = document.querySelector('.menu');
const menuToggleHost = document.querySelector('.menu__toggle-host');
const menuPanel = document.querySelector('.menu__panel');
const menuBottom = document.querySelector('.menu__bottom');

const PANEL_EXPANDED = 'menu__panel--expanded';
const HOST_EXPANDED = 'menu__toggle-host--expanded';

function clipRadiusPx(panelEl, x, y) {
  const w = panelEl.offsetWidth;
  const h = panelEl.offsetHeight;
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  return Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - x, cy - y))) + 12;
}

function pivotToggleTop(panelEl) {
  const w = panelEl.offsetWidth;
  return { x: w, y: 28 };
}

function openMenu() {
  if (!menuPanel || !menuBottom || !menuToggleHost) return;
  if (menuPanel.classList.contains(PANEL_EXPANDED)) return;

  gsap.killTweensOf([menuPanel, menuBottom, menuToggleHost]);

  menuToggleHost.classList.add(HOST_EXPANDED);
  menuPanel.classList.add(PANEL_EXPANDED);
  menuBottom.classList.add('menu__bottom--visible');
  gsap.set(menuBottom, { opacity: 0 });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!toggleButtonCheckbox?.checked) {
        menuToggleHost.classList.remove(HOST_EXPANDED);
        menuPanel.classList.remove(PANEL_EXPANDED);
        menuBottom.classList.remove('menu__bottom--visible');
        gsap.set(menuBottom, { clearProps: 'opacity' });
        gsap.set(menuToggleHost, { clearProps: 'transform' });
        return;
      }

      const { x, y } = pivotToggleTop(menuPanel);
      const r = clipRadiusPx(menuPanel, x, y);
      const bounceEase = prefersReducedMotion.matches ? 'power2.out' : 'back.out(1.35)';

      gsap.set(menuPanel, { clipPath: `circle(0px at ${x}px ${y}px)` });
      gsap.set(menuToggleHost, { transformOrigin: 'top right', scale: 0.94 });

      gsap
        .timeline({ defaults: { ease: 'power2.out' } })
        .to(menuToggleHost, {
          scale: 1,
          duration: prefersReducedMotion.matches ? 0.28 : 0.52,
          ease: bounceEase,
        })
        .to(
          menuPanel,
          {
            clipPath: `circle(${r}px at ${x}px ${y}px)`,
            duration: prefersReducedMotion.matches ? 0.32 : 0.48,
            ease: bounceEase,
          },
          0,
        )
        .to(menuBottom, { opacity: 1, duration: 0.28, ease: 'power1.out' }, '-=0.28');
    });
  });
}

function closeMenu() {
  if (!menuPanel || !menuBottom || !menuToggleHost) return;
  if (!menuPanel.classList.contains(PANEL_EXPANDED)) return;

  gsap.killTweensOf([menuPanel, menuBottom, menuToggleHost]);

  const { x, y } = pivotToggleTop(menuPanel);
  const r = clipRadiusPx(menuPanel, x, y);

  gsap.set(menuPanel, { clipPath: `circle(${r}px at ${x}px ${y}px)` });

  gsap
    .timeline({
      onComplete: () => {
        menuToggleHost.classList.remove(HOST_EXPANDED);
        menuPanel.classList.remove(PANEL_EXPANDED);
        menuBottom.classList.remove('menu__bottom--visible');
        gsap.set(menuPanel, { clearProps: 'clipPath' });
        gsap.set(menuBottom, { clearProps: 'opacity' });
        gsap.set(menuToggleHost, { clearProps: 'transform' });
      },
    })
    .to(menuBottom, { opacity: 0, duration: 0.18, ease: 'power1.in' })
    .to(
      menuPanel,
      {
        clipPath: `circle(0px at ${x}px ${y}px)`,
        duration: 0.38,
        ease: 'power3.in',
      },
      0,
    )
    .to(
      menuToggleHost,
      {
        scale: 0.96,
        duration: 0.32,
        ease: 'power2.in',
      },
      0,
    );
}

function onToggleChange() {
  if (!toggleButtonCheckbox) return;
  if (toggleButtonCheckbox.checked) {
    openMenu();
  } else {
    closeMenu();
  }
}

function scrollToHashTarget(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initMenu() {
  toggleButtonCheckbox?.addEventListener('change', onToggleChange);

  menu?.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || !menu.contains(link)) return;

    const href = link.getAttribute('href') || '';

    if (href.startsWith('#') && href.length > 1) {
      e.preventDefault();
      if (toggleButtonCheckbox?.checked) {
        toggleButtonCheckbox.checked = false;
        window.setTimeout(() => scrollToHashTarget(href), 400);
      } else {
        scrollToHashTarget(href);
      }
      return;
    }

    if (toggleButtonCheckbox?.checked) {
      toggleButtonCheckbox.checked = false;
    }
  });
}

initMenu();

/* =============================================================================
   BACKGROUND PARALLAX (home)
============================================================================= */
const scene = document.getElementById('scene');
const mouse = { x: 0, y: 0 };
const current = { x: 0, y: 0 };

const layers = [
  { el: document.getElementById('l1'), depth: 0.015 },
  { el: document.getElementById('l2'), depth: 0.032 },
  { el: document.getElementById('l3'), depth: 0.058 },
  { el: document.getElementById('l4'), depth: 0.088 },
].filter((x) => x.el);

const mobileParallaxMq = window.matchMedia('(max-width: 767px)');

const getBase = (el) => {
  const bx = Number(el.dataset.baseX ?? 0);
  const mobileY = el.dataset.baseYMobile;
  const useMobileY = mobileParallaxMq.matches && mobileY != null && mobileY !== '';
  const by = Number(useMobileY ? mobileY : (el.dataset.baseY ?? 0));
  return { bx: Number.isFinite(bx) ? bx : 0, by: Number.isFinite(by) ? by : 0 };
};

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX - window.innerWidth / 2;
  mouse.y = e.clientY - window.innerHeight / 2;
});

window.addEventListener('load', () => {
  document.body.classList.add('bg-loaded');
});

function animateBackground() {
  current.x += (mouse.x - current.x) * 0.07;
  current.y += (mouse.y - current.y) * 0.07;

  layers.forEach(({ el, depth }) => {
    const { bx, by } = getBase(el);
    const x = bx + current.x * depth;
    const y = by + current.y * depth;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  requestAnimationFrame(animateBackground);
}

if (scene && layers.length) animateBackground();

/* =============================================================================
   GSAP
============================================================================= */
gsap.registerPlugin(ScrollTrigger);

/* =============================================================================
   HOME — slogan reveal
============================================================================= */
const initHomeSloganReveal = () => {
  const slogan = document.querySelector('.slogan-container');
  const home = document.getElementById('home');
  if (!slogan || !home) return;

  if (prefersReducedMotion.matches) {
    slogan.classList.add('is-visible');
    return;
  }

  ScrollTrigger.create({
    trigger: home,
    start: 'top+=60 top',
    once: true,
    onEnter: () => slogan.classList.add('is-visible'),
  });
};

/* =============================================================================
   QUÉ ES — what parallax
============================================================================= */
const WHAT_CARD_STACK = [
  { x: -10, y: 14, rotate: -8 },
  { x: 16, y: 4, rotate: 6 },
  { x: -6, y: -8, rotate: -5 },
  { x: 20, y: 10, rotate: 9 },
  { x: 2, y: -14, rotate: -7 },
  { x: 12, y: 2, rotate: 5 },
];

const WHAT_CARDS_PER_TEXT = 2;
const WHAT_GROUP_STEP = 0.62;
const WHAT_CARD_ENTER_X = 280;
const WHAT_CARD_INSET = 0.08;
const WHAT_CARD_DUR = 0.34;
const WHAT_TEXT_AFTER_CARDS = 0.05;
const WHAT_TEXT_DUR = 0.36;
const WHAT_TEXT_HOLD = 0.28;
const WHAT_TEXT_ENTER_Y = 22;
const WHAT_TEXT_BOUNCE_EASE = 'back.out(1.12)';
const WHAT_TITLE_BOUNCE_EASE = 'back.out(1.35)';
const WHAT_TITLE_ENTER_Y = 72;

function setWhatCardTransform(card, slot, { alpha = 1, enter = false } = {}) {
  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: (slot?.x ?? 0) + (enter ? WHAT_CARD_ENTER_X : 0),
    y: slot?.y ?? 0,
    rotation: (slot?.rotate ?? 0) + (enter ? 14 : 0),
    autoAlpha: alpha,
    transformOrigin: '50% 50%',
  });
}

function initWhatParallax() {
  const flow = document.getElementById('whatFlow');
  if (!flow) return;

  const pin = flow.querySelector('.what-flow__pin');
  const title = flow.querySelector('.intro__title');
  const textPanes = [...flow.querySelectorAll('.what-flow__text-pane')];
  const cards = [...flow.querySelectorAll('.what-flow__card')];

  if (!pin || !textPanes.length || !cards.length) return;

  const showReduced = () => {
    gsap.set(textPanes, {
      clearProps: 'all',
      visibility: 'visible',
      opacity: 1,
      xPercent: 0,
      y: 0,
    });
    textPanes.forEach((pane, i) => {
      pane.classList.toggle('is-active', i === 0);
      if (i > 0) pane.style.visibility = 'hidden';
    });
    cards.forEach((card, i) => {
      setWhatCardTransform(card, WHAT_CARD_STACK[i], { alpha: 1 });
    });
    if (title) gsap.set(title, { clearProps: 'all', opacity: 1, y: 0 });
  };

  if (prefersReducedMotion.matches) {
    showReduced();
    return;
  }

  if (title) {
    const section = document.getElementById('que-es');
    gsap.set(title, { autoAlpha: 0, y: WHAT_TITLE_ENTER_Y });

    gsap.to(title, {
      autoAlpha: 1,
      y: 0,
      duration: 0.9,
      ease: WHAT_TITLE_BOUNCE_EASE,
      scrollTrigger: {
        trigger: section || flow,
        start: 'top 82%',
        once: true,
        invalidateOnRefresh: true,
      },
    });
  }

  textPanes.forEach((pane, i) => {
    pane.classList.toggle('is-active', i === 0);
  });

  gsap.set(textPanes, {
    xPercent: 55,
    y: WHAT_TEXT_ENTER_Y,
    autoAlpha: 0,
    visibility: 'visible',
  });

  cards.forEach((card, i) => {
    setWhatCardTransform(card, WHAT_CARD_STACK[i], { alpha: 0, enter: true });
  });

  const groupCount = Math.ceil(cards.length / WHAT_CARDS_PER_TEXT);
  const whatTextEnterState = (xFrom) => ({
    xPercent: xFrom,
    y: WHAT_TEXT_ENTER_Y,
    autoAlpha: 0,
  });
  const whatTextBounceOut = {
    xPercent: 0,
    y: 0,
    autoAlpha: 1,
    duration: WHAT_TEXT_DUR,
    ease: WHAT_TEXT_BOUNCE_EASE,
  };

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: flow,
      start: 'top top',
      end: () => `+=${Math.round(groupCount * WHAT_GROUP_STEP * 100)}%`,
      pin: pin,
      pinSpacing: true,
      scrub: 0.85,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap:
        groupCount > 1
          ? {
              snapTo: 1 / groupCount,
              duration: { min: 0.35, max: 0.72 },
              delay: 0.06,
              ease: 'power2.inOut',
            }
          : false,
    },
  });

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const t = groupIndex * WHAT_GROUP_STEP;
    const cardAnimStart = t + WHAT_CARD_INSET;
    const textRevealStart = cardAnimStart + WHAT_CARD_DUR + WHAT_TEXT_AFTER_CARDS;
    const textSettleStart = textRevealStart + WHAT_TEXT_DUR;
    const cardStart = groupIndex * WHAT_CARDS_PER_TEXT;
    const groupCards = cards.slice(cardStart, cardStart + WHAT_CARDS_PER_TEXT);

    groupCards.forEach((card, i) => {
      const index = cardStart + i;
      const slot = WHAT_CARD_STACK[index] ?? { x: 0, y: 0, rotate: 0 };

      tl.to(
        card,
        {
          xPercent: -50,
          yPercent: -50,
          x: slot.x,
          y: slot.y,
          rotation: slot.rotate,
          autoAlpha: 1,
          duration: WHAT_CARD_DUR,
          ease: 'power2.out',
        },
        cardAnimStart,
      );
    });

    if (groupIndex === 0) {
      tl.fromTo(
        textPanes[0],
        whatTextEnterState(55),
        whatTextBounceOut,
        textRevealStart,
      );
    } else {
      const prevPane = textPanes[groupIndex - 1];
      const nextPane = textPanes[groupIndex];

      tl.to(
        prevPane,
        {
          xPercent: -35,
          y: -10,
          autoAlpha: 0,
          duration: WHAT_TEXT_DUR * 0.55,
          ease: 'power2.in',
        },
        textRevealStart,
      );

      tl.fromTo(
        nextPane,
        whatTextEnterState(50),
        whatTextBounceOut,
        textRevealStart + 0.02,
      );

      tl.call(
        () => {
          textPanes.forEach((pane, i) => {
            pane.classList.toggle('is-active', i === groupIndex);
          });
        },
        null,
        textRevealStart + 0.02,
      );
    }

    tl.to({}, { duration: WHAT_TEXT_HOLD }, textSettleStart);
    tl.addLabel(`what-stop-${groupIndex}`, textSettleStart + WHAT_TEXT_HOLD * 0.5);
  }
}

/* =============================================================================
   DESAFÍO — desafio parallax
============================================================================= */
const DESAFIO_CARD_STACK = [
  { x: 0, y: -98, rotate: -8 },
  { x: 0, y: 0, rotate: 6 },
  { x: 0, y: 98, rotate: -7 },
];

const DESAFIO_CARD_STACK_MOBILE = [
  { x: 0, y: -58, rotate: -8 },
  { x: 0, y: 0, rotate: 6 },
  { x: 0, y: 58, rotate: -7 },
];

function getDesafioCardStack() {
  return mobileParallaxMq.matches ? DESAFIO_CARD_STACK_MOBILE : DESAFIO_CARD_STACK;
}

const DESAFIO_CARD_ENTER_X = -300;
const DESAFIO_CARD_ENTER_Y = -140;
const DESAFIO_STEP = 0.46;
const DESAFIO_TITLE_DROP_OFFSET = 56;
const DESAFIO_TITLE_BOUNCE_EASE = 'back.out(1.35)';
const DESAFIO_TEXT_ENTER_Y = -22;
const DESAFIO_TEXT_BOUNCE_EASE = 'back.out(1.12)';
const DESAFIO_TEXT_DUR = 0.36;
const DESAFIO_TEXT_HOLD = 0.22;

function setDesafioCardTransform(card, slot, { alpha = 1, enter = false } = {}) {
  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: (slot?.x ?? 0) + (enter ? DESAFIO_CARD_ENTER_X : 0),
    y: (slot?.y ?? 0) + (enter ? DESAFIO_CARD_ENTER_Y : 0),
    rotation: (slot?.rotate ?? 0) + (enter ? -14 : 0),
    autoAlpha: alpha,
    transformOrigin: '50% 50%',
  });
}

function initDesafioParallax() {
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
    gsap.set(title, { clearProps: 'all', opacity: 1, y: 0 });
    gsap.set(textPanes, {
      clearProps: 'all',
      visibility: 'hidden',
      opacity: 0,
      xPercent: 0,
      y: 0,
    });
    gsap.set(finale, { clearProps: 'all', opacity: 1, visibility: 'visible', xPercent: 0, y: 0 });
    cards.forEach((card, i) => {
      setDesafioCardTransform(
        card,
        getDesafioCardStack()[i] ?? getDesafioCardStack()[0],
        { alpha: 1 },
      );
    });
  };

  if (prefersReducedMotion.matches) {
    showReduced();
    return;
  }

  gsap.set(title, { y: -DESAFIO_TITLE_DROP_OFFSET, autoAlpha: 0 });
  textPanes.forEach((pane, i) => pane.classList.toggle('is-active', i === 0));
  gsap.set(textPanes, {
    xPercent: -55,
    y: DESAFIO_TEXT_ENTER_Y,
    autoAlpha: 0,
    visibility: 'visible',
  });
  cards.forEach((card, i) => {
    setDesafioCardTransform(card, getDesafioCardStack()[i], { alpha: 0, enter: true });
  });
  gsap.set(finale, {
    autoAlpha: 0,
    xPercent: -45,
    y: DESAFIO_TEXT_ENTER_Y,
    visibility: 'visible',
  });

  const textCount = textPanes.length;
  const snapSteps = textCount + 1;
  const totalSteps = textCount + 1.15;
  const endDistance = () => `+=${Math.round(totalSteps * DESAFIO_STEP * 100)}%`;
  const desafioTextEnterState = (xFrom) => ({
    xPercent: xFrom,
    y: DESAFIO_TEXT_ENTER_Y,
    autoAlpha: 0,
  });
  const desafioTextBounceOut = {
    xPercent: 0,
    y: 0,
    autoAlpha: 1,
    duration: DESAFIO_STEP * DESAFIO_TEXT_DUR,
    ease: DESAFIO_TEXT_BOUNCE_EASE,
  };

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
      snap:
        snapSteps > 1
          ? {
              snapTo: 1 / snapSteps,
              duration: { min: 0.35, max: 0.72 },
              delay: 0.06,
              ease: 'power2.inOut',
            }
          : false,
    },
  });

  tl.to(
    title,
    {
      y: 0,
      duration: DESAFIO_STEP * 0.45,
      ease: DESAFIO_TITLE_BOUNCE_EASE,
    },
    0,
  );

  cards.forEach((card, index) => {
    const slot = getDesafioCardStack()[index] ?? { x: 0, y: 0, rotate: 0 };
    const t = index * DESAFIO_STEP;
    const cardStart = t + DESAFIO_STEP * 0.1;
    const textRevealStart = index === 0 ? t + DESAFIO_STEP * 0.08 : t + 0.02;
    const textSettleStart = textRevealStart + DESAFIO_STEP * DESAFIO_TEXT_DUR;

    if (index === 0) {
      tl.fromTo(
        textPanes[0],
        desafioTextEnterState(-55),
        desafioTextBounceOut,
        textRevealStart,
      );
    } else {
      const prevPane = textPanes[index - 1];
      const nextPane = textPanes[index];

      tl.to(
        prevPane,
        {
          xPercent: 35,
          y: 14,
          autoAlpha: 0,
          duration: DESAFIO_STEP * DESAFIO_TEXT_DUR * 0.55,
          ease: 'power2.in',
        },
        textRevealStart,
      );

      tl.fromTo(
        nextPane,
        desafioTextEnterState(-50),
        desafioTextBounceOut,
        textRevealStart + 0.02,
      );

      tl.call(
        () => {
          textPanes.forEach((p, i) => p.classList.toggle('is-active', i === index));
        },
        null,
        textRevealStart + 0.02,
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
        duration: DESAFIO_STEP * 0.52,
        ease: 'power2.out',
      },
      cardStart,
    );

    tl.to({}, { duration: DESAFIO_TEXT_HOLD }, textSettleStart);
    tl.addLabel(`desafio-stop-${index}`, textSettleStart + DESAFIO_TEXT_HOLD * 0.5);
  });

  const finaleT = textCount * DESAFIO_STEP + DESAFIO_STEP * 0.1;
  const finaleRevealStart = finaleT + 0.04;
  const finaleSettleStart = finaleRevealStart + DESAFIO_STEP * DESAFIO_TEXT_DUR;
  const lastPane = textPanes[textCount - 1];

  tl.to(
    lastPane,
    {
      xPercent: 40,
      y: 14,
      autoAlpha: 0,
      duration: DESAFIO_STEP * 0.3,
      ease: 'power2.in',
    },
    finaleT,
  );

  tl.to(textPanes.slice(0, -1), { autoAlpha: 0, duration: 0.01 }, finaleT);

  tl.fromTo(
    finale,
    desafioTextEnterState(-48),
    desafioTextBounceOut,
    finaleRevealStart,
  );

  tl.call(
    () => {
      textPanes.forEach((p) => p.classList.remove('is-active'));
    },
    null,
    finaleRevealStart,
  );

  tl.to({}, { duration: DESAFIO_TEXT_HOLD }, finaleSettleStart);
  tl.addLabel('desafio-stop-finale', finaleSettleStart + DESAFIO_TEXT_HOLD * 0.5);
  tl.to({}, { duration: DESAFIO_STEP * 0.55 });

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
}

/* =============================================================================
   DISEÑO — título + cartas flip
============================================================================= */
const DISENO_TITLE_ENTER_X = -72;
const DISENO_CARD_ENTER_Y = 56;
const DISENO_TITLE_BOUNCE_EASE = 'back.out(1.35)';
const DISENO_CARD_BOUNCE_EASE = 'back.out(1.2)';

function initDisenoReveal() {
  const section = document.getElementById('diseno');
  const how = document.getElementById('how');
  const title = how?.querySelector('h2');
  const cards = how ? [...how.querySelectorAll('.cards-grid .flip-card')] : [];

  if (!section || !how || !title) return;

  const showReduced = () => {
    gsap.set([title, ...cards], { clearProps: 'all', autoAlpha: 1, x: 0, y: 0 });
  };

  if (prefersReducedMotion.matches) {
    showReduced();
    return;
  }

  gsap.set(title, { autoAlpha: 0, x: DISENO_TITLE_ENTER_X });
  gsap.set(cards, { autoAlpha: 0, y: DISENO_CARD_ENTER_Y });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 78%',
      once: true,
      invalidateOnRefresh: true,
    },
  });

  tl.to(title, {
    autoAlpha: 1,
    x: 0,
    duration: 0.88,
    ease: DISENO_TITLE_BOUNCE_EASE,
  });

  if (cards.length) {
    tl.to(
      cards,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.72,
        ease: DISENO_CARD_BOUNCE_EASE,
        stagger: 0.14,
      },
      '-=0.42',
    );
  }
}

const updateFlipCardScrollBtn = (card) => {
  const scroll = card.querySelector('.flip-card__scroll');
  const btn = card.querySelector('.flip-card__scroll-btn');
  if (!scroll || !btn) return;

  const hasOverflow = scroll.scrollHeight > scroll.clientHeight + 4;
  const atBottom =
    scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4;
  const showBtn = card.classList.contains('flipped') && hasOverflow;

  btn.hidden = !showBtn;
  btn.classList.toggle('is-at-bottom', atBottom);
  btn.setAttribute(
    'aria-label',
    atBottom ? 'Subir al inicio' : 'Bajar texto'
  );
  card.classList.toggle('flip-card--scrollable', showBtn);
};

const scheduleFlipCardScrollBtnUpdate = (card) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => updateFlipCardScrollBtn(card));
  });
  window.setTimeout(() => updateFlipCardScrollBtn(card), 580);
};

const initFlipCards = () => {
  document.querySelectorAll('.flip-card').forEach((card) => {
    const scroll = card.querySelector('.flip-card__scroll');
    const scrollBtn = card.querySelector('.flip-card__scroll-btn');

    card.addEventListener('click', (e) => {
      if (e.target.closest('.flip-card__scroll-btn')) return;
      if (!e.target.closest('.flip-inner')) return;

      card.classList.toggle('flipped');
      if (scroll) scroll.scrollTop = 0;
      scheduleFlipCardScrollBtnUpdate(card);
    });

    card.addEventListener('keydown', (e) => {
      if (e.target.closest('.flip-card__scroll-btn')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('flipped');
        if (scroll) scroll.scrollTop = 0;
        scheduleFlipCardScrollBtnUpdate(card);
      }
    });

    if (scrollBtn && scroll) {
      scrollBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const atBottom =
          scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4;

        if (atBottom) {
          scroll.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          scroll.scrollBy({
            top: Math.max(scroll.clientHeight * 0.72, 96),
            behavior: 'smooth',
          });
        }
      });

      scroll.addEventListener(
        'scroll',
        () => updateFlipCardScrollBtn(card),
        { passive: true }
      );
    }

    window.addEventListener('resize', () => updateFlipCardScrollBtn(card));
    updateFlipCardScrollBtn(card);
  });
};

/* =============================================================================
   DÓNDE — carrusel + galería fullscreen
============================================================================= */
function initCarousel() {
  const thumbs = Array.from(document.querySelectorAll('.thumb'));
  const mainImg = document.getElementById('carouselMain');
  const prevBtn = document.querySelector('.carousel-arrow--prev');
  const nextBtn = document.querySelector('.carousel-arrow--next');

  if (!thumbs.length || !mainImg) return;

  let current = 0;

  function goTo(index) {
    current = (index + thumbs.length) % thumbs.length;

    mainImg.classList.add('fade');
    setTimeout(() => {
      mainImg.src = thumbs[current].dataset.src;
      mainImg.alt = thumbs[current].querySelector('img').alt;
      mainImg.classList.remove('fade');
    }, 250);

    thumbs.forEach((t) => t.classList.remove('active'));
    thumbs[current].classList.add('active');
    thumbs[current].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => goTo(i));
  });

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

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
}

function initGallery() {
  const galleryImages = document.querySelectorAll('.gallery img');
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenImage = document.getElementById('fullscreenImage');

  if (!fullscreenOverlay || !fullscreenImage) return;

  galleryImages.forEach((img) => {
    img.addEventListener('click', () => {
      fullscreenImage.src = img.src;
      fullscreenOverlay.classList.add('show');
    });
  });

  fullscreenOverlay.addEventListener('click', () => {
    fullscreenOverlay.classList.remove('show');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      fullscreenOverlay.classList.remove('show');
    }
  });
}

/* =============================================================================
   CONTACTO — formulario
============================================================================= */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const msgSuccess = document.getElementById('formSuccess');

  if (!form || !submitBtn || !msgSuccess) return;

  submitBtn.addEventListener('click', () => {
    msgSuccess.classList.add('visible');
    submitBtn.disabled = true;

    setTimeout(() => {
      form.reset();
      msgSuccess.classList.remove('visible');
      submitBtn.disabled = false;
    }, 4000);
  });
}

/* =============================================================================
   LOADER — video home
============================================================================= */
function initVideoLoader() {
  const loader = document.getElementById('loader');
  const video = document.getElementById('backgroundVideo');
  if (!loader || !video) return;

  video.addEventListener('loadeddata', () => {
    loader.classList.add('hidden');
  });
}

/* =============================================================================
   PAGE END — quitar espacio fantasma después de Contacto
============================================================================= */
function getPageY(el) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    bottom: rect.bottom + window.scrollY,
  };
}

function trimPageEndSpace() {
  const contacto = document.getElementById('contacto');
  const pageEnd = document.querySelector('.footer__bottom') || contacto;
  if (!pageEnd) return;

  const { bottom: endLine } = getPageY(pageEnd);

  document.querySelectorAll('.pin-spacer').forEach((spacer) => {
    const { top: spacerTop, bottom: spacerBottom } = getPageY(spacer);

    if (spacerTop >= endLine - 4) {
      spacer.remove();
      return;
    }

    if (spacerBottom > endLine + 4) {
      const clipped = Math.max(0, Math.ceil(endLine - spacerTop));
      spacer.style.setProperty('height', `${clipped}px`, 'important');
      spacer.style.setProperty('min-height', `${clipped}px`, 'important');
      spacer.style.setProperty('max-height', `${clipped}px`, 'important');
    }
  });

  if (!contacto) return;

  let next = contacto.nextElementSibling;
  while (next) {
    const toRemove = next;
    next = next.nextElementSibling;
    if (toRemove.classList?.contains('pin-spacer')) {
      toRemove.remove();
    }
  }
}

/* =============================================================================
   INIT
============================================================================= */
const init = () => {
  initWhatParallax();
  initDesafioParallax();
  initDisenoReveal();
  initFlipCards();
  initCarousel();

  document.querySelectorAll('[data-stack-1]').forEach((stackEl) => {
    new StackMotionEffect1(stackEl);
  });
  document.querySelectorAll('[data-stack-2]').forEach((stackEl) => {
    new StackMotionEffect2(stackEl);
  });
  document.querySelectorAll('[data-stack-3]').forEach((stackEl) => {
    new StackMotionEffect3(stackEl);
  });

  initHomeSloganReveal();
  ScrollTrigger.refresh();
  trimPageEndSpace();
  requestAnimationFrame(trimPageEndSpace);
};

preloadImages('.card__img').then(() => {
  document.body.classList.remove('loading');
  init();
});

if (!window.location.pathname.includes('juego')) {
  initGallery();
  initVideoLoader();
  initContactForm();
}
