import { Component } from '@theme/component';
import { onAnimationEnd } from '@theme/utilities';
import { StandardEvents, CartLinesUpdateEvent } from '@shopify/events';

/**
 * A custom element that displays a cart icon.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} cartBubble - The cart bubble element.
 * @property {HTMLElement} cartBubbleText - The cart bubble text element.
 * @property {HTMLElement} cartBubbleCount - The cart bubble count element.
 *
 * @extends {Component<Refs>}
 */
class CartIcon extends Component {
  requiredRefs = ['cartBubble', 'cartBubbleText', 'cartBubbleCount'];

  /** @type {AbortController | null} */
  #historyCartController = null;

  /** @type {number} */
  #cartRenderRevision = 0;

  /** @type {number} */
  get currentCartCount() {
    return parseInt(this.refs.cartBubbleCount.textContent ?? '0', 10);
  }

  set currentCartCount(value) {
    this.refs.cartBubbleCount.textContent = value < 100 ? String(value) : '';
  }

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(StandardEvents.cartLinesUpdate, this.onCartUpdate);
    window.addEventListener('pageshow', this.onPageShow);
    this.ensureCartBubbleIsCorrect();

    // A full history reload can emit pageshow before this module upgrades the element.
    if (CartIcon.#getNavigationType() === 'back_forward') {
      this.#reconcileHistoryCart();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(StandardEvents.cartLinesUpdate, this.onCartUpdate);
    window.removeEventListener('pageshow', this.onPageShow);
    this.#historyCartController?.abort();
    this.#historyCartController = null;
  }

  /**
   * Handles the page show event when the page is restored from cache.
   * @param {PageTransitionEvent} event - The page show event.
   */
  onPageShow = async (event) => {
    if (!event.persisted) return;

    await this.#reconcileHistoryCart();
  };

  /**
   * Handles the cart update event.
   * @param {CartLinesUpdateEvent} event - The cart update event.
   */
  onCartUpdate = (event) => {
    event.promise
      ?.then(({ cart, detail }) => {
        const itemCount = cart?.totalQuantity ?? detail?.itemCount ?? 0;

        this.#cartRenderRevision += 1;
        this.#historyCartController?.abort();
        this.renderCartBubble(itemCount);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-icon] Event promise rejected:', error);
      });
  };

  /**
   * Renders the cart bubble.
   * @param {number} itemCount - The absolute number of items in the cart.
   * @param {boolean} [animate=true] - Whether to animate the bubble.
   */
  renderCartBubble = async (itemCount, animate = true) => {
    this.refs.cartBubbleCount.classList.toggle('hidden', itemCount === 0);
    this.refs.cartBubble.classList.toggle('visually-hidden', itemCount === 0);

    this.currentCartCount = itemCount;

    this.classList.toggle('header-actions__cart-icon--has-cart', itemCount > 0);

    sessionStorage.setItem(
      'cart-count',
      JSON.stringify({
        value: String(this.currentCartCount),
        timestamp: Date.now(),
      })
    );

    if (!animate || itemCount === 0) return;

    // Ensure element is visible before starting animation
    // Use requestAnimationFrame to ensure the browser sees the state change
    await new Promise((resolve) => requestAnimationFrame(resolve));

    this.refs.cartBubble.classList.add('cart-bubble--animating');
    await onAnimationEnd(this.refs.cartBubbleText);

    this.refs.cartBubble.classList.remove('cart-bubble--animating');
  };

  /**
   * Checks if the cart count is correct.
   */
  ensureCartBubbleIsCorrect = () => {
    // Ensure refs are available
    if (!this.refs.cartBubbleCount) return;

    const sessionStorageCount = sessionStorage.getItem('cart-count');

    // If no session storage data, nothing to check
    if (sessionStorageCount === null) return;

    const visibleCount = this.refs.cartBubbleCount.textContent;

    try {
      const { value, timestamp } = JSON.parse(sessionStorageCount);

      // Check if the stored count matches what's visible
      if (value === visibleCount) return;

      // Only update if timestamp is recent (within 10 seconds)
      if (Date.now() - timestamp < 10000) {
        const count = parseInt(value, 10);

        if (count >= 0) {
          this.renderCartBubble(count, false);
        }
      }
    } catch (_) {
      // no-op
    }
  };

  /**
   * Reconciles history-restored markup with the authoritative cart response.
   */
  #reconcileHistoryCart = async () => {
    this.#historyCartController?.abort();
    const controller = new AbortController();
    const cartRenderRevision = this.#cartRenderRevision;
    this.#historyCartController = controller;

    try {
      const response = await fetch(`${Theme.routes.cart_url}.json`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (controller.signal.aborted || this.#historyCartController !== controller) return;
      if (!response.ok) throw new Error(`Cart request failed with status ${response.status}`);

      const cart = await response.json();
      if (controller.signal.aborted || this.#historyCartController !== controller) return;

      const itemCount = cart?.item_count;
      if (!Number.isInteger(itemCount) || itemCount < 0) throw new Error('Cart response has an invalid item count');
      if (this.#cartRenderRevision !== cartRenderRevision) return;

      await this.renderCartBubble(itemCount, false);
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('[cart-icon] History reconciliation failed:', error);
    } finally {
      if (this.#historyCartController === controller) this.#historyCartController = null;
    }
  };

  /**
   * Narrows a performance entry before reading its navigation type.
   * @param {PerformanceEntry | undefined} entry
   * @returns {entry is PerformanceNavigationTiming}
   */
  static #isNavigationTiming(entry) {
    return entry?.entryType === 'navigation';
  }

  /**
   * Returns the current document's navigation type.
   */
  static #getNavigationType() {
    const navigationEntry = globalThis.performance?.getEntriesByType?.('navigation')[0];
    return CartIcon.#isNavigationTiming(navigationEntry) ? navigationEntry.type : undefined;
  }
}

if (!customElements.get('cart-icon')) {
  customElements.define('cart-icon', CartIcon);
}
