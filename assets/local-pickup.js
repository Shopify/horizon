import { Component } from '@theme/component';

import { morph } from '@theme/morph';
import { StandardEvents, ProductSelectEvent } from '@shopify/events';

class LocalPickup extends Component {
  /** @type {AbortController | undefined} */
  #activeFetch;

  /** @type {HTMLElement | null} */
  #pickupDrawer = null;

  connectedCallback() {
    super.connectedCallback();

    // Portal the sibling pickup drawer to document.body so its z-index
    // isn't trapped by ancestor stacking contexts on desktop.
    const drawer =
      this.nextElementSibling instanceof HTMLElement && this.nextElementSibling.matches('theme-drawer.pickup-drawer')
        ? this.nextElementSibling
        : null;
    if (drawer) {
      this.#pickupDrawer = drawer;
      document.body.appendChild(drawer);
    }

    const closestSection = this.closest(`.shopify-section, dialog`);

    /** @type {(event: ProductSelectEvent) => void} */
    const handleProductSelect = (event) => {
      if (!(event.target instanceof Element) || event.target.closest('product-card')) return;

      event.promise
        .then(({ detail }) => {
          if (!detail) return;

          const { newProduct, resource } = detail;
          if (newProduct) {
            this.dataset.productUrl = newProduct.url;
          }
          const variantId = resource ? resource.id : null;
          const variantAvailable = resource ? resource.available : null;
          if (variantId !== this.dataset.variantId) {
            if (variantId && variantAvailable) {
              // The variant picker has already rendered the page for this variant, so take the widget from it.
              // When the variant picker loads another product, it morphs `main` from that page before this runs,
              // and the morph moves nodes out of the page. This widget then already shows the variant, and the
              // page is no longer whole, so render the section again, as when the page has no widget.
              const morphedFromPage = String(variantId) === this.dataset.variantId;
              this.dataset.variantId = variantId;
              const widget = detail.html && !morphedFromPage ? this.#findWidget(detail.html, variantId) : null;
              if (widget) {
                this.#activeFetch?.abort();
                this.#update(widget);
              } else {
                this.#fetchAvailability(variantId);
              }
            } else {
              this.setAttribute('hidden', '');
            }
          }
        })
        .catch((error) => {
          if (error?.name !== 'AbortError') console.warn('[local-pickup] Event promise rejected:', error);
        });
    };

    closestSection?.addEventListener(StandardEvents.productSelect, handleProductSelect);

    this.disconnectedCallback = () => {
      closestSection?.removeEventListener(StandardEvents.productSelect, handleProductSelect);
      this.#pickupDrawer?.remove();
      this.#pickupDrawer = null;
    };
  }

  #createAbortController() {
    if (this.#activeFetch) this.#activeFetch.abort();
    this.#activeFetch = new AbortController();
    return this.#activeFetch;
  }

  /**
   * Finds the widget of this block for a variant. Each buy-buttons block in the section renders its own
   * widget from its own settings, so the widget is matched to this block as well as the variant.
   * @param {ParentNode} html - The rendered page or section.
   * @param {string} variantId - The ID of the variant.
   * @returns {Element | null}
   */
  #findWidget(html, variantId) {
    return html.querySelector(`local-pickup[data-block-id="${this.dataset.blockId}"][data-variant-id="${variantId}"]`);
  }

  /**
   * Updates the widget and its drawer from a rendered widget.
   * @param {Element} wrapper - The rendered widget of this block.
   */
  #update(wrapper) {
    morph(this, wrapper);
    this.toggleAttribute('hidden', wrapper.hasAttribute('hidden'));

    // Update the portaled drawer with fresh content from the server.
    // If the page originally loaded on an unavailable variant the drawer
    // wasn't rendered (can_add_to_cart was false), so portal it now.
    // Resolve via the sibling relationship to avoid colliding with
    // other buy-buttons blocks on the same page.
    const newDrawer =
      wrapper.nextElementSibling instanceof HTMLElement &&
      wrapper.nextElementSibling.matches('theme-drawer.pickup-drawer')
        ? wrapper.nextElementSibling
        : null;
    if (newDrawer) {
      if (this.#pickupDrawer) {
        morph(this.#pickupDrawer, newDrawer);
      } else {
        this.#pickupDrawer = newDrawer;
        document.body.appendChild(this.#pickupDrawer);
      }
    }
  }

  /**
   * Fetches the section for a variant and updates the widget from it.
   * @param {string} variantId - The ID of the variant to fetch availability for.
   */
  #fetchAvailability = (variantId) => {
    if (!variantId) return;

    const abortController = this.#createAbortController();

    const url = this.dataset.productUrl;
    fetch(`${url}?variant=${variantId}&section_id=${this.dataset.sectionId}`, {
      signal: abortController.signal,
    })
      .then((response) => response.text())
      .then((text) => {
        if (abortController.signal.aborted) return;

        const html = new DOMParser().parseFromString(text, 'text/html');
        const wrapper = this.#findWidget(html, variantId);
        if (wrapper) {
          this.#update(wrapper);
        } else {
          this.setAttribute('hidden', '');
        }
      })
      .catch((_e) => {
        if (abortController.signal.aborted) return;
        this.setAttribute('hidden', '');
      });
  };
}

if (!customElements.get('local-pickup')) {
  customElements.define('local-pickup', LocalPickup);
}
