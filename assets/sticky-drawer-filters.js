import { Component } from "@theme/component";

/**
 * @typedef {Object} StickyDrawerFiltersRefs
 * @property {HTMLElement} drawerWrapper - The drawer wrapper element
 */

/**
 * A custom element that manages sticky behavior for drawer-style filters
 * when they hit the top of the viewport, accounting for sticky header offset.
 *
 * @extends {Component<StickyDrawerFiltersRefs>}
 */
class StickyDrawerFilters extends Component {
  requiredRefs = ["drawerWrapper"];

  /**
   * Intersection observer to detect when element hits the top
   * @type {IntersectionObserver | null}
   */
  #intersectionObserver = null;

  /**
   * Reference to the header component
   * @type {HTMLElement | null}
   */
  #headerComponent = null;

  /**
   * Mutation observer to watch for header sticky state changes
   * @type {MutationObserver | null}
   */
  #headerObserver = null;

  /**
   * Sentinel element to track original position
   * @type {HTMLElement | null}
   */
  #sentinel = null;

  /**
   * Placeholder element to preserve space when sticky
   * @type {HTMLElement | null}
   */
  #placeholder = null;

  /**
   * Throttled scroll handler
   * @type {((event: Event) => void) | null}
   */
  #throttledScrollHandler = null;

  /**
   * Initialize the sticky behavior
   */
  connectedCallback() {
    super.connectedCallback();

    // Only activate if filter style is drawer
    if (!this.dataset.filterStyle || this.dataset.filterStyle !== "drawer") {
      return;
    }

    this.#headerComponent = document.querySelector("#header-component");
    this.#initializeIntersectionObserver();
    this.#initializeHeaderObserver();
    this.#initializeScrollListener();
    this.#initializeDirectHeaderObservation();
  }

  /**
   * Clean up observers and sentinel
   */
  disconnectedCallback() {
    if (this.#intersectionObserver) {
      this.#intersectionObserver.disconnect();
    }
    if (this.#headerObserver) {
      this.#headerObserver.disconnect();
    }
    if (this.#throttledScrollHandler) {
      window.removeEventListener("scroll", this.#throttledScrollHandler);
      this.#throttledScrollHandler = null;
    }
    if (this.#sentinel?.parentNode) {
      this.#sentinel.parentNode.removeChild(this.#sentinel);
      this.#sentinel = null;
    }
    if (this.#placeholder?.parentNode) {
      this.#placeholder.parentNode.removeChild(this.#placeholder);
      this.#placeholder = null;
    }
  }

  /**
   * Initialize intersection observer to detect when drawer hits top of viewport
   */
  #initializeIntersectionObserver() {
    // Find the existing sentinel element in the markup
    this.#sentinel = this.querySelector('[data-sticky-sentinel="true"]');

    if (!this.#sentinel) {
      return;
    }

    const options = {
      root: null,
      rootMargin: "0px 0px 0px 0px",
      threshold: 0,
    };

    this.#intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const { isIntersecting, boundingClientRect } = entry;

        // When the sentinel goes out of view at the top, activate sticky
        // When the sentinel comes back into view, deactivate sticky
        if (!isIntersecting && boundingClientRect.bottom < 0) {
          this.#activateSticky();
        } else if (isIntersecting || boundingClientRect.bottom >= 0) {
          this.#deactivateSticky();
        }
      });
    }, options);

    this.#intersectionObserver.observe(this.#sentinel);
  }

  /**
   * Initialize header observer to watch for scroll direction changes
   */
  #initializeHeaderObserver() {
    if (!this.#headerComponent) return;

    this.#headerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-scroll-direction"
        ) {
          // Immediate synchronous update - no RAF delay
          this.#updateStickyPosition();
        }
      });
    });

    this.#headerObserver.observe(this.#headerComponent, {
      attributes: true,
      attributeFilter: ["data-scroll-direction"],
    });
  }

  /**
   * Add direct observation of header position changes for maximum responsiveness
   */
  #initializeDirectHeaderObservation() {
    if (!this.#headerComponent) return;

    // Additional intersection observer on header for immediate scroll direction detection
    const headerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const currentScrollDirection =
            this.#headerComponent?.dataset.scrollDirection;

          // Trigger update when scroll direction changes or header position changes
          if (
            currentScrollDirection === "up" ||
            currentScrollDirection === "down"
          ) {
            this.#updateStickyPosition();
          }
        });
      },
      {
        threshold: [0, 1],
        rootMargin: "0px",
      },
    );

    headerObserver.observe(this.#headerComponent);
  }

  /**
   * Initialize scroll listener for additional position updates during scroll
   */
  #initializeScrollListener() {
    let ticking = false;

    this.#throttledScrollHandler = (event) => {
      if (
        !ticking &&
        this.refs.drawerWrapper.classList.contains(
          "facets-block-wrapper--sticky",
        )
      ) {
        requestAnimationFrame(() => {
          // Check if scroll direction has changed during scroll and update position
          this.#updateStickyPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", this.#throttledScrollHandler, {
      passive: true,
    });
  }

  /**
   * Activate sticky positioning
   */
  #activateSticky() {
    // Store original dimensions to prevent layout shifts
    const originalWidth = this.refs.drawerWrapper.offsetWidth;
    const originalHeight = this.refs.drawerWrapper.offsetHeight;

    // Create placeholder element to preserve space in document flow
    this.#createPlaceholder(originalHeight);

    this.refs.drawerWrapper.classList.add("facets-block-wrapper--sticky");
    this.refs.drawerWrapper.style.width = `${originalWidth}px`;
    this.#updateStickyPosition();
  }

  /**
   * Deactivate sticky positioning
   */
  #deactivateSticky() {
    this.refs.drawerWrapper.classList.remove("facets-block-wrapper--sticky");
    this.refs.drawerWrapper.style.removeProperty("top");
    this.refs.drawerWrapper.style.removeProperty("width");

    // Remove placeholder element to restore normal document flow
    this.#removePlaceholder();
  }

  /**
   * Update sticky position based on scroll direction
   */
  #updateStickyPosition() {
    if (
      !this.refs.drawerWrapper.classList.contains(
        "facets-block-wrapper--sticky",
      )
    ) {
      return;
    }

    const scrollDirection = this.#headerComponent?.dataset.scrollDirection;
    let newTop = "0px"; // Default position at top

    // When scrolling up, position drawer under the header
    // When scrolling down, position drawer at top of viewport
    if (scrollDirection === "up") {
      newTop = "var(--header-height, 0px)";
    } else if (scrollDirection === "down") {
      newTop = "0px";
    }

    // Force immediate update without checking previous value for instant response
    this.refs.drawerWrapper.style.top = newTop;

    // Force a reflow to ensure immediate visual update
    this.refs.drawerWrapper.offsetHeight;
  }

  /**
   * Create placeholder element to preserve space when sticky
   * @param {number} height - Height of the original element
   */
  #createPlaceholder(height) {
    if (this.#placeholder) {
      this.#removePlaceholder();
    }

    this.#placeholder = document.createElement("div");
    this.#placeholder.style.cssText = `
      height: ${height}px;
      width: 100%;
      visibility: hidden;
      pointer-events: none;
    `;

    // Insert placeholder right after the drawer wrapper
    const parentNode = this.refs.drawerWrapper.parentNode;
    if (parentNode) {
      parentNode.insertBefore(
        this.#placeholder,
        this.refs.drawerWrapper.nextSibling,
      );
    }
  }

  /**
   * Remove placeholder element
   */
  #removePlaceholder() {
    if (this.#placeholder?.parentNode) {
      this.#placeholder.parentNode.removeChild(this.#placeholder);
      this.#placeholder = null;
    }
  }
}

customElements.define("sticky-drawer-filters", StickyDrawerFilters);
