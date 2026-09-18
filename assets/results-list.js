import { mediaQueryLarge, requestIdleCallback, startViewTransition } from '@theme/utilities';
import PaginatedList from '@theme/paginated-list';

const PRODUCT_CARD_IMAGE_SELECTOR = '.product-media__image';

/**
 * A custom element that renders a pagniated results list
 */
export default class ResultsList extends PaginatedList {
  /** @type {WeakMap<HTMLImageElement, string>} */
  #defaultImageSizes = new WeakMap();

  #gridObserver = new MutationObserver(() => this.#syncProductCardImageSizes());

  connectedCallback() {
    super.connectedCallback();

    mediaQueryLarge.addEventListener('change', this.#handleMediaQueryChange);
    this.#observeGrid();
    this.setAttribute('initialized', '');
  }

  updatedCallback() {
    super.updatedCallback();
    this.#observeGrid();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    mediaQueryLarge.removeEventListener('change', this.#handleMediaQueryChange);
    this.#gridObserver.disconnect();
    this.#defaultImageSizes = new WeakMap();
  }

  /**
   * Updates the layout.
   *
   * @param {Event} event
   */
  updateLayout({ target }) {
    if (!(target instanceof HTMLInputElement)) return;

    this.#animateLayoutChange(target.value);
  }

  /**
   * Sets the layout.
   *
   * @param {string} value
   */
  #animateLayoutChange = async (value) => {
    const { grid } = this.refs;

    if (!grid) return;

    await startViewTransition(() => this.#setLayout(value), ['product-grid']);

    requestIdleCallback(() => {
      const viewport = mediaQueryLarge.matches ? 'desktop' : 'mobile';
      sessionStorage.setItem(`product-grid-view-${viewport}`, value);
    });
  };

  /**
   * Animates the layout change.
   *
   * @param {string} value
   */
  #setLayout(value) {
    const { grid } = this.refs;
    if (!grid) return;

    grid.setAttribute('product-grid-view', value);
    this.#syncProductCardImageSizes();
  }

  #observeGrid() {
    this.#gridObserver.disconnect();

    const { grid } = this.refs;
    if (!grid) return;

    this.#gridObserver.observe(grid, { childList: true, subtree: true });
    this.#syncProductCardImageSizes();
  }

  #syncProductCardImageSizes = () => {
    const { grid } = this.refs;
    if (!grid) return;

    const useSingleColumnSize = !mediaQueryLarge.matches && grid.getAttribute('product-grid-view') === 'mobile-single';
    const images = /** @type {NodeListOf<HTMLImageElement>} */ (grid.querySelectorAll(PRODUCT_CARD_IMAGE_SELECTOR));

    for (const image of images) {
      if (!this.#defaultImageSizes.has(image)) this.#defaultImageSizes.set(image, image.sizes);

      const sizes = useSingleColumnSize ? '100vw' : this.#defaultImageSizes.get(image);
      if (sizes !== undefined && image.sizes !== sizes) image.sizes = sizes;
    }
  };

  /**
   * Handles the media query change event.
   *
   * @param {MediaQueryListEvent} event
   */
  #handleMediaQueryChange = (event) => {
    const targetElement = event.matches
      ? this.querySelector('[data-grid-layout="desktop-default-option"]')
      : this.querySelector('[data-grid-layout="mobile-option"]');

    if (!(targetElement instanceof HTMLInputElement)) return;

    targetElement.checked = true;
    this.#setLayout('default');
  };
}

if (!customElements.get('results-list')) {
  customElements.define('results-list', ResultsList);
}
