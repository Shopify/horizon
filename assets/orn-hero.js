/*
 * Ornevo hero carousel — Alpine.js component.
 * Registered globally so markup can use x-data="ornHero({...})".
 * Ref: sections/orn-hero.liquid, blocks/_orn-hero-slide.liquid
 */
(function () {
  function buildYouTubeSrc(videoId, opts) {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      loop: '1',
      playlist: videoId,
      controls: '0',
      modestbranding: '1',
      rel: '0',
      playsinline: '1',
      iv_load_policy: '3',
      disablekb: '1',
      fs: '0',
      enablejsapi: '1',
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }

  function mountIframe(container, videoId) {
    if (!container || !videoId) return null;
    if (container.querySelector('iframe')) return container.querySelector('iframe');
    const iframe = document.createElement('iframe');
    iframe.src = buildYouTubeSrc(videoId);
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = false;
    iframe.setAttribute('tabindex', '-1');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'Hero background video');
    container.appendChild(iframe);
    return iframe;
  }

  function unmountIframe(container) {
    if (!container) return;
    const iframe = container.querySelector('iframe');
    if (iframe) iframe.remove();
  }

  function postToIframe(iframe, func) {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  }

  window.ornHero = function ornHero({ total, autoplayMs }) {
    return {
      active: 0,
      total: total || 1,
      autoplayMs: autoplayMs || 0,
      playing: true,
      _timer: null,
      _hoverPaused: false,
      _isVisible: true,
      _observer: null,

      init() {
        this.$nextTick(() => {
          this.syncSlides();
          this.startAutoplay();
          this.observeVisibility();
        });
        this.$watch('active', () => this.syncSlides());
        this.$watch('playing', (v) => {
          if (v) {
            this.controlActiveVideo('playVideo');
            this.startAutoplay();
          } else {
            this.controlActiveVideo('pauseVideo');
            this.stopAutoplay();
          }
        });
      },

      get hasActiveVideo() {
        const slide = this.slideEl(this.active);
        return slide ? slide.dataset.hasVideo === 'true' : false;
      },

      slideEl(index) {
        return this.$el.querySelectorAll('.orn-hero__slide')[index] || null;
      },

      syncSlides() {
        const slides = this.$el.querySelectorAll('.orn-hero__slide');
        slides.forEach((slide, i) => {
          const desktopBox = slide.querySelector('.orn-hero__video--desktop');
          const mobileBox  = slide.querySelector('.orn-hero__video--mobile');
          const ytDesktop  = slide.dataset.ytDesktop;
          const ytMobile   = slide.dataset.ytMobile;

          if (i === this.active) {
            if (ytDesktop) mountIframe(desktopBox, ytDesktop);
            if (ytMobile)  mountIframe(mobileBox,  ytMobile);
          } else {
            unmountIframe(desktopBox);
            unmountIframe(mobileBox);
          }
        });
      },

      controlActiveVideo(func) {
        const slide = this.slideEl(this.active);
        if (!slide) return;
        slide.querySelectorAll('iframe').forEach((iframe) => postToIframe(iframe, func));
      },

      next() { this.active = (this.active + 1) % this.total; },
      prev() { this.active = (this.active - 1 + this.total) % this.total; },
      goTo(i) { if (i >= 0 && i < this.total) this.active = i; },

      togglePlay() { this.playing = !this.playing; },

      startAutoplay() {
        this.stopAutoplay();
        if (!this.autoplayMs || this.autoplayMs < 500) return;
        if (!this.playing || this._hoverPaused || !this._isVisible) return;
        if (this.total <= 1) return;
        this._timer = setInterval(() => this.next(), this.autoplayMs);
      },

      stopAutoplay() {
        if (this._timer) {
          clearInterval(this._timer);
          this._timer = null;
        }
      },

      pauseAutoplay() {
        this._hoverPaused = true;
        this.stopAutoplay();
      },

      resumeAutoplay() {
        this._hoverPaused = false;
        this.startAutoplay();
      },

      observeVisibility() {
        if (!('IntersectionObserver' in window)) return;
        this._observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              this._isVisible = entry.isIntersecting;
              if (this._isVisible) {
                this.startAutoplay();
                if (this.playing) this.controlActiveVideo('playVideo');
              } else {
                this.stopAutoplay();
                this.controlActiveVideo('pauseVideo');
              }
            });
          },
          { threshold: 0.25 }
        );
        this._observer.observe(this.$el);
      },

      destroy() {
        this.stopAutoplay();
        if (this._observer) this._observer.disconnect();
      },
    };
  };
})();
