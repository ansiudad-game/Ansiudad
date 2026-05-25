import { preloadImages } from '/js/main-utils.js';
import { initWhatParallax } from '/js/what-parallax.js';
import { initDesafioParallax } from '/js/desafio-parallax.js';
import { StackMotionEffect as StackMotionEffect1 } from '/js/effect-1/stackMotionEffect1.js';
import { StackMotionEffect as StackMotionEffect2 } from '/js/effect-2/stackMotionEffect2.js';
import { StackMotionEffect as StackMotionEffect3 } from '/js/effect-3/stackMotionEffect3.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import Experience from '/Experience/Experience.js'
let experience = null
if (window.location.pathname.includes('juego') && !experience) {
  experience = new Experience(document.querySelector('canvas.webgl'))
}

if (experience && !window.location.pathname.includes('juego')) {
  experience.destroy();
}

/**
 * BACKGROUND
 */
const scene = document.getElementById('scene');
const mouse = { x: 0, y: 0 };
const current = { x: 0, y: 0 };

const layers = [
    { el: document.getElementById('l1'), depth: 0.015 }, // más lejano
    { el: document.getElementById('l2'), depth: 0.032 },
    { el: document.getElementById('l3'), depth: 0.058 },
    { el: document.getElementById('l4'), depth: 0.088 }, // más cercano
].filter((x) => x.el);

const mobileParallaxMq = window.matchMedia('(max-width: 900px)');

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

function animate() {
    current.x += (mouse.x - current.x) * 0.07; // lerp → suavizado
    current.y += (mouse.y - current.y) * 0.07;

    layers.forEach(({ el, depth }) => {
        const { bx, by } = getBase(el);
        const x = bx + current.x * depth;
        const y = by + current.y * depth;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    requestAnimationFrame(animate);
}

if (scene && layers.length) animate();
//Cartas 
gsap.registerPlugin(ScrollTrigger);

const initHomeSloganReveal = () => {
  const slogan = document.querySelector('.slogan-container');
  const home = document.getElementById('home');
  if (!slogan || !home) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

const init = () => {
  initWhatParallax();
  initDesafioParallax();

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
};


preloadImages('.card__img').then(() => {
  document.body.classList.remove('loading');
  init();
});

if ( !window.location.pathname.includes('juego') ) {
  // Gallery

  const galleryImages = document.querySelectorAll('.gallery img');
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenImage = document.getElementById('fullscreenImage');

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

  // Loading video
  document.addEventListener("DOMContentLoaded", function () {
    const loader = document.getElementById("loader");
    const video = document.getElementById("backgroundVideo");


  // Oculta el loader cuando el video está listo para reproducirse
    video.addEventListener("loadeddata", () => {
      loader.classList.add("hidden");
    });
  });
}