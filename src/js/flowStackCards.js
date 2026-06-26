import gsap from 'gsap';

export const FLOW_STACK = {
  topOffset: 14,
  topOffsetMobile: 10,
  scaleStep: 0.05,
  minScale: 0.9,
  backOpacity: 0.62,
  minBackOpacity: 0.38,
  opacityStep: 0.1,
  rotateStep: 5,
  enterY: 44,
  enterYMobile: 28,
  enterScale: 0.94,
};

export function getFlowStackContent(pane) {
  return pane.querySelector('.flow-stack-card__content') || pane;
}

export function getFlowStackMetrics({ mobile = false } = {}) {
  return {
    topOffset: mobile ? FLOW_STACK.topOffsetMobile : FLOW_STACK.topOffset,
    scaleStep: FLOW_STACK.scaleStep,
    minScale: FLOW_STACK.minScale,
    backOpacity: FLOW_STACK.backOpacity,
    minBackOpacity: FLOW_STACK.minBackOpacity,
    opacityStep: FLOW_STACK.opacityStep,
    rotateStep: FLOW_STACK.rotateStep,
    enterY: mobile ? FLOW_STACK.enterYMobile : FLOW_STACK.enterY,
    enterScale: FLOW_STACK.enterScale,
  };
}

function getFlowStackScale(depth, metrics) {
  if (depth <= 0) return 1;
  return Math.max(metrics.minScale, 1 - depth * metrics.scaleStep);
}

function getFlowStackOpacity(depth, metrics) {
  if (depth <= 0) return 1;
  return Math.max(
    metrics.minBackOpacity,
    metrics.backOpacity - (depth - 1) * metrics.opacityStep,
  );
}

function getFlowStackRotation(paneIndex, depth, metrics) {
  if (depth <= 0) return 0;
  const sign = paneIndex % 2 === 0 ? 1 : -1;
  return sign * depth * metrics.rotateStep;
}

export function setFlowStackPaneState(
  pane,
  paneIndex,
  activeIndex,
  metrics,
  { hidden = false, entering = false, allowFullStack = false } = {},
) {
  const content = getFlowStackContent(pane);

  if (hidden) {
    gsap.set(pane, { autoAlpha: 0, visibility: 'hidden' });
    gsap.set(content, { scale: metrics.enterScale, transformOrigin: '50% 0' });
    return;
  }

  if (entering) {
    gsap.set(pane, {
      xPercent: -50,
      yPercent: 0,
      x: 0,
      y: metrics.enterY,
      rotation: 0,
      zIndex: 10 + paneIndex,
      autoAlpha: 0,
      visibility: 'visible',
      transformOrigin: '50% 0',
    });
    gsap.set(content, { scale: metrics.enterScale, transformOrigin: '50% 0' });
    return;
  }

  if (paneIndex > activeIndex) {
    gsap.set(pane, { autoAlpha: 0, visibility: 'hidden' });
    gsap.set(content, { scale: metrics.enterScale, transformOrigin: '50% 0' });
    return;
  }

  if (!allowFullStack && paneIndex < activeIndex - 1) {
    gsap.set(pane, { autoAlpha: 0, visibility: 'hidden' });
    return;
  }

  const depth = activeIndex - paneIndex;
  const isFront = depth === 0;
  const y = depth * metrics.topOffset;
  const scale = getFlowStackScale(depth, metrics);
  const rotation = getFlowStackRotation(paneIndex, depth, metrics);
  const opacity = getFlowStackOpacity(depth, metrics);

  gsap.set(pane, {
    xPercent: -50,
    yPercent: 0,
    x: 0,
    y,
    rotation,
    zIndex: 10 + paneIndex,
    autoAlpha: 1,
    opacity,
    visibility: 'visible',
    transformOrigin: '50% 0',
  });
  gsap.set(content, { scale, transformOrigin: '50% 0' });
}

export function animateFlowStackStep(
  tl,
  panes,
  activeIndex,
  startTime,
  duration,
  metrics,
  { hiddenIndices = [] } = {},
) {
  panes.forEach((pane, i) => {
    if (hiddenIndices.includes(i)) {
      tl.set(pane, { autoAlpha: 0, visibility: 'hidden' }, startTime);
      return;
    }

    const content = getFlowStackContent(pane);
    const isInStack = i >= activeIndex - 1 && i <= activeIndex;

    if (!isInStack) {
      tl.set(pane, { autoAlpha: 0, visibility: 'hidden' }, startTime);
      return;
    }

    const depth = activeIndex - i;
    const y = depth * metrics.topOffset;
    const scale = getFlowStackScale(depth, metrics);
    const rotation = getFlowStackRotation(i, depth, metrics);
    const opacity = getFlowStackOpacity(depth, metrics);

    tl.set(pane, { zIndex: 10 + i }, startTime);
    tl.set(
      pane,
      {
        autoAlpha: 1,
        visibility: 'visible',
      },
      startTime,
    );
    tl.to(
      pane,
      {
        xPercent: -50,
        yPercent: 0,
        x: 0,
        y,
        rotation,
        opacity,
        duration,
        ease: 'none',
      },
      startTime,
    );
    tl.to(
      content,
      {
        scale,
        duration,
        ease: 'none',
        transformOrigin: '50% 0',
      },
      startTime,
    );
  });
}

export function animateFlowStackFinaleStep(
  tl,
  finalePane,
  backPanes,
  activeIndex,
  startTime,
  duration,
  metrics,
  { riseFromY = 0 } = {},
) {
  backPanes.forEach((pane) => {
    const content = getFlowStackContent(pane);
    const backIndex = activeIndex - 1;
    const depth = 1;
    const y = depth * metrics.topOffset;
    const scale = getFlowStackScale(depth, metrics);
    const rotation = getFlowStackRotation(backIndex, depth, metrics);
    const opacity = getFlowStackOpacity(depth, metrics);

    tl.set(
      pane,
      {
        zIndex: 10 + backIndex,
        autoAlpha: 1,
        visibility: 'visible',
      },
      startTime,
    );
    tl.to(
      pane,
      {
        xPercent: -50,
        yPercent: 0,
        x: 0,
        y,
        rotation,
        opacity,
        duration,
        ease: 'none',
      },
      startTime,
    );
    tl.to(
      content,
      {
        scale,
        duration,
        ease: 'none',
        transformOrigin: '50% 0',
      },
      startTime,
    );
  });

  const finaleContent = getFlowStackContent(finalePane);
  tl.set(finalePane, { zIndex: 40, visibility: 'visible' }, startTime);
  tl.fromTo(
    finalePane,
    {
      xPercent: -50,
      yPercent: 0,
      x: 0,
      y: metrics.enterY + riseFromY,
      rotation: 0,
      autoAlpha: 0,
      opacity: 0,
    },
    {
      xPercent: -50,
      yPercent: 0,
      x: 0,
      y: 0,
      rotation: 0,
      autoAlpha: 1,
      opacity: 1,
      duration,
      ease: 'none',
    },
    startTime,
  );
  tl.fromTo(
    finaleContent,
    { scale: metrics.enterScale, transformOrigin: '50% 0' },
    { scale: 1, duration, ease: 'none', transformOrigin: '50% 0' },
    startTime,
  );
}

export function animateFlowStackOutgoing(
  tl,
  pane,
  startTime,
  fadeDuration,
  { lift = null, x = null } = {},
) {
  if (!pane) return;

  const vars = {
    opacity: 0,
    autoAlpha: 0,
    duration: fadeDuration,
    ease: 'none',
  };

  if (x != null) {
    vars.x = x;
  } else {
    vars.y = `+=${lift ?? -120}`;
  }

  tl.to(pane, vars, startTime);
  tl.set(pane, { visibility: 'hidden' }, startTime + fadeDuration);
}

export function syncFlowStackDots(dots, activeIndex) {
  if (!dots) return;

  dots.querySelectorAll('.flow-stack-dots__item').forEach((dot, i) => {
    const active = i === activeIndex;
    dot.classList.toggle('is-active', active);
    if (active) {
      dot.setAttribute('aria-current', 'step');
    } else {
      dot.removeAttribute('aria-current');
    }
  });
}

export function syncFlowStackDotsFromItems(dots, items) {
  if (!dots) return;

  let activeIndex = items.findIndex((pane) => pane.classList.contains('is-active'));
  if (activeIndex < 0) activeIndex = 0;
  syncFlowStackDots(dots, activeIndex);
}

export function syncFlowStackActiveState(panes, activeIndex, { finale = null, dots = null } = {}) {
  const items = finale ? [...panes, finale] : panes;
  items.forEach((pane, i) => {
    const isFront = finale && pane === finale ? activeIndex >= panes.length : i === activeIndex;
    pane.classList.toggle('is-active', isFront);
  });
  syncFlowStackDots(dots, activeIndex);
}
