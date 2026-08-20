import { Component } from '@theme/component';
import { ViewEventElement } from '@shopify/events';

/** Record of element refs, matching the JSDoc typedef in component.js */
type Refs = Record<string, Element | Element[] | undefined>;

/**
 * ProductComponent is a Component with view event functionality that dispatches
 * product:view events when visible (via IntersectionObserver by default).
 *
 * The class extends Component and adds the dispatchViewEvent() method.
 */
export class ProductComponent<T extends Refs = Refs> extends Component<T> implements ViewEventElement {
  dispatchViewEvent(): void;
}

/**
 * CollectionComponent is a Component with view event functionality that dispatches
 * collection:view events when connected to the DOM.
 */
export class CollectionComponent<T extends Refs = Refs> extends Component<T> implements ViewEventElement {
  dispatchViewEvent(): void;
}
