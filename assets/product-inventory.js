import { ThemeEvents } from '@theme/events';
import { morph } from '@theme/morph';
import { Component } from '@theme/component';
import { StandardEvents, ProductSelectEvent } from '@shopify/events';

class ProductInventory extends Component {
  connectedCallback() {
    super.connectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    closestSection?.addEventListener(StandardEvents.productSelect, this.#handleProductSelect);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    closestSection?.removeEventListener(StandardEvents.productSelect, this.#handleProductSelect);
  }

  /**
   * Handles product select event by updating the inventory.
   * @param {ProductSelectEvent} event - The product select event.
   */
  #handleProductSelect = (event) => {
    if (!(event.target instanceof Element) || event.target.closest('product-card')) return;

    event.promise
      .then(({ detail }) => {
        if (!detail?.html) return;

        const { html, newProduct } = detail;

        if (newProduct) {
          this.dataset.productId = newProduct.id;
        } else if (detail.productId && detail.productId !== this.dataset.productId) {
          return;
        }

        const newInventory = html.querySelector('product-inventory');
        if (!newInventory) return;

        morph(this, newInventory, { childrenOnly: true });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[product-inventory] Event promise rejected:', error);
      });
  };
}

if (!customElements.get('product-inventory')) {
  customElements.define('product-inventory', ProductInventory);
}
