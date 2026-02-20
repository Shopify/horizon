import { ThemeEvents } from '@theme/events';

function scrollToHash() {
  const hash = window.location.hash; // "#faq"
  if (hash) {
    const id = hash.slice(1); // remove #
    const target = document.querySelector(`[data-section-id="${id}"]`);
    if (target) {
      let offset = 0;
      const stickyHeader = document.querySelector('.header[data-sticky-state="active"]');
      if (stickyHeader) {
        offset = stickyHeader.clientHeight;
      }

      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
    }
  }
}

// Run on page load
scrollToHash();


// Run on hash change
window.addEventListener("hashchange", scrollToHash);


function calculateHeaderGroupHeight() {
  const headerGroup = document.querySelector('#header-group');
  if (!headerGroup) return 0;

  let totalHeight = 0;
  
  // Get all .shopify-section-group-header-group elements inside #header-group
  const headerSections = headerGroup.querySelectorAll('.shopify-section-group-header-group');
  
  if (headerSections.length === 0) return 0;

  // Check if ANY section has [data-sticky-state="inactive"]
  const hasInactiveElements = Array.from(headerSections).some(section => 
    section.querySelector('[data-sticky-state="inactive"]')
  );

  if (hasInactiveElements) {
    // Sum the heights of all .shopify-section-group-header-group sections
    headerSections.forEach(section => {
      if (section instanceof HTMLElement) {
        const style = window.getComputedStyle(section);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          totalHeight += section.offsetHeight;
        }
      }
    });
  } else {
    // Only get header-component height
    const header = document.querySelector('header-component');
    if (header instanceof HTMLElement) {
      totalHeight += header.offsetHeight;
    }
  }

  return totalHeight;
}

function updateHeaderHeight() {
  const headerHeight = calculateHeaderGroupHeight();
  
  // Update CSS variables
  document.body.style.setProperty('--header-static-height', `${headerHeight}px`);
  document.body.style.setProperty('--header-total-height', `${headerHeight}px`);
}

// Simple debounce
function debounce(func, wait) {
  let timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const headerGroup = document.querySelector('#header-group');
  if (!headerGroup) return;

  // Initial calculation
  updateHeaderHeight();

  // Create ResizeObserver
  const resizeObserver = new ResizeObserver(debounce(() => {
    updateHeaderHeight();
  }, 100));

  // Observe #header-group and all .shopify-section-group-header-group sections
  resizeObserver.observe(headerGroup);
  
  const headerSections = headerGroup.querySelectorAll('.shopify-section-group-header-group');
  headerSections.forEach(section => {
    if (section instanceof HTMLElement) {
      resizeObserver.observe(section);
    }
  });

  // Also observe header-component specifically
  const header = document.querySelector('header-component');
  if (header instanceof HTMLElement) {
    resizeObserver.observe(header);
  }

  // Handle scroll and resize
  const handleUpdate = debounce(updateHeaderHeight, 100);
  window.addEventListener('scroll', handleUpdate, { passive: true });
  window.addEventListener('resize', handleUpdate);

  // Watch for attribute changes on the sections and header-component
  const mutationObserver = new MutationObserver(() => {
    updateHeaderHeight();
  });

  // Observe header sections for changes
  headerSections.forEach(section => {
    mutationObserver.observe(section, { 
      attributes: true, 
      childList: true,
      subtree: true 
    });
  });

  // Also observe header-component for data-sticky-state changes
  if (header instanceof HTMLElement) {
    mutationObserver.observe(header, { 
      attributes: true,
      attributeFilter: ['data-sticky-state', 'style', 'class']
    });
  }

  // Observe the #header-group container itself
  mutationObserver.observe(headerGroup, { 
    attributes: true, 
    childList: true,
    subtree: true 
  });
});

// Export for manual triggering if needed
window.updateHeaderHeight = updateHeaderHeight;
window.calculateHeaderGroupHeight = calculateHeaderGroupHeight;


class VideoMedia extends HTMLElement {
    constructor() {
      super();
      this.init();
    }
  
    init() {
      if (this.getAttribute('loaded')) return;

      new IntersectionObserver(([entry], observer) => {
        if (!entry.isIntersecting) return;
        
        this.loadContent();
        observer.disconnect();
      }, { threshold: 0.1, once: true }).observe(this);
    }

    loadContent() {
      this.setAttribute('loaded', true);
      this.querySelector('img')?.remove();
  
      // Extract content from <noscript> and parse it
      const templateString = this.querySelector('noscript')?.textContent.trim();
      if (!templateString) return;
  
      const parser = new DOMParser();
      const doc = parser.parseFromString(templateString, 'text/html');
      const video = doc.querySelector('video');
  
      if (video) {
        this.appendChild(video);
        video.play().catch(err => console.warn("Autoplay failed:", err));
      }
    }
}
  
customElements.define('video-media', VideoMedia);


// Hubspot Installers form
document.querySelectorAll('.form-opener').forEach(e=> {
    e.addEventListener('click', function(el) {
        el.preventDefault()

        var parent = e.closest('.tab__content')
        var formWrapper = parent.querySelector('.hubspot-form-wrapper')
        var link = e.href

        formWrapper.removeAttribute('hidden')
        
        if ( formWrapper.querySelector('iframe') == null ) {
            formWrapper.insertAdjacentHTML('afterbegin', `<iframe src="${link}" frameborder="0"></iframe>`)
            formWrapper.scrollIntoView({ behavior: 'smooth', block: 'center',inline: 'center' });
            e.style.display = 'none';
        }
    }) 
})

document.querySelectorAll('.form-opener, .button--quote').forEach(e => {
    e.addEventListener('click', function(el) {
        el.preventDefault()

        var targetId = e.dataset.id
        var formWrapper = document.getElementById(targetId)
        var link = e.href

        if (formWrapper) {
            formWrapper.removeAttribute('hidden')
            
            if (formWrapper.querySelector('iframe') == null) {
                formWrapper.insertAdjacentHTML('afterbegin', `<iframe src="${link}" frameborder="0"></iframe>`)
                formWrapper.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                e.style.display = 'none'
            }
        }
    })
})