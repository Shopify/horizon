import { Component } from '@theme/component';
import { CartItemsComponent } from '@theme/component-cart-items';
import { morphSection, sectionRenderer } from '@theme/section-renderer';
import { fetchConfig } from '@theme/utilities';
import { cartPerformance } from '@theme/performance';
import { CartDiscountUpdateEvent, CartErrorEvent } from '@shopify/events';

/**
 * A custom element that applies a discount to the cart.
 *
 * @typedef {Object} CartDiscountComponentRefs
 * @property {HTMLElement} cartDiscountError - The error element.
 * @property {HTMLElement} cartDiscountErrorDiscountCode - The discount code error element.
 * @property {HTMLElement} cartDiscountErrorShipping - The shipping error element.
 */

/**
 * @extends {Component<CartDiscountComponentRefs>}
 */
class CartDiscount extends Component {
  requiredRefs = ['cartDiscountError', 'cartDiscountErrorDiscountCode', 'cartDiscountErrorShipping'];

  /** @type {AbortController | null} */
  #activeFetch = null;

  #pending = false;

  #needsRefresh = false;

  /**
   * Keeps discount controls focusable while the pending guard prevents another mutation.
   * @returns {() => void} Restores the controls' previous states.
   */
  #disableControls() {
    const previousBusy = this.getAttribute('aria-busy');
    const input = this.querySelector('input[name="discount"]');
    const previousReadOnly = input instanceof HTMLInputElement && input.readOnly;
    const buttons = Array.from(this.querySelectorAll('button'), (button) => ({
      button,
      previousDisabled: button.getAttribute('aria-disabled'),
    }));

    this.setAttribute('aria-busy', 'true');
    if (input instanceof HTMLInputElement) input.readOnly = true;
    for (const { button } of buttons) button.setAttribute('aria-disabled', 'true');

    return () => {
      if (previousBusy === null) this.removeAttribute('aria-busy');
      else this.setAttribute('aria-busy', previousBusy);

      if (input instanceof HTMLInputElement) input.readOnly = previousReadOnly;
      for (const { button, previousDisabled } of buttons) {
        if (previousDisabled === null) button.removeAttribute('aria-disabled');
        else button.setAttribute('aria-disabled', previousDisabled);
      }
    };
  }

  #createAbortController() {
    if (this.#activeFetch) {
      this.#activeFetch.abort();
    }

    const abortController = new AbortController();
    this.#activeFetch = abortController;
    return abortController;
  }

  /**
   * Refreshes this section when a cart AJAX response cannot include rendered section HTML.
   * Cancelled renders can resolve without validation, so retry until this refresh reaches the DOM.
   * @param {(html: string) => boolean} [shouldRender] - Validates the rendered discounts before morphing.
   */
  async #refreshDiscountSection(shouldRender) {
    const sectionId = this.dataset.sectionId;
    if (!sectionId) return;

    this.#needsRefresh = true;
    let validated = false;

    try {
      while (!validated && this.isConnected) {
        let pendingQuantityUpdates = CartItemsComponent.pendingQuantityUpdates;
        while (pendingQuantityUpdates.length) {
          await Promise.all(pendingQuantityUpdates);
          pendingQuantityUpdates = CartItemsComponent.pendingQuantityUpdates;
        }
        if (!this.isConnected) return;

        await sectionRenderer.renderSection(sectionId, {
          cache: false,
          mode: this.closest('theme-drawer') ? 'hydration' : 'full',
          shouldRender: (html) => {
            validated = true;
            return shouldRender?.(html) ?? true;
          },
        });
      }

      if (validated) this.#needsRefresh = false;
    } catch (error) {
      if (error?.name === 'AbortError') return;

      this.dispatchEvent(
        new CartErrorEvent({
          error: error?.message || 'Failed to refresh cart discounts',
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    }
  }

  /**
   * Replaces stale pills before accepting another action against the refreshed controls.
   */
  async #refreshStaleDiscounts() {
    this.#pending = true;
    const restoreControls = this.#disableControls();

    try {
      await this.#refreshDiscountSection();
    } finally {
      this.#pending = false;
      restoreControls();
    }
  }

  /**
   * Applies a discount to the cart.
   * @param {SubmitEvent} event - The submit event on our form.
   */
  applyDiscount = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.#pending) return;

    if (this.#needsRefresh) {
      await this.#refreshStaleDiscounts();
      return;
    }

    const { cartDiscountError, cartDiscountErrorDiscountCode, cartDiscountErrorShipping } = this.refs;

    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const discountCode = form.querySelector('input[name="discount"]');
    if (!(discountCode instanceof HTMLInputElement) || typeof this.dataset.sectionId !== 'string') return;

    const discountCodeValue = discountCode.value;

    const existingDiscounts = this.#existingDiscounts();
    if (existingDiscounts.includes(discountCodeValue)) return;

    sectionRenderer.abortRender(this.dataset.sectionId);
    const abortController = this.#createAbortController();

    cartDiscountError.classList.add('hidden');
    cartDiscountErrorDiscountCode.classList.add('hidden');
    cartDiscountErrorShipping.classList.add('hidden');

    const allDiscountCodes = [...existingDiscounts, discountCodeValue];
    const deferredPromise = CartDiscountUpdateEvent.createPromise();

    this.#pending = true;
    const restoreControls = this.#disableControls();

    try {
      this.dispatchEvent(
        new CartDiscountUpdateEvent({
          discountCodes: allDiscountCodes.map((code) => ({ code })),
          promise: deferredPromise.promise,
        })
      );

      const config = fetchConfig('json', {
        body: JSON.stringify({
          discount: allDiscountCodes.join(','),
          sections: [this.dataset.sectionId],
        }),
      });

      const response = await fetch(Theme.routes.cart_update_url, {
        ...config,
        signal: abortController.signal,
      });

      const data = await response.json();

      if (
        data.discount_codes.find((/** @type {{ code: string; applicable: boolean; }} */ discount) => {
          return discount.code === discountCodeValue && discount.applicable === false;
        })
      ) {
        discountCode.value = '';
        this.#handleDiscountError('discount_code');
        deferredPromise.resolve({
          cart: CartDiscountUpdateEvent.createCartFromAjaxResponse(data),
        });
        return;
      }

      const sections = /** @type {Record<string, string> | null | undefined} */ (data.sections);
      const newHtml = sections?.[this.dataset.sectionId];

      /**
       * Liquid omits shipping discounts that the cart payload still reports as applicable.
       * @param {string} html - The rendered section HTML.
       * @returns {boolean} Whether the section can replace the current discount UI.
       */
      const shouldRender = (html) => {
        const parsedHtml = new DOMParser().parseFromString(html, 'text/html');
        const section = parsedHtml.getElementById(`shopify-section-${this.dataset.sectionId}`);
        const discountCodes = section?.querySelectorAll('.cart-discount__pill') || [];
        if (section) {
          const codes = Array.from(discountCodes)
            .map((element) => (element instanceof HTMLLIElement ? element.dataset.discountCode : null))
            .filter(Boolean);
          if (
            codes.length === existingDiscounts.length &&
            codes.every((/** @type {string} */ code) => existingDiscounts.includes(code)) &&
            data.discount_codes.find((/** @type {{ code: string; applicable: boolean; }} */ discount) => {
              return discount.code === discountCodeValue && discount.applicable === true;
            })
          ) {
            this.#handleDiscountError('shipping');
            return false;
          }
        }

        return true;
      };

      if (!newHtml) {
        discountCode.value = '';
        deferredPromise.resolve({
          cart: CartDiscountUpdateEvent.createCartFromAjaxResponse(data),
        });
        await this.#refreshDiscountSection(shouldRender);
        return;
      }

      if (!shouldRender(newHtml)) {
        discountCode.value = '';
        deferredPromise.resolve({
          cart: CartDiscountUpdateEvent.createCartFromAjaxResponse(data),
        });
        return;
      }

      deferredPromise.resolve({
        cart: CartDiscountUpdateEvent.createCartFromAjaxResponse(data),
      });
      // Clear the input explicitly: data-skip-node-update on <input name="discount"> means
      // morphSection no longer syncs the input value from the server-rendered empty state,
      // so without this the user's typed code stays in the field after a successful apply.
      discountCode.value = '';
      sectionRenderer.abortRender(this.dataset.sectionId);
      await morphSection(this.dataset.sectionId, newHtml, {
        mode: this.closest('theme-drawer') ? 'hydration' : 'full',
      });
    } catch (error) {
      deferredPromise.reject(error);
      if (error instanceof Error && error.name !== 'AbortError') {
        this.dispatchEvent(
          new CartErrorEvent({
            error: error.message || 'Failed to apply discount',
            code: 'SERVICE_UNAVAILABLE',
          })
        );
      }
    } finally {
      this.#activeFetch = null;
      this.#pending = false;
      restoreControls();
      cartPerformance.measureFromEvent('discount-update:user-action', event);
    }
  };

  /**
   * Handles removing a discount from the cart.
   * @param {MouseEvent | KeyboardEvent} event - The mouse or keyboard event in our pill.
   */
  removeDiscount = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.#pending) return;

    if (this.#needsRefresh) {
      await this.#refreshStaleDiscounts();
      return;
    }

    if (
      (event instanceof KeyboardEvent && event.key !== 'Enter') ||
      !(event instanceof MouseEvent) ||
      !(event.target instanceof HTMLElement) ||
      typeof this.dataset.sectionId !== 'string'
    ) {
      return;
    }

    const pill = event.target.closest('.cart-discount__pill');
    if (!(pill instanceof HTMLLIElement)) return;

    const discountCode = pill.dataset.discountCode;
    if (!discountCode) return;

    const existingDiscounts = this.#existingDiscounts();
    const index = existingDiscounts.indexOf(discountCode);
    if (index === -1) return;

    existingDiscounts.splice(index, 1);

    sectionRenderer.abortRender(this.dataset.sectionId);
    const abortController = this.#createAbortController();
    const deferredPromise = CartDiscountUpdateEvent.createPromise();

    this.#pending = true;
    const restoreControls = this.#disableControls();

    try {
      this.dispatchEvent(
        new CartDiscountUpdateEvent({
          discountCodes: existingDiscounts.map((code) => ({ code })),
          promise: deferredPromise.promise,
        })
      );

      const config = fetchConfig('json', {
        body: JSON.stringify({ discount: existingDiscounts.join(','), sections: [this.dataset.sectionId] }),
      });

      const response = await fetch(Theme.routes.cart_update_url, {
        ...config,
        signal: abortController.signal,
      });

      const data = await response.json();

      const sections = /** @type {Record<string, string> | null | undefined} */ (data.sections);
      const newHtml = sections?.[this.dataset.sectionId];

      deferredPromise.resolve({
        cart: CartDiscountUpdateEvent.createCartFromAjaxResponse(data),
      });

      if (!newHtml) {
        await this.#refreshDiscountSection();
        return;
      }

      sectionRenderer.abortRender(this.dataset.sectionId);
      await morphSection(this.dataset.sectionId, newHtml, {
        mode: this.closest('theme-drawer') ? 'hydration' : 'full',
      });
    } catch (error) {
      deferredPromise.reject(error);
      if (error instanceof Error && error.name !== 'AbortError') {
        this.dispatchEvent(
          new CartErrorEvent({
            error: error.message || 'Failed to remove discount',
            code: 'SERVICE_UNAVAILABLE',
          })
        );
      }
    } finally {
      this.#activeFetch = null;
      this.#pending = false;
      restoreControls();
    }
  };

  /**
   * Handles the discount error.
   *
   * @param {'discount_code' | 'shipping'} type - The type of discount error.
   */
  #handleDiscountError(type) {
    const { cartDiscountError, cartDiscountErrorDiscountCode, cartDiscountErrorShipping } = this.refs;
    const target = type === 'discount_code' ? cartDiscountErrorDiscountCode : cartDiscountErrorShipping;
    cartDiscountError.classList.remove('hidden');
    target.classList.remove('hidden');

    const errorMessage = type === 'discount_code' ? 'Invalid discount code' : 'Discount not applicable for shipping';
    this.dispatchEvent(
      new CartErrorEvent({
        error: errorMessage,
        code: 'VALIDATION_CUSTOM',
      })
    );
  }

  /**
   * Returns an array of existing discount codes.
   * @returns {string[]}
   */
  #existingDiscounts() {
    /** @type {string[]} */
    const discountCodes = [];
    const discountPills = this.querySelectorAll('.cart-discount__pill');
    for (const pill of discountPills) {
      if (pill instanceof HTMLLIElement && typeof pill.dataset.discountCode === 'string') {
        discountCodes.push(pill.dataset.discountCode);
      }
    }

    return discountCodes;
  }
}

if (!customElements.get('cart-discount-component')) {
  customElements.define('cart-discount-component', CartDiscount);
}
