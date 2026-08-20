import { Component } from '@theme/component';
import { debounce, requestIdleCallback } from '@theme/utilities';

/**
 * A custom element that manages the popover + popover trigger relationship for anchoring.
 * Calculates the trigger position and inlines custom properties on the popover element
 * that can be consumed by CSS for positioning.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} popover - The popover element.
 * @property {HTMLElement} trigger - The popover trigger element.
 * @property {HTMLElement} [verticalPositionAnchor] - Optional anchor for vertical fallback positioning.
 *
 * @extends Component<Refs>
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
 * @property {number} [interaction_delay] - The delay in milliseconds for the hover interaction
 * @property {string} [data-close-on-resize] - When present, closes popover on window resize
 * @property {string} [data-hover-triggered] - When present, makes the popover function via pointerenter/leave
 * @property {number | null} [popoverTrigger] - The timeout for the popover trigger
 * @property {string} [data-vertical-position-anchor] - Optional external anchor name for vertical fallback positioning
 */
export class AnchoredPopoverComponent extends Component {
  requiredRefs = ['popover', 'trigger'];
  interaction_delay = 200;
  #popoverTrigger = /** @type {number | null} */ (null);

  #onTriggerEnter = () => {
    const { trigger, popover } = this.refs;
    trigger.dataset.hoverActive = 'true';
    if (!popover.matches(':popover-open')) {
      this.#popoverTrigger = setTimeout(() => {
        if (trigger.matches('[data-hover-active]')) popover.showPopover();
      }, this.interaction_delay);
    }
  };

  #onTriggerLeave = () => {
    const { trigger, popover } = this.refs;
    delete trigger.dataset.hoverActive;
    if (this.#popoverTrigger) clearTimeout(this.#popoverTrigger);
    if (popover.matches(':popover-open')) {
      this.#popoverTrigger = setTimeout(() => {
        popover.hidePopover();
      }, this.interaction_delay);
    }
  };

  #onPopoverEnter = () => {
    if (this.#popoverTrigger) clearTimeout(this.#popoverTrigger);
  };

  #onPopoverLeave = () => {
    const { popover } = this.refs;
    this.#popoverTrigger = setTimeout(() => {
      popover.hidePopover();
    }, this.interaction_delay);
  };

  /**
   * Updates the popover position by calculating trigger element bounds
   * and setting CSS custom properties on the popover element.
   */
  #updatePosition = async () => {
    const { popover, trigger } = this.refs;
    if (!popover || !trigger) return;

    const triggerPositions = trigger.getBoundingClientRect();
    const verticalPositionAnchor = this.#getVerticalPositionAnchor();
    const verticalPositions = (verticalPositionAnchor ?? trigger).getBoundingClientRect();

    popover.style.setProperty('--anchor-top', `${verticalPositions.top}`);
    popover.style.setProperty('--anchor-right', `${window.innerWidth - triggerPositions.right}`);
    popover.style.setProperty('--anchor-bottom', `${window.innerHeight - verticalPositions.bottom}`);
    popover.style.setProperty('--anchor-left', `${triggerPositions.left}`);
    popover.style.setProperty('--anchor-height', `${verticalPositions.height}`);
    popover.style.setProperty('--anchor-width', `${triggerPositions.width}`);
  };

  /**
   * Finds the vertical fallback anchor. Internal refs are kept for existing callers;
   * data-vertical-position-anchor supports sibling/external anchors outside Component refs.
   *
   * @returns {HTMLElement | null}
   */
  #getVerticalPositionAnchor() {
    const internalAnchor = this.refs.verticalPositionAnchor;
    if (internalAnchor instanceof HTMLElement) return internalAnchor;

    const anchorName = this.dataset.verticalPositionAnchor?.trim();
    if (!anchorName) return null;

    const selector = `[data-anchor-name="${CSS.escape(anchorName)}"]`;
    const scopedAnchor = this.#queryVerticalPositionAnchor(selector);
    if (this.#isUsableExternalVerticalPositionAnchor(scopedAnchor)) return scopedAnchor;

    const root = this.getRootNode();
    const anchor = root instanceof Document || root instanceof ShadowRoot ? root.querySelector(selector) : null;

    return this.#isUsableExternalVerticalPositionAnchor(anchor) ? anchor : null;
  }

  /**
   * @param {string} selector - Escaped selector for the external anchor.
   * @returns {HTMLElement | null}
   */
  #queryVerticalPositionAnchor(selector) {
    const scope = this.closest('[data-anchor-scope], tr, li, section, article, form');
    if (!(scope instanceof HTMLElement)) return null;

    const anchor = scope.querySelector(selector);

    return anchor instanceof HTMLElement ? anchor : null;
  }

  /**
   * @param {Element | null} anchor - External anchor candidate.
   * @returns {anchor is HTMLElement}
   */
  #isUsableExternalVerticalPositionAnchor(anchor) {
    if (!(anchor instanceof HTMLElement)) return false;

    const rect = anchor.getBoundingClientRect();

    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Debounced resize handler that optionally closes the popover
   * when the window is resized, based on the data-close-on-resize attribute.
   */
  #resizeListener = debounce(() => {
    const popover = /** @type {HTMLElement} */ (this.refs.popover);
    if (popover && popover.matches(':popover-open')) {
      popover.hidePopover();
    }
  }, 100);

  /**
   * Opens a dialog from a disclosure trigger without toggling the hover popover preview.
   *
   * @param {string} dialogId - The ID of the dialog component to open.
   * @param {Event} event - The click or activation event.
   */
  openDialog(dialogId, event) {
    event.preventDefault();

    const { popover, trigger } = this.refs;
    const triggerAriaControls = trigger.getAttribute('aria-controls');

    if (this.#popoverTrigger !== null) {
      clearTimeout(this.#popoverTrigger);
      this.#popoverTrigger = null;
    }

    delete trigger.dataset.hoverActive;

    if (popover.matches(':popover-open')) {
      popover.hidePopover();
    }

    const dialog = /** @type {(HTMLElement & { showDialog?: () => void }) | null} */ (
      document.getElementById(dialogId)
    );

    if (typeof dialog?.showDialog !== 'function') return;

    dialog.addEventListener(
      'dialog:close',
      () => {
        const focusTarget = trigger.isConnected ? trigger : getTriggerByAriaControls(triggerAriaControls);
        focusTarget?.focus();
      },
      { once: true }
    );

    dialog.showDialog();
  }

  /**
   * Component initialization - sets up event listeners for resize and popover toggle events.
   */
  connectedCallback() {
    super.connectedCallback();
    const { popover, trigger } = this.refs;
    if (this.dataset.closeOnResize) {
      popover.addEventListener('beforetoggle', (event) => {
        const evt = /** @type {ToggleEvent} */ (event);
        window[evt.newState === 'open' ? 'addEventListener' : 'removeEventListener']('resize', this.#resizeListener);
      });
    }
    if (this.dataset.hoverTriggered) {
      trigger.addEventListener('pointerenter', this.#onTriggerEnter);
      trigger.addEventListener('pointerleave', this.#onTriggerLeave);
      popover.addEventListener('pointerenter', this.#onPopoverEnter);
      popover.addEventListener('pointerleave', this.#onPopoverLeave);
    }
    if (!CSS.supports('position-anchor: --trigger')) {
      popover.addEventListener('beforetoggle', () => {
        this.#updatePosition();
      });
      requestIdleCallback(() => {
        this.#updatePosition();
      });
    }
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

/**
 * Finds a live disclosure trigger matching a prior aria-controls value.
 *
 * @param {string | null} ariaControls - The aria-controls value to match.
 * @returns {HTMLElement | null}
 */
function getTriggerByAriaControls(ariaControls) {
  if (!ariaControls) return null;

  const trigger = document.querySelector(`[aria-controls="${CSS.escape(ariaControls)}"]`);

  return trigger instanceof HTMLElement && trigger.isConnected ? trigger : null;
}
