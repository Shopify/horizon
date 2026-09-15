import { Component } from '@theme/component';
import { StandardEvents, CartLinesUpdateEvent } from '@shopify/events';
import { DrawerOpenEvent, DrawerCloseEvent } from '@theme/theme-drawer';

/**
 * Header actions component that manages cart notifications and the
 * cart-drawer trigger's `aria-expanded` state.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} liveRegion - The live region for cart announcements.
 *
 * @extends {Component<Refs>}
 */
class HeaderActions extends Component {
  requiredRefs = ['liveRegion'];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(StandardEvents.cartLinesUpdate, this.#onCartUpdate);
    document.addEventListener(DrawerOpenEvent.eventName, this.#onDrawerStateChange);
    document.addEventListener(DrawerCloseEvent.eventName, this.#onDrawerStateChange);
    this.#syncCartTriggerAriaExpanded();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(StandardEvents.cartLinesUpdate, this.#onCartUpdate);
    document.removeEventListener(DrawerOpenEvent.eventName, this.#onDrawerStateChange);
    document.removeEventListener(DrawerCloseEvent.eventName, this.#onDrawerStateChange);
  }

  #syncCartTriggerAriaExpanded = () => {
    const cartDrawer = document.getElementById('cart-drawer');
    if (!cartDrawer) return;
    const trigger = this.querySelector('[aria-controls="cart-drawer"]');
    if (!trigger) return;
    trigger.setAttribute('aria-expanded', cartDrawer.hasAttribute('open') ? 'true' : 'false');
  };

  /**
   * Syncs `aria-expanded` on the cart-drawer trigger when the drawer opens or closes.
   * @param {Event} event
   */
  #onDrawerStateChange = (event) => {
    const target = /** @type {HTMLElement | null} */ (event.target);
    if (target?.id !== 'cart-drawer') return;
    this.#syncCartTriggerAriaExpanded();
  };

  /**
   * Handles cart update events and announces the new count to screen readers.
   * @param {CartLinesUpdateEvent} event
   */
  #onCartUpdate = (event) => {
    event.promise
      ?.then(({ cart }) => {
        const cartCount = cart?.totalQuantity;
        if (cartCount === undefined) return;

        this.refs.liveRegion.textContent = `${Theme.translations.cart_count}: ${cartCount}`;
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[header-actions] Event promise rejected:', error);
      });
  };
}

if (!customElements.get('header-actions')) {
  customElements.define('header-actions', HeaderActions);
}
