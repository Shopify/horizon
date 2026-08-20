import { Component } from '@theme/component';
import { debounce, fetchConfig } from '@theme/utilities';
import { cartPerformance } from '@theme/performance';
import { CartErrorEvent, CartNoteUpdateEvent } from '@shopify/events';

/**
 * A custom element that displays a cart note.
 */
class CartNote extends Component {
  /** @type {AbortController | null} */
  #activeFetch = null;

  /**
   * Handles updates to the cart note.
   * @param {InputEvent} event - The input event in our text-area.
   */
  updateCartNote = debounce(async (event) => {
    if (!(event.target instanceof HTMLTextAreaElement)) return;

    const note = event.target.value;
    if (this.#activeFetch) {
      this.#activeFetch.abort();
    }

    const abortController = new AbortController();
    this.#activeFetch = abortController;

    // Dispatch the cart note update event before the fetch with a promise for the result
    const isDialog = Boolean(this.closest('dialog'));
    const deferredPromise = CartNoteUpdateEvent.createPromise();

    this.dispatchEvent(
      new CartNoteUpdateEvent({
        context: isDialog ? 'dialog' : 'cart',
        note,
        promise: deferredPromise.promise,
      })
    );

    try {
      const config = fetchConfig('json', {
        body: JSON.stringify({ note }),
      });

      const response = await fetch(Theme.routes.cart_update_url, {
        ...config,
        signal: abortController.signal,
      });

      const data = await response.json();

      deferredPromise.resolve({ cart: CartNoteUpdateEvent.createCartFromAjaxResponse(data) });
    } catch (error) {
      deferredPromise.reject(error);
      // Don't dispatch error for user-triggered aborts
      if (error instanceof Error && error.name !== 'AbortError') {
        this.dispatchEvent(
          new CartErrorEvent({
            error: error.message || 'Failed to update cart note',
            code: 'SERVICE_UNAVAILABLE',
          })
        );
      }
    } finally {
      this.#activeFetch = null;
      cartPerformance.measureFromEvent('note-update:user-action', event);
    }
  }, 200);
}

if (!customElements.get('cart-note')) {
  customElements.define('cart-note', CartNote);
}
