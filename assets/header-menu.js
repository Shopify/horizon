import { Component } from '@theme/component';
import { debounce, onDocumentLoaded, setHeaderMenuStyle } from '@theme/utilities';
import { MegaMenuHoverEvent } from '@theme/events';

/** Skim filter: pointer must dwell this long before MegaMenuHoverEvent fires. */
const HOVER_COMMIT_DELAY_MS = 150;

/**
 * A custom element that manages a header menu.
 *
 * @typedef {Object} State
 * @property {HTMLElement | null} activeItem - The currently active menu item.
 * @property {HTMLElement | null} activeOverflowItem - The overflow item shown when the More trigger is active.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} overflowMenu - The overflow menu.
 * @property {HTMLElement[]} [submenu] - The submenu in each respective menu item.
 *
 * @extends {Component<Refs>}
 */
class HeaderMenu extends Component {
  requiredRefs = ['overflowMenu'];

  /**
   * @type {MutationObserver | null}
   */
  #submenuMutationObserver = null;

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #hoverDispatchTimer;

  connectedCallback() {
    super.connectedCallback();

    onDocumentLoaded(this.#preloadImages);
    window.addEventListener('resize', this.#resizeListener);
    this.addEventListener('keydown', this.#onKeydown);
    this.overflowMenu?.addEventListener('pointerleave', this.#overflowSubmenuListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#resizeListener);
    this.removeEventListener('keydown', this.#onKeydown);
    document.body.removeEventListener('pointermove', this.#onPointerMove);
    if (this.#state.activeItem) {
      this.#stopPointerTracking(this.#state.activeItem);
    }
    this.overflowMenu?.removeEventListener('pointerleave', this.#overflowSubmenuListener);
    this.#cleanupMutationObserver();
    clearTimeout(this.#hoverDispatchTimer);
    this.#hoverDispatchTimer = undefined;
  }

  /**
   * Debounced resize event listener to recalculate menu style
   */
  #resizeListener = debounce(() => {
    setHeaderMenuStyle();
  }, 100);

  #overflowSubmenuListener = () => {
    this.#deactivate();
  };

  /**
   * Close the open submenu on Escape and restore focus to its disclosure control.
   * @param {KeyboardEvent} event
   */
  #onKeydown = (event) => {
    if (event.key !== 'Escape') return;
    const item = this.#state.activeItem;
    if (!item) return;

    const control = this.#focusTargetAfterClose(item);
    this.#deactivate(item, { force: true });
    control.focus();
  };

  /**
   * Toggle a submenu from its dedicated disclosure button (click / Enter / Space).
   * @param {PointerEvent | MouseEvent} event
   */
  toggle = (event) => {
    const button = event.target;
    if (!(button instanceof HTMLElement)) return;

    const item = findMenuItem(button);
    if (!item) return;

    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      // Close whatever is currently active. In the overflow panel the initially
      // selected item is tracked as `activeOverflowItem` while the More trigger is
      // the `activeItem`, so deactivating `item` directly would no-op; deactivate
      // the active item instead.
      this.#deactivate(this.#state.activeItem ?? item, { force: true });
      // Closing the overflow panel hides the focused disclosure, so return focus
      // to the visible More trigger; a top-level disclosure stays put.
      const focusTarget = this.#focusTargetAfterClose(item);
      if (focusTarget !== button) focusTarget.focus();
    } else {
      this.activate(event);
    }
  };

  /**
   * The control that should receive focus after a submenu closes. Overflow items
   * live in a panel that is hidden on close, so focus returns to the always-visible
   * More trigger instead of a now-inert control inside the panel.
   * @param {HTMLElement} item
   * @returns {HTMLElement}
   */
  #focusTargetAfterClose(item) {
    const listItem = item.closest('.menu-list__list-item');
    const slot = listItem instanceof HTMLElement ? listItem.slot : '';
    if (slot === 'overflow' || slot === 'more') {
      const moreButton = this.querySelector('[slot="more"] [ref="menuitem"]');
      if (moreButton instanceof HTMLElement) return moreButton;
    }
    return this.#expandableFor(item);
  }

  /**
   * Return the element that carries the `aria-expanded` state for a menu item.
   * @param {HTMLElement} item
   * @returns {HTMLElement}
   */
  #expandableFor(item) {
    const listItem = item.closest('.menu-list__list-item');
    const disclosure = listItem?.querySelector('[ref="disclosure[]"]');
    return disclosure instanceof HTMLElement ? disclosure : item;
  }

  /**
   * @type {State}
   */
  #state = {
    activeItem: null,
    activeOverflowItem: null,
  };

  /**
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  #pointerIdleTimer;

  /**
   * Last known pointer position for Safari hit-test reconciliation.
   * @type {{ x: number, y: number }}
   */
  #lastPointer = { x: 0, y: 0 };

  /**
   * Update the safety box idle state on the active menu item.
   * @param {PointerEvent} event
   */
  #onPointerMove = (event) => {
    const activeLink = this.#state.activeItem;
    if (!activeLink) return;

    this.#lastPointer.x = event.clientX;
    this.#lastPointer.y = event.clientY;

    const moving = Math.abs(event.movementX) >= 1 || event.movementY >= 1;
    activeLink.dataset.safetyBox = `${moving}`;

    clearTimeout(this.#pointerIdleTimer);
    if (moving) {
      this.#pointerIdleTimer = setTimeout(() => {
        if (this.#state.activeItem) {
          this.#state.activeItem.dataset.safetyBox = 'false';
          this.#reconcilePointerTarget();
        }
      }, 50);
    } else {
      this.#reconcilePointerTarget();
    }
  };

  /**
   * Check if the pointer is over a different menu item and trigger activation if so.
   * Works around Safari not re-evaluating hit targets after pseudo-element changes.
   */
  #reconcilePointerTarget() {
    const { x, y } = this.#lastPointer;
    requestAnimationFrame(() => {
      const target = document.elementFromPoint(x, y);
      if (!target) return;
      const listItem = target.closest('.menu-list__list-item');
      if (listItem && !listItem.contains(this.#state.activeItem)) {
        listItem.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }));
      }
    });
  }

  /**
   * Begin pointer tracking for the safety box on the newly active item.
   * @param {HTMLElement} item
   * @param {HTMLElement | null} previousItem
   */
  #startPointerTracking(item, previousItem) {
    if (previousItem) {
      this.#stopPointerTracking(previousItem);
    } else {
      document.body.addEventListener('pointermove', this.#onPointerMove);
    }

    const rect = item.getBoundingClientRect();
    const isOverlap = this.headerComponent?.hasAttribute('data-submenu-overlap-bottom-row');
    const boundary = isOverlap ? this.headerComponent?.querySelector('.header__row--top') : this.headerComponent;
    item.style.setProperty('--box-height', `${(boundary?.getBoundingClientRect().bottom ?? 0) - rect.top}px`);
  }

  /**
   * Stop pointer tracking and remove all safety box properties from an item.
   * @param {HTMLElement} item
   */
  #stopPointerTracking(item) {
    window.clearTimeout(this.#pointerIdleTimer);
    this.#pointerIdleTimer = undefined;
    item.style.removeProperty('--box-height');
    delete item.dataset.safetyBox;
  }

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

  /**
   * Find the first overflowing menu item shown by the More trigger.
   * @returns {HTMLElement | null}
   */
  #getFirstOverflowMenuItem() {
    const menuItem = this.refs.overflowMenu?.querySelector('[slot="overflow"] [ref="menuitem"]');
    return menuItem instanceof HTMLElement ? menuItem : null;
  }

  get headerComponent() {
    return /** @type {HTMLElement | null} */ (this.closest('header-component'));
  }

  /**
   * Activate the selected menu item immediately
   * @param {PointerEvent | FocusEvent} event
   */
  activate = (event) => {
    if (!(event.target instanceof Element) || !this.headerComponent) return;

    const item = findMenuItem(event.target);

    if (!item || item == this.#state.activeItem) return;

    // Derive the slot context from the list item rather than `event.target`.
    const listItem = item.closest('.menu-list__list-item');
    const slot = listItem instanceof HTMLElement ? listItem.slot : '';
    const isMoreTrigger = slot === 'more';
    const isDefaultSlot = slot === '';
    const overflowItem = isMoreTrigger ? this.#getFirstOverflowMenuItem() : null;

    this.dataset.overflowExpanded = (!isDefaultSlot).toString();

    const previouslyActiveItem = this.#state.activeItem;
    const previouslyActiveOverflowItem = this.#state.activeOverflowItem;

    if (previouslyActiveItem) {
      this.#expandableFor(previouslyActiveItem).ariaExpanded = 'false';
      const previousSubmenu = findSubmenu(previouslyActiveItem);
      if (previousSubmenu) previousSubmenu.inert = true;
    }
    if (previouslyActiveOverflowItem && previouslyActiveOverflowItem !== previouslyActiveItem) {
      this.#expandableFor(previouslyActiveOverflowItem).ariaExpanded = 'false';
      const previousOverflowSubmenu = findSubmenu(previouslyActiveOverflowItem);
      if (previousOverflowSubmenu) previousOverflowSubmenu.inert = true;
    }

    this.#state.activeItem = item;
    this.#state.activeOverflowItem = overflowItem;
    this.ariaExpanded = 'true';
    this.#expandableFor(item).ariaExpanded = 'true';
    if (overflowItem && overflowItem !== item) {
      this.#expandableFor(overflowItem).ariaExpanded = 'true';
      // The More trigger auto-opens the first overflow item's submenu, so expose it.
      const activeOverflowSubmenu = findSubmenu(overflowItem);
      if (activeOverflowSubmenu) activeOverflowSubmenu.inert = false;
    }

    const overflowItemSubmenu = isMoreTrigger ? findSubmenu(overflowItem) : null;
    let submenu = findSubmenu(item) || (overflowItemSubmenu ? this.overflowMenu : null);
    const hasSubmenu = Boolean(submenu);

    if (!hasSubmenu && !isDefaultSlot) {
      submenu = this.overflowMenu;
    }

    if (submenu) {
      clearTimeout(this.#hoverDispatchTimer);
      this.#hoverDispatchTimer = undefined;
      const committedItem = item;
      if (event instanceof FocusEvent) {
        this.dispatchEvent(new MegaMenuHoverEvent());
      } else {
        this.#hoverDispatchTimer = setTimeout(() => {
          this.#hoverDispatchTimer = undefined;
          if (this.#state.activeItem === committedItem) {
            this.dispatchEvent(new MegaMenuHoverEvent());
          }
        }, HOVER_COMMIT_DELAY_MS);
      }

      // Mark submenu as active for content-visibility optimization
      submenu.dataset.active = '';

      // Expose the open submenu to focus and assistive tech. Collapsed submenus stay
      // inert so their contents cannot be reached (visibility:hidden alone can be
      // overridden by descendants that re-assert visibility).
      submenu.inert = false;

      // Cleanup any existing mutation observer from previous menu activations
      this.#cleanupMutationObserver();

      // Monitor DOM mutations to catch deferred content injection (from section hydration)
      this.#submenuMutationObserver = new MutationObserver(() => {
        requestAnimationFrame(() => {
          // Double requestAnimationFrame to ensure the height is properly calculated and not defaulting to the contain-intrinsic-size
          requestAnimationFrame(() => {
            if (submenu.offsetHeight > 0) {
              this.headerComponent?.style.setProperty('--submenu-height', `${submenu.offsetHeight}px`);
              this.#cleanupMutationObserver();
            }
          });
        });
      });
      this.#submenuMutationObserver.observe(submenu, { childList: true, subtree: true });

      // Auto-disconnect after 500ms to prevent memory leaks
      setTimeout(() => {
        this.#cleanupMutationObserver();
      }, 500);
    }

    let finalHeight = submenu?.offsetHeight || 0;

    // For overflow menu, the height needs to be either content of the submenu or the total height of the menu list links
    if (!isDefaultSlot) {
      const overflowListHeight = this.#getOverflowListLinksHeight();
      if (hasSubmenu) {
        /* Note: When the submenu is inside the overflow menu, its offsetHeight is not valid due to the lack of padding
         * we could add the padding variables to the submenu.offsetHeight, but measuring the overflowMenu.offsetHeight is just easier */
        const overflowHeight = this.overflowMenu?.offsetHeight || 0;
        finalHeight = Math.max(overflowHeight, overflowListHeight);
      } else {
        finalHeight = overflowListHeight;
      }
    }

    if (!submenu) {
      // If there is no content to open, don't try to open it
      finalHeight = 0;
    }

    const headerVisibleHeight = this.#getHeaderVisibleHeight();

    this.headerComponent.style.setProperty('--submenu-height', `${finalHeight}px`);
    this.#setFullOpenHeaderHeight(finalHeight, headerVisibleHeight);
    this.style.setProperty('--submenu-opacity', '1');
    this.#startPointerTracking(item, previouslyActiveItem);
  };

  /**
   * Deactivate the active item after a delay
   * @param {PointerEvent | FocusEvent} event
   */
  deactivate(event) {
    if (!(event.target instanceof Element)) return;

    const menu = findSubmenu(this.#state.activeItem);
    // Keep the submenu open while focus moves between the link, its disclosure
    // button, and the submenu contents — i.e. anywhere inside the same list item.
    const isMovingWithinItem =
      event.relatedTarget instanceof Node &&
      event.target instanceof Element &&
      event.target.contains(event.relatedTarget);
    const isMovingWithinMenu = event.relatedTarget instanceof Node && menu?.contains(document.activeElement);
    const isMovingToSubmenu =
      event.relatedTarget instanceof Node && event.type === 'blur' && menu?.contains(event.relatedTarget);
    const isMovingToOverflowMenu =
      event.relatedTarget instanceof Element && Boolean(event.relatedTarget.closest('[slot="overflow"]'));

    if (isMovingWithinItem || isMovingWithinMenu || isMovingToOverflowMenu || isMovingToSubmenu) {
      if (this.#state.activeItem) {
        this.#stopPointerTracking(this.#state.activeItem);
      }
      return;
    }

    this.#deactivate();
  }

  /**
   * Deactivate the active item immediately
   * @param {HTMLElement | null} [item]
   */
  #deactivate = (item = this.#state.activeItem, { force = false } = {}) => {
    if (!item || item != this.#state.activeItem) return;

    // Don't deactivate if the overflow menu or overflow list is still being hovered,
    // unless the close was explicitly requested (Escape or the disclosure toggle),
    // which must close regardless of pointer position.
    if (!force && (this.overflowListHovered || this.overflowMenu?.matches(':hover'))) return;

    clearTimeout(this.#hoverDispatchTimer);
    this.#hoverDispatchTimer = undefined;

    this.headerComponent?.style.setProperty('--submenu-height', '0px');
    this.#setFullOpenHeaderHeight(0, 0);
    this.style.setProperty('--submenu-opacity', '0');
    this.dataset.overflowExpanded = 'false';

    const submenu = findSubmenu(item) || (item.closest('[slot="more"]') ? this.overflowMenu : null);
    const activeOverflowItem = this.#state.activeOverflowItem;

    document.body.removeEventListener('pointermove', this.#onPointerMove);
    this.#stopPointerTracking(item);

    this.#state.activeItem = null;
    this.#state.activeOverflowItem = null;
    this.ariaExpanded = 'false';
    this.#expandableFor(item).ariaExpanded = 'false';
    if (activeOverflowItem && activeOverflowItem !== item) {
      this.#expandableFor(activeOverflowItem).ariaExpanded = 'false';
      const activeOverflowSubmenu = findSubmenu(activeOverflowItem);
      if (activeOverflowSubmenu) activeOverflowSubmenu.inert = true;
    }

    // Remove active state from submenu after animation completes
    if (submenu) {
      delete submenu.dataset.active;
      submenu.inert = true;
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
    };

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
   * Read the visible header height before submenu height writes invalidate layout.
   * @returns {number}
   */
  #getHeaderVisibleHeight() {
    if (!this.headerComponent) return 0;

    const isOverlapSituation = this.headerComponent.hasAttribute('data-submenu-overlap-bottom-row');

    return isOverlapSituation && this.headerComponent.offsetHeight > 0
      ? /** @type {HTMLElement | null} */ (this.headerComponent.querySelector('.header__row--top'))?.offsetHeight ?? 0
      : this.headerComponent.offsetHeight;
  }

  /**
   * Calculate and set the full open header height. If the submenu is not open, the full open header height is 0.
   * @param {number} submenuHeight
   * @param {number} headerVisibleHeight
   */
  #setFullOpenHeaderHeight(submenuHeight, headerVisibleHeight) {
    if (!this.headerComponent) return;

    const nothingToOpen = submenuHeight === 0;
    const fullOpenHeaderHeight = nothingToOpen ? 0 : submenuHeight + headerVisibleHeight;

    this.headerComponent?.style.setProperty('--full-open-header-height', `${fullOpenHeaderHeight}px`);
  }

  /**
   * Preload images that are set to load lazily.
   */
  #preloadImages = () => {
    const images = this.querySelectorAll('img[loading="lazy"]');
    images?.forEach((image) => image.removeAttribute('loading'));
  };

  #cleanupMutationObserver() {
    this.#submenuMutationObserver?.disconnect();
    this.#submenuMutationObserver = null;
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

  // `element` may be the list item itself (hover/focus routed via the `<li>`) or a
  // descendant such as the disclosure button (click routed via the button).
  const listItem = element.closest('.menu-list__list-item') ?? element;
  return listItem.querySelector('[ref="menuitem"]');
}

/**
 * Find the closest submenu.
 * @param {Element | null | undefined} element
 * @returns {HTMLElement | null}
 */
function findSubmenu(element) {
  const listItem = element?.closest?.('.menu-list__list-item');
  const submenu = listItem?.querySelector(':scope > [ref="submenu[]"]');
  return submenu instanceof HTMLElement ? submenu : null;
}
