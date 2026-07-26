import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

// Bump the version suffix whenever the worker's response shape or filtering
// changes — every browser will then treat the old entry as nonexistent and
// fall through to a fresh fetch on the next drawer open.
const STORES_CACHE_KEY = 'rmsc_locator_stores_v3';      // v3: PDP hits ?location_type=rocky_store explicitly
const INVENTORY_CACHE_KEY = 'rmsc_locator_inventory_v1';
const STORES_TTL_MS = 60 * 60 * 1000;     // 1 h — store list is near-static
const INVENTORY_TTL_MS = 5 * 60 * 1000;   // 5 min — matches Worker edge cache
const VARIANT_DEBOUNCE_MS = 300;

/**
 * Stock thresholds preserved verbatim from `inventory-by-location.liquid`
 * (1.9 kg soap slabs vs everything else).
 *
 * @param {number} qty
 * @param {string} variantTitle
 * @returns {{ status: 'in' | 'low' | 'none' }}
 */
function classifyStock(qty, variantTitle) {
  if (variantTitle === '1.9kg') {
    if (qty > 1) return { status: 'in' };
    if (qty === 1) return { status: 'low' };
    return { status: 'none' };
  }
  if (qty > 10) return { status: 'in' };
  if (qty > 3) return { status: 'low' };
  return { status: 'none' };
}

/**
 * sessionStorage helpers — silently degrade when storage isn't available
 * (private browsing, quota errors).
 */
function readJson(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => (
    ch === '&' ? '&amp;' :
    ch === '<' ? '&lt;'  :
    ch === '>' ? '&gt;'  :
    ch === '"' ? '&quot;' :
    '&#39;'
  ));
}

class RPdpFindInStore extends Component {
  requiredRefs = ['list'];

  #abort = new AbortController();
  #variantTitles = {};
  #currentVariantId = null;
  #currentVariantTitle = '';
  #stores = null;
  #fetchedVariants = new Set();
  #variantDebounce = null;
  #i18n = {
    loading:  'Loading inventory…',
    error:    'Unable to load inventory. Please try again later.',
    inStock:  'In stock',
    lowStock: 'Low stock — Call us!',
    noStock:  'No stock',
  };

  connectedCallback() {
    super.connectedCallback();

    const idAttr = this.dataset.initialVariantId;
    this.#currentVariantId = idAttr ? parseInt(idAttr, 10) : null;
    this.#currentVariantTitle = this.dataset.initialVariantTitle || '';

    try {
      this.#variantTitles = JSON.parse(this.dataset.variantTitles || '{}');
    } catch {
      this.#variantTitles = {};
    }

    // Pull localised copy from the existing loading <li> so the JS render path
    // matches the server-rendered placeholder.
    if (this.refs.loading?.textContent) {
      this.#i18n.loading = this.refs.loading.textContent.trim();
    }
    const errorEl = this.refs.error;
    if (errorEl?.textContent) {
      this.#i18n.error = errorEl.textContent.trim();
    }

    const { signal } = this.#abort;

    document.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });

    // The element now lives inside the Rocky side drawer (r-side-drawer.liquid),
    // so the lazy-fetch trigger is dialog.js's DialogOpenEvent instead of the old
    // accordion `toggle`. That event does not bubble, so listen on the
    // <dialog-component> itself.
    const dialogComponent = this.closest('dialog-component');
    if (dialogComponent) {
      dialogComponent.addEventListener('dialog:open', this.#handleDialogOpen, { signal });
      // Guard against being connected while the drawer is already open (morph).
      if (this.#isPanelOpen()) this.#refresh();
    } else {
      // Rendered outside a drawer — just fetch immediately.
      this.#refresh();
    }
  }

  disconnectedCallback() {
    this.#abort.abort();
    if (this.#variantDebounce) clearTimeout(this.#variantDebounce);
    super.disconnectedCallback();
  }

  // ── event handlers ──────────────────────────────────────────────────────────

  /** True when the enclosing drawer panel is showing (or there is no drawer). */
  #isPanelOpen() {
    const dialog = this.closest('dialog');
    return dialog ? dialog.open : true;
  }

  #handleDialogOpen = () => {
    if (this.#currentVariantId && !this.#fetchedVariants.has(this.#currentVariantId)) {
      this.#refresh();
    }
  };

  #handleVariantUpdate = (event) => {
    const variant = event?.detail?.resource;
    if (!variant?.id) return;
    const id = Number(variant.id);
    if (!Number.isFinite(id) || id === this.#currentVariantId) return;

    const title = variant.title || this.#variantTitles[id] || '';

    this.#currentVariantId = id;
    this.#currentVariantTitle = title;

    if (this.#variantDebounce) clearTimeout(this.#variantDebounce);
    this.#variantDebounce = setTimeout(() => {
      if (this.#isPanelOpen()) {
        this.#refresh();
      } else if (!this.#fetchedVariants.has(id)) {
        this.#renderLoading();
      }
    }, VARIANT_DEBOUNCE_MS);
  };

  // ── data ────────────────────────────────────────────────────────────────────

  async #refresh() {
    if (this.dataset.featureEnabled === 'false') return;
    if (!this.dataset.workerUrl) {
      console.warn('[r-pdp-find-in-store] No worker URL configured.');
      return;
    }
    if (!this.#currentVariantId) return;

    this.#renderLoading();

    try {
      const [stores, inventory] = await Promise.all([
        this.#fetchStores(),
        this.#fetchInventory(this.#currentVariantId),
      ]);

      if (!stores?.length) {
        this.#renderError();
        return;
      }

      const map = {};
      for (const row of inventory ?? []) {
        if (row?.locationId != null) map[row.locationId] = Number(row.available) || 0;
      }

      this.#fetchedVariants.add(this.#currentVariantId);
      this.#renderStores(stores, map);
    } catch (err) {
      console.error('[r-pdp-find-in-store]', err);
      this.#renderError();
    }
  }

  async #fetchStores() {
    if (this.#stores) return this.#stores;

    const cached = readJson(STORES_CACHE_KEY);
    if (cached && Date.now() - cached.ts < STORES_TTL_MS && Array.isArray(cached.stores)) {
      this.#stores = cached.stores;
      return cached.stores;
    }

    // PDP find-in-store only ever cares about the 14 active retail stores —
    // ask the worker to push the filter to Shopify so we never receive the
    // wholesale / archived metaobjects over the wire.
    const url = new URL('stores', this.#normaliseWorkerUrl());
    url.searchParams.set('location_type', 'rocky_store');
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`stores HTTP ${res.status}`);
    const body = await res.json();
    if (!body?.ok) throw new Error('stores not ok');

    this.#stores = body.stores ?? [];
    writeJson(STORES_CACHE_KEY, { ts: Date.now(), stores: this.#stores });
    return this.#stores;
  }

  async #fetchInventory(variantId) {
    const cache = readJson(INVENTORY_CACHE_KEY) ?? {};
    const entry = cache[variantId];
    if (entry && Date.now() - entry.ts < INVENTORY_TTL_MS && Array.isArray(entry.inventory)) {
      return entry.inventory;
    }

    const url = new URL('inventory', this.#normaliseWorkerUrl());
    url.searchParams.set('variantId', String(variantId));
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`inventory HTTP ${res.status}`);
    const body = await res.json();
    if (!body?.ok) throw new Error('inventory not ok');

    const inventory = body.inventory ?? [];
    cache[variantId] = { ts: Date.now(), inventory };
    writeJson(INVENTORY_CACHE_KEY, cache);
    return inventory;
  }

  /** URL constructor needs a trailing slash to treat the value as a base. */
  #normaliseWorkerUrl() {
    const raw = String(this.dataset.workerUrl || '').trim();
    if (!raw) throw new Error('worker url missing');
    return raw.endsWith('/') ? raw : `${raw}/`;
  }

  // ── rendering ───────────────────────────────────────────────────────────────

  #renderLoading() {
    const list = this.refs.list;
    if (!list) return;
    list.classList.add('is-loading');
    list.innerHTML = `<li class="r-pdp-find-in-store__loading">${escapeHtml(this.#i18n.loading)}</li>`;
    if (this.refs.error) this.refs.error.hidden = true;
  }

  #renderError() {
    const list = this.refs.list;
    if (!list) return;
    list.classList.remove('is-loading');
    list.innerHTML = '';
    if (this.refs.error) this.refs.error.hidden = false;
  }

  /**
   * @param {Array<Record<string, any>>} stores
   * @param {Record<number, number>} inventoryMap
   */
  #renderStores(stores, inventoryMap) {
    const list = this.refs.list;
    if (!list) return;
    list.classList.remove('is-loading');
    if (this.refs.error) this.refs.error.hidden = true;

    const variantTitle = this.#currentVariantTitle;

    const html = stores.map((store) => {
      const locId = Number(store.shopify_location_id);
      const qty = Number.isFinite(locId) ? (inventoryMap[locId] ?? 0) : 0;
      const { status } = classifyStock(qty, variantTitle);

      const stockText =
        status === 'in'  ? this.#i18n.inStock  :
        status === 'low' ? this.#i18n.lowStock :
        this.#i18n.noStock;

      const fullAddress = [store.address, store.city, store.province].filter(Boolean).join(', ');
      const mapsUrl = store.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
      const tel = store.phone || '';
      const telDigits = tel.replace(/[^0-9+]/g, '');

      return `
        <li class="r-pdp-find-in-store__store" data-location-id="${escapeHtml(store.shopify_location_id)}">
          <div class="r-pdp-find-in-store__store-header">
            <span class="r-pdp-find-in-store__store-name">${escapeHtml(store.name)}</span>
            <span class="r-pdp-find-in-store__store-stock r-pdp-find-in-store__store-stock--${status}">
              ${escapeHtml(stockText)}
            </span>
          </div>
          <div class="r-pdp-find-in-store__store-meta">
            <a class="r-pdp-find-in-store__store-address" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">
              ${escapeHtml(fullAddress)}
            </a>
            ${tel ? `<a class="r-pdp-find-in-store__store-tel" href="tel:${escapeHtml(telDigits)}">${escapeHtml(tel)}</a>` : ''}
          </div>
        </li>
      `;
    }).join('');

    list.innerHTML = html;
  }
}

if (!customElements.get('r-pdp-find-in-store')) {
  customElements.define('r-pdp-find-in-store', RPdpFindInStore);
}
