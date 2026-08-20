import { PageViewEvent } from '@shopify/events';
import { onDocumentReady } from '@theme/utilities';

onDocumentReady(
  function dispatchPageViewEvent() {
    /** @type {HTMLElement | null} */
    const templateElement = document.querySelector('main[data-template]');
    const template = templateElement?.dataset.template || '';

    // -- Page --
    document.dispatchEvent(
      new PageViewEvent({
        page: {
          template,
          title: document.title,
          url: window.location.href,
        },
      })
    );
  },
  { once: true }
);
