import { ThemeEvents } from '@theme/events';
import { Component } from '@theme/component';
import { StandardEvents, ProductSelectEvent } from '@shopify/events';

/**
 * @typedef {Object} ProductPriceRefs
 * @property {HTMLElement} priceContainer
 * @property {HTMLElement} [volumePricingNote]
 */

/**
 * A custom element that displays a product price.
 * This component listens for variant update events and updates the price display accordingly.
 * It handles price updates from two different sources:
 * 1. Variant picker (in quick add modal or product page)
 * 2. Swatches variant picker (in product cards)
 *
 * @extends {Component<ProductPriceRefs>}
 */
class ProductPrice extends Component {
  connectedCallback() {
    super.connectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.addEventListener(StandardEvents.productSelect, this.#handleProductSelect);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.removeEventListener(StandardEvents.productSelect, this.#handleProductSelect);
  }

  /**
   * Handles product select event and updates the price.
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

        const { priceContainer, volumePricingNote } = this.refs;
        // Find the new product-price element in the updated HTML
        const newProductPrice = html.querySelector(`product-price[data-block-id="${this.dataset.blockId}"]`);
        if (!newProductPrice) return;

        // Update price container
        const newPrice = newProductPrice.querySelector('[ref="priceContainer"]');
        if (newPrice && priceContainer) {
          priceContainer.replaceWith(newPrice);
        }

        // Update volume pricing note
        const newNote = newProductPrice.querySelector('[ref="volumePricingNote"]');
        if (!newNote) {
          volumePricingNote?.remove();
        } else if (!volumePricingNote) {
          // Use newPrice since priceContainer was just replaced and now points to the detached element
          newPrice?.insertAdjacentElement('afterend', /** @type {Element} */ (newNote.cloneNode(true)));
        } else {
          volumePricingNote.replaceWith(newNote);
        }

        // Update installments (SPI banner) variant ID to trigger payment terms re-render
        const installmentsInput = /** @type {HTMLInputElement|null} */ (
          this.querySelector(`#product-form-installment-${this.dataset.blockId} input[name="id"]`)
        );
        if (installmentsInput) {
          installmentsInput.value = detail.resource?.id ?? '';
          installmentsInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[product-price] Event promise rejected:', error);
      });
  };
}

if (!customElements.get('product-price')) {
  customElements.define('product-price', ProductPrice);
}
