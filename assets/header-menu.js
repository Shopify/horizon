import { Component } from '@theme/component';
import { debounce, onDocumentLoaded, setHeaderMenuStyle } from '@theme/utilities';
import { MegaMenuHoverEvent } from '@theme/events';

/**
 * A custom element that manages a header menu.
 *
 * @typedef {Object} State
 * @property {HTMLElement | null} activeItem - The currently active menu item.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} overflowMenu - The overflow menu.
 * @property {HTMLElement[]} [submenu] - The submenu in each respective menu item.
 *
 * @extends {Component<Refs>}
 */
class HeaderMenu extends Component {
  requiredRefs = [];

  /**
   * @type {ResizeObserver | null}
   */
  #submenuResizeObserver = null;

  /**
   * @type {{ submenu: HTMLElement; isDefaultSlot: boolean; hasSubmenu: boolean } | null}
   */
  #submenuMeasurementContext = null;

  /**
   * @type {number | null}
   */
  #deactivateTimeout = null;

  connectedCallback() {
    super.connectedCallback();

    onDocumentLoaded(this.#preloadImages);
    window.addEventListener('resize', this.#resizeListener);
    this.overflowMenu?.addEventListener('pointerleave', this.#overflowSubmenuListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#resizeListener);
    this.overflowMenu?.removeEventListener('pointerleave', this.#overflowSubmenuListener);
    this.#stopSubmenuHeightTracking();
    this.#clearDeactivateTimeout();
  }

  /**
   * Debounced resize event listener to recalculate menu style
   */
  #resizeListener = debounce(() => {
    setHeaderMenuStyle();
    this.#measureAndApplySubmenuHeight();
  }, 100);


  #overflowSubmenuListener = () => {
    this.#deactivate();
  };

  /**
   * @type {State}
   */
  #state = {
    activeItem: null,
  };

  /**
   * Get the overflow menu
   */
  get overflowMenu() {
    return /** @type {HTMLElement | null} */ (this.refs.overflowMenu?.shadowRoot?.querySelector('[part="overflow"]'));
  }

  /**
   * Whether the overflow list is hovered
   * @returns {boolean}
   */
  get overflowListHovered() {
    return this.refs.overflowMenu?.shadowRoot?.querySelector('[part="overflow-list"]')?.matches(':hover') ?? false;
  }

  get headerComponent() {
    return /** @type {HTMLElement | null} */ (this.closest('header-component'));
  }

  /**
   * Activate the selected menu item immediately
   * @param {PointerEvent | FocusEvent} event
   */
  activate = (event) => {
    this.#clearDeactivateTimeout();
    this.dispatchEvent(new MegaMenuHoverEvent());

    if (!(event.target instanceof Element) || !this.headerComponent) return;

    let item = findMenuItem(event.target);

    if (!item || item == this.#state.activeItem) return;

    const isDefaultSlot = event.target.slot === '';

    this.dataset.overflowExpanded = (!isDefaultSlot).toString();

    const previouslyActiveItem = this.#state.activeItem;

    if (previouslyActiveItem) {
      previouslyActiveItem.ariaExpanded = 'false';
    }

    this.#state.activeItem = item;
    this.ariaExpanded = 'true';
    item.ariaExpanded = 'true';

    let submenu = findSubmenu(item);
    const hasSubmenu = Boolean(submenu);

    if (!hasSubmenu && !isDefaultSlot) {
      submenu = this.overflowMenu;
    }

    if (submenu) {
      // Mark submenu active before measuring so content-visibility reports full height
      submenu.dataset.active = '';
      this.#stopSubmenuHeightTracking();
      this.#flushSubmenuLayout(submenu);
      const initialHeight = this.#calculateSubmenuHeight(submenu, { isDefaultSlot, hasSubmenu });
      this.#applySubmenuHeight(initialHeight, { force: true });
      this.#startSubmenuHeightTracking(submenu, { isDefaultSlot, hasSubmenu }, initialHeight);
    } else {
      this.#stopSubmenuHeightTracking();
      this.#applySubmenuHeight(0, { force: true });
    }

    this.style.setProperty('--submenu-opacity', '1');
  };

  /**
   * Deactivate the active item after a delay
   * @param {PointerEvent | FocusEvent} event
   */
  deactivate(event) {
    if (!(event.target instanceof Element)) return;

    const menu = findSubmenu(this.#state.activeItem);
    const isMovingWithinMenu = event.relatedTarget instanceof Node && menu?.contains(event.relatedTarget);
    const isMovingToSubmenu = event.relatedTarget instanceof Node && menu?.contains(event.relatedTarget);
    const isMovingToOverflowMenu =
      event.relatedTarget instanceof Node && event.relatedTarget.parentElement?.matches('[slot="overflow"]');

    if (isMovingWithinMenu || isMovingToOverflowMenu || isMovingToSubmenu) return;

    if (event.type === 'pointerleave') {
      this.#clearDeactivateTimeout();
      this.#deactivateTimeout = window.setTimeout(() => {
        const activeSubmenu = findSubmenu(this.#state.activeItem);
        const activeListItem = this.#state.activeItem?.parentElement;
        const shouldKeepOpen =
          activeSubmenu?.matches(':hover') || activeListItem?.matches(':hover') || this.overflowMenu?.matches(':hover');

        if (shouldKeepOpen) return;
        this.#deactivate();
      }, 90);
      return;
    }

    this.#deactivate();
  }

  /**
   * Deactivate the active item immediately
   * @param {HTMLElement | null} [item]
   */
  #deactivate = (item = this.#state.activeItem) => {
    if (!item || item != this.#state.activeItem) return;

    // Don't deactivate if the overflow menu or overflow list is still being hovered
    if (this.overflowListHovered || this.overflowMenu?.matches(':hover')) return;

    this.#stopSubmenuHeightTracking();
    this.#applySubmenuHeight(0, { force: true });
    this.style.setProperty('--submenu-opacity', '0');
    this.dataset.overflowExpanded = 'false';

    const submenu = findSubmenu(item);

    this.#state.activeItem = null;
    this.ariaExpanded = 'false';
    item.ariaExpanded = 'false';

    // Remove active state from submenu after animation completes
    if (submenu) {
      delete submenu.dataset.active;
    }
  };

  #getOverflowListLinksHeight() {
    const slottedMenuLinks = this.overflowMenu?.querySelector('slot')?.assignedElements();
    if (!slottedMenuLinks) return this.overflowMenu?.offsetHeight || 0;

    /**
     * @param {(submenu: HTMLElement) => void} cb
     */
    const mapSubmenus = (cb) => {
      slottedMenuLinks.forEach((link) => {
        const submenu = /** @type {HTMLElement | null} */ (link.querySelector('[ref="submenu[]"]'));
        if (submenu) {
          cb(submenu);
        }
      });
    }

    mapSubmenus((submenu) => {
      submenu.style.setProperty('display', 'none');
    });
    const height = this.overflowMenu?.offsetHeight || 0;
    mapSubmenus((submenu) => {
      submenu.style.removeProperty('display');
    });
    return height;
  }

  /**
   * Calculate and set the full open header height. If the submenu is not open, the full open header height is 0.
   * @param {number} submenuHeight
   */
  #setFullOpenHeaderHeight(submenuHeight) {
    if (!this.headerComponent) return;

    const isOverlapSituation = this.headerComponent.hasAttribute('data-submenu-overlap-bottom-row');

    const headerVisibleHeight =
      isOverlapSituation && this.headerComponent.offsetHeight > 0
        ? /** @type {HTMLElement | null} */ (this.headerComponent.querySelector('.header__row--top'))?.offsetHeight ?? 0
        : this.headerComponent.offsetHeight;

    const nothingToOpen = submenuHeight === 0;
    const submenuOffset = Number.parseFloat(
      getComputedStyle(this).getPropertyValue('--submenu-offset').replace('px', '').trim() || '0'
    );
    const fullOpenHeaderHeight = nothingToOpen ? 0 : submenuHeight + (headerVisibleHeight ?? 0) + submenuOffset;

    this.headerComponent?.style.setProperty('--full-open-header-height', `${fullOpenHeaderHeight}px`);
  }

  /**
   * Preload images that are set to load lazily.
   */
  #preloadImages = () => {
    const images = this.querySelectorAll('img[loading="lazy"]');
    images?.forEach((image) => image.removeAttribute('loading'));
  };

  /**
   * @param {HTMLElement} submenu
   * @param {{ isDefaultSlot: boolean; hasSubmenu: boolean }} context
   */
  /**
   * @param {HTMLElement} submenu
   * @param {{ isDefaultSlot: boolean; hasSubmenu: boolean }} context
   * @param {number} [initialHeight]
   */
  #startSubmenuHeightTracking(submenu, context, initialHeight = 0) {
    this.#submenuMeasurementContext = {
      submenu,
      ...context,
      appliedHeight: Math.max(0, initialHeight),
    };

    const scheduleMeasure = () => {
      this.#flushSubmenuLayout(submenu);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.#measureAndApplySubmenuHeight());
      });
    };

    this.#submenuResizeObserver = new ResizeObserver(scheduleMeasure);
    this.#submenuResizeObserver.observe(submenu);

    const submenuInner = submenu.querySelector('.menu-list__submenu-inner');
    if (submenuInner instanceof HTMLElement) {
      this.#submenuResizeObserver.observe(submenuInner);
    }

    const featuredCollections = submenu.querySelector('.mega-menu-featured-collections');
    if (featuredCollections instanceof HTMLElement) {
      this.#submenuResizeObserver.observe(featuredCollections);
    }

    const cards = featuredCollections?.querySelector('.mega-menu-featured-collections__cards');
    if (cards instanceof HTMLElement) {
      this.#submenuResizeObserver.observe(cards);
    }

    this.#watchSubmenuImages(submenu, scheduleMeasure);
    document.fonts?.ready?.then(() => {
      if (this.#submenuMeasurementContext?.submenu === submenu) {
        scheduleMeasure();
      }
    });

    scheduleMeasure();
    window.setTimeout(scheduleMeasure, 0);
    window.setTimeout(scheduleMeasure, 50);
    window.setTimeout(scheduleMeasure, 150);
    window.setTimeout(scheduleMeasure, 300);
    window.setTimeout(scheduleMeasure, 600);
  }

  /**
   * Force layout so content-visibility and images report full dimensions before measuring.
   * @param {HTMLElement} submenu
   */
  #flushSubmenuLayout(submenu) {
    void submenu.offsetHeight;
    const submenuInner = submenu.querySelector('.menu-list__submenu-inner');
    if (submenuInner instanceof HTMLElement) {
      void submenuInner.offsetHeight;
      void submenuInner.scrollHeight;
    }
    const featuredCollections = submenu.querySelector('.mega-menu-featured-collections');
    if (featuredCollections instanceof HTMLElement) {
      void featuredCollections.offsetHeight;
      void featuredCollections.scrollHeight;
    }
  }

  #stopSubmenuHeightTracking() {
    this.#submenuResizeObserver?.disconnect();
    this.#submenuResizeObserver = null;
    this.#submenuMeasurementContext = null;
  }

  #measureAndApplySubmenuHeight() {
    const context = this.#submenuMeasurementContext;
    if (!context || !this.headerComponent) return;

    const measuredHeight = this.#calculateSubmenuHeight(context.submenu, context);
    const appliedHeight = context.appliedHeight || 0;

    // Avoid shrinking mid-open when layout is still settling (fixes first-open clip)
    if (measuredHeight <= appliedHeight - 2) return;

    context.appliedHeight = measuredHeight;
    this.#applySubmenuHeight(measuredHeight);
  }

  /**
   * @param {number} submenuHeight
   * @param {{ force?: boolean }} [options]
   */
  #applySubmenuHeight(submenuHeight, { force = false } = {}) {
    if (!this.headerComponent) return;

    const context = this.#submenuMeasurementContext;
    if (!force && context && submenuHeight > 0) {
      submenuHeight = Math.max(context.appliedHeight || 0, submenuHeight);
      context.appliedHeight = submenuHeight;
    }

    this.headerComponent.style.setProperty('--submenu-height', `${submenuHeight}px`);
    this.#setFullOpenHeaderHeight(submenuHeight);

    if (submenuHeight > 0) {
      this.headerComponent.dataset.submenuOpen = '';
    } else {
      delete this.headerComponent.dataset.submenuOpen;
      if (context) context.appliedHeight = 0;
    }
  }

  /**
   * @param {HTMLElement} submenu
   * @param {{ isDefaultSlot: boolean; hasSubmenu: boolean }} context
   */
  #calculateSubmenuHeight(submenu, { isDefaultSlot, hasSubmenu }) {
    if (!isDefaultSlot) {
      const overflowListHeight = this.#getOverflowListLinksHeight();

      if (hasSubmenu) {
        /* Note: When the submenu is inside the overflow menu, its offsetHeight is not valid due to the lack of padding
         * we could add the padding variables to the submenu.offsetHeight, but measuring the overflowMenu.offsetHeight is just easier */
        const overflowHeight = this.overflowMenu?.offsetHeight || 0;
        return Math.max(overflowHeight, overflowListHeight);
      }

      return overflowListHeight;
    }

    const submenuInner = submenu.querySelector('.menu-list__submenu-inner');
    const measuredElement = submenuInner instanceof HTMLElement ? submenuInner : submenu;

    const featuredCollections = submenu.querySelector('.mega-menu-featured-collections');
    if (featuredCollections instanceof HTMLElement) {
      const savedTransform =
        measuredElement instanceof HTMLElement ? measuredElement.style.transform : '';
      if (measuredElement instanceof HTMLElement) {
        measuredElement.style.transform = 'none';
      }

      const heights = [
        submenu.scrollHeight,
        submenu.offsetHeight,
        submenu.getBoundingClientRect().height,
        featuredCollections.scrollHeight,
        featuredCollections.offsetHeight,
        featuredCollections.getBoundingClientRect().height,
        measuredElement.scrollHeight,
        measuredElement.getBoundingClientRect().height,
      ];

      const cards = featuredCollections.querySelector('.mega-menu-featured-collections__cards');
      if (cards instanceof HTMLElement) {
        heights.push(cards.scrollHeight, cards.offsetHeight, cards.getBoundingClientRect().height);
      }

      if (measuredElement instanceof HTMLElement) {
        const submenuStyles = getComputedStyle(measuredElement);
        const paddingBlock =
          Number.parseFloat(submenuStyles.paddingBlockStart) + Number.parseFloat(submenuStyles.paddingBlockEnd);
        if (paddingBlock > 0) {
          heights.push(measuredElement.scrollHeight + paddingBlock);
        }
        measuredElement.style.transform = savedTransform;
      }

      return Math.ceil(Math.max(...heights.filter((height) => height > 0)));
    }

    const contentHeight = Math.ceil(measuredElement.getBoundingClientRect().height);
    const scrollHeight = measuredElement.scrollHeight;

    return Math.max(contentHeight, scrollHeight);
  }

  /**
   * @param {HTMLElement} submenu
   * @param {() => void} callback
   */
  #watchSubmenuImages(submenu, callback) {
    submenu.querySelectorAll('img').forEach((image) => {
      if (image.complete) return;

      image.addEventListener('load', callback, { once: true });
      image.addEventListener('error', callback, { once: true });
    });
  }

  #clearDeactivateTimeout() {
    if (this.#deactivateTimeout) {
      window.clearTimeout(this.#deactivateTimeout);
      this.#deactivateTimeout = null;
    }
  }
}

if (!customElements.get('header-menu')) {
  customElements.define('header-menu', HeaderMenu);
}

/**
 * Find the closest menu item.
 * @param {Element | null | undefined} element
 * @returns {HTMLElement | null}
 */
function findMenuItem(element) {
  if (!(element instanceof Element)) return null;

  return element?.querySelector('[ref="menuitem"]');
}

/**
 * Find the closest submenu.
 * @param {Element | null | undefined} element
 * @returns {HTMLElement | null}
 */
function findSubmenu(element) {
  const submenu = element?.parentElement?.querySelector('[ref="submenu[]"]');
  return submenu instanceof HTMLElement ? submenu : null;
}
