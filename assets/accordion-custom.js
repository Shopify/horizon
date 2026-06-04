import { mediaQueryLarge, isMobileBreakpoint } from '@theme/utilities';

// Accordion
// Still extends HTMLElement over Component so that refs are still available to parent components (e.g. SortingFilterComponent)
class AccordionCustom extends HTMLElement {
  static #CLOSE_CLASS = 'accordion-custom--closing';
  static #CLOSE_DURATION_MS = 380;

  /** @type {HTMLDetailsElement} */
  get details() {
    const details = this.querySelector('details');

    if (!(details instanceof HTMLDetailsElement)) throw new Error('Details element not found');

    return details;
  }

  /** @type {HTMLElement} */
  get summary() {
    const summary = this.details.querySelector('summary');

    if (!(summary instanceof HTMLElement)) throw new Error('Summary element not found');

    return summary;
  }

  get #disableOnMobile() {
    return this.dataset.disableOnMobile === 'true';
  }

  get #disableOnDesktop() {
    return this.dataset.disableOnDesktop === 'true';
  }

  get #closeWithEscape() {
    return this.dataset.closeWithEscape === 'true';
  }

  #controller = new AbortController();

  connectedCallback() {
    const { signal } = this.#controller;

    this.#setDefaultOpenState();
    this.#enforceSingleOpenOnConnect();

    this.addEventListener('keydown', this.#handleKeyDown, { signal });
    this.summary.addEventListener('click', this.handleClick, { signal });
    this.details.addEventListener('toggle', this.#handleToggle, { signal });
    mediaQueryLarge.addEventListener('change', this.#handleMediaQueryChange, { signal });
  }

  /**
   * @returns {HTMLElement | null}
   */
  #getSingleOpenGroup() {
    const group = this.closest('.accordion[data-single-open]');
    return group instanceof HTMLElement ? group : null;
  }

  /**
   * When single-open mode is enabled, only one row may be open on load.
   */
  #enforceSingleOpenOnConnect() {
    const group = this.#getSingleOpenGroup();
    if (!group) return;

    const openAccordions = [...group.querySelectorAll('accordion-custom')].filter(
      (accordion) => accordion instanceof AccordionCustom && accordion.details.open
    );

    if (openAccordions.length <= 1) return;

    openAccordions.slice(1).forEach((accordion) => {
      accordion.#closeDetails(false);
    });
  }

  /**
   * Closes other accordions in the same group when this one opens.
   */
  #handleToggle = () => {
    const group = this.#getSingleOpenGroup();
    if (!group || !this.details.open) return;

    for (const accordion of group.querySelectorAll('accordion-custom')) {
      if (!(accordion instanceof AccordionCustom) || accordion === this) continue;
      if (accordion.details.open) accordion.#closeDetails(true);
    }
  };

  /**
   * @param {boolean} animate - Whether to animate the close transition
   */
  #closeDetails(animate) {
    const { details } = this;
    if (!details.open) return;

    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      details.open = false;
      return;
    }

    details.classList.add(AccordionCustom.#CLOSE_CLASS);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        details.open = false;
      });
    });

    const content = details.querySelector('.details-content');
    const removeClosingClass = () => {
      details.classList.remove(AccordionCustom.#CLOSE_CLASS);
    };

    if (content instanceof HTMLElement) {
      content.addEventListener(
        'transitionend',
        (event) => {
          if (event.target !== content || event.propertyName !== 'block-size') return;
          removeClosingClass();
        },
        { once: true }
      );
    }

    window.setTimeout(removeClosingClass, AccordionCustom.#CLOSE_DURATION_MS);
  }

  /**
   * Handles the disconnect event.
   */
  disconnectedCallback() {
    // Disconnect all the event listeners
    this.#controller.abort();
  }

  /**
   * Handles the click event.
   * @param {Event} event - The event.
   */
  handleClick = (event) => {
    const isMobile = isMobileBreakpoint();
    const isDesktop = !isMobile;

    // Stop default behaviour from the browser
    if ((isMobile && this.#disableOnMobile) || (isDesktop && this.#disableOnDesktop)) {
      event.preventDefault();
      return;
    }
  };

  /**
   * Handles the media query change event.
   */
  #handleMediaQueryChange = () => {
    this.#setDefaultOpenState();
  };

  /**
   * Sets the default open state of the accordion based on the `open-by-default-on-mobile` and `open-by-default-on-desktop` attributes.
   */
  #setDefaultOpenState() {
    const isMobile = isMobileBreakpoint();

    this.details.open =
      (isMobile && this.hasAttribute('open-by-default-on-mobile')) ||
      (!isMobile && this.hasAttribute('open-by-default-on-desktop'));
  }

  /**
   * Handles keydown events for the accordion
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #handleKeyDown(event) {
    // Close the accordion when used as a menu
    if (event.key === 'Escape' && this.#closeWithEscape) {
      event.preventDefault();

      this.details.open = false;
      this.summary.focus();
    }
  }
}

if (!customElements.get('accordion-custom')) {
  customElements.define('accordion-custom', AccordionCustom);
}
