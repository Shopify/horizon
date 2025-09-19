import { Component } from '@theme/component';

/**
 * A small utility for setting up an animated disclosure panel using inert and CSS display grid for height auto animation.
 *
 * This component works with any element that follows the details/summary pattern for revealing content.
 * Forms and other interactive elements don't need to live inside a details element, but can still use
 * the expanded pattern for accessibility and animation.
 *
 * The component relies on CSS display grid and inert attributes to create smooth height animations
 * when expanding/collapsing content areas.
 *
 * @class DisclosureCustom
 * @typedef {object} Refs
 * @property {HTMLElement} disclosureTrigger – The disclosure trigger element.
 * @property {HTMLElement} disclosureContent – The disclosure content element.
 *
 * @extends Component<Refs>
 */
class DisclosureCustom extends Component {
  requiredRefs = ['disclosureTrigger', 'disclosureContent'];

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  /**
   * Toggles the disclosure panel open/closed state.
   * Updates aria-expanded, aria-label attributes on the trigger and inert state on content.
   * Works with CSS grid animations to provide smooth height transitions.
   */
  toggleDisclosure = () => {
    const { disclosureTrigger: trigger, disclosureContent: content } = this.refs;
    const expanded = trigger.matches('[aria-expanded="true"]');
    trigger.setAttribute('aria-expanded', String(!expanded));
    trigger.setAttribute(
      'aria-label',
      `${expanded ? trigger.dataset.disclosureOpen : trigger.dataset.disclosureClose}`
    );
    content.inert = expanded;
  };
}

if (!customElements.get('disclosure-custom')) {
  customElements.define('disclosure-custom', DisclosureCustom);
}
