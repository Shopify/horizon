const LOADED_ATTR = 'data-image-loaded';
const PROMOTED_ATTR = 'data-image-priority-promoted';
const PROMOTE_ROOT_MARGIN = '800px 0px';

let priorityObserver = null;

function markLoaded(img) {
  if (!img || img.getAttribute(LOADED_ATTR) === 'true') return;
  img.setAttribute(LOADED_ATTR, 'true');
}

function handleImage(img) {
  if (!(img instanceof HTMLImageElement)) return;

  if (priorityObserver && img.loading === 'lazy') {
    priorityObserver.observe(img);
  }

  if (img.complete && img.naturalWidth > 0) {
    markLoaded(img);
    return;
  }

  img.addEventListener('load', () => markLoaded(img), { once: true });
  img.addEventListener('error', () => markLoaded(img), { once: true });
}

function handleNode(node) {
  if (node instanceof HTMLImageElement) {
    handleImage(node);
    return;
  }

  if (!(node instanceof Element)) return;

  const images = node.querySelectorAll('img');
  images.forEach((img) => handleImage(img));
}

function init() {
  if ('IntersectionObserver' in window) {
    priorityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const img = entry.target;
        if (!(img instanceof HTMLImageElement)) return;
        if (img.getAttribute(PROMOTED_ATTR) === 'true') {
          priorityObserver.unobserve(img);
          return;
        }

        img.setAttribute(PROMOTED_ATTR, 'true');
        if (img.loading === 'lazy') {
          img.loading = 'eager';
        }
        img.setAttribute('fetchpriority', 'high');
        priorityObserver.unobserve(img);
      });
    }, { rootMargin: PROMOTE_ROOT_MARGIN, threshold: 0 });
  }

  document.querySelectorAll('img').forEach((img) => handleImage(img));

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => handleNode(node));
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
