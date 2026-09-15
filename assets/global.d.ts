export {};

declare global {
  interface Shopify {
    country: string;
    currency: {
      active: string;
      rate: string;
    };
    designMode: boolean;
    locale: string;
    shop: string;
    loadFeatures(features: ShopifyFeature[], callback?: LoadCallback): void;
    ModelViewerUI?: ModelViewer;
    visualPreviewMode: boolean;
  }

  interface Theme {
    translations: Record<string, string>;
    routes: {
      cart_add_url: string;
      cart_change_url: string;
      cart_update_url: string;
      cart_url: string;
      predictive_search_url: string;
      search_url: string;
    };
    utilities: {
      scheduler: {
        schedule: (task: () => void) => void;
      };
    };
    template: {
      name: string;
    };
    popoverPolyfillReady: Promise<void>;
    supportsNativePopover: boolean;
  }

  /**
   * Minimal Navigation API surface, limited to what view-transitions.js reads. TypeScript's
   * DOM lib does not describe it yet, and only `activation` is needed here: it identifies the
   * cross-document navigation that activated this document, so `from === null` means there is
   * no outgoing same-origin document for a transition to snapshot.
   */
  interface NavigationActivation {
    from: NavigationHistoryEntry | null;
    entry: NavigationHistoryEntry;
    navigationType: 'push' | 'replace' | 'reload' | 'traverse';
  }

  interface NavigationHistoryEntry {
    url: string | null;
  }

  interface Window {
    Shopify: Shopify;
    navigation?: {
      activation?: NavigationActivation;
    };
  }

  declare const Shopify: Shopify;
  declare const Theme: Theme;

  type LoadCallback = (error: Error | undefined) => void;

  // Refer to https://github.com/Shopify/shopify/blob/main/areas/core/shopify/app/assets/javascripts/storefront/load_feature/load_features.js
  interface ShopifyFeature {
    name: string;
    version: string;
    onLoad?: LoadCallback;
  }

  // Refer to https://github.com/Shopify/model-viewer-ui/blob/main/src/js/model-viewer-ui.js
  interface ModelViewer {
    new (
      element: Element,
      options?: {
        focusOnPlay?: boolean;
      }
    ): ModelViewer;
    play(): void;
    pause(): void;
    toggleFullscreen(): void;
    zoom(amount: number): void;
    destroy(): void;
  }

  // Device Memory API - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
  interface Navigator {
    readonly deviceMemory?: number;
  }
}

/** Augment ProductSelectEvent detail with Horizon-specific fields */
declare module '@shopify/events' {
  interface ProductSelectPayloadDetail {
    optionValueId?: string;
    /** Synchronous selected variant ID; '' means no variant. Await the promise for full variant data. */
    variantId?: string;
    /** Connected product URL for combined-listing selections. */
    connectedProductUrl?: string;
  }
  interface ProductSelectResultDetail {
    html: Document;
    productId: string;
    newProduct?: { id: string; url: string };
    sourceId: string;
    resource?: {
      id?: string;
      title?: string;
      sku?: string;
      available?: boolean;
      price?: number;
      featured_media?: {
        preview_image?: {
          src?: string;
        };
      };
      [k: string]: unknown;
    };
  }
}

/** Augment CartErrorEvent detail with Horizon-specific fields */
declare module '@shopify/events' {
  interface CartErrorPayloadDetail {
    errors?: Record<string, string[]>;
  }
}

/** Augment CartDiscountUpdateEvent result detail with Horizon-specific fields */
declare module '@shopify/events' {
  interface CartDiscountUpdateResultDetail {
    sections?: Record<string, string>;
  }
}

/** Augment CartLinesUpdateEvent result detail with Horizon-specific fields */
declare module '@shopify/events' {
  interface CartLinesUpdateResultDetail {
    sections?: Record<string, string>;
    didError?: boolean;
    source?: string;
    sourceId?: string;
    itemCount?: number;
  }
}
