import { Component } from '@theme/component';
import { QuantitySelectorUpdateEvent, ThemeEvents } from '@theme/events';
import { debounce, fetchConfig, resetShimmer } from '@theme/utilities';
import { morphSection, sectionRenderer } from '@theme/section-renderer';
import { CartErrorEvent, CartLinesUpdateEvent, StandardEvents } from '@shopify/events';
import { getScrollTop, scrollTo } from '@theme/scroll-container';

/**
 * A custom element that manages the quick order list section.
 *
 * @typedef {object} QuickOrderListComponentRefs
 * @property {HTMLTableRowElement[]} variantRows - The variant row elements
 * @property {HTMLElement} confirmationPanel - The remove all confirmation dialog
 * @property {HTMLElement} totalInfo - The total info section element
 * @property {HTMLElement} errorContainer - The error message container
 * @property {HTMLElement} errorText - The error message text element
 * @property {HTMLElement} successContainer - The success message container
 * @property {HTMLElement} successText - The success message text element
 * @property {HTMLElement} [paginationNav] - The pagination navigation element
 *
 * @extends Component<QuickOrderListComponentRefs>
 */
class QuickOrderListComponent extends Component {
  requiredRefs = [
    'variantRows',
    'confirmationPanel',
    'totalInfo',
    'errorContainer',
    'errorText',
    'successContainer',
    'successText',
  ];

  /** @type {AbortController|null} */
  #abortController = null;

  /** @type {Promise<unknown> | null} */
  #pendingQuantityUpdate = null;

  /** @type {(event: Event) => void} */
  #debouncedHandleQuantityUpdate;

  /** @type {(event: CartLinesUpdateEvent) => void} */
  #boundHandleCartUpdate;

  /** @type {HTMLElement|null} */
  #confirmationTrigger = null;

  /**
   * Gets the current page number from pagination controls
   * @returns {number}
   */
  get currentPage() {
    if (this.refs.paginationNav && this.refs.paginationNav.dataset.current_page) {
      const pageNum = parseInt(this.refs.paginationNav.dataset.current_page, 10);
      if (!isNaN(pageNum)) {
        return pageNum;
      }
    }
    return 1;
  }

  /**
   * Gets all cart variant IDs for the product from the data attribute
   * @returns {number[]}
   */
  get cartVariantIds() {
    const data = this.dataset.cartVariantIds;
    if (!data) return [];

    return JSON.parse(data);
  }

  /**
   * Gets the AJAX cart line keys (`<variant_id>:<hash>`) for items currently
   * in the cart for this product, parallel to `cartVariantIds`.
   * @returns {string[]}
   */
  get cartLineKeys() {
    const data = this.dataset.cartLineKeys;
    if (!data) return [];

    return JSON.parse(data);
  }

  connectedCallback() {
    super.connectedCallback();

    this.#debouncedHandleQuantityUpdate = debounce(this.#handleQuantityUpdate.bind(this), 300);
    this.#boundHandleCartUpdate = this.#handleCartUpdate.bind(this);

    this.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedHandleQuantityUpdate);
    document.addEventListener(StandardEvents.cartLinesUpdate, this.#boundHandleCartUpdate);
    document.addEventListener(StandardEvents.cartDiscountUpdate, this.#handleDiscountUpdate);
    this.addEventListener('keydown', this.#handleKeyDown, true);
    this.addEventListener('keyup', this.#handleKeyup, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedHandleQuantityUpdate);
    document.removeEventListener(StandardEvents.cartLinesUpdate, this.#boundHandleCartUpdate);
    document.removeEventListener(StandardEvents.cartDiscountUpdate, this.#handleDiscountUpdate);
    this.removeEventListener('keydown', this.#handleKeyDown, true);
    this.removeEventListener('keyup', this.#handleKeyup, true);

    this.#abortController?.abort();
    this.#confirmationTrigger = null;
  }

  /**
   * @param {EventTarget | null} target
   * @returns {target is HTMLInputElement}
   */
  #isQuantityInput(target) {
    return target instanceof HTMLInputElement && target.matches('input[type="number"][data-cart-quantity]');
  }

  /**
   * Keyboard navigation:
   * Enter key selects next quantity input
   * Shift+Enter selects previous quantity input
   * @param {KeyboardEvent} event
   */
  #handleKeyDown = (event) => {
    if (event.key !== 'Enter' || !this.#isQuantityInput(event.target)) {
      return;
    }
    event.preventDefault();

    // Get all VISIBLE quantity inputs (exclude hidden mobile/desktop variants)
    const allQuantityInputs = Array.from(this.querySelectorAll('input[type="number"][data-cart-quantity]')).filter(
      (input) => {
        return input instanceof HTMLElement && input.offsetParent !== null;
      }
    );

    if (allQuantityInputs.length <= 1) {
      return;
    }

    const currentIndex = allQuantityInputs.indexOf(event.target);
    if (currentIndex === -1) {
      return;
    }

    const offset = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + offset + allQuantityInputs.length) % allQuantityInputs.length;
    const nextInput = allQuantityInputs[nextIndex];

    event.target.blur();
    if (nextInput instanceof HTMLInputElement) {
      nextInput.select();
    }
  };

  /**
   * @param {KeyboardEvent} event
   */
  #handleKeyup = (event) => {
    if ((event.key === 'Tab' || event.key === 'Enter') && this.#isQuantityInput(event.target)) {
      this.#scrollToCenter(event.target);
    }
  };

  /**
   * @param {HTMLElement} element
   */
  #scrollToCenter(element) {
    element.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }

  /**
   * Handles pagination events
   * @param {Object<string, string>} data - URL search params
   * @param {Event} event - The click event
   */
  async onPaginationControlClick(data, event) {
    event.preventDefault();
    const sectionId = this.dataset.sectionId;

    if (!this.dataset.url || !sectionId) return;

    this.#abortController?.abort();
    this.#abortController = new AbortController();

    const newURL = new URL(this.dataset.url, window.location.origin);
    for (const [key, value] of Object.entries(data)) {
      newURL.searchParams.set(key, value);
    }

    await sectionRenderer.renderSection(sectionId, {
      // Rows carry cart line keys and quantities, which a cached page may no longer match.
      cache: false,
      url: newURL,
    });
    this.#scrollToTopOfSection();
    // Morph preserves focus on the pagination button — defer focus to override it
    // after the morph and any MutationObserver callbacks have settled.
    requestAnimationFrame(() => this.#focusFirstQuantityInput());
  }

  /**
   * Handles removing a single variant item (sets quantity to 0)
   * @param {string} variantId - The variant ID to remove
   * @param {Event} event - The click event
   */
  async onLineItemRemove(variantId, event) {
    event.preventDefault();

    const targetRow = this.refs.variantRows.find((row) => row.dataset.variantId === String(variantId));
    if (!(targetRow instanceof HTMLElement)) return;

    const quantityInput = targetRow.querySelector('input[type="number"]');
    if (quantityInput instanceof HTMLInputElement) {
      quantityInput.value = '0';
      quantityInput.dispatchEvent(new QuantitySelectorUpdateEvent(0, Number(quantityInput.dataset.cartLine)));
    }
  }

  /**
   * Handles removing all items from the cart
   * @param {Event} event - The click event
   */
  async onRemoveAll(event) {
    event.preventDefault();
    const idsToRemove = this.cartVariantIds;

    this.#clearSuccessMessage();
    this.#clearErrorMessage();
    this.#applyShimmerEffects(idsToRemove);

    this.#abortController?.abort();
    this.#abortController = new AbortController();

    /**
     * Keyed by cart line key rather than variant ID: a variant ID only targets the
     * first of a variant's lines, leaving any lines split off by discounts behind.
     * @type {Record<string, number>}
     */
    const updates = {};

    for (const lineKey of this.cartLineKeys) {
      updates[lineKey] = 0;
    }

    if (Object.keys(updates).length === 0) {
      resetShimmer(this);
      return;
    }

    const deferredPromise = CartLinesUpdateEvent.createPromise();
    this.dispatchEvent(
      new CartLinesUpdateEvent({
        action: 'remove',
        context: 'cart',
        lines: this.cartLineKeys.map((key) => ({ id: key, quantity: 0 })),
        promise: deferredPromise.promise,
      })
    );

    try {
      const sectionIds = this.#getSectionIds();
      const sectionsUrl = new URL(window.location.pathname, window.location.origin);
      sectionsUrl.searchParams.set('page', this.currentPage.toString());

      const body = JSON.stringify({
        updates: updates,
        sections: sectionIds.join(','),
        sections_url: sectionsUrl.pathname + sectionsUrl.search,
      });

      const response = await fetch(Theme.routes.cart_update_url, {
        ...fetchConfig('json', { body }),
        signal: this.#abortController.signal,
      });

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      resetShimmer(this);

      if (data.errors) {
        this.#showErrorMessage(data.errors);

        const errorMessage = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
        deferredPromise.reject(new Error(errorMessage));
        this.dispatchEvent(
          new CartErrorEvent({
            error: errorMessage,
            code: 'INVALID',
          })
        );
      } else {
        deferredPromise.resolve(
          /** @type {any} */ ({
            cart: CartLinesUpdateEvent.createCartFromAjaxResponse(data),
            detail: {
              source: 'quick-order-remove-all',
              sections: data.sections,
              didError: false,
            },
          })
        );
        this.#updateSectionHTML(data);
        this.#toggleConfirmationPanel(false);
        this.#confirmationTrigger = null;
      }
    } catch (error) {
      deferredPromise.reject(error);

      if (error.name !== 'AbortError') {
        resetShimmer(this);

        this.dispatchEvent(
          new CartErrorEvent({
            error: error?.message || 'Failed to update cart',
            code: 'SERVICE_UNAVAILABLE',
          })
        );

        throw error;
      }
    }
  }

  /**
   * Reads the cart lines rendered for a variant row. Discounts such as Buy X Get Y
   * can split a single variant across several cart lines.
   * @param {HTMLElement} variantRow - The variant row element
   * @returns {{ key: string, quantity: number }[]}
   */
  #getVariantCartLines(variantRow) {
    try {
      const keys = JSON.parse(variantRow.dataset.cartLineKeys || '[]');
      const quantities = JSON.parse(variantRow.dataset.cartLineQuantities || '[]');
      if (!Array.isArray(keys) || !Array.isArray(quantities)) return [];

      return keys.map((key, index) => ({ key: String(key), quantity: Number(quantities[index]) || 0 }));
    } catch {
      return [];
    }
  }

  /**
   * Builds an AJAX `updates` payload, keyed by cart line key, that moves a variant's
   * total cart quantity to `targetQuantity`.
   *
   * The cart applies a line update as the difference between the requested quantity
   * and that line's current quantity. Sending the variant total to one line of a
   * split variant therefore over-counts by the quantity held in the other lines.
   * Increases are added to the first line; decreases are taken from the lines in order.
   * @param {{ key: string, quantity: number }[]} lines - The variant's cart lines
   * @param {number} currentQuantity - The variant's current total cart quantity
   * @param {number} targetQuantity - The requested total cart quantity
   * @returns {Record<string, number>}
   */
  #buildLineUpdates(lines, currentQuantity, targetQuantity) {
    /** @type {Record<string, number>} */
    const updates = {};
    const [firstLine] = lines;
    if (!firstLine) return updates;

    const delta = targetQuantity - currentQuantity;
    if (delta > 0) {
      updates[firstLine.key] = firstLine.quantity + delta;
      return updates;
    }

    let remaining = -delta;
    for (const line of lines) {
      if (remaining <= 0) break;

      const removed = Math.min(line.quantity, remaining);
      updates[line.key] = line.quantity - removed;
      remaining -= removed;
    }

    return updates;
  }

  /**
   * Handles quantity selector updates
   * @param {CustomEvent} event - The quantity update event
   */
  async #handleQuantityUpdate(event) {
    if (!(event instanceof QuantitySelectorUpdateEvent)) return;

    // Only handle events from our own quantity selectors
    if (!(event.target instanceof Node) || !this.contains(event.target)) return;

    const { quantity } = event.detail;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const variantRow = this.refs.variantRows.find((row) => {
      return row.contains(target);
    });

    if (!variantRow) return;

    const variantId = variantRow.dataset.variantId;
    if (!variantId) return;

    const cartLines = this.#getVariantCartLines(variantRow);
    let currentCartQuantity = 0;
    if (cartLines.length > 0) {
      for (const line of cartLines) currentCartQuantity += line.quantity;
    } else {
      const quantityInput = /** @type {HTMLInputElement|null} */ (
        variantRow.querySelector('input[data-cart-quantity]')
      );
      currentCartQuantity = quantityInput ? parseInt(quantityInput.dataset.cartQuantity || '0') || 0 : 0;
    }

    this.#clearSuccessMessage();
    this.#clearErrorMessage();

    if (currentCartQuantity === quantity) {
      return;
    }

    this.#applyShimmerEffects([variantId]);

    this.#disableQuickOrderListItems();
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    /** @type {'add' | 'remove' | 'update'} */
    let action;
    if (currentCartQuantity === 0) {
      action = 'add';
    } else if (quantity === 0) {
      action = 'remove';
    } else {
      action = 'update';
    }

    /** @type {Record<string, number>} */
    const updates =
      cartLines.length > 0
        ? this.#buildLineUpdates(cartLines, currentCartQuantity, quantity)
        : { [variantId]: quantity };

    const deferredPromise = CartLinesUpdateEvent.createPromise();
    if (action === 'add') {
      this.dispatchEvent(
        new CartLinesUpdateEvent({
          action,
          context: 'cart',
          lines: [{ merchandiseId: variantId, quantity }],
          promise: deferredPromise.promise,
        })
      );
    } else {
      // A decrease can empty one split line while another remains, so lines set to zero
      // are reported as a removal rather than as an update.
      const lineChanges = Object.entries(updates).map(([id, lineQuantity]) => ({ id, quantity: lineQuantity }));
      const updatedLines = lineChanges.filter((line) => line.quantity > 0);
      const removedLines = lineChanges.filter((line) => line.quantity === 0);

      if (updatedLines.length > 0) {
        this.dispatchEvent(
          new CartLinesUpdateEvent({
            action: 'update',
            context: 'cart',
            lines: updatedLines,
            promise: deferredPromise.promise,
          })
        );
      }

      if (removedLines.length > 0) {
        this.dispatchEvent(
          new CartLinesUpdateEvent({
            action: 'remove',
            context: 'cart',
            lines: removedLines,
            promise: deferredPromise.promise,
          })
        );
      }
    }

    try {
      // Include page parameter in sections URL to maintain pagination state
      const sectionsUrl = new URL(window.location.pathname, window.location.origin);
      sectionsUrl.searchParams.set('page', this.currentPage.toString());

      const body = JSON.stringify({
        updates: updates,
        sections: this.#getSectionIds().join(','),
        sections_url: sectionsUrl.pathname + sectionsUrl.search,
      });

      const response = await fetch(Theme.routes.cart_update_url, {
        ...fetchConfig('json', { body }),
        signal: this.#abortController.signal,
      });

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      resetShimmer(this);

      if (data.errors) {
        this.#showErrorMessage(data.errors);
        if (this.dataset.sectionId) {
          const url = new URL(window.location.href);
          url.searchParams.set('page', this.currentPage.toString());
          await sectionRenderer.renderSection(this.dataset.sectionId, { cache: false, url });
        }

        const errorMessage = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
        deferredPromise.reject(new Error(errorMessage));
        this.dispatchEvent(
          new CartErrorEvent({
            error: errorMessage,
            code: 'INVALID',
          })
        );
      } else {
        deferredPromise.resolve(
          /** @type {any} */
          ({
            cart: CartLinesUpdateEvent.createCartFromAjaxResponse(data),
            detail: {
              sections: data.sections,
              items: data.items,
              source: 'quick-order-quantity',
              variantId: variantId,
              didError: false,
            },
          })
        );
        this.#updateSectionHTML(data);
        // Bundled section rendering can fail independently of the cart update.
        this.#enableQuickOrderListItems();

        const quantityAdded = quantity - currentCartQuantity;
        if (quantityAdded > 0) {
          this.#showSuccessMessage(quantityAdded);
        }
      }
    } catch (error) {
      deferredPromise.reject(error);

      if (error.name !== 'AbortError') {
        this.#enableQuickOrderListItems();
        resetShimmer(this);

        this.dispatchEvent(
          new CartErrorEvent({
            error: error?.message || 'Failed to update cart',
            code: 'SERVICE_UNAVAILABLE',
          })
        );

        throw error;
      }
    }
  }

  /**
   * Re-renders the section after a discount change. Applying or removing a discount can
   * merge or re-split cart lines, which changes the line keys and quantities on each row.
   * Wait for quantity responses before refreshing so their morphs cannot cancel the discount refresh.
   * @param {Event} event - The cart discount update event
   */
  #handleDiscountUpdate = async (event) => {
    const { promise } = /** @type {{ promise?: Promise<unknown> }} */ (event);
    if (!promise || !this.dataset.sectionId) return;

    // Rows describe the pre-discount cart until the re-render lands, so block edits until then.
    this.#disableQuickOrderListItems();

    try {
      const promises = [promise];

      if (this.#pendingQuantityUpdate) {
        promises.push(this.#pendingQuantityUpdate);
      }

      await Promise.allSettled(promises);

      if (!this.dataset.sectionId) return;

      const url = new URL(window.location.href);
      url.searchParams.set('page', this.currentPage.toString());

      await sectionRenderer.renderSection(this.dataset.sectionId, {
        cache: false,
        url,
      });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('[quick-order-list] Discount render failed:', error);
      }
    } finally {
      this.#enableQuickOrderListItems();
    }
  };

  /**
   * Handles cart update events from other components. Records this component's own update
   * promise as a settlement-only value so discount refreshes can wait without double-reporting.
   * @param {CartLinesUpdateEvent} event - The cart update event
   */
  async #handleCartUpdate(event) {
    if (event.target === this && event.promise) {
      this.#pendingQuantityUpdate = event.promise.catch(() => undefined);
      return;
    }

    // Abort any in-flight fetch immediately (before waiting for the promise),
    // so rapid updates cancel stale renders without delay.
    this.#enableQuickOrderListItems();
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    const { promise } = event;
    if (!promise) return;

    promise
      .then(async ({ detail }) => {
        // Don't process our own events to avoid double updates
        if (detail?.source === 'quick-order-quantity' || detail?.source === 'quick-order-remove-all') {
          return;
        }

        const sections = detail?.sections;
        if (sections && this.dataset.sectionId && sections[this.dataset.sectionId]) {
          this.#updateSectionHTML({ sections });
          return;
        }

        if (this.dataset.sectionId) {
          const url = new URL(window.location.href);
          url.searchParams.set('page', this.currentPage.toString());

          await sectionRenderer.renderSection(this.dataset.sectionId, {
            cache: false,
            url,
          });
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[quick-order-list] Event promise rejected:', error);
      });
  }

  #disableQuickOrderListItems() {
    this.classList.add('quick-order-list-disabled');
  }

  #enableQuickOrderListItems() {
    this.classList.remove('quick-order-list-disabled');
  }

  /**
   * Shows the remove all confirmation dialog
   * @param {Event} event - The click event
   */
  showRemoveAllConfirmation(event) {
    event.preventDefault();
    this.#confirmationTrigger = /** @type {HTMLElement} */ (event.target);
    this.#toggleConfirmationPanel(true);
  }

  /**
   * Hides the remove all confirmation
   * @param {Event} event - The click event
   */
  hideRemoveAllConfirmation(event) {
    event.preventDefault();
    this.#toggleConfirmationPanel(false);
    this.#confirmationTrigger?.focus();
    this.#confirmationTrigger = null;
  }

  /**
   * Toggles the confirmation panel visibility
   * @param {boolean} show
   */
  #toggleConfirmationPanel(show) {
    this.refs.confirmationPanel.classList.toggle('hidden', !show);
    this.refs.totalInfo.classList.toggle('confirmation-visible', show);
  }

  /**
   * Shows an error message in the error container
   * @param {string} message - The error message to display
   */
  #showErrorMessage(message) {
    this.refs.errorText.textContent = message;
    this.refs.errorContainer.classList.remove('hidden');
  }

  /**
   * Hides the error messages
   */
  #clearErrorMessage() {
    this.refs.errorContainer.classList.add('hidden');
  }

  /**
   * Shows success message in the success container
   * @param {number} quantityAdded - The number of items added
   */
  #showSuccessMessage(quantityAdded) {
    this.#clearErrorMessage();

    const oneItemText = Theme?.translations?.items_added_to_cart_one || '1 item added to cart';
    const itemsText = Theme?.translations?.items_added_to_cart_other || '{{ count }} items added to cart';

    const message = quantityAdded === 1 ? oneItemText : itemsText.replace('{{ count }}', quantityAdded.toString());

    this.refs.successText.textContent = message;
    this.refs.successContainer.classList.remove('hidden');
  }

  #clearSuccessMessage() {
    this.refs.successContainer.classList.add('hidden');
  }

  /**
   * Applies shimmer effects to price elements
   * @param {Array<string|number>} variantIds - Array of variant IDs to apply shimmer to
   */
  #applyShimmerEffects(variantIds) {
    for (const variantId of variantIds) {
      const variantRow = this.refs.variantRows.find((row) => row.dataset.variantId === String(variantId));
      if (variantRow) {
        const variantTotal = /** @type {import('./utilities').TextComponent|null} */ (
          variantRow.querySelector('.variant-item__total-price')
        );
        variantTotal?.shimmer();
      }
    }

    const totalPrice = /** @type {import('./utilities').TextComponent|null} */ (
      this.querySelector('text-component[ref="totalPrice"]')
    );
    totalPrice?.shimmer();
  }

  #scrollToTopOfSection() {
    // Defer layout read until scroll action to batch with other layout work
    requestAnimationFrame(() => {
      const top = this.getBoundingClientRect().top;
      scrollTo({ top: top + getScrollTop(), behavior: 'smooth' });
    });
  }

  #focusFirstQuantityInput() {
    for (const input of this.querySelectorAll('input[type="number"][data-cart-quantity]')) {
      if (input instanceof HTMLElement && input.offsetParent !== null) {
        input.focus({ preventScroll: true });
        return;
      }
    }
  }

  /**
   * Updates section HTML using morphSection
   * @param {{ sections?: Record<string, string> }} data - Response data containing sections
   */
  #updateSectionHTML(data) {
    if (data.sections && this.dataset.sectionId) {
      const sectionHtml = data.sections[this.dataset.sectionId];
      if (sectionHtml) {
        // A pending section render would otherwise morph older cart markup over this response.
        sectionRenderer.abortRender(this.dataset.sectionId);
        morphSection(this.dataset.sectionId, sectionHtml);
      }
    }
  }

  /**
   * Gets the section IDs for updating
   * @returns {string[]} Array of section IDs
   */
  #getSectionIds() {
    const sectionIds = [];

    if (this.dataset.sectionId) {
      sectionIds.push(this.dataset.sectionId);
    }

    // Also include all cart-items-component sections (like cart drawer) for smooth updates
    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    for (const component of cartItemsComponents) {
      if (!(component instanceof HTMLElement)) continue;
      if (component.dataset.sectionId && !sectionIds.includes(component.dataset.sectionId)) {
        sectionIds.push(component.dataset.sectionId);
      }
    }

    return sectionIds;
  }
}

if (!customElements.get('quick-order-list-component')) {
  customElements.define('quick-order-list-component', QuickOrderListComponent);
}
