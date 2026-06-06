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

/* Scroll animations: menu jumps reset state, then play section intro */
let programmaticScrollLock = false;
let whatParallaxTimeline = null;
let desafioParallaxTimeline = null;
let disenoRevealTimeline = null;

const STACK_TEXT_BACK_OPACITY = 0.1;
const STACK_TEXT_ACTIVE_MIN_OPACITY = 0.08;
const STACK_TEXT_FRONT_Z = 30;
const SCROLL_SCRUB_SMOOTH = 1;
const STACK_TEXT_HOLD = 0.42;
/** Extra Y where the finale / objective card starts its last rise */
const STACK_FINALE_RISE_FROM_Y = 56;

function getStackFinaleRiseFromSlot(slot) {
  const extraY = mobileParallaxMq.matches
    ? Math.round(STACK_FINALE_RISE_FROM_Y * 0.72)
    : STACK_FINALE_RISE_FROM_Y;
  return { ...slot, y: slot.y + extraY };
}

function getWhatObjectiveIndex(textPanes) {
  return textPanes.length - 1;
}

function getWhatObjectivePane(textPanes) {
  return textPanes[getWhatObjectiveIndex(textPanes)];
}

function getStackPaneOpacity(pane) {
  return Number(gsap.getProperty(pane, 'opacity')) || 0;
}

function getStackPaneAutoAlpha(pane) {
  return Number(gsap.getProperty(pane, 'autoAlpha')) || 0;
}

function getStackPaneZ(pane) {
  return Number(gsap.getProperty(pane, 'zIndex')) || 0;
}

/** Front stack cards stay .is-active while opacity stays above threshold */
function syncStackTextActiveState(panes, { finale = null } = {}) {
  const items = finale ? [...panes, finale] : panes;

  items.forEach((pane) => {
    if (getStackPaneAutoAlpha(pane) < 0.01) {
      pane.classList.remove('is-active');
      return;
    }
  });

  const visible = items.filter((pane) => getStackPaneAutoAlpha(pane) > 0.01);
  if (!visible.length) return;

  const usesDynamicFrontZ = visible.some((pane) => getStackPaneZ(pane) >= STACK_TEXT_FRONT_Z);
  const peakOpacity = Math.max(...visible.map(getStackPaneOpacity));

  visible.forEach((pane) => {
    const opacity = getStackPaneOpacity(pane);
    const z = getStackPaneZ(pane);
    const isAtFront = usesDynamicFrontZ
      ? z >= STACK_TEXT_FRONT_Z
      : opacity >= peakOpacity - 0.02;

    pane.classList.toggle('is-active', isAtFront && opacity > STACK_TEXT_ACTIVE_MIN_OPACITY);
  });
}

function hideStackFinalePane(pane) {
  pane.classList.remove('is-active');
  gsap.set(pane, { autoAlpha: 0, opacity: 0, visibility: 'hidden' });
}

function setStackTextOpacities(
  tl,
  textPanes,
  activeIndex,
  startTime,
  { keepOutgoingIndex = null, hidePane = null, hidePaneIndex = null } = {},
) {
  textPanes.forEach((pane, i) => {
    if (hidePaneIndex !== null && i === hidePaneIndex) return;
    if (i < activeIndex - 1) return;
    if (keepOutgoingIndex === i) return;

    tl.set(
      pane,
      { opacity: i === activeIndex ? 1 : STACK_TEXT_BACK_OPACITY },
      startTime,
    );
  });

  if (hidePane) {
    tl.call(() => hideStackFinalePane(hidePane), null, startTime);
  }
}

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

  programmaticScrollLock = true;

  const y = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: y, behavior: 'auto' });
  resetAnimationsAfterMenuJump();

  requestAnimationFrame(() => {
    ScrollTrigger.refresh(true);
    playMenuSectionIntro(hash);
    programmaticScrollLock = false;
  });
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
   HOME — slogan line → scroll reveal + typewriter
============================================================================= */
const HOME_SLOGAN_CHAR_DURATION = 0.034;

function measureSloganContainerHeight(container, textEl, fullText) {
  container.classList.add('is-revealed', 'is-measuring');
  textEl.textContent = fullText;
  const height = container.offsetHeight;
  container.classList.remove('is-revealed', 'is-measuring');
  textEl.textContent = '';
  return height;
}

function typewriteSlogan(textEl, fullText, { delay = 0 } = {}) {
  textEl.textContent = '';
  textEl.setAttribute('aria-label', fullText);

  const proxy = { count: 0 };
  return gsap.to(proxy, {
    count: fullText.length,
    duration: fullText.length * HOME_SLOGAN_CHAR_DURATION,
    delay,
    ease: 'none',
    onUpdate: () => {
      textEl.textContent = fullText.slice(0, Math.round(proxy.count));
    },
    onComplete: () => {
      textEl.textContent = fullText;
      textEl.removeAttribute('aria-label');
    },
  });
}

function revealHomeSlogan(container, textEl, scrollHint) {
  const fullText = (textEl.dataset.slogan || textEl.textContent).trim();
  if (container.classList.contains('is-revealed')) return;

  const targetHeight = measureSloganContainerHeight(container, textEl, fullText);
  container.classList.add('is-revealed');
  textEl.textContent = '';

  gsap.killTweensOf(container);

  gsap.fromTo(
    container,
    {
      height: 2,
      y: 32,
      scaleX: 1,
    },
    {
      height: targetHeight,
      y: 0,
      duration: 0.9,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(container, { clearProps: 'height,y,transform' });
      },
    },
  );

  typewriteSlogan(textEl, fullText, { delay: 0.18 });

  if (scrollHint) {
    gsap.to(scrollHint, {
      autoAlpha: 0,
      y: 8,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => {
        scrollHint.classList.add('is-hidden');
        scrollHint.hidden = true;
      },
    });
  }
}

const initHomeSloganReveal = () => {
  const sloganSection = document.getElementById('home-slogan');
  const container = document.getElementById('sloganContainer');
  const textEl = document.querySelector('.slogan-text__content');
  const scrollHint = document.querySelector('.home__scroll-hint');
  if (!sloganSection || !container || !textEl) return;

  const fullText = (textEl.dataset.slogan || textEl.textContent).trim();
  textEl.dataset.slogan = fullText;

  let revealed = false;
  const runRevealOnce = () => {
    if (revealed || container.classList.contains('is-revealed')) return;
    revealed = true;
    revealHomeSlogan(container, textEl, scrollHint);
  };

  if (prefersReducedMotion.matches) {
    container.classList.add('is-revealed');
    textEl.textContent = fullText;
    if (scrollHint) scrollHint.hidden = true;
    return;
  }

  textEl.textContent = '';
  container.classList.add('is-line-ready');

  ScrollTrigger.create({
    trigger: sloganSection,
    start: 'top 78%',
    once: true,
    invalidateOnRefresh: true,
    onEnter: runRevealOnce,
  });

  scrollHint?.addEventListener('click', () => {
    sloganSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

const WHAT_CARD_FAN_BY_GROUP = [
  null,
  [
    { x: -16, y: 6, rotate: -11 },
    { x: 20, y: 4, rotate: 13 },
    { x: -12, y: -2, rotate: -9 },
    { x: 24, y: 6, rotate: 15 },
    { x: -6, y: -8, rotate: -7 },
    { x: 16, y: 2, rotate: 10 },
  ],
  [
    { x: -30, y: 12, rotate: -20 },
    { x: 36, y: 8, rotate: 22 },
    { x: -22, y: -4, rotate: -16 },
    { x: 40, y: 10, rotate: 24 },
    { x: -12, y: -14, rotate: -12 },
    { x: 28, y: 4, rotate: 18 },
  ],
];

const WHAT_CARD_FAN_BY_GROUP_MOBILE = [
  null,
  [
    { x: -10, y: 4, rotate: -9 },
    { x: 12, y: 3, rotate: 10 },
    { x: -8, y: -2, rotate: -7 },
    { x: 14, y: 4, rotate: 11 },
    { x: -5, y: -5, rotate: -6 },
    { x: 10, y: 2, rotate: 8 },
  ],
  [
    { x: -18, y: 8, rotate: -15 },
    { x: 22, y: 6, rotate: 16 },
    { x: -14, y: -3, rotate: -12 },
    { x: 26, y: 7, rotate: 18 },
    { x: -8, y: -9, rotate: -10 },
    { x: 18, y: 3, rotate: 13 },
  ],
];

const WHAT_GROUP_STEP = 1.35;
const WHAT_CARD_ENTER_X = 280;
const WHAT_CARD_INSET = 0.08;
const WHAT_CARD_DUR = 0.48;
const WHAT_CARD_FAN_DUR = 0.42;
const WHAT_CARD_FAN_ORIGIN = '50% 88%';
const WHAT_TEXT_INSET = 0.1;
/* Text stack: timeline units = scroll distance (scrubbed), not seconds */
const WHAT_TEXT_SCROLL_DUR = 0.58;
const WHAT_TEXT_FADE_SCROLL_DUR = 0.2;
const WHAT_TEXT_ENTER_DUR = WHAT_TEXT_SCROLL_DUR;
const WHAT_TEXT_ALPHA_DUR = WHAT_TEXT_FADE_SCROLL_DUR;
const WHAT_TEXT_ENTER_EASE = 'none';
const WHAT_TEXT_EXIT_EASE = 'none';
const WHAT_TEXT_HOLD = STACK_TEXT_HOLD;
const WHAT_TEXT_ENTER_X = -280;
const WHAT_TEXT_ENTER_Y = -112;
const WHAT_TEXT_EXIT_LIFT = -120;
const WHAT_TEXT_STACK = [
  { x: 0, y: 0, rotate: 0 },
  { x: 0, y: 30, rotate: 10 },
  { x: 0, y: 58, rotate: -14 },
];
const WHAT_TITLE_EASE = 'power3.out';
const WHAT_TITLE_ENTER_Y = 52;

function getWhatCardFanByGroup() {
  return mobileParallaxMq.matches ? WHAT_CARD_FAN_BY_GROUP_MOBILE : WHAT_CARD_FAN_BY_GROUP;
}

function getWhatCardSlot(cardIndex, groupIndex) {
  const base = WHAT_CARD_STACK[cardIndex] ?? { x: 0, y: 0, rotate: 0 };
  const fan = getWhatCardFanByGroup()[groupIndex]?.[cardIndex];
  if (!fan) return base;
  return {
    x: base.x + fan.x,
    y: base.y + fan.y,
    rotate: base.rotate + fan.rotate,
  };
}

function getWhatTextEnterOffset() {
  return mobileParallaxMq.matches
    ? { x: 0, y: WHAT_TEXT_ENTER_Y }
    : { x: WHAT_TEXT_ENTER_X, y: 0 };
}

function getWhatTextStackSlot(index) {
  const slot = WHAT_TEXT_STACK[index] ?? WHAT_TEXT_STACK[0];
  if (!mobileParallaxMq.matches) return slot;
  return {
    ...slot,
    y: Math.round(slot.y * 0.72),
  };
}

function setWhatStackZIndex(textPanes, objective, activeIndex, outgoingIndex = null) {
  const topZ = 33;
  const frontZ = 30;
  const backZ = 11;
  const objectiveIndex = getWhatObjectiveIndex(textPanes);

  const resolveZ = (stackIndex) => {
    if (outgoingIndex !== null && outgoingIndex === stackIndex) return topZ;
    if (activeIndex >= objectiveIndex) {
      return stackIndex === objectiveIndex ? frontZ : backZ + stackIndex;
    }
    if (stackIndex < activeIndex) return backZ + stackIndex;
    return frontZ - (stackIndex - activeIndex);
  };

  textPanes.forEach((pane, i) => {
    gsap.set(pane, { zIndex: resolveZ(i) });
  });
}

function animateWhatCardsToFan(tl, cards, groupIndex, startTime) {
  cards.forEach((card, i) => {
    const slot = getWhatCardSlot(i, groupIndex);
    tl.to(
      card,
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        rotation: slot.rotate,
        transformOrigin: WHAT_CARD_FAN_ORIGIN,
        duration: WHAT_CARD_FAN_DUR,
        ease: 'power2.out',
      },
      startTime,
    );
  });
}

function setWhatTextTransform(pane, slot, { alpha = 1, enter = false } = {}) {
  const enterOffset = getWhatTextEnterOffset();
  gsap.set(pane, {
    xPercent: -50,
    yPercent: 0,
    x: (slot?.x ?? 0) + (enter ? enterOffset.x : 0),
    y: (slot?.y ?? 0) + (enter ? enterOffset.y : 0),
    rotation: slot?.rotate ?? 0,
    autoAlpha: alpha,
    visibility: 'visible',
    transformOrigin: '50% 0',
  });
}

function animateWhatTextMove(slot, { duration = WHAT_TEXT_ENTER_DUR, ease = WHAT_TEXT_ENTER_EASE } = {}) {
  return {
    xPercent: -50,
    yPercent: 0,
    x: slot.x,
    y: slot.y,
    rotation: slot.rotate,
    duration,
    ease,
  };
}

function addWhatTextEnter(
  tl,
  pane,
  slot,
  startTime,
  paneIndex = 0,
  activeIndex = 0,
  { reveal = true } = {},
) {
  if (reveal) {
    tl.set(
      pane,
      {
        autoAlpha: 1,
        opacity: paneIndex === activeIndex ? 1 : STACK_TEXT_BACK_OPACITY,
        visibility: 'visible',
      },
      startTime,
    );
  } else {
    tl.set(pane, { autoAlpha: 1, opacity: 0, visibility: 'visible' }, startTime);
  }
  tl.to(
    pane,
    {
      xPercent: -50,
      yPercent: 0,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotate,
      duration: WHAT_TEXT_SCROLL_DUR,
      ease: 'none',
    },
    startTime,
  );
}

function getWhatTextEnterStart(groupIndex, cardsRevealStart) {
  if (groupIndex === 0) return cardsRevealStart;
  return groupIndex * WHAT_GROUP_STEP + WHAT_TEXT_INSET;
}

function getWhatSegmentEnd(groupIndex) {
  return (groupIndex + 1) * WHAT_GROUP_STEP;
}

function getWhatOutgoingStart(textEnterStart) {
  return textEnterStart + WHAT_TEXT_SCROLL_DUR;
}

function animateWhatTextFadeOut() {
  return {
    autoAlpha: 0,
    duration: WHAT_TEXT_ALPHA_DUR,
    ease: WHAT_TEXT_EXIT_EASE,
  };
}

function animateWhatTextExit() {
  return {
    xPercent: -50,
    yPercent: 0,
    y: WHAT_TEXT_EXIT_LIFT,
    ...animateWhatTextFadeOut(),
  };
}

function setWhatActiveTextPane(textPanes) {
  const objective = getWhatObjectivePane(textPanes);
  gsap.set(objective, { autoAlpha: 0, opacity: 0, visibility: 'hidden' });
  objective.classList.remove('is-active');
  syncStackTextActiveState(textPanes);
}

function setWhatCardTransform(card, slot, { alpha = 1, enter = false } = {}) {
  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: (slot?.x ?? 0) + (enter ? WHAT_CARD_ENTER_X : 0),
    y: slot?.y ?? 0,
    rotation: (slot?.rotate ?? 0) + (enter ? 14 : 0),
    autoAlpha: alpha,
    transformOrigin: WHAT_CARD_FAN_ORIGIN,
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
    const objective = getWhatObjectivePane(textPanes);
    const objectiveIndex = getWhatObjectiveIndex(textPanes);
    textPanes.forEach((pane, i) => {
      if (i === objectiveIndex) return;
      setWhatTextTransform(pane, getWhatTextStackSlot(i), { alpha: 1 });
      pane.classList.toggle('is-active', i === 0);
    });
    setWhatTextTransform(objective, getWhatTextStackSlot(objectiveIndex), { alpha: 1 });
    gsap.set(objective, { autoAlpha: 1, visibility: 'visible' });
    setWhatStackZIndex(textPanes, objective, 0);
    cards.forEach((card, i) => {
      setWhatCardTransform(card, getWhatCardSlot(i, 0), { alpha: 1 });
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
      ease: WHAT_TITLE_EASE,
      scrollTrigger: {
        trigger: section || flow,
        start: 'top 88%',
        end: 'top 52%',
        scrub: 1.4,
        invalidateOnRefresh: true,
      },
    });
  }

  setWhatActiveTextPane(textPanes);
  const objectivePane = getWhatObjectivePane(textPanes);
  const objectiveIndex = getWhatObjectiveIndex(textPanes);
  textPanes.forEach((pane, i) => {
    if (i === objectiveIndex) return;
    setWhatTextTransform(pane, getWhatTextStackSlot(i), { alpha: 0, enter: true });
  });
  setWhatTextTransform(objectivePane, getWhatTextStackSlot(objectiveIndex), { alpha: 0, enter: true });
  gsap.set(objectivePane, { visibility: 'hidden' });
  setWhatStackZIndex(textPanes, objectivePane, 0);
  cards.forEach((card, i) => {
    setWhatCardTransform(card, getWhatCardSlot(i, 0), { alpha: 0, enter: true });
  });

  const groupCount = textPanes.length;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: flow,
      start: 'top top',
      end: () => `+=${Math.round(groupCount * WHAT_GROUP_STEP * 100)}%`,
      pin: pin,
      pinSpacing: true,
      scrub: SCROLL_SCRUB_SMOOTH,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: () => syncStackTextActiveState(textPanes),
    },
  });
  whatParallaxTimeline = tl;

  const cardsRevealStart = WHAT_CARD_INSET;
  cards.forEach((card, i) => {
    const slot = getWhatCardSlot(i, 0);

    tl.set(card, { autoAlpha: 1 }, cardsRevealStart);
    tl.to(
      card,
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        rotation: slot.rotate,
        transformOrigin: WHAT_CARD_FAN_ORIGIN,
        duration: WHAT_CARD_DUR,
        ease: 'power2.out',
      },
      cardsRevealStart,
    );
  });

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const isObjectiveStep = groupIndex === objectiveIndex;
    const textEnterStart = getWhatTextEnterStart(groupIndex, cardsRevealStart);
    const outgoingStart = getWhatOutgoingStart(textEnterStart);

    if (groupIndex === 0) {
      tl.call(
        () => {
          setWhatStackZIndex(textPanes, objectivePane, 0);
        },
        null,
        textEnterStart,
      );

      textPanes.forEach((pane, i) => {
        if (i === objectiveIndex) return;
        addWhatTextEnter(tl, pane, getWhatTextStackSlot(i), textEnterStart, i, 0);
      });
      addWhatTextEnter(
        tl,
        objectivePane,
        getWhatTextStackSlot(objectiveIndex),
        textEnterStart,
        objectiveIndex,
        0,
        { reveal: false },
      );
      tl.call(() => hideStackFinalePane(objectivePane), null, textEnterStart);
    } else {
      const outgoing = textPanes[groupIndex - 1];
      const rising = isObjectiveStep ? [objectivePane] : textPanes.slice(groupIndex);

      tl.call(
        () => {
          setWhatStackZIndex(textPanes, objectivePane, groupIndex, groupIndex - 1);
        },
        null,
        textEnterStart,
      );

      animateWhatCardsToFan(tl, cards, groupIndex, textEnterStart);

      if (isObjectiveStep) {
        const frontSlot = getWhatTextStackSlot(0);
        const riseFrom = getStackFinaleRiseFromSlot(frontSlot);
        tl.set(
          objectivePane,
          {
            xPercent: -50,
            yPercent: 0,
            x: riseFrom.x,
            y: riseFrom.y,
            rotation: riseFrom.rotate,
          },
          textEnterStart,
        );
        tl.to(
          objectivePane,
          animateWhatTextMove(frontSlot, { duration: WHAT_TEXT_SCROLL_DUR, ease: 'none' }),
          textEnterStart,
        );
      } else {
        rising.forEach((el, i) => {
          tl.to(
            el,
            animateWhatTextMove(getWhatTextStackSlot(i), {
              duration: WHAT_TEXT_SCROLL_DUR,
              ease: 'none',
            }),
            textEnterStart,
          );
        });
      }

      if (isObjectiveStep) {
        tl.to(
          objectivePane,
          {
            autoAlpha: 1,
            visibility: 'visible',
            duration: WHAT_TEXT_SCROLL_DUR,
            ease: 'none',
          },
          textEnterStart,
        );
        tl.call(
          () => {
            setWhatStackZIndex(textPanes, objectivePane, objectiveIndex);
          },
          null,
          textEnterStart,
        );
      } else {
        setStackTextOpacities(tl, textPanes, groupIndex, textEnterStart, {
          keepOutgoingIndex: groupIndex - 1,
          hidePane: objectivePane,
          hidePaneIndex: objectiveIndex,
        });
      }

      if (outgoing) {
        tl.to(
          outgoing,
          {
            ...animateWhatTextExit(),
            opacity: 0,
            ease: 'none',
          },
          outgoingStart,
        );
      }
    }
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

const DESAFIO_CARD_FAN_BY_GROUP = [
  null,
  [
    { x: -10, y: -16, rotate: -11 },
    { x: 8, y: 0, rotate: 10 },
    { x: -6, y: 14, rotate: -8 },
  ],
  [
    { x: -18, y: -28, rotate: -18 },
    { x: 14, y: 0, rotate: 16 },
    { x: -10, y: 24, rotate: -12 },
  ],
  [
    { x: -24, y: -36, rotate: -24 },
    { x: 18, y: 0, rotate: 20 },
    { x: -14, y: 32, rotate: -16 },
  ],
];

const DESAFIO_CARD_FAN_BY_GROUP_MOBILE = [
  null,
  [
    { x: -6, y: -10, rotate: -8 },
    { x: 5, y: 0, rotate: 7 },
    { x: -4, y: 9, rotate: -6 },
  ],
  [
    { x: -12, y: -18, rotate: -14 },
    { x: 9, y: 0, rotate: 12 },
    { x: -7, y: 16, rotate: -9 },
  ],
  [
    { x: -16, y: -24, rotate: -18 },
    { x: 12, y: 0, rotate: 15 },
    { x: -10, y: 22, rotate: -12 },
  ],
];

const DESAFIO_GROUP_STEP = 1.35;
const DESAFIO_CARD_ENTER_X = -300;
const DESAFIO_CARD_ENTER_Y = -140;
const DESAFIO_CARD_INSET = 0.08;
const DESAFIO_CARD_DUR = 0.48;
const DESAFIO_CARD_FAN_DUR = 0.42;
const DESAFIO_CARD_FAN_ORIGIN = '50% 88%';
const DESAFIO_TEXT_INSET = 0.1;
const DESAFIO_TEXT_SCROLL_DUR = 0.58;
const DESAFIO_TEXT_FADE_SCROLL_DUR = 0.2;
const DESAFIO_TEXT_ENTER_DUR = DESAFIO_TEXT_SCROLL_DUR;
const DESAFIO_TEXT_ALPHA_DUR = DESAFIO_TEXT_FADE_SCROLL_DUR;
const DESAFIO_TEXT_ENTER_EASE = 'none';
const DESAFIO_TEXT_EXIT_EASE = 'none';
const DESAFIO_TEXT_HOLD = STACK_TEXT_HOLD;
const DESAFIO_TEXT_ENTER_X = -280;
const DESAFIO_TEXT_ENTER_Y = -112;
const DESAFIO_TEXT_EXIT_X = 280;
const DESAFIO_STACK_SLOTS = [
  { x: 0, y: 0, rotate: 0 },
  { x: 0, y: 30, rotate: 10 },
  { x: 0, y: 58, rotate: -14 },
  { x: 0, y: 86, rotate: 12 },
];
const DESAFIO_TITLE_DROP_OFFSET = 0;
const DESAFIO_TITLE_BOUNCE_EASE = 'back.out(1.35)';

function getDesafioCardStack() {
  return mobileParallaxMq.matches ? DESAFIO_CARD_STACK_MOBILE : DESAFIO_CARD_STACK;
}

function getDesafioCardFanByGroup() {
  return mobileParallaxMq.matches ? DESAFIO_CARD_FAN_BY_GROUP_MOBILE : DESAFIO_CARD_FAN_BY_GROUP;
}

function getDesafioCardSlot(cardIndex, groupIndex) {
  const base = getDesafioCardStack()[cardIndex] ?? { x: 0, y: 0, rotate: 0 };
  const fan = getDesafioCardFanByGroup()[groupIndex]?.[cardIndex];
  if (!fan) return base;
  return {
    x: base.x + fan.x,
    y: base.y + fan.y,
    rotate: base.rotate + fan.rotate,
  };
}

function getDesafioStackSlot(index) {
  return DESAFIO_STACK_SLOTS[index] ?? DESAFIO_STACK_SLOTS[0];
}

function getDesafioTextEnterOffset() {
  return mobileParallaxMq.matches
    ? { x: 0, y: DESAFIO_TEXT_ENTER_Y }
    : { x: DESAFIO_TEXT_ENTER_X, y: 0 };
}

function getDesafioSegmentEnd(groupIndex) {
  return (groupIndex + 1) * DESAFIO_GROUP_STEP;
}

function getDesafioOutgoingStart(textEnterStart) {
  return textEnterStart + DESAFIO_TEXT_SCROLL_DUR;
}

function setDesafioTextTransform(pane, slot, { alpha = 1, enter = false } = {}) {
  const enterOffset = getDesafioTextEnterOffset();
  gsap.set(pane, {
    xPercent: -50,
    yPercent: 0,
    x: (slot?.x ?? 0) + (enter ? enterOffset.x : 0),
    y: (slot?.y ?? 0) + (enter ? enterOffset.y : 0),
    rotation: slot?.rotate ?? 0,
    autoAlpha: alpha,
    visibility: 'visible',
    transformOrigin: '50% 0',
  });
}

function animateDesafioTextMove(slot, { duration = DESAFIO_TEXT_ENTER_DUR, ease = DESAFIO_TEXT_ENTER_EASE } = {}) {
  return {
    xPercent: -50,
    yPercent: 0,
    x: slot.x,
    y: slot.y,
    rotation: slot.rotate,
    duration,
    ease,
  };
}

function addDesafioTextEnter(
  tl,
  pane,
  slot,
  startTime,
  paneIndex = 0,
  activeIndex = 0,
  { reveal = true } = {},
) {
  if (reveal) {
    tl.set(
      pane,
      {
        autoAlpha: 1,
        opacity: paneIndex === activeIndex ? 1 : STACK_TEXT_BACK_OPACITY,
        visibility: 'visible',
      },
      startTime,
    );
  } else {
    tl.set(pane, { autoAlpha: 1, opacity: 0, visibility: 'visible' }, startTime);
  }
  tl.to(
    pane,
    {
      xPercent: -50,
      yPercent: 0,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotate,
      duration: DESAFIO_TEXT_SCROLL_DUR,
      ease: 'none',
    },
    startTime,
  );
}

function getDesafioTextEnterStart(groupIndex, cardsRevealStart) {
  if (groupIndex === 0) return cardsRevealStart;
  return groupIndex * DESAFIO_GROUP_STEP + DESAFIO_TEXT_INSET;
}

function animateDesafioTextFadeOut() {
  return {
    autoAlpha: 0,
    duration: DESAFIO_TEXT_ALPHA_DUR,
    ease: DESAFIO_TEXT_EXIT_EASE,
  };
}

function animateDesafioTextExit() {
  return {
    xPercent: -50,
    yPercent: 0,
    x: DESAFIO_TEXT_EXIT_X,
    y: 0,
    ...animateDesafioTextFadeOut(),
  };
}

function setDesafioStackZIndex(textPanes, finale, activeIndex, outgoingIndex = null) {
  const topZ = 33;
  const frontZ = 30;
  const backZ = 11;
  const finaleIndex = textPanes.length;

  const resolveZ = (stackIndex) => {
    if (outgoingIndex !== null && outgoingIndex === stackIndex) return topZ;
    if (activeIndex >= finaleIndex) {
      return stackIndex === finaleIndex ? frontZ : backZ + stackIndex;
    }
    if (stackIndex < activeIndex) return backZ + stackIndex;
    return frontZ - (stackIndex - activeIndex);
  };

  textPanes.forEach((pane, i) => {
    gsap.set(pane, { zIndex: resolveZ(i) });
  });

  if (finale) {
    gsap.set(finale, { zIndex: resolveZ(finaleIndex) });
  }
}

function setDesafioActiveTextPane(textPanes, index, finale = null) {
  if (finale) {
    gsap.set(finale, { autoAlpha: 0, opacity: 0, visibility: 'hidden' });
    finale.classList.remove('is-active');
  }
  syncStackTextActiveState(textPanes, { finale });
}

function setDesafioFinaleActive(finale, textPanes) {
  textPanes.forEach((pane) => {
    if (getStackPaneAutoAlpha(pane) > 0.01) {
      gsap.set(pane, { opacity: STACK_TEXT_BACK_OPACITY });
    }
  });
  syncStackTextActiveState(textPanes, { finale });
}

function animateDesafioCardsToFan(tl, cards, groupIndex, startTime) {
  cards.forEach((card, i) => {
    const slot = getDesafioCardSlot(i, groupIndex);
    tl.to(
      card,
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        rotation: slot.rotate,
        transformOrigin: DESAFIO_CARD_FAN_ORIGIN,
        duration: DESAFIO_CARD_FAN_DUR,
        ease: 'power2.out',
      },
      startTime,
    );
  });
}

function setDesafioCardTransform(card, slot, { alpha = 1, enter = false } = {}) {
  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: (slot?.x ?? 0) + (enter ? DESAFIO_CARD_ENTER_X : 0),
    y: (slot?.y ?? 0) + (enter ? DESAFIO_CARD_ENTER_Y : 0),
    rotation: (slot?.rotate ?? 0) + (enter ? -14 : 0),
    autoAlpha: alpha,
    transformOrigin: DESAFIO_CARD_FAN_ORIGIN,
  });
}

function resetFlowParallaxState(flowId, {
  titleSelector,
  titleInitial,
  textPanes,
  textStack,
  setTextTransform,
  setActiveTextPane,
  cards,
  getCardSlot,
  setCardTransform,
  finale = null,
  finaleSlot = null,
  setStackZIndex = null,
}) {
  const flow = document.getElementById(flowId);
  if (!flow) return;

  const title = titleSelector ? flow.querySelector(titleSelector) : null;
  if (title && titleInitial) gsap.set(title, titleInitial);

  if (textPanes?.length) {
    setActiveTextPane(textPanes, 0, finale);
    textPanes.forEach((pane, i) => {
      setTextTransform(pane, textStack[i] ?? textStack[0], { alpha: 0, enter: true });
      gsap.set(pane, { opacity: 1 });
    });
  }

  if (finale && finaleSlot) {
    setTextTransform(finale, finaleSlot, { alpha: 0, enter: true });
    gsap.set(finale, { opacity: 0, visibility: 'hidden' });
    finale.classList.remove('is-active');
  }

  if (setStackZIndex) setStackZIndex(textPanes, finale, 0);

  cards?.forEach((card, i) => {
    setCardTransform(card, getCardSlot(i, 0), { alpha: 0, enter: true });
  });
}

function resetAnimationsAfterMenuJump() {
  if (whatParallaxTimeline) whatParallaxTimeline.progress(0);
  if (desafioParallaxTimeline) desafioParallaxTimeline.progress(0);

  if (disenoRevealTimeline) {
    disenoRevealTimeline.progress(0);
    const how = document.getElementById('how');
    const title = how?.querySelector('h2');
    const cards = how ? [...how.querySelectorAll('.cards-grid .flip-card')] : [];
    if (title) gsap.set(title, { autoAlpha: 0, x: DISENO_TITLE_ENTER_X });
    if (cards.length) gsap.set(cards, { autoAlpha: 0, y: DISENO_CARD_ENTER_Y });
  }

  const whatFlow = document.getElementById('whatFlow');
  if (whatFlow) {
    const whatTextPanes = [...whatFlow.querySelectorAll('.what-flow__text-pane')];
    const whatObjective = getWhatObjectivePane(whatTextPanes);
    resetFlowParallaxState('whatFlow', {
      titleSelector: '.intro__title',
      titleInitial: { autoAlpha: 0, y: WHAT_TITLE_ENTER_Y },
      textPanes: whatTextPanes,
      textStack: whatTextPanes.map((_, i) => getWhatTextStackSlot(i)),
      setTextTransform: setWhatTextTransform,
      setActiveTextPane: setWhatActiveTextPane,
      cards: [...whatFlow.querySelectorAll('.what-flow__card')],
      getCardSlot: getWhatCardSlot,
      setCardTransform: setWhatCardTransform,
      finale: whatObjective,
      finaleSlot: getWhatTextStackSlot(getWhatObjectiveIndex(whatTextPanes)),
      setStackZIndex: setWhatStackZIndex,
    });
  }
  if (desafioFlow) {
    const textPanes = [...desafioFlow.querySelectorAll('.desafio-flow__text-pane')];
    const finale = desafioFlow.querySelector('.desafio-flow__finale');
    resetFlowParallaxState('desafioFlow', {
      titleSelector: '.desafio-flow__title',
      titleInitial: { y: -DESAFIO_TITLE_DROP_OFFSET, autoAlpha: 0 },
      textPanes,
      textStack: textPanes.map((_, i) => getDesafioStackSlot(i)),
      setTextTransform: setDesafioTextTransform,
      setActiveTextPane: setDesafioActiveTextPane,
      cards: [...desafioFlow.querySelectorAll('.desafio-flow__card')],
      getCardSlot: getDesafioCardSlot,
      setCardTransform: setDesafioCardTransform,
      finale,
      finaleSlot: getDesafioStackSlot(textPanes.length),
      setStackZIndex: setDesafioStackZIndex,
    });
  }
}

function playWhatMenuIntro() {
  const flow = document.getElementById('whatFlow');
  if (!flow || prefersReducedMotion.matches) return;

  const title = flow.querySelector('.intro__title');
  const cards = [...flow.querySelectorAll('.what-flow__card')];
  const textPanes = [...flow.querySelectorAll('.what-flow__text-pane')];
  const objectivePane = getWhatObjectivePane(textPanes);
  const objectiveIndex = getWhatObjectiveIndex(textPanes);

  if (title) {
    gsap.fromTo(
      title,
      { autoAlpha: 0, y: WHAT_TITLE_ENTER_Y },
      { autoAlpha: 1, y: 0, duration: 0.85, ease: WHAT_TITLE_EASE },
    );
  }

  cards.forEach((card, i) => {
    const slot = getWhatCardSlot(i, 0);
    gsap.fromTo(
      card,
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x + WHAT_CARD_ENTER_X,
        y: slot.y,
        rotation: slot.rotate + 14,
        autoAlpha: 0,
        transformOrigin: WHAT_CARD_FAN_ORIGIN,
      },
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        rotation: slot.rotate,
        autoAlpha: 1,
        duration: WHAT_CARD_DUR,
        ease: 'power2.out',
        delay: 0.1 + i * 0.035,
      },
    );
  });

  textPanes.forEach((pane, i) => {
    if (i === objectiveIndex) return;
    setWhatTextTransform(pane, getWhatTextStackSlot(i), { alpha: 0, enter: true });
  });
  setWhatTextTransform(objectivePane, getWhatTextStackSlot(objectiveIndex), { alpha: 0, enter: true });
  gsap.set(objectivePane, { visibility: 'hidden' });
  setWhatStackZIndex(textPanes, objectivePane, 0);
  setWhatActiveTextPane(textPanes);

  if (whatParallaxTimeline) {
    const cardEnd = WHAT_CARD_INSET + WHAT_CARD_DUR;
    whatParallaxTimeline.progress(cardEnd / whatParallaxTimeline.totalDuration());
  }
}

function playDesafioMenuIntro() {
  const flow = document.getElementById('desafioFlow');
  if (!flow || prefersReducedMotion.matches) return;

  const title = flow.querySelector('.desafio-flow__title');
  const cards = [...flow.querySelectorAll('.desafio-flow__card')];
  const textPanes = [...flow.querySelectorAll('.desafio-flow__text-pane')];
  const finale = flow.querySelector('.desafio-flow__finale');

  if (title) {
    gsap.fromTo(
      title,
      { y: -DESAFIO_TITLE_DROP_OFFSET, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.65, ease: DESAFIO_TITLE_BOUNCE_EASE },
    );
  }

  cards.forEach((card, i) => {
    const slot = getDesafioCardSlot(i, 0);
    gsap.fromTo(
      card,
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x + DESAFIO_CARD_ENTER_X,
        y: slot.y + DESAFIO_CARD_ENTER_Y,
        rotation: slot.rotate - 14,
        autoAlpha: 0,
        transformOrigin: DESAFIO_CARD_FAN_ORIGIN,
      },
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        rotation: slot.rotate,
        autoAlpha: 1,
        duration: DESAFIO_CARD_DUR,
        ease: 'power2.out',
        delay: 0.1 + i * 0.035,
      },
    );
  });

  textPanes.forEach((pane, i) => {
    setDesafioTextTransform(pane, getDesafioStackSlot(i), { alpha: 0, enter: true });
  });
  if (finale) {
    setDesafioTextTransform(finale, getDesafioStackSlot(textPanes.length), { alpha: 0, enter: true });
  }
  setDesafioActiveTextPane(textPanes, 0, finale);

  if (desafioParallaxTimeline) {
    const cardEnd = DESAFIO_CARD_INSET + DESAFIO_CARD_DUR;
    desafioParallaxTimeline.progress(cardEnd / desafioParallaxTimeline.totalDuration());
  }
}

function playDisenoMenuIntro() {
  if (prefersReducedMotion.matches) return;

  const how = document.getElementById('how');
  const title = how?.querySelector('h2');
  const cards = how ? [...how.querySelectorAll('.cards-grid .flip-card')] : [];
  if (!title) return;

  gsap.fromTo(
    title,
    { autoAlpha: 0, x: DISENO_TITLE_ENTER_X },
    { autoAlpha: 1, x: 0, duration: 0.88, ease: DISENO_TITLE_BOUNCE_EASE },
  );

  if (cards.length) {
    gsap.fromTo(
      cards,
      { autoAlpha: 0, y: DISENO_CARD_ENTER_Y },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.72,
        ease: DISENO_CARD_BOUNCE_EASE,
        stagger: 0.14,
        delay: 0.35,
      },
    );
  }

  if (disenoRevealTimeline) {
    disenoRevealTimeline.progress(1);
  }
}

function playMenuSectionIntro(hash) {
  if (prefersReducedMotion.matches) return;

  switch (hash) {
    case '#que-es':
      playWhatMenuIntro();
      break;
    case '#desafio':
      playDesafioMenuIntro();
      break;
    case '#diseno':
      playDisenoMenuIntro();
      break;
    default:
      break;
  }
}

function initDesafioParallax() {
  const flow = document.getElementById('desafioFlow');
  if (!flow) return;

  const pin = flow.querySelector('.desafio-flow__pin');
  const title = flow.querySelector('.desafio-flow__title');
  const cards = [...flow.querySelectorAll('.desafio-flow__card')];
  const textPanes = [...flow.querySelectorAll('.desafio-flow__text-pane')];
  const finale = flow.querySelector('.desafio-flow__finale');

  if (!pin || !title || !cards.length || !textPanes.length || !finale) return;

  const showReduced = () => {
    gsap.set(title, { clearProps: 'all', opacity: 1, y: 0 });
    textPanes.forEach((pane, i) => {
      setDesafioTextTransform(pane, getDesafioStackSlot(i), { alpha: 1 });
      pane.classList.toggle('is-active', i === 0);
    });
    setDesafioTextTransform(finale, getDesafioStackSlot(textPanes.length), { alpha: 1 });
    setDesafioStackZIndex(textPanes, finale, 0);
    cards.forEach((card, i) => {
      setDesafioCardTransform(card, getDesafioCardSlot(i, 0), { alpha: 1 });
    });
  };

  if (prefersReducedMotion.matches) {
    showReduced();
    gsap.set(finale, { autoAlpha: 1 });
    return;
  }

  gsap.set(title, { y: -DESAFIO_TITLE_DROP_OFFSET, autoAlpha: 0 });
  setDesafioActiveTextPane(textPanes, 0, finale);
  textPanes.forEach((pane, i) => {
    setDesafioTextTransform(pane, getDesafioStackSlot(i), { alpha: 0, enter: true });
  });
  setDesafioTextTransform(finale, getDesafioStackSlot(textPanes.length), { alpha: 0, enter: true });
  gsap.set(finale, { visibility: 'hidden' });
  setDesafioStackZIndex(textPanes, finale, 0);
  cards.forEach((card, i) => {
    setDesafioCardTransform(card, getDesafioCardSlot(i, 0), { alpha: 0, enter: true });
  });

  const snapSteps = textPanes.length + 1;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: flow,
      start: 'top top',
      end: () => `+=${Math.round(snapSteps * DESAFIO_GROUP_STEP * 100)}%`,
      pin: pin,
      pinSpacing: true,
      scrub: SCROLL_SCRUB_SMOOTH,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: () => syncStackTextActiveState(textPanes, { finale }),
    },
  });
  desafioParallaxTimeline = tl;

  tl.to(
    title,
    {
      y: 0,
      duration: DESAFIO_GROUP_STEP * 0.45,
      ease: DESAFIO_TITLE_BOUNCE_EASE,
    },
    0,
  );

  const cardsRevealStart = DESAFIO_CARD_INSET;
  cards.forEach((card, i) => {
    const slot = getDesafioCardSlot(i, 0);

    tl.set(card, { autoAlpha: 1 }, cardsRevealStart);
    tl.to(
      card,
      {
        xPercent: -50,
        yPercent: -50,
        x: slot.x,
        y: slot.y,
        rotation: slot.rotate,
        transformOrigin: DESAFIO_CARD_FAN_ORIGIN,
        duration: DESAFIO_CARD_DUR,
        ease: 'power2.out',
      },
      cardsRevealStart,
    );
  });

  for (let groupIndex = 0; groupIndex <= textPanes.length; groupIndex += 1) {
    const isFinaleStep = groupIndex === textPanes.length;
    const textEnterStart = getDesafioTextEnterStart(groupIndex, cardsRevealStart);
    const outgoingStart = getDesafioOutgoingStart(textEnterStart);

    if (groupIndex === 0) {
      tl.call(
        () => {
          setDesafioStackZIndex(textPanes, finale, 0);
        },
        null,
        textEnterStart,
      );

      textPanes.forEach((pane, i) => {
        addDesafioTextEnter(tl, pane, getDesafioStackSlot(i), textEnterStart, i, 0);
      });
      addDesafioTextEnter(
        tl,
        finale,
        getDesafioStackSlot(textPanes.length),
        textEnterStart,
        textPanes.length,
        0,
        { reveal: false },
      );
      tl.call(() => hideStackFinalePane(finale), null, textEnterStart);
    } else {
      const outgoing = textPanes[groupIndex - 1];
      const rising = isFinaleStep
        ? [finale]
        : [...textPanes.slice(groupIndex), finale];

      tl.call(
        () => {
          setDesafioStackZIndex(textPanes, finale, groupIndex, groupIndex - 1);
        },
        null,
        textEnterStart,
      );

      animateDesafioCardsToFan(tl, cards, groupIndex, textEnterStart);

      if (isFinaleStep) {
        const frontSlot = getDesafioStackSlot(0);
        const riseFrom = getStackFinaleRiseFromSlot(frontSlot);
        tl.set(
          finale,
          {
            xPercent: -50,
            yPercent: 0,
            x: riseFrom.x,
            y: riseFrom.y,
            rotation: riseFrom.rotate,
          },
          textEnterStart,
        );
        tl.to(
          finale,
          animateDesafioTextMove(frontSlot, {
            duration: DESAFIO_TEXT_SCROLL_DUR,
            ease: 'none',
          }),
          textEnterStart,
        );
      } else {
        rising.forEach((el, i) => {
          tl.to(
            el,
            animateDesafioTextMove(getDesafioStackSlot(i), {
              duration: DESAFIO_TEXT_SCROLL_DUR,
              ease: 'none',
            }),
            textEnterStart,
          );
        });
      }

      if (isFinaleStep) {
        tl.to(
          finale,
          {
            autoAlpha: 1,
            visibility: 'visible',
            duration: DESAFIO_TEXT_SCROLL_DUR,
            ease: 'none',
          },
          textEnterStart,
        );
        tl.call(
          () => {
            setDesafioStackZIndex(textPanes, finale, textPanes.length);
          },
          null,
          textEnterStart,
        );
      } else {
        setStackTextOpacities(tl, textPanes, groupIndex, textEnterStart, {
          keepOutgoingIndex: groupIndex - 1,
        });
        tl.call(() => hideStackFinalePane(finale), null, textEnterStart);
      }

      if (outgoing) {
        tl.to(
          outgoing,
          {
            ...animateDesafioTextExit(),
            opacity: 0,
            ease: 'none',
          },
          outgoingStart,
        );
      }
    }
  }

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
      start: 'top top',
      end: 'top 42%',
      scrub: 0.65,
      invalidateOnRefresh: true,
    },
  });
  disenoRevealTimeline = tl;

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
