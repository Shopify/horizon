import { OverflowList } from '@theme/overflow-list';
import VariantPicker from '@theme/variant-picker';
import { ProductComponent } from '@theme/view-event-elements';
import { debounce, isDesktopBreakpoint, mediaQueryLarge, yieldToMainThread } from '@theme/utilities';
import { SlideshowSelectEvent } from '@theme/events';
import { morph } from '@theme/morph';
import { StandardEvents, ProductSelectEvent } from '@shopify/events';

/**
 * @typedef {object} ProductCardLinkRefs
 * @property {HTMLElement} [cardGallery] - The card gallery element.
 * @property {HTMLImageElement[]} [imagesToTransition] - The images to transition.
 */

/**
 * A custom element for product links with images for transitions to PDP.
 * This is a base class that is extended by ProductCard.
 * Used directly by resource-card.liquid for non-product-card scenarios.
 * Extends ProductComponent to automatically emit product:view events when visible.
 *
 * @template {ProductCardLinkRefs} [T=ProductCardLinkRefs]
 * @extends {ProductComponent<T>}
 */
export class ProductCardLink extends ProductComponent {
  get productTransitionEnabled() {
    return this.getAttribute('data-product-transition') === 'true';
  }

  get featuredMediaUrl() {
    return this.getAttribute('data-featured-media-url');
  }

  /**
   * Handles the click event for view transitions.
   * @param {Event} event
   */
  handleViewTransition(event) {
    // If the event has been prevented, don't do anything, another component is handling the click
    if (event.defaultPrevented) return;

    // If the event was on an interactive element, don't do anything, this is not a navigation
    if (event.target instanceof Element) {
      const interactiveElement = event.target.closest('button, input, label, select, [tabindex="1"]');
      if (interactiveElement) return;
    }

    if (!this.productTransitionEnabled) return;

    const { cardGallery } = this.refs;
    if (!cardGallery || !cardGallery.hasAttribute('data-view-transition-to-main-product')) return;

    // Check on the current active image, whether it's a product card image or a resource card image
    const { imagesToTransition } = this.refs;
    const activeImage =
      imagesToTransition?.find(
        (/** @type {HTMLImageElement} */ image) =>
          image.closest('slideshow-slide')?.getAttribute('aria-hidden') === 'false'
      ) || imagesToTransition?.[imagesToTransition.length - 1];

    if (activeImage instanceof HTMLImageElement) this.#setImageSrcset(activeImage);

    cardGallery.setAttribute('data-view-transition-type', 'product-image-transition');
    cardGallery.setAttribute('data-view-transition-triggered', 'true');
  }

  /**
   * Sets the srcset for the image
   * @param {HTMLImageElement} image
   */
  #setImageSrcset(image) {
    if (!this.featuredMediaUrl) return;

    const currentImageUrl = new URL(image.currentSrc);

    // Deliberately not using origin, as it includes the protocol, which is usually skipped for featured media
    const currentImageRawUrl = currentImageUrl.host + currentImageUrl.pathname;

    if (!this.featuredMediaUrl.includes(currentImageRawUrl)) {
      const imageFade = image.animate([{ opacity: 0.8 }, { opacity: 1 }], {
        duration: 125,
        easing: 'ease-in-out',
      });

      imageFade.onfinish = () => {
        image.srcset = this.featuredMediaUrl ?? '';
      };
    }
  }
}

if (!customElements.get('product-card-link')) {
  customElements.define('product-card-link', ProductCardLink);
}

/**
 * A custom element that displays a product card.
 * Extends ProductCardLink to inherit view transition functionality.
 *
 * @typedef {object} ProductCardRefs
 * @property {HTMLAnchorElement} productCardLink - The product card link element.
 * @property {import('slideshow').Slideshow} [slideshow] - The slideshow component.
 * @property {import('quick-add').QuickAddComponent} [quickAdd] - The quick add component.
 * @property {HTMLElement} [cardGallery] - The card gallery component.
 * @property {HTMLImageElement[]} [imagesToTransition] - The images to transition.
 * @extends {ProductCardLink<ProductCardRefs>}
 */
export class ProductCard extends ProductCardLink {
  requiredRefs = ['productCardLink'];

  get productPageUrl() {
    return this.refs.productCardLink.href;
  }

  /**
   * Gets the currently selected variant ID from the product card
   * @returns {string | null} The variant ID or null if none selected
   */
  getSelectedVariantId() {
    const checkedInput = /** @type {HTMLInputElement | null} */ (
      this.querySelector('input[type="radio"]:checked[data-variant-id]')
    );

    return checkedInput?.dataset.variantId || null;
  }

  /**
   * Gets the product card link element
   * @returns {HTMLAnchorElement | null} The product card link or null
   */
  getProductCardLink() {
    return this.refs.productCardLink || null;
  }

  #fetchProductPageHandler = () => {
    this.refs.quickAdd?.fetchProductPage(this.productPageUrl);
  };

  /**
   * Navigates to a URL link. Respects modifier keys for opening in new tab/window.
   * @param {Event} event - The event that triggered the navigation.
   * @param {URL} url - The URL to navigate to.
   */
  #navigateToURL = (event, url) => {
    // Check for modifier keys that should open in new tab/window (only for mouse events)
    const shouldOpenInNewTab =
      event instanceof MouseEvent && (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1);

    if (shouldOpenInNewTab) {
      event.preventDefault();
      window.open(url.href, '_blank');
      return;
    } else {
      window.location.href = url.href;
    }
  };

  connectedCallback() {
    super.connectedCallback();

    const link = this.refs.productCardLink;
    if (!(link instanceof HTMLAnchorElement)) throw new Error('Product card link not found');
    this.#handleQuickAdd();

    this.addEventListener(StandardEvents.productSelect, this.#handleProductSelect);
    this.addEventListener(SlideshowSelectEvent.eventName, this.#handleSlideshowSelect);
    mediaQueryLarge.addEventListener('change', this.#handleQuickAdd);

    this.addEventListener('click', this.navigateToProduct);

    // Preload the next image on the slideshow to avoid white flashes on previewImage
    setTimeout(() => {
      if (this.refs.slideshow?.isNested) {
        this.#preloadNextPreviewImage();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.navigateToProduct);
  }

  #preloadNextPreviewImage() {
    const currentSlide = this.refs.slideshow?.slides?.[this.refs.slideshow?.current];
    currentSlide?.nextElementSibling?.querySelector('img[loading="lazy"]')?.removeAttribute('loading');
  }

  /**
   * Handles the quick add event.
   */
  #handleQuickAdd = () => {
    this.removeEventListener('pointerenter', this.#fetchProductPageHandler);
    this.removeEventListener('focusin', this.#fetchProductPageHandler);

    if (isDesktopBreakpoint()) {
      this.addEventListener('pointerenter', this.#fetchProductPageHandler);
      this.addEventListener('focusin', this.#fetchProductPageHandler);
    }
  };

  /**
   * Handles the product select event (variant selected and updated).
   * @param {ProductSelectEvent} event - The product select event.
   */
  #handleProductSelect = (event) => {
    // Update variant picker when variant:selected event fires
    const { optionValueId } = event.detail ?? {};
    if (optionValueId && event.target !== this.variantPicker) {
      this.variantPicker?.updateSelectedOption(optionValueId);
    }

    // Wait for variant:update data via promise
    event.promise
      .then(({ detail }) => {
        if (!detail?.html) return;

        const { html } = detail;

        // Update price, availability, and URL based on new variant
        this.updatePrice(html);
        this.#isUnavailableVariantSelected(html);
        this.#updateProductUrl(html);
        this.refs.quickAdd?.fetchProductPage(this.productPageUrl);

        if (event.target !== this.variantPicker) {
          this.variantPicker?.updateVariantPicker(html);
        }

        this.#updateVariantImages();
        this.#previousSlideIndex = null;

        // Remove attribute after re-rendering since a variant selection has been made
        this.removeAttribute('data-no-swatch-selected');

        // Force overflow list to reflow after variant update
        this.#updateOverflowList();
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[product-card] Event promise rejected:', error);
      });
  };

  /**
   * Forces the overflow list to recalculate by dispatching a reflow event.
   * This ensures the overflow counter displays correctly after variant updates.
   */
  #updateOverflowList() {
    // Find the overflow list in the variant picker
    const overflowList = this.querySelector('swatches-variant-picker-component overflow-list');
    const isActiveOverflowList = overflowList?.querySelector('[slot="overflow"]') ? true : false;
    if (!overflowList || !isActiveOverflowList) return;

    // Use requestAnimationFrame to ensure DOM has been updated
    requestAnimationFrame(() => {
      // Dispatch a reflow event to trigger recalculation
      overflowList.dispatchEvent(
        new CustomEvent('reflow', {
          bubbles: true,
          detail: {},
        })
      );
    });
  }

  /**
   * Updates the DOM with a new price.
   * @param {Document} html - The parsed HTML document with updated variant data.
   */
  updatePrice(html) {
    const priceContainer = this.querySelectorAll(`product-price [ref='priceContainer']`)[1];
    const newPriceElement = html.querySelector(`product-price [ref='priceContainer']`);

    if (newPriceElement && priceContainer) {
      morph(priceContainer, newPriceElement);
    }
  }

  /**
   * Updates the product URL based on the variant update.
   * @param {Document} html - The parsed HTML document with updated variant data.
   */
  #updateProductUrl(html) {
    const responseProductCard = html.querySelector('product-card');
    const anchorElement = responseProductCard?.querySelector('a');
    const featuredMediaUrl = responseProductCard?.getAttribute('data-featured-media-url');

    // Update the featured media URL for view transitions (inherited from ProductCardLink)
    if (featuredMediaUrl) {
      this.setAttribute('data-featured-media-url', featuredMediaUrl);
    }

    if (anchorElement instanceof HTMLAnchorElement) {
      // If the href is empty, don't update the product URL eg: unavailable variant
      if (anchorElement.getAttribute('href')?.trim() === '') return;

      const productUrl = anchorElement.href;
      const { productCardLink, productTitleLink, cardGalleryLink } = this.refs;

      productCardLink.href = productUrl;
      if (cardGalleryLink instanceof HTMLAnchorElement) {
        cardGalleryLink.href = productUrl;
      }
      if (productTitleLink instanceof HTMLAnchorElement) {
        productTitleLink.href = productUrl;
      }
    }
  }

  /**
   * Checks if an unavailable variant is selected.
   * @param {Document} html - The parsed HTML document with updated variant data.
   */
  #isUnavailableVariantSelected(html) {
    const allVariants = /** @type {NodeListOf<HTMLInputElement>} */ (html.querySelectorAll('input:checked'));

    for (const variant of allVariants) {
      this.#toggleAddToCartButton(variant.dataset.optionAvailable === 'true');
    }
  }

  /**
   * Toggles the add to cart button state.
   * @param {boolean} enable - Whether to enable or disable the button.
   */
  #toggleAddToCartButton(enable) {
    const addToCartButton = this.querySelector('.add-to-cart__button button');

    if (addToCartButton instanceof HTMLButtonElement) {
      addToCartButton.disabled = !enable;
    }
  }

  /**
   * Hide the variant images that are not for the selected variant.
   */
  #updateVariantImages() {
    const { slideshow } = this.refs;
    if (!this.variantPicker?.selectedOption) {
      return;
    }

    const selectedImageId = this.variantPicker?.selectedOption.dataset.optionMediaId;

    if (slideshow && selectedImageId) {
      const { slides = [] } = slideshow.refs;

      for (const slide of slides) {
        if (slide.getAttribute('variant-image') == null) continue;

        slide.hidden = slide.getAttribute('slide-id') !== selectedImageId;
      }

      slideshow.select({ id: selectedImageId }, undefined, { animate: false });
    }
  }

  /**
   * Gets all variant inputs.
   * @returns {NodeListOf<HTMLInputElement>} All variant input elements.
   */
  get allVariants() {
    return this.querySelectorAll('input[data-variant-id]');
  }

  /**
   * Gets the variant picker component.
   * @returns {VariantPicker | null} The variant picker component.
   */
  get variantPicker() {
    return this.querySelector('swatches-variant-picker-component');
  }
  /** @type {number | null} */
  #previousSlideIndex = null;

  /**
   * Handles the slideshow select event.
   * @param {SlideshowSelectEvent} event - The slideshow select event.
   */
  #handleSlideshowSelect = (event) => {
    if (event.detail.userInitiated) {
      this.#previousSlideIndex = event.detail.index;
    }
  };

  /**
   * Previews a variant.
   * @param {string} id - The id of the variant to preview.
   */
  previewVariant(id) {
    const { slideshow } = this.refs;

    if (!slideshow) return;

    this.resetVariant.cancel();
    slideshow.select({ id }, undefined, { animate: false });
  }

  /**
   * Previews the next image.
   * @param {PointerEvent} event - The pointer event.
   */
  previewImage(event) {
    if (event.pointerType !== 'mouse') return;

    const { slideshow } = this.refs;

    if (!slideshow) return;

    this.resetVariant.cancel();

    if (this.#previousSlideIndex != null && this.#previousSlideIndex > 0) {
      slideshow.select(this.#previousSlideIndex, undefined, { animate: false });
    } else {
      slideshow.next(undefined, { animate: false });
      setTimeout(() => this.#preloadNextPreviewImage());
    }
  }

  /**
   * Resets the image to the variant image.
   * @param {PointerEvent} event - The pointer event.
   */
  resetImage(event) {
    if (event.pointerType !== 'mouse') return;

    const { slideshow } = this.refs;

    if (!this.variantPicker) {
      if (!slideshow) return;
      slideshow.previous(undefined, { animate: false });
    } else {
      this.#resetVariant();
    }
  }

  /**
   * Resets the image to the variant image.
   */
  #resetVariant = () => {
    const { slideshow } = this.refs;

    if (!slideshow) return;

    // If we have a selected variant, always use its image
    if (this.variantPicker?.selectedOption) {
      const id = this.variantPicker.selectedOption.dataset.optionMediaId;
      if (id) {
        slideshow.select({ id }, undefined, { animate: false });
        return;
      }
    }

    // No variant selected - use initial slide if it's valid
    const initialSlide = slideshow.initialSlide;
    const slideId = initialSlide?.getAttribute('slide-id');
    if (initialSlide && slideshow.slides?.includes(initialSlide) && slideId) {
      slideshow.select({ id: slideId }, undefined, { animate: false });
      return;
    }

    // No valid initial slide or selected variant - go to previous
    slideshow.previous(undefined, { animate: false });
  };

  /**
   * Intercepts the click event on the product card anchor, we want
   * to use this to add an intermediate state to the history.
   * This intermediate state captures the page we were on so that we
   * navigate back to the same page when the user navigates back.
   * In addition to that, it captures the product card anchor so that we
   * have the specific product card in view.
   *
   * A product card can have other interactive elements like variant picker,
   * so we do not navigate if the click was on one of those elements.
   *
   * @param {Event} event
   */
  navigateToProduct = (event) => {
    if (!(event.target instanceof Element)) return;

    // Don't navigate if this product card is marked as no-navigation (e.g., in theme editor)
    if (this.hasAttribute('data-no-navigation')) return;

    const interactiveElement = event.target.closest('button, input, label, select, [tabindex="1"]');

    // If the click was on an interactive element, do nothing.
    if (interactiveElement) {
      return;
    }

    const link = this.refs.productCardLink;
    if (!link.href) return;
    const linkURL = new URL(link.href);

    const productCardAnchor = link.getAttribute('id');
    if (!productCardAnchor) return;

    const infiniteResultsList = this.closest('results-list[infinite-scroll="true"]');
    if (!window.Shopify.designMode && infiniteResultsList) {
      const url = new URL(window.location.href);
      const parent = this.closest('li');
      url.hash = productCardAnchor;
      if (parent && parent.dataset.page) {
        url.searchParams.set('page', parent.dataset.page);
      }

      yieldToMainThread().then(() => {
        history.replaceState({}, '', url.toString());
      });
    }

    const targetLink = event.target.closest('a');
    // Let the native navigation handle the click if it was on a link.
    if (!targetLink) {
      this.#navigateToURL(event, linkURL);
    }
  };

  /**
   * Resets the variant.
   */
  resetVariant = debounce(this.#resetVariant, 100);
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}

/**
 * A custom element that displays a variant picker with swatches.
 * @typedef {import('@theme/variant-picker').VariantPickerRefs & {overflowList: HTMLElement}} SwatchesRefs
 */

/**
 * @extends {VariantPicker<SwatchesRefs>}
 */
class SwatchesVariantPickerComponent extends VariantPicker {
  connectedCallback() {
    super.connectedCallback();

    // Cache the parent product card
    this.parentProductCard = this.closest('product-card');

    // Listen for variant updates to apply pending URL changes
    this.addEventListener(StandardEvents.productSelect, this.#handleCardProductSelect.bind(this));
  }

  /**
   * Updates the card URL when a variant is selected.
   * @param {ProductSelectEvent} event
   */
  #handleCardProductSelect(event) {
    // Handle URL update via promise resolution
    event.promise
      .then(() => {
        if (this.pendingVariantId && this.parentProductCard instanceof ProductCard) {
          const currentUrl = new URL(this.parentProductCard.refs.productCardLink.href);
          currentUrl.searchParams.set('variant', this.pendingVariantId);
          this.parentProductCard.refs.productCardLink.href = currentUrl.toString();
          this.pendingVariantId = null;
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[product-card] Event promise rejected:', error);
      });
  }

  /**
   * Override the variantChanged method to handle unavailable swatches with available alternatives.
   * @param {Event} event - The variant change event.
   */
  variantChanged(event) {
    if (!(event.target instanceof HTMLElement)) return;

    // Check if this is a swatch input
    const isSwatchInput = event.target instanceof HTMLInputElement && event.target.name?.includes('-swatch');
    const clickedSwatch = event.target;
    const availableCount = parseInt(clickedSwatch.dataset.availableCount || '0');
    const firstAvailableVariantId = clickedSwatch.dataset.firstAvailableOrFirstVariantId;

    // For swatch inputs, check if we need special handling
    if (isSwatchInput && availableCount > 0 && firstAvailableVariantId) {
      // If this is an unavailable variant but there are available alternatives
      // Prevent the default handling
      event.stopPropagation();

      // Update the selected option visually
      this.updateSelectedOption(clickedSwatch);

      // Build request URL with the first available variant
      const productUrl = this.dataset.productUrl?.split('?')[0];

      if (!productUrl) return;

      const url = new URL(productUrl, window.location.origin);
      url.searchParams.set('variant', firstAvailableVariantId);
      url.searchParams.set('section_id', 'section-rendering-product-card');

      const requestUrl = url.href;

      // Store the variant ID we want to apply to the URL
      this.pendingVariantId = firstAvailableVariantId;

      // Use parent's fetch method
      this.fetchUpdatedSection(requestUrl);
      return;
    }

    // For all other cases, use the default behavior
    super.variantChanged(event);
  }

  /**
   * Shows all swatches.
   * @param {Event} [event] - The event that triggered the show all swatches.
   */
  showAllSwatches(event) {
    event?.preventDefault();

    const { overflowList } = this.refs;

    if (overflowList instanceof OverflowList) {
      overflowList.showAll();
    }
  }
}

if (!customElements.get('swatches-variant-picker-component')) {
  customElements.define('swatches-variant-picker-component', SwatchesVariantPickerComponent);
}
