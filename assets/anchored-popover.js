import { Component } from '@theme/component';
import { debounce, requestIdleCallback } from '@theme/utilities';

/**
 * A custom element that manages the popover + popover trigger relationship for anchoring.
 * Calculates the trigger position and inlines custom properties on the popover element
 * that can be consumed by CSS for positioning.
 *
 * @extends {Component}
 *
 * @example
 * ```html
 * <anchored-popover-component data-close-on-resize>
 *   <button data-ref="trigger" popovertarget="menu">Open Menu</button>
 *   <div data-ref="popover" id="menu" popover>Menu content</div>
 * </anchored-popover-component>
 * ```
 *
 * @property {string[]} requiredRefs - Required refs: 'popover' and 'trigger'
 * @property {string} [data-close-on-resize] - When present, closes popover on window resize
 */
export class AnchoredPopoverComponent extends Component {
  requiredRefs = ['popover', 'trigger'];

  /**
   * Updates the popover position by calculating trigger element bounds
   * and setting CSS custom properties on the popover element.
   */
  #updatePosition = async () => {
    const popover = /** @type {HTMLElement} */ (this.refs.popover);
    const trigger = /** @type {HTMLElement} */ (this.refs.trigger);
    if (!popover || !trigger) return;
    const positions = trigger.getBoundingClientRect();
    popover.style.setProperty('--anchor-top', `${positions.top}`);
    popover.style.setProperty('--anchor-right', `${window.innerWidth - positions.right}`);
    popover.style.setProperty('--anchor-bottom', `${window.innerHeight - positions.bottom}`);
    popover.style.setProperty('--anchor-left', `${positions.left}`);
  };

  /**
   * Debounced resize handler that optionally closes the popover
   * when the window is resized, based on the data-close-on-resize attribute.
   */
  #resizeListener = debounce(() => {
    if (this.dataset.closeOnResize) {
      const popover = /** @type {HTMLElement} */ (this.refs.popover);
      if (popover && popover.matches(':popover-open')) {
        popover.hidePopover();
      }
    }
  }, 100);

  /**
   * Component initialization - sets up event listeners for resize and popover toggle events.
   */
  connectedCallback() {
    super.connectedCallback();
    const popover = /** @type {HTMLElement} */ (this.refs.popover);
    popover?.addEventListener('beforetoggle', (event) => {
      const evt = /** @type {ToggleEvent} */ (event);
      this.#updatePosition();
      window[evt.newState === 'open' ? 'addEventListener' : 'removeEventListener']('resize', this.#resizeListener);
    });
    requestIdleCallback(() => {
      this.#updatePosition();
    });
  }

  /**
   * Component cleanup - removes resize event listener.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#resizeListener);
  }
}

if (!customElements.get('anchored-popover-component')) {
  customElements.define('anchored-popover-component', AnchoredPopoverComponent);
}
