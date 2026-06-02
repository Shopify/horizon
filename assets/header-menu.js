import { Component } from '@theme/component';
import { debounce, onDocumentLoaded, setHeaderMenuStyle, updateHeaderHeights } from '@theme/utilities';
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
  static DESKTOP_MIN_SUBMENU_HEIGHT = 370;
  static DEBUG_STORAGE_KEY = 'horizon:mega-menu-debug';

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

  /**
   * @type {ResizeObserver | null}
   */
  #headerResizeObserver = null;

  /**
   * @type {number | null}
   */
  #pendingStableOpenFrame = null;

  /**
   * @type {boolean}
   */
  #debugEnabled = false;

  /**
   * @type {boolean}
   */
  #debugFreezeOpen = false;

  /**
   * @type {HTMLElement | null}
   */
  #debugPanel = null;

  connectedCallback() {
    super.connectedCallback();

    this.#preloadImages();
    onDocumentLoaded(this.#preloadImages);
    window.addEventListener('resize', this.#resizeListener);
    this.overflowMenu?.addEventListener('pointerleave', this.#overflowSubmenuListener);
    this.#observeHeaderResize();
    this.#schedulePrimeSubmenuLayout();
    this.#initDebugTools();
    window.addEventListener('keydown', this.#handleDebugHotkeys);

    document.fonts?.ready?.then(() => {
      this.#syncHeaderLayoutAndRefreshSubmenu();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#resizeListener);
    this.overflowMenu?.removeEventListener('pointerleave', this.#overflowSubmenuListener);
    this.#headerResizeObserver?.disconnect();
    this.#headerResizeObserver = null;
    this.#cancelStableSubmenuOpen();
    this.#stopSubmenuHeightTracking();
    this.#clearDeactivateTimeout();
    window.removeEventListener('keydown', this.#handleDebugHotkeys);
    this.#teardownDebugPanel();
  }

  /**
   * Debounced resize event listener to recalculate menu style
   */
  #resizeListener = debounce(() => {
    setHeaderMenuStyle();
    this.#measureAndApplySubmenuHeight();
  }, 100);


  #overflowSubmenuListener = () => {
    if (this.#debugFreezeOpen) return;
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

    if (this.#debugFreezeOpen) return;

    if (!(event.target instanceof Element) || !this.headerComponent) return;

    updateHeaderHeights();
    this.#observeHeaderResize();
    this.dispatchEvent(new MegaMenuHoverEvent());

    let item = findMenuItem(event.target);

    if (!item || item == this.#state.activeItem) return;

    const isDefaultSlot = event.target.slot === '';

    this.dataset.overflowExpanded = (!isDefaultSlot).toString();

    const previouslyActiveItem = this.#state.activeItem;

    if (previouslyActiveItem) {
      previouslyActiveItem.ariaExpanded = 'false';
    }

    this.#state.activeItem = item;

    let submenu = findSubmenu(item);
    const hasSubmenu = Boolean(submenu);

    if (!hasSubmenu && !isDefaultSlot) {
      submenu = this.overflowMenu;
    }

    const measurementContext = { isDefaultSlot, hasSubmenu };
    const openingFromClosed = !this.headerComponent.dataset.submenuOpen;

    if (submenu instanceof HTMLElement) {
      this.#cancelStableSubmenuOpen();
      this.#stopSubmenuHeightTracking();

      // Unlock content-visibility and measure before the panel becomes visible
      submenu.dataset.active = '';
      this.#prepareSubmenuAssets(submenu);
      this.#flushSubmenuLayout(submenu);
      const preOpenHeight = this.#calculateSubmenuHeight(submenu, measurementContext);
      this.#setSubmenuHeightVars(preOpenHeight);

      item.ariaExpanded = 'true';
      this.ariaExpanded = 'true';

      if (openingFromClosed) {
        delete this.headerComponent.dataset.submenuOpen;
        this.#openSubmenuWithStableClip(submenu, measurementContext, preOpenHeight);
      } else {
        this.#applySubmenuHeight(preOpenHeight, { force: true });
        this.#startSubmenuHeightTracking(submenu, measurementContext, preOpenHeight);
      }
    } else {
      this.#stopSubmenuHeightTracking();
      this.#applySubmenuHeight(0, { force: true });
      item.ariaExpanded = 'true';
      this.ariaExpanded = 'true';
    }

    this.style.setProperty('--submenu-opacity', '1');
    this.#updateDebugPanel('activate');
  };

  /**
   * Deactivate the active item after a delay
   * @param {PointerEvent | FocusEvent} event
   */
  deactivate(event) {
    if (!(event.target instanceof Element)) return;
    if (this.#debugFreezeOpen) return;

    const menu = findSubmenu(this.#state.activeItem);
    const isMovingWithinMenu = event.relatedTarget instanceof Node && menu?.contains(event.relatedTarget);
    const isMovingToSubmenu = event.relatedTarget instanceof Node && menu?.contains(event.relatedTarget);
    const isMovingToOverflowMenu =
      event.relatedTarget instanceof Node && event.relatedTarget.parentElement?.matches('[slot="overflow"]');

    if (isMovingWithinMenu || isMovingToOverflowMenu || isMovingToSubmenu) return;

    if (event.type === 'pointerleave') {
      this.#clearDeactivateTimeout();
      this.#deactivateTimeout = window.setTimeout(() => {
        if (this.#debugFreezeOpen) return;

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
    if (this.#debugFreezeOpen) return;

    // Don't deactivate if the overflow menu or overflow list is still being hovered
    if (this.overflowListHovered || this.overflowMenu?.matches(':hover')) return;

    this.#cancelStableSubmenuOpen();
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

    this.#updateDebugPanel('deactivate');
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
    this.querySelectorAll('img[loading="lazy"]').forEach((image) => {
      image.removeAttribute('loading');
    });
  };

  /**
   * Prime content-visibility so first hover measures full megamenu height while the page is still loading.
   */
  #schedulePrimeSubmenuLayout() {
    const prime = () => this.#primeSubmenuLayout();

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prime, { timeout: 2000 });
    } else {
      window.setTimeout(prime, 0);
    }
  }

  #primeSubmenuLayout() {
    this.querySelectorAll('.menu-list__submenu').forEach((submenu) => {
      if (!(submenu instanceof HTMLElement)) return;
      if (submenu.dataset.active !== undefined) return;

      submenu.dataset.active = '';
      this.#prepareSubmenuAssets(submenu);
      this.#flushSubmenuLayout(submenu);
      delete submenu.dataset.active;
    });
  }

  /**
   * @param {HTMLElement} submenu
   */
  #prepareSubmenuAssets(submenu) {
    submenu.querySelectorAll('img').forEach((image) => {
      image.removeAttribute('loading');

      if (!image.complete) {
        image.addEventListener(
          'load',
          () => this.#measureAndApplySubmenuHeight(),
          { once: true }
        );
        image.addEventListener(
          'error',
          () => this.#measureAndApplySubmenuHeight(),
          { once: true }
        );
      }

      image.decode?.().catch(() => {});
    });
  }

  /**
   * @param {number} submenuHeight
   */
  #setSubmenuHeightVars(submenuHeight) {
    if (!this.headerComponent) return;

    if (submenuHeight > 0) {
      submenuHeight = Math.max(submenuHeight, this.#getActiveSubmenuLiveHeight());

      // Keep desktop mega menus from clipping to an undershot measured height.
      if (window.matchMedia('(min-width: 990px)').matches) {
        submenuHeight = Math.max(submenuHeight, HeaderMenu.DESKTOP_MIN_SUBMENU_HEIGHT);
      }
    }

    updateHeaderHeights();
    this.headerComponent.style.setProperty('--submenu-height', `${submenuHeight}px`);
    this.#setFullOpenHeaderHeight(submenuHeight);
    this.#updateDebugPanel('set-vars');
  }

  /**
   * Use live DOM dimensions as a floor so clip-path never undershoots
   * and cuts the mega menu midway through links/cards.
   * @returns {number}
   */
  #getActiveSubmenuLiveHeight() {
    const activeSubmenu = findSubmenu(this.#state.activeItem) ?? this.overflowMenu;
    if (!(activeSubmenu instanceof HTMLElement)) return 0;

    const submenuInner = activeSubmenu.querySelector('.menu-list__submenu-inner');
    const measuredElement = submenuInner instanceof HTMLElement ? submenuInner : activeSubmenu;
    const featuredCollections = activeSubmenu.querySelector('.mega-menu-featured-collections');

    const heights = [
      activeSubmenu.scrollHeight,
      activeSubmenu.offsetHeight,
      activeSubmenu.getBoundingClientRect().height,
      measuredElement.scrollHeight,
      measuredElement.offsetHeight,
      measuredElement.getBoundingClientRect().height,
    ];

    if (featuredCollections instanceof HTMLElement) {
      heights.push(
        featuredCollections.scrollHeight,
        featuredCollections.offsetHeight,
        featuredCollections.getBoundingClientRect().height
      );

      const cards = featuredCollections.querySelector('.mega-menu-featured-collections__cards');
      if (cards instanceof HTMLElement) {
        heights.push(cards.scrollHeight, cards.offsetHeight, cards.getBoundingClientRect().height);
      }
    }

    return Math.ceil(Math.max(...heights.filter((height) => height > 0), 0));
  }

  /**
   * First open while the page is still loading: remeasure without clip-path animation until height is stable.
   * @param {HTMLElement} submenu
   * @param {{ isDefaultSlot: boolean; hasSubmenu: boolean }} context
   * @param {number} initialHeight
   */
  #openSubmenuWithStableClip(submenu, context, initialHeight) {
    const activeItem = this.#state.activeItem;

    const runStableMeasureLoop = () => {
      let lastHeight = initialHeight;
      let maxHeight = initialHeight;
      let stableFrames = 0;
      let frame = 0;
      const maxFrames = 12;

      const step = () => {
        this.#pendingStableOpenFrame = null;

        if (this.#state.activeItem !== activeItem || findSubmenu(activeItem) !== submenu) return;

        this.#flushSubmenuLayout(submenu);
        const measuredHeight = this.#calculateSubmenuHeight(submenu, context);
        maxHeight = Math.max(maxHeight, measuredHeight);
        this.#setSubmenuHeightVars(maxHeight);

        if (maxHeight > 0 && Math.abs(maxHeight - lastHeight) <= 1) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
        }

        lastHeight = maxHeight;
        frame += 1;

        if (stableFrames >= 2 || frame >= maxFrames) {
          this.#finalizeSubmenuOpen(submenu, context, maxHeight);
          return;
        }

        this.#pendingStableOpenFrame = requestAnimationFrame(step);
      };

      step();
    };

    Promise.race([
      this.#whenSubmenuImagesReady(submenu),
      new Promise((resolve) => window.setTimeout(resolve, 150)),
    ]).then(() => {
      if (this.#state.activeItem !== activeItem || findSubmenu(activeItem) !== submenu) return;
      runStableMeasureLoop();
    });
  }

  /**
   * @param {HTMLElement} submenu
   * @param {{ isDefaultSlot: boolean; hasSubmenu: boolean }} context
   * @param {number} height
   */
  #finalizeSubmenuOpen(submenu, context, height) {
    if (!this.headerComponent) return;

    this.#submenuMeasurementContext = {
      submenu,
      ...context,
      appliedHeight: Math.max(0, height),
    };

    this.#setSubmenuHeightVars(height);
    this.headerComponent.dataset.submenuOpen = '';
    this.#startSubmenuHeightTracking(submenu, context, height);
  }

  #cancelStableSubmenuOpen() {
    if (this.#pendingStableOpenFrame) {
      cancelAnimationFrame(this.#pendingStableOpenFrame);
      this.#pendingStableOpenFrame = null;
    }
  }

  /**
   * @param {HTMLElement} submenu
   * @returns {Promise<void>}
   */
  #whenSubmenuImagesReady(submenu) {
    const images = [...submenu.querySelectorAll('img')];

    if (images.length === 0) return Promise.resolve();

    return Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          })
      )
    ).then(() =>
      Promise.all(images.map((image) => image.decode?.().catch(() => {}) ?? Promise.resolve()))
    );
  }

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

    this.#setSubmenuHeightVars(submenuHeight);

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

  #syncHeaderLayoutAndRefreshSubmenu() {
    updateHeaderHeights();

    if (!this.#state.activeItem) return;

    this.#measureAndApplySubmenuHeight();
    this.#updateDebugPanel('sync');
  }

  #observeHeaderResize() {
    const header = this.headerComponent;
    if (!header) return;

    this.#headerResizeObserver?.disconnect();
    this.#headerResizeObserver = new ResizeObserver(
      debounce(() => {
        this.#syncHeaderLayoutAndRefreshSubmenu();
      }, 16)
    );
    this.#headerResizeObserver.observe(header);

    const headerTopRow = header.querySelector('.header__row--top');
    if (headerTopRow instanceof HTMLElement) {
      this.#headerResizeObserver.observe(headerTopRow);
    }
  }

  #initDebugTools() {
    const queryEnabled = new URLSearchParams(window.location.search).get('megaMenuDebug') === '1';
    const storedEnabled = window.localStorage.getItem(HeaderMenu.DEBUG_STORAGE_KEY) === '1';
    this.#debugEnabled = queryEnabled || storedEnabled;

    if (!this.#debugEnabled) return;

    this.#mountDebugPanel();
    this.#updateDebugPanel('init');
  }

  /**
   * Toggle debug panel with Option+Shift+D (mac) / Alt+Shift+D.
   * Toggle freeze with Option+Shift+F (mac) / Alt+Shift+F.
   * Uses event.code so Option-modified characters still work on macOS.
   * @param {KeyboardEvent} event
   */
  #handleDebugHotkeys = (event) => {
    const isModifierCombo = event.shiftKey && (event.altKey || event.metaKey);
    if (!isModifierCombo) return;

    if (event.code === 'KeyD') {
      event.preventDefault();
      this.#toggleDebug();
      return;
    }

    if (event.code === 'KeyF') {
      event.preventDefault();
      this.#toggleFreeze();
    }
  };

  #toggleDebug() {
    this.#debugEnabled = !this.#debugEnabled;
    window.localStorage.setItem(HeaderMenu.DEBUG_STORAGE_KEY, this.#debugEnabled ? '1' : '0');

    if (!this.#debugEnabled) {
      this.#debugFreezeOpen = false;
      this.dataset.debugFreeze = 'false';
      this.#teardownDebugPanel();
      return;
    }

    this.#mountDebugPanel();
    this.#updateDebugPanel('debug-on');
  }

  #toggleFreeze() {
    if (!this.#debugEnabled) {
      this.#debugEnabled = true;
      window.localStorage.setItem(HeaderMenu.DEBUG_STORAGE_KEY, '1');
      this.#mountDebugPanel();
    }

    this.#debugFreezeOpen = !this.#debugFreezeOpen;
    this.dataset.debugFreeze = this.#debugFreezeOpen ? 'true' : 'false';
    this.headerComponent?.toggleAttribute('data-mega-menu-debug-freeze', this.#debugFreezeOpen);

    if (this.#debugFreezeOpen) {
      this.#pinFrozenMenuOpen();
    } else {
      this.#clearFrozenMenuStyles();
    }

    this.#updateDebugPanel(this.#debugFreezeOpen ? 'freeze-on' : 'freeze-off');
  }

  #pinFrozenMenuOpen() {
    this.#clearDeactivateTimeout();

    const item = this.#state.activeItem;
    if (!item || !this.headerComponent) return;

    const submenu = findSubmenu(item);
    if (!(submenu instanceof HTMLElement)) return;

    submenu.dataset.active = '';
    item.ariaExpanded = 'true';
    this.ariaExpanded = 'true';
    this.headerComponent.dataset.submenuOpen = '';
    this.style.setProperty('--submenu-opacity', '1');

    const context = this.#submenuMeasurementContext ?? {
      submenu,
      isDefaultSlot: true,
      hasSubmenu: true,
    };

    this.#flushSubmenuLayout(submenu);
    const height = Math.max(
      this.#calculateSubmenuHeight(submenu, context),
      this.#getActiveSubmenuLiveHeight(),
      HeaderMenu.DESKTOP_MIN_SUBMENU_HEIGHT
    );

    this.#submenuMeasurementContext = {
      submenu,
      isDefaultSlot: context.isDefaultSlot,
      hasSubmenu: context.hasSubmenu,
      appliedHeight: height,
    };
    this.#setSubmenuHeightVars(height);
  }

  #clearFrozenMenuStyles() {
    this.headerComponent?.removeAttribute('data-mega-menu-debug-freeze');
  }

  #mountDebugPanel() {
    if (this.#debugPanel) return;

    const panel = document.createElement('pre');
    panel.setAttribute('data-mega-menu-debug', '');
    panel.style.position = 'fixed';
    panel.style.top = '12px';
    panel.style.right = '12px';
    panel.style.zIndex = '2147483647';
    panel.style.maxWidth = '420px';
    panel.style.maxHeight = '60vh';
    panel.style.overflow = 'auto';
    panel.style.margin = '0';
    panel.style.padding = '12px';
    panel.style.background = 'rgb(0 0 0 / 85%)';
    panel.style.color = '#9ef3c3';
    panel.style.font = '12px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    panel.style.border = '1px solid rgb(158 243 195 / 45%)';
    panel.style.borderRadius = '6px';
    panel.style.whiteSpace = 'pre-wrap';
    panel.style.pointerEvents = 'none';
    panel.style.userSelect = 'text';
    panel.textContent = 'Mega menu debug booting...';
    document.body.append(panel);
    this.#debugPanel = panel;
  }

  #teardownDebugPanel() {
    this.#debugPanel?.remove();
    this.#debugPanel = null;
  }

  /**
   * @param {string} reason
   */
  #updateDebugPanel(reason) {
    if (!this.#debugEnabled || !this.#debugPanel || !this.headerComponent) return;

    const activeSubmenu = findSubmenu(this.#state.activeItem) ?? this.overflowMenu;
    const submenuInner =
      activeSubmenu instanceof HTMLElement ? activeSubmenu.querySelector('.menu-list__submenu-inner') : null;
    const target = submenuInner instanceof HTMLElement ? submenuInner : activeSubmenu;
    const headerStyles = getComputedStyle(this.headerComponent);
    const now = new Date().toLocaleTimeString();

    const lines = [
      `Mega Menu Debug (${now})`,
      `reason: ${reason}`,
      `active: ${this.#state.activeItem?.textContent?.trim() || 'none'}`,
      `freeze: ${this.#debugFreezeOpen ? 'ON' : 'off'}   (Alt+Shift+F)`,
      `debug: ON   (Alt+Shift+D toggles)`,
      '',
      `--submenu-height: ${headerStyles.getPropertyValue('--submenu-height').trim()}`,
      `--full-open-header-height: ${headerStyles.getPropertyValue('--full-open-header-height').trim()}`,
      `--header-height: ${headerStyles.getPropertyValue('--header-height').trim()}`,
      `dataset.submenuOpen: ${this.headerComponent.dataset.submenuOpen !== undefined ? 'true' : 'false'}`,
      `dataset.debugFreeze: ${this.dataset.debugFreeze || 'false'}`,
      '',
      `submenu.offsetHeight: ${activeSubmenu instanceof HTMLElement ? Math.ceil(activeSubmenu.offsetHeight) : 0}`,
      `submenu.scrollHeight: ${activeSubmenu instanceof HTMLElement ? Math.ceil(activeSubmenu.scrollHeight) : 0}`,
      `target.offsetHeight: ${target instanceof HTMLElement ? Math.ceil(target.offsetHeight) : 0}`,
      `target.scrollHeight: ${target instanceof HTMLElement ? Math.ceil(target.scrollHeight) : 0}`,
      `liveHeightFloor: ${this.#getActiveSubmenuLiveHeight()}`,
      `desktopMinFloor: ${window.matchMedia('(min-width: 990px)').matches ? HeaderMenu.DESKTOP_MIN_SUBMENU_HEIGHT : 0}`,
    ];

    this.#debugPanel.textContent = lines.join('\n');
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
