import { ThemeEvents, VariantUpdateEvent } from '@theme/events';
import { Component } from '@theme/component';
/**
 * A custom element that displays a product price.
 * This component listens for variant update events and updates the price display accordingly.
 * It handles price updates from two different sources:
 * 1. Variant picker (in quick add modal or product page)
 * 2. Swatches variant picker (in product cards)
 */
class ProductPrice extends Component {
  connectedCallback() {
    super.connectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.addEventListener(ThemeEvents.variantUpdate, this.updatePrice);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.removeEventListener(ThemeEvents.variantUpdate, this.updatePrice);
  }

  /**
   * Updates the price and volume pricing note.
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  updatePrice = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (event.target instanceof HTMLElement && event.target.dataset.productId !== this.dataset.productId) {
      return;
    }

    // Find the new product-price element in the updated HTML
    const newProductPrice = event.detail.data.html.querySelector(`product-price[data-block-id="${this.dataset.blockId}"]`);
    if (!newProductPrice) return;

    // Update price container
    const newPrice = newProductPrice.querySelector('[ref="priceContainer"]');
    const currentPrice = this.querySelector('[ref="priceContainer"]');
    if (newPrice && currentPrice) currentPrice.replaceWith(newPrice);

    // Update volume pricing note
    const currentNote = this.querySelector('.volume-pricing-note');
    const newNote = newProductPrice.querySelector('.volume-pricing-note');

    if (!newNote) {
      currentNote?.remove();
    } else if (!currentNote) {
      this.querySelector('[ref="priceContainer"]')?.insertAdjacentElement('afterend', /** @type {Element} */ (newNote.cloneNode(true)));
    } else {
      currentNote.replaceWith(newNote);
    }
  };
}

if (!customElements.get('product-price')) {
  customElements.define('product-price', ProductPrice);
}
