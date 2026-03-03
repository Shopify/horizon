import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

/**
 * Header actions component that manages cart notifications.
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
    document.addEventListener(ThemeEvents.cartUpdate, this.#onCartUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(ThemeEvents.cartUpdate, this.#onCartUpdate);
  }

  /**
   * Handles cart update events and announces the new count to screen readers.
   * @param {CustomEvent<{ resource?: { item_count?: number } }>} event
   */
  #onCartUpdate = (event) => {
    const cartCount = event.detail.resource?.item_count;
    if (cartCount === undefined) return;

    this.refs.liveRegion.textContent = `${Theme.translations.cart_count}: ${cartCount}`;
  };
}

if (!customElements.get('header-actions')) {
  customElements.define('header-actions', HeaderActions);
}
