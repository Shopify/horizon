import { Component } from '@theme/component';
import { ThemeEvents, MediaStartedPlayingEvent } from '@theme/events';
import { DialogCloseEvent, DialogOpenEvent } from '@theme/dialog';

/**
 * A deferred media element
 * @typedef {Object} Refs
 * @property {HTMLElement} deferredMediaPlayButton - The button to show the deferred media content
 * @property {HTMLElement} toggleMediaButton - The button to toggle the media
 *
 * @extends {Component<Refs>}
 */
class DeferredMedia extends Component {
  /** @type {boolean} */
  isPlaying = false;

  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();
    const signal = this.#abortController.signal;
    // If we're to use deferred media for images, we will need to run this only when it's not an image type media
    document.addEventListener(ThemeEvents.mediaStartedPlaying, this.pauseMedia.bind(this), { signal });
    window.addEventListener(DialogCloseEvent.eventName, this.pauseMedia.bind(this), { signal });

    // Neither dialog:open nor dialog:close bubbles, and DialogComponent dispatches both on itself,
    // so both have to be observed on the dialog element. The window listener above stays because
    // ZoomDialog dispatches DialogCloseEvent straight at window instead.
    const dialogComponent = this.closest('dialog-component');

    dialogComponent?.addEventListener(DialogOpenEvent.eventName, this.#playOnDialogOpen, { signal });
    dialogComponent?.addEventListener(DialogCloseEvent.eventName, this.pauseMedia.bind(this), { signal });

    // dialog:open fires once. media.js is a low-priority module and popup-link loads dialog.js
    // itself, so on a slow connection the dialog can already be open by the time this upgrade runs
    // and the listener above would wait for an event that has been and gone.
    if (dialogComponent && this.closest('dialog')?.open) this.#playOnDialogOpen();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
  }

  /**
   * Updates the visual hint for play/pause state
   * @param {boolean} isPlaying - Whether the video is currently playing
   */
  updatePlayPauseHint(isPlaying) {
    const toggleMediaButton = this.refs.toggleMediaButton;
    if (toggleMediaButton instanceof HTMLElement) {
      toggleMediaButton.classList.remove('hidden');
      const playIcon = toggleMediaButton.querySelector('.icon-play');
      if (playIcon) playIcon.classList.toggle('hidden', isPlaying);
      const pauseIcon = toggleMediaButton.querySelector('.icon-pause');
      if (pauseIcon) pauseIcon.classList.toggle('hidden', !isPlaying);
    }
  }

  /**
   * Shows the deferred media content
   */
  showDeferredMedia = () => {
    this.loadContent(true);
    this.isPlaying = true;
    this.updatePlayPauseHint(this.isPlaying);
  };

  /**
   * Loads the content
   * @param {boolean} [focus] - Whether to focus the content
   */
  loadContent(focus = true) {
    if (this.getAttribute('data-media-loaded')) return;

    this.dispatchEvent(new MediaStartedPlayingEvent(this));

    const content = this.querySelector('template')?.content.firstElementChild?.cloneNode(true);

    if (!content) return;

    this.setAttribute('data-media-loaded', 'true');
    this.appendChild(content);

    if (focus && content instanceof HTMLElement) {
      content.focus();
    }

    this.refs.deferredMediaPlayButton?.classList.add('deferred-media__playing');

    if (content instanceof HTMLVideoElement && content.hasAttribute('autoplay')) {
      // Force playback for browsers that do not reliably start template-cloned videos from the autoplay attribute alone.
      content.play();
    }
  }

  /**
   * `snippets/video.liquid` renders an uploaded video twice, inside `<template>` and again as a
   * direct child, and `loadContent` appends the clone on top of both. The clone is the copy the
   * visitor sees, so start paths need the last match in tree order, not the first.
   *
   * @returns {HTMLVideoElement | null}
   */
  #presentedVideo() {
    const videos = this.querySelectorAll('video');

    return videos[videos.length - 1] ?? null;
  }

  /**
   * Starts an autoplay video once the dialog holding it is open.
   *
   * Safari does not honour the autoplay attribute on a video that was rendered inside a closed
   * `<dialog>`, and no other code path asks it to play, so the video stays at currentTime 0 for the
   * whole session. Only a paused video is touched, so browsers that start it on their own keep the
   * playhead they already have.
   */
  #playOnDialogOpen = () => {
    if (!this.hasAttribute('autoplay')) return;

    const video = this.#presentedVideo();

    if (!video || !video.paused) return;

    // Announce the start before playing, the order loadContent uses. The document listener pauses
    // every DeferredMedia on this event, including this one, so play() has to come second.
    this.dispatchEvent(new MediaStartedPlayingEvent(this));

    // A rejected play() is the browser declining on autoplay-policy grounds. There is nothing to
    // recover, and an unhandled rejection would be noise in the merchant's console.
    video.play().catch(() => {});

    this.isPlaying = true;
    this.updatePlayPauseHint(this.isPlaying);
  };

  /**
   * Toggle play/pause state of the media
   */
  toggleMedia() {
    if (this.isPlaying) {
      this.pauseMedia();
    } else {
      this.playMedia();
    }
  }

  playMedia() {
    /** @type {HTMLIFrameElement | null} */
    const iframe = this.querySelector('iframe[data-video-type]');
    if (iframe) {
      iframe.contentWindow?.postMessage(
        iframe.dataset.videoType === 'youtube'
          ? '{"event":"command","func":"playVideo","args":""}'
          : '{"method":"play"}',
        '*'
      );
    } else {
      this.#presentedVideo()?.play();
    }
    this.isPlaying = true;
    this.updatePlayPauseHint(this.isPlaying);
  }

  /**
   * Pauses the media
   */
  pauseMedia() {
    /** @type {HTMLIFrameElement | null} */
    const iframe = this.querySelector('iframe[data-video-type]');

    if (iframe) {
      iframe.contentWindow?.postMessage(
        iframe.dataset.videoType === 'youtube'
          ? '{"event":"command","func":"' + 'pauseVideo' + '","args":""}'
          : '{"method":"pause"}',
        '*'
      );
    } else {
      // Every copy, because the one the clone covers can still be decoding.
      for (const video of this.querySelectorAll('video')) video.pause();
    }
    this.isPlaying = false;

    // If we've already revealed the deferred media, we should toggle the play/pause hint
    if (this.getAttribute('data-media-loaded')) {
      this.updatePlayPauseHint(this.isPlaying);
    }
  }
}

if (!customElements.get('deferred-media')) {
  customElements.define('deferred-media', DeferredMedia);
}

/**
 * A product model
 */
class ProductModel extends DeferredMedia {
  #abortController = new AbortController();

  loadContent() {
    super.loadContent();

    Shopify.loadFeatures([
      {
        name: 'model-viewer-ui',
        version: '1.0',
        onLoad: this.setupModelViewerUI.bind(this),
      },
    ]);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
  }

  pauseMedia() {
    super.pauseMedia();
    this.modelViewerUI?.pause();
  }

  playMedia() {
    super.playMedia();
    this.modelViewerUI?.play();
  }

  /**
   * @param {Error[]} errors
   */
  async setupModelViewerUI(errors) {
    if (errors) return;

    if (!Shopify.ModelViewerUI) {
      await this.#waitForModelViewerUI();
    }

    if (!Shopify.ModelViewerUI) return;

    const element = this.querySelector('model-viewer');
    if (!element) return;

    const signal = this.#abortController.signal;

    this.modelViewerUI = new Shopify.ModelViewerUI(element);
    if (!this.modelViewerUI) return;

    this.playMedia();

    // Track pointer events to detect taps
    let pointerStartX = 0;
    let pointerStartY = 0;

    element.addEventListener(
      'pointerdown',
      (/** @type {PointerEvent} */ event) => {
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
      },
      { signal }
    );

    element.addEventListener(
      'click',
      (/** @type {PointerEvent} */ event) => {
        const distanceX = Math.abs(event.clientX - pointerStartX);
        const distanceY = Math.abs(event.clientY - pointerStartY);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        // Try to ensure that this is a tap, not a drag.
        if (totalDistance < 10) {
          // When the model is paused, it has its own button overlay for playing the model again.
          // If we're receiving a click event, it means the model is playing, all we can do is pause it.
          this.pauseMedia();
        }
      },
      { signal }
    );
  }

  /**
   * Waits for Shopify.ModelViewerUI to be defined.
   * This seems to be necessary for Safari since Shopify.ModelViewerUI is always undefined on the first try.
   * @returns {Promise<void>}
   */
  async #waitForModelViewerUI() {
    const maxAttempts = 10;
    const interval = 50;

    for (let i = 0; i < maxAttempts; i++) {
      if (Shopify.ModelViewerUI) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}

if (!customElements.get('product-model')) {
  customElements.define('product-model', ProductModel);
}
