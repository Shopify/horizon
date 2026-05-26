/*
 * Ornevo services tabs — Alpine.js component.
 * Direct DOM manipulation for the indicator + flash to avoid any
 * reactivity timing issues with CSS transitions.
 * Ref: sections/orn-services.liquid, ADR-0002
 */
(function () {
  window.ornServices = function ornServices({ total, swipeMobile }) {
    return {
      active: 0,
      total: total || 1,
      swipeMobile: swipeMobile !== false,

      _navEl: null,
      _indicatorEl: null,
      _flashEl: null,
      _ro: null,
      _touchStartX: 0,
      _touchStartY: 0,
      _flashTimer: 0,

      init() {
        this._navEl       = this.$el.querySelector('.orn-services__nav');
        this._indicatorEl = this.$el.querySelector('.orn-services__indicator');
        this._flashEl     = this.$el.querySelector('.orn-services__flash');

        this.$nextTick(() => this.updateIndicator(true));

        if ('ResizeObserver' in window && this._navEl) {
          this._ro = new ResizeObserver(() => this.updateIndicator(true));
          this._ro.observe(this._navEl);
        }
      },

      // skipTransition=true → snap (used on init/resize); false → animated slide
      updateIndicator(skipTransition = false) {
        const tab = this.$refs['tab' + this.active];
        if (!this._navEl || !this._indicatorEl || !tab) return;

        const nRect = this._navEl.getBoundingClientRect();
        const tRect = tab.getBoundingClientRect();
        const left = tRect.left - nRect.left;
        const width = tRect.width;

        const ind = this._indicatorEl;

        if (skipTransition) {
          ind.style.transition = 'none';
          ind.style.transform = `translateX(${left}px)`;
          ind.style.width = `${width}px`;
          // force reflow so the next style change is animated
          void ind.offsetWidth;
          ind.style.transition = '';
        } else {
          ind.style.transition = '';
          ind.style.transform = `translateX(${left}px)`;
          ind.style.width = `${width}px`;
        }
      },

      goTo(i, fromKeyboard = false) {
        if (i < 0 || i >= this.total || i === this.active) return;
        this.flash(i);
        this.active = i;
        this.$nextTick(() => {
          this.updateIndicator(false);
          if (fromKeyboard) {
            const tab = this.$refs['tab' + i];
            if (tab) tab.focus();
          }
        });
      },

      flash(targetIndex) {
        if (this.prefersReducedMotion()) return;
        const tab = this.$refs['tab' + targetIndex];
        if (!this._navEl || !this._flashEl || !tab) return;

        const nRect = this._navEl.getBoundingClientRect();
        const tRect = tab.getBoundingClientRect();
        const cx = tRect.left - nRect.left + tRect.width / 2;
        const cy = tRect.top - nRect.top + tRect.height / 2;

        const f = this._flashEl;
        f.style.left = `${cx}px`;
        f.style.top  = `${cy}px`;

        // Restart the keyframe animation reliably
        f.classList.remove('is-flashing');
        void f.offsetWidth;
        f.classList.add('is-flashing');

        if (this._flashTimer) clearTimeout(this._flashTimer);
        this._flashTimer = setTimeout(() => {
          f.classList.remove('is-flashing');
        }, 600);
      },

      onTabKey(e, i) {
        let next = i;
        if (e.key === 'ArrowRight') next = (i + 1) % this.total;
        else if (e.key === 'ArrowLeft') next = (i - 1 + this.total) % this.total;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = this.total - 1;
        else return;

        e.preventDefault();
        this.goTo(next, true);
      },

      onTouchStart(e) {
        if (!this.swipeMobile) return;
        const t = e.touches[0];
        this._touchStartX = t.clientX;
        this._touchStartY = t.clientY;
      },

      onTouchEnd(e) {
        if (!this.swipeMobile) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - this._touchStartX;
        const dy = t.clientY - this._touchStartY;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0) this.goTo(Math.min(this.active + 1, this.total - 1));
        else        this.goTo(Math.max(this.active - 1, 0));
      },

      prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      },

      destroy() {
        if (this._ro) this._ro.disconnect();
        if (this._flashTimer) clearTimeout(this._flashTimer);
      },
    };
  };
})();
