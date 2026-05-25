import gsap from 'gsap';

const toggleButtonCheckbox = document.querySelector('.menu__toggle-checkbox');
const menu = document.querySelector('.menu');
const menuToggleHost = document.querySelector('.menu__toggle-host');
const menuPanel = document.querySelector('.menu__panel');
const menuBottom = document.querySelector('.menu__bottom');

const PANEL_EXPANDED = 'menu__panel--expanded';
const HOST_EXPANDED = 'menu__toggle-host--expanded';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

/** Origen de la apertura: junto al botón hamburguesa (arriba-derecha del panel). */
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
        .to(
          menuBottom,
          { opacity: 1, duration: 0.28, ease: 'power1.out' },
          '-=0.28',
        );
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

toggleButtonCheckbox?.addEventListener('change', onToggleChange);

function scrollToHashTarget(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

menu?.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link || !menu.contains(link)) return;

  const href = link.getAttribute('href') || '';

  if (href.startsWith('#') && href.length > 1) {
    e.preventDefault();
    if (toggleButtonCheckbox?.checked && toggleButtonCheckbox) {
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
