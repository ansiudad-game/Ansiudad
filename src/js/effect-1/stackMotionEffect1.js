import { throttle } from '/js/main-utils.js';
import gsap from 'gsap';

// Keeps track of the window's size for responsive adjustments.
let winsize = {width: window.innerWidth, height: window.innerHeight};

export class StackMotionEffect {
  constructor(stackEl) {
    // Validates the input element to ensure it's an HTML element.
    if (!stackEl || !(stackEl instanceof HTMLElement)) {
      throw new Error('Invalid element provided.');
    }

    this.wrapElement = stackEl;
    this.contentElement = this.wrapElement.querySelector('.content');
    this.imageElements = this.contentElement.querySelectorAll('.card');
    this.imagesTotal = this.imageElements.length;

    // Calls the method to set up the initial effect.
    this.initializeEffect(stackEl);
  }
  
  // Sets up the initial effect on the provided element.
  initializeEffect(element) {
    // Scroll effect.
    this.scroll();
    
    // Throttles resize event to optimize performance and re-calculate sizes and effect on resize.
    const throttledResize = throttle(() => {
      winsize = { width: window.innerWidth, height: window.innerHeight };
      this.scroll();
    }, 100);
    window.addEventListener('resize', throttledResize);
  }

  // Defines the scroll effect logic for the stack.
  scroll() {
    if (!this.contentElement) return;

    this.contentElement.style.transform =
      'rotate3d(1, 0, 0, -25deg) rotate3d(0, 1, 0, 50deg) rotate3d(0, 0, 1, 25deg)';

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
          z: (pos) => -2.65 * winsize.width - pos * 0.03 * winsize.width,
        },
        {
          z: (pos) => 1.4 * winsize.width + (this.imagesTotal - pos - 1) * 0.03 * winsize.width,
        },
        0,
      )
      .fromTo(
        this.imageElements,
        {
          rotationZ: -220,
        },
        {
          rotationY: -30,
          rotationZ: 120,
          stagger: 0.005,
        },
        0,
      );
  }
}
