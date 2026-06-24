(function () {
  // Reports on Meta's in-app browsers (Facebook, Instagram) that fail to paint during
  // cross-document (MPA) View Transitions implementation that can freeze or
  // white-screen the storefront on navigation. June 2026 testing.
  // Remove check if every resolved.
  if (isMetaInAppBrowser()) {
    disableCrossDocumentViewTransitions();
  }

  const viewTransitionRenderBlocker = document.getElementById('view-transition-render-blocker');
  // Remove the view transition render blocker if the user has reduced motion enabled or is on a low power device.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || isLowPowerDevice()) {
    viewTransitionRenderBlocker?.remove();
  } else {
    // If the browser didn't manage to parse the main content quickly, at least let the user see something.
    // We're aiming for the FCP to be under 1.8 seconds since the navigation started.
    const RENDER_BLOCKER_TIMEOUT_MS = Math.max(0, 1800 - performance.now());

    setTimeout(() => {
      viewTransitionRenderBlocker?.remove();
    }, RENDER_BLOCKER_TIMEOUT_MS);
  }

  const idleCallback = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout;

  window.addEventListener('pageswap', async (event) => {
    const { viewTransition } = /** @type {PageSwapEvent} */ (event);

    if (shouldSkipViewTransition(viewTransition)) {
      /** @type {ViewTransition | null} */ (viewTransition)?.skipTransition();
      return;
    }

    // Cancel view transition on user interaction to improve INP (Interaction to Next Paint)
    ['pointerdown', 'keydown'].forEach((eventName) => {
      document.addEventListener(
        eventName,
        () => {
          viewTransition.skipTransition();
        },
        { once: true }
      );
    });

    // Clean in case you landed on the pdp first. We want to remove the default transition type on the PDP media gallery so there is no duplicate transition name
    document
      .querySelectorAll('[data-view-transition-type]:not([data-view-transition-triggered])')
      .forEach((element) => {
        element.removeAttribute('data-view-transition-type');
      });

    const transitionTriggered = document.querySelector('[data-view-transition-triggered]');
    const transitionType = transitionTriggered?.getAttribute('data-view-transition-type');

    if (transitionType) {
      viewTransition.types.clear();
      viewTransition.types.add(transitionType);
      sessionStorage.setItem('custom-transition-type', transitionType);
    } else {
      viewTransition.types.clear();
      viewTransition.types.add('page-navigation');
      sessionStorage.removeItem('custom-transition-type');
    }
  });

  window.addEventListener('pagereveal', async (event) => {
    const { viewTransition } = /** @type {PageRevealEvent} */ (event);

    if (shouldSkipViewTransition(viewTransition)) {
      /** @type {ViewTransition | null} */ (viewTransition)?.skipTransition();
      return;
    }

    const customTransitionType = sessionStorage.getItem('custom-transition-type');

    if (customTransitionType) {
      viewTransition.types.clear();
      viewTransition.types.add(customTransitionType);

      await viewTransition.finished;

      viewTransition.types.clear();
      viewTransition.types.add('page-navigation');

      idleCallback(() => {
        sessionStorage.removeItem('custom-transition-type');
        document.querySelectorAll('[data-view-transition-type]').forEach((element) => {
          element.removeAttribute('data-view-transition-type');
        });
      });
    } else {
      viewTransition.types.clear();
      viewTransition.types.add('page-navigation');
    }
  });

  /**
   * @param {ViewTransition | null} viewTransition
   * @returns {viewTransition is null}
   */
  function shouldSkipViewTransition(viewTransition) {
    return (
      !(viewTransition instanceof ViewTransition) ||
      isLowPowerDevice() ||
      prefersReducedMotion() ||
      isMetaInAppBrowser()
    );
  }

  /**
   * Detect Facebook / Instagram in-app browsers (Meta WebView).
   *
   * Meta's in-app browsers expose identifying tokens in the user-agent:
   *   - Facebook: `FBAN`, `FBAV`, `FB_IAB`, `FBIOS`
   *   - Instagram: `Instagram`
   *
   * We can't import this from utilities.js here (this file runs before modules),
   * so the equivalent `isMetaInAppBrowser()` in utilities.js must be kept in sync.
   * @param {string} [userAgent=navigator.userAgent] - User-agent string to test.
   * @returns {boolean} True if running inside a Facebook/Instagram in-app browser.
   */
  function isMetaInAppBrowser(userAgent = navigator.userAgent) {
    return /\b(FBAN|FBAV|FB_IAB|FBIOS|Instagram)\b/i.test(userAgent || '');
  }

  /**
   * Disable cross-document (MPA) View Transitions for the current document.
   *
   * Overrides the standard `@view-transition { navigation: auto }` CSS opt-in
   * and drops the render-blocking `<link rel="expect">` so a stalled transition
   * can never hold first paint (the white-screen symptom).
   */
  function disableCrossDocumentViewTransitions() {
    // 1. Override the standard `@view-transition` opt-in. A later `@view-transition`
    //    rule wins the cascade, so `navigation: none` here defeats base.css.
    const style = document.createElement('style');
    style.textContent = '@view-transition { navigation: none; }';
    (document.head || document.documentElement).appendChild(style);

    // 2. Never let the render blocker hold first paint on these browsers.
    document.getElementById('view-transition-render-blocker')?.remove();
  }

  /*
   * We can't import this logic from utilities.js here, but we should keep them in sync.
   */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /*
   * We can't import this logic from utilities.js here, but we should keep them in sync.
   */
  function isLowPowerDevice() {
    /* Skip ESLint compatibility check. Number(undefined) <= 2 is always false anyway. */
    /* eslint-disable-next-line compat/compat */
    return Number(navigator.hardwareConcurrency) <= 2 || Number(navigator.deviceMemory) <= 2;
  }
})();
