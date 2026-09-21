import { Component } from '@theme/component';
import {
  fetchConfig,
  debounce,
  onAnimationEnd,
  prefersReducedMotion,
  resetShimmer,
  startViewTransition,
} from '@theme/utilities';
import { morphSection, sectionRenderer } from '@theme/section-renderer';
import { ThemeEvents, QuantitySelectorUpdateEvent, CartSectionRestoredEvent } from '@theme/events';
import { cartPerformance } from '@theme/performance';
import {
  createViewEventElement,
  CartErrorEvent,
  CartDiscountUpdateEvent,
  CartLinesUpdateEvent,
  CartNoteUpdateEvent,
  StandardEvents,
} from '@shopify/events';

/** @typedef {import('./utilities').TextComponent} TextComponent */

/**
 * A custom element that displays a cart items component.
 *
 * @typedef {object} Refs
 * @property {HTMLElement[]} quantitySelectors - The quantity selector elements.
 * @property {HTMLTableRowElement[]} cartItemRows - The cart item rows.
 * @property {TextComponent} cartTotal - The cart total.
 *
 * @extends {Component<Refs>}
 */
export class CartItemsComponent extends createViewEventElement(Component) {
  /** @type {Set<Promise<void>>} */
  static #pendingQuantityUpdates = new Set();

  /**
   * Includes quantity mutations, their section renders, and control cleanup across all cart instances.
   * @returns {ReadonlyArray<Promise<void>>} A snapshot that cannot modify the shared pending set.
   */
  static get pendingQuantityUpdates() {
    return Array.from(CartItemsComponent.#pendingQuantityUpdates);
  }

  #debouncedOnChange = debounce(
    /** @param {Event} event */
    (event) => {
      if (event instanceof QuantitySelectorUpdateEvent) this.#onQuantityChange(event);
    },
    300
  );
  /** @type {Promise<any> | null} */
  #pendingCartFetch = null;

  /**
   * True when the event was dispatched from outside this cart-items-component (e.g.
   * `Shopify.actions.updateCart(...)` from an external app, or the SFAPI default
   * handler). Internal dispatchers (cart-discount-component, cart-note) live inside
   * `this` and either morph the section themselves or don't need a refresh — running
   * a fallback render in that case double-renders and can clobber form state.
   * @param {Event} event
   */
  #isExternalCartUpdate(event) {
    return !(event.target instanceof Node) || !this.contains(event.target);
  }

  /**
   * Refreshes this section when a cart AJAX response cannot include rendered section HTML.
   * @param {Object} [options] - Additional section morph options.
   * @param {boolean} [options.injectStylesheet]
   */
  async #refreshCartSection(options = {}) {
    try {
      await sectionRenderer.renderSection(this.sectionId, {
        cache: false,
        mode: this.isDrawer ? 'hydration' : 'full',
        ...options,
      });
      this.#updateCartQuantitySelectorButtonStates();
    } catch (error) {
      if (error?.name === 'AbortError') return;

      this.dispatchEvent(
        new CartErrorEvent({
          error: error?.message || 'Failed to refresh cart',
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    }
  }

  /** @param {CartDiscountUpdateEvent} event */
  #handleDiscountUpdate = (event) => {
    const isExternalCartUpdate = this.#isExternalCartUpdate(event);

    event.promise
      ?.then(({ detail }) => {
        if (!isExternalCartUpdate) return;

        const sectionsHtml = detail?.sections?.[this.sectionId];
        if (sectionsHtml) {
          sectionRenderer.abortRender(this.sectionId);
          morphSection(this.sectionId, sectionsHtml, { mode: this.isDrawer ? 'hydration' : 'full' });
          this.#updateCartQuantitySelectorButtonStates();
        } else {
          // External caller (Shopify.actions.updateCart or SFAPI default handler) didn't
          // attach sections; refetch so the discount UI reflects the post-mutation cart.
          this.#refreshCartSection();
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-items] Event promise rejected:', error);
      });
  };

  /** @param {CartNoteUpdateEvent} event */
  #handleNoteUpdate = (event) => {
    // Internal cart-note dispatches don't need a section refresh — the user typed the
    // value and the textarea retains it. Only external callers need the UI synced.
    if (!this.#isExternalCartUpdate(event)) return;
    event.promise
      ?.then(({ detail }) => {
        const sections = /** @type {Record<string, string> | undefined} */ (detail?.sections);
        const sectionsHtml = sections?.[this.sectionId];
        if (sectionsHtml) {
          sectionRenderer.abortRender(this.sectionId);
          morphSection(this.sectionId, sectionsHtml, { mode: this.isDrawer ? 'hydration' : 'full' });
        } else {
          this.#refreshCartSection();
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-items] Event promise rejected:', error);
      });
  };

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(StandardEvents.cartLinesUpdate, this.#handleCartUpdate);
    document.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
    document.addEventListener(StandardEvents.cartDiscountUpdate, this.#handleDiscountUpdate);
    document.addEventListener(StandardEvents.cartNoteUpdate, this.#handleNoteUpdate);
    window.addEventListener('pageshow', this.#handlePageShow);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(StandardEvents.cartLinesUpdate, this.#handleCartUpdate);
    document.removeEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
    document.removeEventListener(StandardEvents.cartDiscountUpdate, this.#handleDiscountUpdate);
    document.removeEventListener(StandardEvents.cartNoteUpdate, this.#handleNoteUpdate);
    window.removeEventListener('pageshow', this.#handlePageShow);
  }

  /**
   * Re-renders the cart section when the page is restored from the back/forward cache.
   *
   * A restored page replays a frozen DOM, so the line items still show whatever the cart
   * held before the shopper navigated away. `cart-icon.js` self-corrects its count bubble
   * on this same event, which is why the bubble and the cart body disagree until a reload.
   *
   * `persisted` alone does not cover Chrome. Chrome refuses the bfcache for any document holding
   * the Sign in with Shop iframe, `/services/login_with_shop/authorize` inside the shadow root of
   * `shopify-account > shop-login`, and every product page carries one. A shopper's Back there
   * rebuilds the document from the HTTP disk cache instead: `persisted` is false and the frozen
   * cart markup renders anyway. Only the navigation entry separates that from an ordinary page
   * view, so it is the second channel. Safari and Firefox do restore the same page and arrive
   * through `persisted`. Measured on os3 across all three browsers, 2026-09-03.
   *
   * Both channels are still needed. A restored document keeps its ORIGINAL navigation entry in
   * Chrome and Safari, reporting `navigate`, so `back_forward` alone would miss every real
   * restore. And `pageshow` fires after `load` on every ordinary navigation, so dropping both
   * guards would put a section fetch on every page view.
   *
   * @param {PageTransitionEvent} event
   */
  #handlePageShow = (event) => {
    const navigationEntry = globalThis.performance?.getEntriesByType?.('navigation')[0];
    const navigationType = CartItemsComponent.#isNavigationTiming(navigationEntry) ? navigationEntry.type : undefined;
    if (!event.persisted && navigationType !== 'back_forward') return;
    // `section_id` is optional in `snippets/cart-items-component.liquid` and the `sectionId`
    // getter throws without it. Every other caller reads it inside a promise chain that
    // already has a catch; this one runs straight off a window listener, so it would escape.
    if (!this.dataset.sectionId) return;

    // `cache: false` on both paths. A bfcache restore never fires `load`, so the renderer's cache
    // still holds the pre-navigation copy. A disk-cache Back does fire `load` and seeds the cache
    // from the stale document it just rebuilt. Either way the cached copy is the same stale HTML
    // the DOM already shows.
    sectionRenderer
      .renderSection(this.sectionId, {
        cache: false,
        mode: this.isDrawer ? 'hydration' : 'full',
        // Empty → non-empty adds the cart summary markup, which carries its own stylesheet.
        injectStylesheet: this.isDrawer && this.querySelector('[data-cart-drawer-empty]') !== null,
      })
      .then(() => {
        // Morph swaps the quantity selectors in place, so they never reconnect and their
        // min/max button states stay bound to the pre-restore quantities. A line restored to its
        // minimum would otherwise keep minus enabled: a wrong affordance and a wasted cart mutation.
        this.#updateCartQuantitySelectorButtonStates();
        // No drawer-open event fires on a restore, so the sticky summary measurement has to
        // be driven from here. `cart-drawer-component` listens for this.
        this.dispatchEvent(new CartSectionRestoredEvent());
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-items] bfcache restore render failed:', error);
      });
  };

  /**
   * Handles QuantitySelectorUpdateEvent change event.
   * @param {QuantitySelectorUpdateEvent} event - The event.
   */
  #onQuantityChange(event) {
    if (!(event.target instanceof Node) || !this.contains(event.target)) return;

    const { quantity, cartLine: line } = event.detail;

    // Cart items require a line number
    if (!line) return;

    if (quantity === 0) {
      return this.onLineItemRemove(line);
    }

    this.updateQuantity({
      line,
      quantity,
      action: 'change',
    });
    const lineItemRow = this.refs.cartItemRows[line - 1];

    if (!lineItemRow) return;

    const textComponent = /** @type {TextComponent | undefined} */ (lineItemRow.querySelector('text-component'));
    textComponent?.shimmer();
  }

  /**
   * Handles the line item removal.
   * @param {number} line - The line item index.
   */
  onLineItemRemove(line) {
    this.updateQuantity({
      line,
      quantity: 0,
      action: 'clear',
    });

    const cartItemRowToRemove = this.refs.cartItemRows[line - 1];

    if (!cartItemRowToRemove) return;

    const rowsToRemove = [
      cartItemRowToRemove,
      // Get all nested lines of the row to remove
      ...this.refs.cartItemRows.filter((row) => row.dataset.parentKey === cartItemRowToRemove.dataset.key),
    ];

    // If the cart item row is the last row, optimistically trigger the cart empty state
    const isEmptyCart = rowsToRemove.length == this.refs.cartItemRows.length;

    const template = document.getElementById('empty-cart-template');
    if (isEmptyCart && template instanceof HTMLTemplateElement) {
      const clone = document.importNode(template.content, true);

      startViewTransition(() => {
        document.getElementById('cart-drawer-heading')?.remove();
        this.replaceChildren(clone);
      }, [this.isDrawer ? 'empty-cart-drawer' : 'empty-cart-page']);

      return;
    }

    // Add class to the row to trigger the animation
    rowsToRemove.forEach((row) => {
      const remove = () => row.remove();

      if (prefersReducedMotion()) return remove();

      row.style.setProperty('--row-height', `${row.clientHeight}px`);
      row.classList.add('removing');

      // Remove the row after the animation ends
      onAnimationEnd(row, remove);
    });
  }

  /**
   * Updates the quantity.
   * @param {Object} config - The config.
   * @param {number} config.line - The line.
   * @param {number} config.quantity - The quantity.
   * @param {string} config.action - The action.
   */
  async updateQuantity(config) {
    const cartPerformaceUpdateMarker = cartPerformance.createStartingMarker(`${config.action}:user-action`);
    const deferredUpdatePromise = CartLinesUpdateEvent.createPromise();
    let completeQuantityUpdate = () => {};
    /** @type {Promise<void>} */
    const quantityUpdate = new Promise((resolve) => {
      completeQuantityUpdate = () => resolve();
    });
    CartItemsComponent.#pendingQuantityUpdates.add(quantityUpdate);

    try {
      this.#disableCartItems();

      const { line, quantity } = config;
      const { cartTotal } = this.refs;

      const cartItemsComponents = document.querySelectorAll('cart-items-component');
      const sectionsToUpdate = new Set([this.sectionId]);
      for (const item of cartItemsComponents) {
        if (item instanceof HTMLElement && item.dataset.sectionId) {
          sectionsToUpdate.add(item.dataset.sectionId);
        }
      }

      for (const sectionId of sectionsToUpdate) {
        sectionRenderer.abortRender(sectionId);
      }

      const body = JSON.stringify({
        line: line,
        quantity: quantity,
        sections: Array.from(sectionsToUpdate).join(','),
        sections_url: window.location.pathname,
      });

      cartTotal?.shimmer();

      const lineId = this.refs.cartItemRows[line - 1]?.dataset.key ?? '';
      this.dispatchEvent(
        new CartLinesUpdateEvent({
          action: config.action === 'change' && quantity > 0 ? 'update' : 'remove',
          context: 'cart',
          lines: [{ id: lineId, quantity }],
          promise: deferredUpdatePromise.promise,
        })
      );

      const response = await fetch(`${Theme.routes.cart_change_url}`, fetchConfig('json', { body }));
      const responseText = await response.text();
      const parsedResponseText = JSON.parse(responseText);

      resetShimmer(this);

      if (parsedResponseText.errors) {
        this.#handleCartError(line, parsedResponseText);
        deferredUpdatePromise.reject(new Error(parsedResponseText.errors));
        return;
      }

      const sections = /** @type {Record<string, string> | null | undefined} */ (parsedResponseText.sections);
      const sectionHTML = sections?.[this.sectionId];
      const parsedItemCount = Number(parsedResponseText.item_count);
      let newCartItemCount = Number.isFinite(parsedItemCount) ? parsedItemCount : 0;

      // Update data-cart-quantity for all matching variants
      this.#updateQuantitySelectors(parsedResponseText);

      if (!sectionHTML) {
        deferredUpdatePromise.resolve({
          cart: CartLinesUpdateEvent.createCartFromAjaxResponse(parsedResponseText),
          detail: {
            sections: sections ?? undefined,
            items: parsedResponseText.items,
            itemCount: newCartItemCount,
            source: 'cart-items-component',
            didError: false,
          },
        });

        await this.#refreshCartSection();
        return;
      }

      const newSectionHTML = new DOMParser().parseFromString(sectionHTML, 'text/html');

      // Grab the new cart item count from a hidden element
      const newCartHiddenItemCount = newSectionHTML.querySelector('[ref="cartItemCount"]')?.textContent;
      newCartItemCount = newCartHiddenItemCount ? parseInt(newCartHiddenItemCount, 10) : newCartItemCount;

      deferredUpdatePromise.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(parsedResponseText),
        detail: {
          sections: sections ?? undefined,
          items: parsedResponseText.items,
          itemCount: newCartItemCount,
          source: 'cart-items-component',
          didError: false,
        },
      });

      sectionRenderer.abortRender(this.sectionId);
      await morphSection(this.sectionId, sectionHTML, {
        mode: this.isDrawer ? 'hydration' : 'full',
      });

      this.#updateCartQuantitySelectorButtonStates();
    } catch (error) {
      console.error(error);
      deferredUpdatePromise.reject(error);

      this.dispatchEvent(
        new CartErrorEvent({
          error: error?.message || 'Failed to update cart',
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    } finally {
      try {
        this.#enableCartItems();
        cartPerformance.measureFromMarker(cartPerformaceUpdateMarker);
      } finally {
        CartItemsComponent.#pendingQuantityUpdates.delete(quantityUpdate);
        completeQuantityUpdate();
      }
    }
  }

  /**
   * Handles the cart error.
   * @param {number} line - The line.
   * @param {Object} parsedResponseText - The parsed response text.
   * @param {string} parsedResponseText.errors - The errors.
   */
  #handleCartError = (line, parsedResponseText) => {
    const quantitySelector = this.refs.quantitySelectors[line - 1];
    const quantityInput = quantitySelector?.querySelector('input');

    if (!quantityInput) throw new Error('Quantity input not found');

    quantityInput.value = quantityInput.defaultValue;

    const cartItemError = this.refs[`cartItemError-${line}`];
    const cartItemErrorContainer = this.refs[`cartItemErrorContainer-${line}`];

    if (!(cartItemError instanceof HTMLElement)) throw new Error('Cart item error not found');
    if (!(cartItemErrorContainer instanceof HTMLElement)) throw new Error('Cart item error container not found');

    cartItemError.textContent = parsedResponseText.errors;
    cartItemErrorContainer.classList.remove('hidden');

    this.dispatchEvent(
      new CartErrorEvent({
        error: parsedResponseText.errors || 'Cart update failed',
        code: 'INVALID',
      })
    );
  };

  /**
   * Handles the cart update.
   *
   * @param {CartLinesUpdateEvent} event
   */
  #handleCartUpdate = (event) => {
    if (event.target === this) return;

    event.promise
      ?.then(async ({ detail }) => {
        const sections = detail?.sections;
        const cartItemsHtml = sections?.[this.sectionId];
        // Animate empty → non-empty in the drawer (possible in squeeze mode
        // where the page is interactive alongside the open drawer). This also
        // needs the response stylesheet because it adds the cart summary markup.
        const wasEmptyCartDrawer = this.isDrawer && this.querySelector('[data-cart-drawer-empty]') !== null;
        /** @type {'hydration' | 'full'} */
        const mode = this.isDrawer ? 'hydration' : 'full';
        const morphOptions = {
          mode,
          injectStylesheet: wasEmptyCartDrawer,
        };

        if (cartItemsHtml) {
          sectionRenderer.abortRender(this.sectionId);
          const existingKeys = new Set(this.refs.cartItemRows?.map((row) => row.dataset.key) ?? []);

          if (wasEmptyCartDrawer) {
            startViewTransition(() => {
              morphSection(this.sectionId, cartItemsHtml, morphOptions);
            }, ['fill-cart-drawer']);
          } else {
            await morphSection(this.sectionId, cartItemsHtml, morphOptions);
          }

          // Animate newly added rows (reverse of the remove animation).
          if (!wasEmptyCartDrawer && !prefersReducedMotion()) {
            for (const row of this.refs.cartItemRows ?? []) {
              if (!existingKeys.has(row.dataset.key)) {
                row.classList.add('adding');
                onAnimationEnd(row, () => row.classList.remove('adding'));
              }
            }
          }

          // Update button states for all cart quantity selectors after morph
          this.#updateCartQuantitySelectorButtonStates();
        } else {
          this.#refreshCartSection(morphOptions);
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-items] Event promise rejected:', error);
      });
  };

  /**
   * Disables the cart items.
   */
  #disableCartItems() {
    this.classList.add('cart-items-disabled');
  }

  /**
   * Enables the cart items.
   */
  #enableCartItems() {
    this.classList.remove('cart-items-disabled');
  }

  /**
   * Updates quantity selectors for all matching variants in the cart.
   * @param {Object} updatedCart - The updated cart object.
   * @param {Array<{variant_id: number, quantity: number}>} [updatedCart.items] - The cart items.
   */
  #updateQuantitySelectors(updatedCart) {
    if (!updatedCart.items) return;

    for (const item of updatedCart.items) {
      const variantId = item.variant_id.toString();
      const selectors = document.querySelectorAll(`quantity-selector-component[data-variant-id="${variantId}"]`);

      for (const selector of selectors) {
        const input = selector.querySelector('input[data-cart-quantity]');
        if (!input) continue;

        input.setAttribute('data-cart-quantity', item.quantity.toString());

        // Update the quantity selector's internal state
        if ('updateCartQuantity' in selector && typeof selector.updateCartQuantity === 'function') {
          selector.updateCartQuantity();
        }
      }
    }
  }

  /**
   * Updates button states for all cart quantity selector components.
   */
  #updateCartQuantitySelectorButtonStates() {
    for (const selector of document.querySelectorAll('cart-quantity-selector-component')) {
      /** @type {any} */ (selector).updateButtonStates?.();
    }
  }

  async fetchCartData() {
    if (this.#pendingCartFetch) return this.#pendingCartFetch;

    this.#pendingCartFetch = (async () => {
      const response = await fetch(`${Theme.routes.cart_url}.json`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`Failed to fetch cart: ${response.status} ${response.statusText}`);
      const data = await response.json();
      return data;
    })().finally(() => {
      this.#pendingCartFetch = null;
    });

    return this.#pendingCartFetch;
  }

  /**
   * Gets the section id.
   * @returns {string} The section id.
   */
  get sectionId() {
    const { sectionId } = this.dataset;

    if (!sectionId) throw new Error('Section id missing');

    return sectionId;
  }

  /**
   * @returns {boolean} Whether the component is a drawer.
   */
  get isDrawer() {
    return this.dataset.drawer !== undefined;
  }

  /**
   * `getEntriesByType` is typed as the `PerformanceEntry` base, which has no `type`, and the DOM
   * lib has no per-string overload for `'navigation'`. `entryType` is the spec's discriminant and
   * lives on the base, so this narrows at runtime instead of asserting the way a cast would.
   *
   * @param {PerformanceEntry | undefined} entry
   * @returns {entry is PerformanceNavigationTiming}
   */
  static #isNavigationTiming(entry) {
    return entry?.entryType === 'navigation';
  }
}

if (!customElements.get('cart-items-component')) {
  customElements.define('cart-items-component', CartItemsComponent);
}
