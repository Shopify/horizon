/**
 * Deferred Hydration Utility
 * Hydrates content when it enters the viewport on mobile.
 */

import { onDocumentReady } from '@theme/utilities';

class DeferredHydration extends HTMLElement {
  constructor() {
    super();
    this.observer = null;
  }

  connectedCallback() {
    onDocumentReady(() => {
      const mobileOnly = this.hasAttribute('mobile-only');
      const isMobile = window.innerWidth < 750;

      if (mobileOnly && !isMobile) {
        this.hydrate();
        return;
      }

      // If it's already in viewport or we want to be safe, use IntersectionObserver
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.hydrate();
            this.observer.disconnect();
          }
        });
      }, { rootMargin: '200px' });

      this.observer.observe(this);
    });
  }

  hydrate() {
    const template = this.querySelector('template');
    if (template) {
      const content = template.content.cloneNode(true);
      this.appendChild(content);
      // Remove template to avoid re-hydration
      template.remove();
      this.setAttribute('hydrated', '');
      
      // Look for any scripts that might need a nudge
      this.querySelectorAll('script').forEach(script => {
        const newScript = document.createElement('script');
        Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.innerHTML = script.innerHTML;
        if (script.parentNode) {
          script.parentNode.replaceChild(newScript, script);
        }
      });
    }
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

if (!customElements.get('deferred-hydration')) {
  customElements.define('deferred-hydration', DeferredHydration);
}
