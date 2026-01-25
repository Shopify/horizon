import { Component } from '@theme/component';

/**
 * @typedef {Object} StylesComponentRefs
 * @property {HTMLElement} items - Container for collection tiles
 * @property {HTMLElement} nav - Navigation buttons container
 * @property {HTMLButtonElement} prevButton - Previous button
 * @property {HTMLButtonElement} nextButton - Next button
 */

/**
 * Styles section component with carousel navigation.
 *
 * Handles horizontal scrolling of collection tiles with previous/next buttons.
 *
 * @extends {Component<StylesComponentRefs>}
 */
class StylesComponent extends Component {
  requiredRefs = ['items'];

  #scrollAmount = 0;

  connectedCallback() {
    super.connectedCallback();
    this.#calculateScrollAmount();
    this.#updateButtonStates();
    this.refs.items?.addEventListener('scroll', this.#handleScroll);
    window.addEventListener('resize', this.#handleResize);
  }

  disconnectedCallback() {
    this.refs.items?.removeEventListener('scroll', this.#handleScroll);
    window.removeEventListener('resize', this.#handleResize);
    super.disconnectedCallback();
  }

  /**
   * Scrolls to the previous set of tiles.
   */
  scrollPrev() {
    const items = this.refs.items;
    if (!items) return;

    const newPosition = Math.max(0, items.scrollLeft - this.#scrollAmount);
    items.scrollTo({ left: newPosition, behavior: 'smooth' });
  }

  /**
   * Scrolls to the next set of tiles.
   */
  scrollNext() {
    const items = this.refs.items;
    if (!items) return;

    const maxScroll = items.scrollWidth - items.clientWidth;
    const newPosition = Math.min(maxScroll, items.scrollLeft + this.#scrollAmount);
    items.scrollTo({ left: newPosition, behavior: 'smooth' });
  }

  /**
   * Calculates the scroll amount based on tile width and gap.
   */
  #calculateScrollAmount() {
    const items = this.refs.items;
    if (!items) return;

    const firstTile = items.querySelector('.section-styles__tile');
    if (firstTile) {
      const gap = parseInt(getComputedStyle(items).gap, 10) || 8;
      this.#scrollAmount = firstTile.offsetWidth + gap;
    }
  }

  /**
   * Updates disabled state of navigation buttons based on scroll position.
   */
  #updateButtonStates = () => {
    const items = this.refs.items;
    const prevButton = this.refs.prevButton;
    const nextButton = this.refs.nextButton;

    if (!items || !prevButton || !nextButton) return;

    const scrollLeft = items.scrollLeft;
    const maxScroll = items.scrollWidth - items.clientWidth;

    prevButton.disabled = scrollLeft <= 0;
    nextButton.disabled = scrollLeft >= maxScroll - 1;
  };

  /**
   * Handles scroll events on the items container.
   */
  #handleScroll = () => {
    this.#updateButtonStates();
  };

  /**
   * Handles window resize to recalculate scroll amount.
   */
  #handleResize = () => {
    this.#calculateScrollAmount();
    this.#updateButtonStates();
  };
}

if (!customElements.get('styles-component')) {
  customElements.define('styles-component', StylesComponent);
}
