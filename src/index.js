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
const WHAT_STEP = 0.42;
const WHAT_CARD_ENTER_X = 280;

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
    gsap.set(textPanes, { clearProps: 'all', visibility: 'visible', opacity: 1, xPercent: 0 });
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
    setWhatCardTransform(card, WHAT_CARD_STACK[i], { alpha: 0, enter: true });
  });

  const totalSteps = cards.length;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: flow,
      start: 'top top',
      end: () => `+=${Math.round(totalSteps * WHAT_STEP * 100)}%`,
      pin: pin,
      pinSpacing: true,
      scrub: 0.85,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  cards.forEach((card, index) => {
    const slot = WHAT_CARD_STACK[index] ?? { x: 0, y: 0, rotate: 0 };
    const textIndex = Math.floor(index / WHAT_CARDS_PER_TEXT);
    const t = index * WHAT_STEP;

    if (index % WHAT_CARDS_PER_TEXT === 0 && textIndex > 0) {
      const prevPane = textPanes[textIndex - 1];
      const nextPane = textPanes[textIndex];

      tl.to(
        prevPane,
        { xPercent: -35, autoAlpha: 0, duration: WHAT_STEP * 0.35, ease: 'power2.in' },
        t,
      );

      tl.fromTo(
        nextPane,
        { xPercent: 50, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: WHAT_STEP * 0.4, ease: 'power2.out' },
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
        duration: WHAT_STEP * 0.55,
        ease: 'power2.out',
      },
      t + WHAT_STEP * 0.12,
    );

    tl.to({}, { duration: WHAT_STEP * 0.2 });
  });
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
const DESAFIO_TITLE_EXTRA_DROP = 28;

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

function getDesafioTitleEndY(header, title) {
  return Math.max(0, header.offsetHeight - title.offsetHeight + DESAFIO_TITLE_EXTRA_DROP);
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
    gsap.set(title, { clearProps: 'all', opacity: 1, y: getDesafioTitleEndY(header, title) });
    gsap.set(textPanes, { clearProps: 'all', visibility: 'hidden', opacity: 0 });
    gsap.set(finale, { clearProps: 'all', opacity: 1, visibility: 'visible', xPercent: 0 });
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

  gsap.set(title, { y: 0, autoAlpha: 0 });
  textPanes.forEach((pane, i) => pane.classList.toggle('is-active', i === 0));
  gsap.set(textPanes, { xPercent: -55, autoAlpha: 0, visibility: 'visible' });
  gsap.set(textPanes[0], { xPercent: 0, autoAlpha: 1 });
  cards.forEach((card, i) => {
    setDesafioCardTransform(card, getDesafioCardStack()[i], { alpha: 0, enter: true });
  });
  gsap.set(finale, { autoAlpha: 0, xPercent: -45, visibility: 'visible' });

  const textCount = textPanes.length;
  const totalSteps = textCount + 1.15;
  const endDistance = () => `+=${Math.round(totalSteps * DESAFIO_STEP * 100)}%`;

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
      y: () => getDesafioTitleEndY(header, title),
      duration: DESAFIO_STEP * 0.4,
      ease: 'elastic.out(1, 0.55)',
    },
    0,
  );

  cards.forEach((card, index) => {
    const slot = getDesafioCardStack()[index] ?? { x: 0, y: 0, rotate: 0 };
    const t = index * DESAFIO_STEP;

    if (index > 0) {
      const prevPane = textPanes[index - 1];
      const nextPane = textPanes[index];

      tl.to(
        prevPane,
        { xPercent: 35, autoAlpha: 0, duration: DESAFIO_STEP * 0.3, ease: 'power2.in' },
        t,
      );

      tl.fromTo(
        nextPane,
        { xPercent: -50, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: DESAFIO_STEP * 0.36, ease: 'power2.out' },
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
      tl.to({}, { duration: DESAFIO_STEP * 0.1 }, t);
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
      t + DESAFIO_STEP * 0.1,
    );

    tl.to({}, { duration: DESAFIO_STEP * 0.18 });
  });

  const finaleT = textCount * DESAFIO_STEP + DESAFIO_STEP * 0.1;
  const lastPane = textPanes[textCount - 1];

  tl.to(
    lastPane,
    { xPercent: 40, autoAlpha: 0, duration: DESAFIO_STEP * 0.3, ease: 'power2.in' },
    finaleT,
  );

  tl.to(textPanes.slice(0, -1), { autoAlpha: 0, duration: 0.01 }, finaleT);

  tl.fromTo(
    finale,
    { xPercent: -48, autoAlpha: 0 },
    { xPercent: 0, autoAlpha: 1, duration: DESAFIO_STEP * 0.42, ease: 'power2.out' },
    finaleT + 0.04,
  );

  tl.call(
    () => {
      textPanes.forEach((p) => p.classList.remove('is-active'));
    },
    null,
    finaleT + 0.04,
  );

  tl.to({}, { duration: DESAFIO_STEP * 0.8 });

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
   DISEÑO — flip cards
============================================================================= */
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
function trimPageEndSpace() {
  const contacto = document.getElementById('contacto');
  if (!contacto) return;

  const cutLine = contacto.offsetTop + contacto.offsetHeight;

  document.querySelectorAll('.pin-spacer').forEach((spacer) => {
    if (spacer.offsetTop >= cutLine - 4) {
      spacer.remove();
    }
  });

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
  ScrollTrigger.refresh();
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
