import { Component } from '@theme/component';

const INLINE_LAYOUT = 'inline';
const STACKED_LAYOUT = 'stacked';
const INLINE_LAYOUT_MIN_WIDTH = 701;
const WIDTH_TOLERANCE = 1;

class DisclosuresSummaryFit extends Component {
  /** @type {number} */
  #animationFrame = 0;

  /** @type {AbortController} */
  #abortController = new AbortController();

  #resizeObserver = new ResizeObserver(() => this.#scheduleMeasure());

  #mutationObserver = new MutationObserver(() => this.#scheduleMeasure());

  connectedCallback() {
    super.connectedCallback();
    this.#connectObservers();
    this.#scheduleMeasure();
  }

  disconnectedCallback() {
    this.#disconnectObservers();
    super.disconnectedCallback();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#connectObservers();
    this.#scheduleMeasure();
  }

  get #summaryContent() {
    const summaryContent = this.querySelector('.disclosures__summary-content');

    return summaryContent instanceof HTMLElement ? summaryContent : null;
  }

  get #summaryItem() {
    const summaryItem = this.querySelector('.disclosures__summary-content > .disclosures__summary-item');

    return summaryItem instanceof HTMLElement ? summaryItem : null;
  }

  #connectObservers() {
    this.#disconnectObservers();
    this.#abortController = new AbortController();

    const summaryContent = this.#summaryContent;
    const summaryItem = this.#summaryItem;

    if (summaryContent) {
      this.#resizeObserver.observe(summaryContent);
    }

    if (summaryItem) {
      this.#mutationObserver.observe(summaryItem, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    for (const image of this.querySelectorAll('.disclosures__summary-content .details__icon')) {
      image.addEventListener('load', this.#scheduleMeasure, { signal: this.#abortController.signal });
    }

    const fontsReady = document.fonts?.ready;
    if (fontsReady) {
      const { signal } = this.#abortController;

      void fontsReady.then(() => {
        if (!signal.aborted) this.#scheduleMeasure();
      });
    }
  }

  #disconnectObservers() {
    this.#abortController.abort();
    this.#resizeObserver.disconnect();
    this.#mutationObserver.disconnect();

    if (this.#animationFrame) {
      window.cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = 0;
    }
  }

  #scheduleMeasure = () => {
    if (this.#animationFrame) return;

    this.#animationFrame = window.requestAnimationFrame(() => {
      this.#animationFrame = 0;
      this.#measure();
    });
  };

  #measure() {
    const summaryContent = this.#summaryContent;
    const summaryItem = this.#summaryItem;

    if (!summaryContent || !summaryItem) {
      this.#setLayout(STACKED_LAYOUT);
      return;
    }

    const availableWidth = summaryContent.getBoundingClientRect().width;

    if (availableWidth < INLINE_LAYOUT_MIN_WIDTH) {
      this.#setLayout(STACKED_LAYOUT);
      return;
    }

    const requiredWidth = this.#measureRequiredWidth(summaryItem);
    const nextLayout = requiredWidth <= availableWidth + WIDTH_TOLERANCE ? INLINE_LAYOUT : STACKED_LAYOUT;

    this.#setLayout(nextLayout);
  }

  /**
   * @param {HTMLElement} summaryItem
   * @returns {number}
   */
  #measureRequiredWidth(summaryItem) {
    const clone = summaryItem.cloneNode(true);

    if (!(clone instanceof HTMLElement)) return 0;

    clone.classList.add('disclosures__summary-item--measure');
    clone.setAttribute('aria-hidden', 'true');
    this.append(clone);

    try {
      return clone.getBoundingClientRect().width;
    } finally {
      clone.remove();
    }
  }

  /**
   * @param {string} layout
   */
  #setLayout(layout) {
    if (this.dataset.summaryLayout === layout) return;

    this.dataset.summaryLayout = layout;
  }
}

if (!customElements.get('disclosures-summary-fit')) {
  customElements.define('disclosures-summary-fit', DisclosuresSummaryFit);
}
