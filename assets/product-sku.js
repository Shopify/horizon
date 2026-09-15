import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';
import { StandardEvents, ProductSelectEvent } from '@shopify/events';

/**
 * A custom element that displays a product SKU.
 * This component listens for variant update events and updates the SKU display accordingly.
 * It handles SKU updates from two different sources:
 * 1. Variant picker (in quick add modal or product page)
 * 2. Swatches variant picker (in product cards)
 *
 * @typedef {Object} Refs
 * @property {HTMLElement} skuContainer - The container element for the SKU
 * @property {HTMLElement} sku - The span element that displays the SKU text
 *
 * @extends {Component<Refs>}
 */
class ProductSkuComponent extends Component {
  requiredRefs = ['skuContainer', 'sku'];

  connectedCallback() {
    super.connectedCallback();
    const target = this.closest('[id*="ProductInformation-"], [id*="QuickAdd-"], product-card');
    if (!target) return;
    target.addEventListener(StandardEvents.productSelect, this.#handleProductSelect);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const target = this.closest('[id*="ProductInformation-"], [id*="QuickAdd-"], product-card');
    if (!target) return;
    target.removeEventListener(StandardEvents.productSelect, this.#handleProductSelect);
  }

  /**
   * Handles product select event and updates the SKU.
   * @param {ProductSelectEvent} event - The product select event.
   */
  #handleProductSelect = (event) => {
    event.promise
      .then(({ detail }) => {
        if (!detail) return;

        const { newProduct, resource } = detail;
        if (newProduct) {
          this.dataset.productId = newProduct.id;
        }

        if (detail.productId && detail.productId !== this.dataset.productId) {
          return;
        }
        if (resource) {
          const variantSku = resource.sku || '';

          if (variantSku) {
            // Show the component and update the SKU
            this.style.display = 'block';
            this.refs.sku.textContent = variantSku;
          } else {
            // Hide the entire component when SKU is empty
            this.style.display = 'none';
            this.refs.sku.textContent = '';
          }
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[product-sku] Event promise rejected:', error);
      });
  };
}

if (!customElements.get('product-sku-component')) {
  customElements.define('product-sku-component', ProductSkuComponent);
}
