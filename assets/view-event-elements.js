import { createViewEventElement } from '@shopify/events';
import { Component } from '@theme/component';

export const ProductComponent = createViewEventElement(Component, {
  defaultTrigger: 'intersect',
});

if (!customElements.get('product-component')) {
  customElements.define('product-component', ProductComponent);
}

export const CollectionComponent = createViewEventElement(Component);

if (!customElements.get('collection-component')) {
  customElements.define('collection-component', CollectionComponent);
}
