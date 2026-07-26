import { Component } from '@theme/component';
import { prefersReducedMotion, yieldToMainThread } from '@theme/utilities';

/**
 * <r-editorial-story> — the Rocky editorial storytelling stage (WS10).
 *
 * The stage itself is pure CSS (dual-grid collage driven by per-item custom
 * properties); this component only arms and drives the scroll-reveal for
 * text / custom-liquid items (`.r-story-item[data-r-reveal]`). Media items
 * handle their own entrances inside <r-media> — see assets/r-media.js.
 *
 * Contract (mirrors r-media):
 *   - hidden initial states require BOTH `data-r-armed` (JS present and
 *     driving) and `prefers-reduced-motion: no-preference`, so no-JS and
 *     reduced-motion visitors always see the content;
 *   - the visible end-state derives from the `data-r-visible` attribute
 *     alone — transitions are decorative, so a frozen background tab can
 *     never strand an item mid-reveal;
 *   - a section-renderer morph resets server-rendered attributes, so
 *     everything is re-derived from the live DOM in updatedCallback.
 *
 * @extends {Component}
 */

/** Portion of an item that must enter the viewport before it reveals. */
const REVEAL_THRESHOLD = 0.15;

/** All connected stages (live reduced-motion preference resync). */
const instances = new Set();

class REditorialStory extends Component {
  /** @type {IntersectionObserver | undefined} */
  #observer;

  connectedCallback() {
    super.connectedCallback();
    instances.add(this);
    this.resync();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = undefined;
    instances.delete(this);
    super.disconnectedCallback();
  }

  updatedCallback() {
    super.updatedCallback();
    // A morph may have swapped items or reset attributes — re-derive.
    this.resync();
  }

  /** Re-derive arming and observation from the live DOM. */
  resync() {
    this.#observer?.disconnect();
    this.#observer = undefined;

    const items = this.querySelectorAll('[data-r-reveal]');
    const armed = items.length > 0 && !prefersReducedMotion();
    this.toggleAttribute('data-r-armed', armed);

    if (!armed) {
      // Reduced motion (or no reveal items): everything is simply visible.
      for (const item of items) item.removeAttribute('data-r-visible');
      return;
    }

    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.#reveal(entry.target);
          this.#observer?.unobserve(entry.target);
        }
      },
      { threshold: REVEAL_THRESHOLD }
    );

    for (const item of items) {
      if (item.hasAttribute('data-r-visible')) continue;
      this.#observer.observe(item);
    }
  }

  /**
   * One-shot reveal. Layout settles first so the transition actually runs
   * (the jumbo-text / r-media entrance pattern).
   * @param {Element} item
   */
  #reveal(item) {
    yieldToMainThread().then(() => {
      item.setAttribute('data-r-visible', '');
    });
  }
}

if (!customElements.get('r-editorial-story')) {
  customElements.define('r-editorial-story', REditorialStory);

  // Honour live preference flips (e.g. macOS Reduce Motion mid-session).
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    for (const stage of instances) {
      if (stage instanceof REditorialStory) stage.resync();
    }
  });
}
