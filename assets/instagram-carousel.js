const GRAPH_API_VERSION = 'v17.0';
const GRAPH_FIELDS =
  'id,media_type,media_url,permalink,thumbnail_url,caption,timestamp,children{media_type,media_url,thumbnail_url}';

const carouselInstances = new WeakMap();

/**
 * Normalize caption text for display.
 * @param {string | undefined} caption
 * @param {string | undefined} username
 * @returns {string}
 */
function formatCaption(caption, username) {
  if (typeof caption !== 'string' || caption.trim() === '') {
    return username ? `@${username}` : 'Instagram post';
  }

  const normalized = caption.replace(/\s+/g, ' ').trim();
  return normalized.length > 140 ? `${normalized.slice(0, 137)}…` : normalized;
}

/**
 * Format ISO timestamp into a short readable date.
 * @param {string | undefined} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const options = { month: 'short', day: 'numeric' };
  const formatted = new Intl.DateTimeFormat(undefined, options).format(date);

  const thisYear = new Date().getFullYear();
  if (date.getFullYear() !== thisYear) {
    return `${formatted}, ${date.getFullYear()}`;
  }

  return formatted;
}

/**
 * Resolve the best image URL to use for a media item.
 * @param {object} post
 * @returns {string | null}
 */
function resolveMediaUrl(post) {
  if (!post) return null;
  if (post.media_type === 'VIDEO') {
    return post.thumbnail_url ?? post.media_url ?? null;
  }

  if (post.media_type === 'CAROUSEL_ALBUM') {
    if (Array.isArray(post.children?.data) && post.children.data.length > 0) {
      const preferred = post.children.data.find((child) => child.media_type === 'IMAGE');
      if (preferred?.media_url) return preferred.media_url;
      if (post.children.data[0]?.media_url) return post.children.data[0].media_url;
    }
  }

  return post.media_url ?? null;
}

class InstagramCarousel {
  /**
   * @param {HTMLElement} root
   */
  constructor(root) {
    this.root = root;
    this.viewport = root.querySelector('[data-carousel-viewport]');
    this.track = root.querySelector('[data-carousel-track]');
    this.sentinel = root.querySelector('[data-carousel-sentinel]');
    this.status = root.querySelector('[data-status]');
    this.placeholders = Array.from(root.querySelectorAll('.instagram-carousel__slide--placeholder'));

    const dataset = root.dataset;
    this.accessToken = dataset.accessToken?.trim();
    this.accountId = dataset.accountId?.trim();
    this.username = dataset.username?.trim();
    this.initialLoad = Number.parseInt(dataset.initialLoad ?? '6', 10) || 6;
    this.lazyBatch = Number.parseInt(dataset.batchSize ?? '3', 10) || 3;
    this.loadingText = dataset.loadingText || 'Loading latest posts…';
    this.errorText = dataset.errorText || 'Instagram content is currently unavailable.';
    this.emptyText = dataset.emptyText || 'No Instagram posts to show right now.';

    this.initialized = false;
    this.loading = false;
    this.initialFetch = true;
    this.nextCursor = null;
    this.hasMore = true;
    this.totalLoaded = 0;

    if (this.root.dataset.initialized === 'true') return;
    this.root.dataset.initialized = 'true';

    if (!this.accessToken || !this.accountId) {
      this.showStatus('Add your Facebook access token and Instagram business ID to display posts.', 'error');
      return;
    }

    if (!(this.track instanceof HTMLElement) || !(this.viewport instanceof HTMLElement) || !this.sentinel) {
      this.showStatus('Instagram carousel markup incomplete.', 'error');
      return;
    }

    this.setupObserver();
    this.loadInitialMedia().catch((error) => {
      console.error('Failed to initialise Instagram carousel', error);
      this.showStatus(this.errorText, 'error');
    });
  }

  setupObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadMoreMedia().catch((error) => {
              console.error('Failed to load additional Instagram media', error);
              this.showStatus(this.errorText, 'error');
            });
          }
        });
      },
      {
        root: this.viewport,
        rootMargin: '0px 240px 0px 0px',
        threshold: 0.4,
      },
    );

    this.intersectionObserver.observe(this.sentinel);
  }

  async loadInitialMedia() {
    await this.fetchAndRender(this.initialLoad);
  }

  async loadMoreMedia() {
    if (!this.hasMore) return;
    await this.fetchAndRender(this.lazyBatch);
  }

  /**
   * Fetch posts from Graph API and render them.
   * @param {number} limit
   */
  async fetchAndRender(limit) {
    if (this.loading) return;
    this.loading = true;
    this.showStatus(this.loadingText, 'loading');

    try {
      const posts = await this.fetchPosts(limit);
      if (!posts.length && this.totalLoaded === 0) {
        this.showStatus(this.emptyText, 'empty');
        return;
      }

      if (posts.length) {
        this.renderPosts(posts);
        this.totalLoaded += posts.length;
      }

      if (!this.hasMore) {
        this.intersectionObserver?.disconnect();
      }

      this.hideStatus();
    } catch (error) {
      console.error('Instagram Graph API error', error);
      this.showStatus(this.errorText, 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Call the Graph API.
   * @param {number} limit
   * @returns {Promise<object[]>}
   */
  async fetchPosts(limit) {
    const params = new URLSearchParams({
      fields: GRAPH_FIELDS,
      access_token: this.accessToken,
      limit: String(limit),
    });

    if (!this.initialFetch && this.nextCursor) {
      params.set('after', this.nextCursor);
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.accountId}/media?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Graph API request failed with ${response.status}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message || 'Graph API error');
    }

    this.initialFetch = false;
    this.nextCursor = json.paging?.cursors?.after ?? null;
    this.hasMore = Boolean(this.nextCursor);

    return Array.isArray(json.data) ? json.data : [];
  }

  /**
   * Render returned posts into the carousel.
   * @param {object[]} posts
   */
  renderPosts(posts) {
    if (!posts.length) return;

    if (!this.initialized) {
      this.placeholders.forEach((node) => node.remove());
      this.placeholders = [];
      this.initialized = true;
    }

    const fragment = document.createDocumentFragment();

    posts.forEach((post) => {
      const mediaUrl = resolveMediaUrl(post);
      if (!mediaUrl) return;

      const slide = document.createElement('article');
      slide.className = 'instagram-carousel__slide';
      slide.dataset.mediaType = post.media_type ?? '';

      const link = document.createElement('a');
      link.className = 'instagram-carousel__link';
      link.href = post.permalink || '#';
      link.target = '_blank';
      link.rel = 'noopener';

      const ariaParts = [this.username ? `@${this.username}` : 'Instagram post'];
      const formattedDate = formatDate(post.timestamp);
      if (formattedDate) ariaParts.push(formattedDate);
      link.setAttribute('aria-label', ariaParts.join(' · '));

      const mediaWrapper = document.createElement('div');
      mediaWrapper.className = 'instagram-carousel__media';

      const img = document.createElement('img');
      img.className = 'instagram-carousel__image';
      img.src = mediaUrl;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';

      mediaWrapper.appendChild(img);

      if (post.media_type === 'VIDEO' || post.media_type === 'CAROUSEL_ALBUM') {
        const badge = document.createElement('span');
        badge.className = 'instagram-carousel__badge';
        badge.textContent = post.media_type === 'VIDEO' ? 'Video' : 'Gallery';
        mediaWrapper.appendChild(badge);
      }

      link.appendChild(mediaWrapper);

      const captionText = formatCaption(post.caption, this.username);
      if (captionText) {
        const caption = document.createElement('p');
        caption.className = 'instagram-carousel__caption';
        caption.textContent = captionText;
        link.appendChild(caption);
      }

      const metaText = formatDate(post.timestamp);
      if (metaText) {
        const meta = document.createElement('div');
        meta.className = 'instagram-carousel__meta';
        meta.textContent = metaText;
        link.appendChild(meta);
      }

      slide.appendChild(link);
      fragment.appendChild(slide);
    });

    this.track.insertBefore(fragment, this.sentinel);
  }

  /**
   * Present a status message.
   * @param {string} message
   * @param {'loading' | 'error' | 'empty'} [state]
   */
  showStatus(message, state = 'loading') {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.removeAttribute('hidden');
    this.status.dataset.state = state;
  }

  hideStatus() {
    if (!this.status) return;
    this.status.textContent = '';
    this.status.setAttribute('hidden', 'hidden');
    this.status.dataset.state = 'idle';
  }
}

/**
 * Initialise all carousel instances within a root node.
 * @param {ParentNode} root
 */
function initInstagramCarousel(root = document) {
  const nodes = root.querySelectorAll('[data-instagram-carousel]');
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (carouselInstances.has(node)) return;

    const instance = new InstagramCarousel(node);
    carouselInstances.set(node, instance);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initInstagramCarousel());
} else {
  initInstagramCarousel();
}

document.addEventListener('shopify:section:load', (event) => {
  initInstagramCarousel(event.target);
});

document.addEventListener('shopify:section:select', (event) => {
  initInstagramCarousel(event.target);
});
