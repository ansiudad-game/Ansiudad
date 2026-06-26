import { throttle } from '/js/main-utils.js';
import gsap from 'gsap';

let winsize = {width: window.innerWidth, height: window.innerHeight};

export class StackMotionEffect {
  constructor(stackEl) {
    // Check if the provided element is valid.
    if (!stackEl || !(stackEl instanceof HTMLElement)) {
      throw new Error('Invalid element provided.');
    }

    this.wrapElement = stackEl;
    this.contentElement = this.wrapElement.querySelector('.content');
    this.imageElements = this.contentElement.querySelectorAll('.card');
    this.imagesTotal = this.imageElements.length;

    // Set up the effect for the provided element.
    this.initializeEffect(stackEl);
  }
  
  // Sets up the initial effect on the provided element.
  initializeEffect(element) {
    // Scroll effect.
    this.scroll();

    const throttledResize = throttle(() => {
      winsize = { width: window.innerWidth, height: window.innerHeight };
      this.scroll();
    }, 100);
    window.addEventListener('resize', throttledResize);
  }

  scroll() {
    if (!this.contentElement) return;

    this.contentElement.style.transform =
      'rotate3d(1, 0, 0, 25deg) rotate3d(0, 1, 0, -50deg) rotate3d(0, 0, 1, 25deg)';

    if (this.tl) {
      this.tl.scrollTrigger?.kill();
      this.tl.kill();
    }

    gsap.set(this.contentElement, { autoAlpha: 0 });

    this.tl = gsap.timeline({
      defaults: {
        ease: 'power1',
      },
      scrollTrigger: {
        trigger: this.wrapElement,
        start: 'top 88%',
        end: 'bottom 15%',
        scrub: true,
        invalidateOnRefresh: true,
      },
    })
      .to(this.contentElement, { autoAlpha: 1, duration: 0.12 }, 0)
      .fromTo(
        this.imageElements,
        {
          z: (pos) => -2.5 * winsize.width / 2 - pos * 0.07 * winsize.width,
        },
        {
          z: (pos) => 2.5 * winsize.width + (this.imagesTotal - pos - 1) * 0.07 * winsize.width,
        },
        0,
      )
      .fromTo(
        this.imageElements,
        {
          rotationZ: 10,
          xPercent: 48,
          yPercent: 38,
          scale: 1,
        },
        {
          rotationX: 20,
          rotationZ: 280,
          xPercent: -48,
          yPercent: -100,
          scale: 1,
          stagger: 0.005,
        },
        0,
      );
  }
}
