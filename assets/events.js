/**
 * @namespace ThemeEvents
 * @description A collection of theme-specific events that can be used to trigger and listen for changes anywhere in the theme.
 * @example
 * document.dispatchEvent(new QuantitySelectorUpdateEvent(quantity, cartLine));
 * document.addEventListener(ThemeEvents.quantitySelectorUpdate, (e) => { console.log(e.detail.quantity) });
 */
export class ThemeEvents {
  /** @static @constant {string} Event triggered when a media (video, 3d model) is loaded */
  static mediaStartedPlaying = 'media:started-playing';
  // Event triggered when quantity-selector value is changed
  static quantitySelectorUpdate = 'quantity-selector:update';
  /** @static @constant {string} Event triggered when a predictive search is expanded */
  static megaMenuHover = 'megaMenu:hover';
  /** @static @constant {string} Event triggered when a zoom dialog media is selected */
  static zoomMediaSelected = 'zoom-media:selected';
}

/**
 * Event class for quantity-selector updates
 * @extends {Event}
 */
export class QuantitySelectorUpdateEvent extends Event {
  /**
   * Creates a new QuantitySelectorUpdateEvent
   * @param {number} quantity - Quantity value
   * @param {number} [cartLine] - The id of the updated cart line
   */
  constructor(quantity, cartLine) {
    super(ThemeEvents.quantitySelectorUpdate, { bubbles: true });
    this.detail = {
      quantity,
      cartLine,
    };
  }
}

/**
 * Event class for media playback starts
 * @extends {Event}
 */
export class MediaStartedPlayingEvent extends Event {
  /**
   * Creates a new MediaStartedPlayingEvent
   * @param {HTMLElement} resource - The element containing the video that emitted the event
   */
  constructor(resource) {
    super(ThemeEvents.mediaStartedPlaying, { bubbles: true });
    this.detail = {
      resource,
    };
  }
}

/**
 * @typedef {Object} SlideshowSelectEventData
 * @property {number} index
 * @property {string | null} id
 * @property {Element} slide
 * @property {number} previousIndex
 * @property {boolean} userInitiated
 * @property {'select' | 'scroll' | 'drag'} trigger
 */

export class SlideshowSelectEvent extends Event {
  /**  @param {SlideshowSelectEventData} data */
  constructor(data) {
    super(SlideshowSelectEvent.eventName, { bubbles: true });
    this.detail = data;
  }

  /** @type {SlideshowSelectEventData} */
  detail;

  static eventName = 'slideshow:select';
}

/**
 * Event class for zoom dialog media selection
 * @extends {Event}
 */
export class ZoomMediaSelectedEvent extends Event {
  /**
   * Creates a new ZoomMediaSelectedEvent
   * @param {number} index - The index of the selected media
   */
  constructor(index) {
    super(ThemeEvents.zoomMediaSelected, { bubbles: true });
    this.detail = {
      index,
    };
  }
}

/**
 * Event class for mega menu hover being hovered over
 * @extends {Event}
 */
export class MegaMenuHoverEvent extends Event {
  constructor() {
    super(ThemeEvents.megaMenuHover, { bubbles: true });
  }
}
