import gsap from 'gsap';

const toggleButtonCheckbox = document.querySelector('.menu__toggle-checkbox');
const menu = document.querySelector('.menu');
const menuPanel = document.querySelector('.menu__panel');
const menuBottom = document.querySelector('.menu__bottom');

const PANEL_EXPANDED = 'menu__panel--expanded';

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

/** Centro del círculo en el borde derecho del panel (apertura hacia la izquierda). */
function pivotRightCenter(panelEl) {
  const w = panelEl.offsetWidth;
  const h = panelEl.offsetHeight;
  return { x: w, y: h / 2 };
}

function openMenu() {
  if (!menuPanel || !menuBottom) return;
  if (menuPanel.classList.contains(PANEL_EXPANDED)) return;

  gsap.killTweensOf([menuPanel, menuBottom]);

  menuPanel.classList.add(PANEL_EXPANDED);
  menuBottom.classList.add('menu__bottom--visible');
  gsap.set(menuBottom, { opacity: 0 });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!toggleButtonCheckbox?.checked) {
        menuPanel.classList.remove(PANEL_EXPANDED);
        menuBottom.classList.remove('menu__bottom--visible');
        gsap.set(menuBottom, { clearProps: 'opacity' });
        return;
      }

      const { x, y } = pivotRightCenter(menuPanel);
      const r = clipRadiusPx(menuPanel, x, y);

      gsap.set(menuPanel, { clipPath: `circle(0px at ${x}px ${y}px)` });

      gsap
        .timeline({ defaults: { ease: 'power2.out' } })
        .to(menuPanel, {
          clipPath: `circle(${r}px at ${x}px ${y}px)`,
          duration: 0.48,
          ease: 'power2.out',
        })
        .to(
          menuBottom,
          { opacity: 1, duration: 0.28, ease: 'power1.out' },
          '-=0.32',
        );
    });
  });
}

function closeMenu() {
  if (!menuPanel || !menuBottom) return;
  if (!menuPanel.classList.contains(PANEL_EXPANDED)) return;

  gsap.killTweensOf([menuPanel, menuBottom]);

  const { x, y } = pivotRightCenter(menuPanel);
  const r = clipRadiusPx(menuPanel, x, y);

  gsap.set(menuPanel, { clipPath: `circle(${r}px at ${x}px ${y}px)` });

  gsap
    .timeline({
      onComplete: () => { 
        menuPanel.classList.remove(PANEL_EXPANDED);
        menuBottom.classList.remove('menu__bottom--visible');
        gsap.set(menuPanel, { clearProps: 'clipPath' });
        gsap.set(menuBottom, { clearProps: 'opacity' });
      },
    })
    .to(menuBottom, { opacity: 0, duration: 0.18, ease: 'power1.in' })
    .to(
      menuPanel,
      {
        clipPath: `circle(0px at ${x}px ${y}px)`,
        duration: 0.42,
        ease: 'power3.in',
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
