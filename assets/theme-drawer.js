import { Component } from '@theme/component';
import { trapFocus, removeTrapFocus } from '@theme/focus';
import { isClickedOutside, lockScroll, onAnimationEnd, unlockScroll } from '@theme/utilities';

/** Viewport width below which the drawer opens as a modal overlay (no squeeze). */
const MODAL_BREAKPOINT = 990;

/**
 * A drawer that opens from the right side.
 *
 * On wide viewports (≥ 990px) the drawer squeezes page content alongside it.
 * The panel is a non-modal dialog (`show()`); we install a focus trap via
 * `trapFocus()` so Tab cycles within the drawer, mirroring the modal-mode
 * a11y contract. Focus moves to the close button on open and returns to
 * the trigger on close.
 *
 * On narrow viewports (< 990px) the drawer overlays with a backdrop. The
 * panel is a modal dialog (`showModal()`) — native focus trap, scroll-lock,
 * and ARIA semantics. Same focus-on-close-button + restore-on-close UX.
 *
 * Dispatches {@link DrawerOpenEvent} and {@link DrawerCloseEvent}.
 *
 * @typedef {object} Refs
 * @property {HTMLDialogElement} panel - The dialog that owns all visual styles and animation.
 *
 * @extends {Component<Refs>}
 */
export class ThemeDrawer extends Component {
  requiredRefs = ['panel'];

  /** Monotonically increasing counter for z-index stacking of multiple open drawers. */
  static #stackOrder = 0;

  /** @type {boolean} */
  #isClosing = false;

  /** When true, the drawer will reopen after the current close animation finishes. */
  /** @type {{ enter?: 'inline-start' } | false} */
  #deferredOpen = false;

  /** Element to restore focus to when the drawer closes. */
  /** @type {HTMLElement | null} */
  #previouslyFocused = null;

  /** @type {MediaQueryList} */
  #modalQuery = window.matchMedia(`(max-width: ${MODAL_BREAKPOINT - 1}px)`);

  /**
   * @returns {boolean} Whether the drawer is currently open.
   */
  get isOpen() {
    return this.hasAttribute('open');
  }

  connectedCallback() {
    super.connectedCallback();
    this.#modalQuery.addEventListener('change', this.#onModalBreakpointChange);

    // Sync the static stack counter with any --drawer-stack-order set by the
    // synchronous restore script (which runs before this module loads).
    const restoredOrder = Number(this.style.getPropertyValue('--drawer-stack-order') || 0);
    if (restoredOrder > ThemeDrawer.#stackOrder) {
      ThemeDrawer.#stackOrder = restoredOrder;
    }

    if (this.isOpen) {
      this.#onRestore();
    }
  }

  /**
   * Restore path: the inline script in theme-drawer.liquid set [open] on
   * <theme-drawer> + <dialog> before this module loaded. The dialog is
   * already visible — we just wire close listeners. We deliberately skip
   * trapFocus and focus moves: the user is loading a fresh page and
   * expects focus on main content, not inside a drawer left over from
   * the previous session.
   */
  #onRestore() {
    const { panel } = this.refs;
    if (this.#modalQuery.matches) {
      lockScroll(panel);
    }

    document.addEventListener('keydown', this.#onKeyDown);
    panel.addEventListener('click', this.#onBackdropClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    unlockScroll(this.refs.panel);
    this.#modalQuery.removeEventListener('change', this.#onModalBreakpointChange);
    this.#removeEventListeners();
    removeTrapFocus();
    this.#deferredOpen = false;
  }

  /**
   * Closes the drawer when the user clicks the backdrop (outside the dialog
   * content area). Only meaningful in modal mode — in sidebar mode the
   * dialog has no backdrop so this handler is inert.
   *
   * @param {MouseEvent} event - The mouse event.
   */
  #onBackdropClick = (event) => {
    const { panel } = this.refs;

    if (isClickedOutside(event, panel)) {
      if (this.#hasOpenNestedDialog()) return;

      this.close();
    }
  };

  /**
   * @returns {boolean} Whether the drawer panel contains an open dialog other than itself.
   */
  #hasOpenNestedDialog() {
    return this.#getOpenNestedDialog() !== null;
  }

  /**
   * @returns {HTMLDialogElement | null} The open dialog nested inside the drawer panel, if any.
   */
  #getOpenNestedDialog() {
    return /** @type {HTMLDialogElement | null} */ (this.refs.panel.querySelector('dialog[open]'));
  }

  /**
   * Switches the dialog between modal and non-modal when the viewport
   * crosses the modal breakpoint while the drawer is open.
   */
  #onModalBreakpointChange = () => {
    if (!this.isOpen) return;

    const { panel } = this.refs;
    const nestedDialog = this.#getOpenNestedDialog();
    const nestedActiveElement =
      nestedDialog?.contains(document.activeElement) && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // Close the current dialog mode and immediately reopen in the new mode.
    // No animation — the drawer stays visually in place.
    panel.close();
    removeTrapFocus();

    if (this.#modalQuery.matches) {
      lockScroll(panel);
      panel.showModal();
    } else {
      unlockScroll(panel);
      panel.show();
      trapFocus(panel);
    }

    if (nestedDialog?.open) {
      this.#bringNestedDialogToFront(nestedDialog, nestedActiveElement);
    } else {
      this.#focusInitialElement();
    }

    // Ensure keydown and click listeners are registered. The sessionStorage
    // restore path bypasses open(), so these may not have been added yet.
    // addEventListener deduplicates identical listeners, so this is safe
    // even if they were already registered.
    document.addEventListener('keydown', this.#onKeyDown);
    panel.addEventListener('click', this.#onBackdropClick);
  };

  /**
   * Closes the drawer when the user presses Escape.
   * preventDefault() suppresses the native dialog cancel event in modal mode.
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    // isComposing: don't close while an Input Method Editor (e.g. Japanese,
    // Chinese, Korean input) consumes Escape to dismiss its candidate list —
    // can happen inside the cart's discount-code field.
    // defaultPrevented: let nested components handle Escape first.
    if (event.isComposing || event.defaultPrevented) return;
    if (!this.isOpen) return;
    if (!this.#isTopmost()) return;

    event.preventDefault();
    this.close();
  };

  /**
   * Shows the drawer.
   *
   * @param {object} [options]
   * @param {'inline-start'} [options.enter] - Slide direction. `'inline-start'` slides left-to-right (used when the chat docks).
   */
  open({ enter } = {}) {
    if (this.isOpen) {
      this.#bringToFront({ enter });
      return;
    }
    if (this.#isClosing) {
      this.#deferredOpen = { enter };
      return;
    }

    const { panel } = this.refs;

    ThemeDrawer.#stackOrder += 1;
    this.style.setProperty('--drawer-stack-order', String(ThemeDrawer.#stackOrder));

    const openClass =
      enter === 'inline-start' ? 'theme-drawer__dialog--opening-inline-start' : 'theme-drawer__dialog--opening';
    panel.classList.add(openClass);

    this.#previouslyFocused = /** @type {HTMLElement | null} */ (document.activeElement);

    if (this.#modalQuery.matches) {
      lockScroll(panel);
      panel.showModal();
    } else {
      panel.show();
      trapFocus(panel);
    }

    this.#focusInitialElement();

    onAnimationEnd(panel, () => panel.classList.remove(openClass), { subtree: false });

    this.setAttribute('open', '');
    this.dispatchEvent(new DrawerOpenEvent());

    document.addEventListener('keydown', this.#onKeyDown);
    panel.addEventListener('click', this.#onBackdropClick);
  }

  /**
   * Bumps this drawer's z-index to the top of the stack and replays
   * the slide-in animation. Called when open() is invoked on an
   * already-open drawer.
   *
   * @param {object} [options]
   * @param {'inline-start'} [options.enter] - Slide direction.
   */
  #bringToFront({ enter } = {}) {
    const { panel } = this.refs;

    ThemeDrawer.#stackOrder += 1;
    this.style.setProperty('--drawer-stack-order', String(ThemeDrawer.#stackOrder));

    // In modal mode, dialogs live in the browser's top layer where z-index
    // is ignored — stacking follows showModal() call order. Re-calling
    // showModal() moves this dialog to the top of the stack.
    if (this.#modalQuery.matches && panel.open) {
      lockScroll(panel);
      panel.close();
      panel.showModal();
    }

    const openClass =
      enter === 'inline-start' ? 'theme-drawer__dialog--opening-inline-start' : 'theme-drawer__dialog--opening';
    panel.classList.add(openClass);
    onAnimationEnd(panel, () => panel.classList.remove(openClass), { subtree: false });

    // Re-fire so persistDrawerState picks up the new stack order.
    this.dispatchEvent(new DrawerOpenEvent());
  }

  #removeEventListeners() {
    const { panel } = this.refs;

    document.removeEventListener('keydown', this.#onKeyDown);
    panel.removeEventListener('click', this.#onBackdropClick);
  }

  /**
   * Moves focus to the close button inside the drawer panel.
   * Every theme-drawer renders the close button via theme-drawer-header.
   * If a future drawer omits it, that drawer is responsible for its own focus management.
   */
  #focusInitialElement() {
    const closeButton = /** @type {HTMLElement | null} */ (
      this.refs.panel.querySelector('.theme-drawer__close-button')
    );
    closeButton?.focus();
  }

  /**
   * Reopens a nested modal after the drawer panel changes mode so it remains
   * above the drawer in the browser top layer.
   *
   * @param {HTMLDialogElement} dialog - The nested dialog to restack.
   * @param {HTMLElement | null} focusTarget - Element to refocus inside the nested dialog.
   */
  #bringNestedDialogToFront(dialog, focusTarget) {
    dialog.close();
    dialog.showModal();

    if (focusTarget && document.contains(focusTarget) && dialog.contains(focusTarget)) {
      focusTarget.focus();
    }
  }

  /**
   * Slides the drawer out, waits for the animation, then closes the dialog.
   */
  async #closeDialog() {
    if (!this.isOpen) return;
    if (this.#isClosing) return;
    this.#isClosing = true;

    this.#removeEventListeners();
    removeTrapFocus();

    const { panel } = this.refs;

    this.removeAttribute('open');
    this.dispatchEvent(new DrawerCloseEvent());

    unlockScroll(panel);

    if (panel.open) {
      // Cancel any in-progress open animation before starting the close.
      panel.classList.remove('theme-drawer__dialog--opening', 'theme-drawer__dialog--opening-inline-start');

      panel.classList.add('theme-drawer__dialog--closing');
      await onAnimationEnd(panel, undefined, { subtree: false });
      panel.classList.remove('theme-drawer__dialog--closing');
    }

    panel.close();
    this.style.removeProperty('--drawer-stack-order');

    if (!document.querySelector('theme-drawer[open]')) {
      ThemeDrawer.#stackOrder = 0;
    }

    const trigger = this.#previouslyFocused;
    this.#previouslyFocused = null;
    // A Section Rendering API morph between open and close can replace the
    // trigger node. The JS reference stays valid but the element is detached
    // from the live DOM — and .focus() on a detached node is a silent no-op,
    // so we explicitly check and fall back to a fresh query.
    if (trigger && document.contains(trigger)) {
      trigger.focus();
    } else {
      /** @type {HTMLElement | null} */ (document.querySelector(`[aria-controls="${this.id}"]`))?.focus();
    }

    this.#isClosing = false;

    // Reconcile: if open() was called during the close animation, reopen now.
    if (this.#deferredOpen) {
      const options = this.#deferredOpen;
      this.#deferredOpen = false;
      this.open(options);
    }
  }

  /**
   * Closes the drawer.
   */
  async close() {
    if (this.#isClosing) {
      // A close is already in progress — cancel any deferred open so the
      // drawer stays closed when the animation finishes.
      this.#deferredOpen = false;
      return;
    }
    await this.#closeDialog();
  }

  /**
   * Toggles the drawer. If the drawer is open but not the topmost in the
   * stack, it is brought to front instead of closed.
   */
  toggle() {
    if (this.isOpen && this.#isTopmost()) {
      return this.close();
    }
    return this.open();
  }

  /**
   * @returns {boolean} Whether this drawer has the highest stack order among all open drawers.
   */
  #isTopmost() {
    const myOrder = Number(this.style.getPropertyValue('--drawer-stack-order') || 0);
    for (const other of document.querySelectorAll('theme-drawer[open]')) {
      if (other === this) continue;
      const otherOrder = Number(/** @type {HTMLElement} */ (other).style.getPropertyValue('--drawer-stack-order') || 0);
      if (otherOrder > myOrder) return false;
    }
    return true;
  }
}

if (!customElements.get('theme-drawer')) {
  customElements.define('theme-drawer', ThemeDrawer);
}

export class DrawerOpenEvent extends CustomEvent {
  constructor() {
    super(DrawerOpenEvent.eventName, { bubbles: true });
  }

  static eventName = 'theme-drawer:open';
}

export class DrawerCloseEvent extends CustomEvent {
  constructor() {
    super(DrawerCloseEvent.eventName, { bubbles: true });
  }

  static eventName = 'theme-drawer:close';
}
