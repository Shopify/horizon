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
  }

  interface Window {
    Shopify: Shopify;
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
