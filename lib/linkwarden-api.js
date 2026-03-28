/**
 * Linkwarden API Client
 *
 * Implements communication with a Linkwarden instance to save bookmarks,
 * retrieve collections, tags, and test the connection.
 */

export class LinkwardenAPI {
    /**
     * @param {string} baseUrl - The base URL of the Linkwarden instance
     * @param {string} token - The API token (JWT)
     */
    /**
     * @param {{ screenshotDelayMs?: number }} [options]
     */
    constructor(baseUrl, token, options = {}) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.token = token;
        this.screenshotDelayMs = options.screenshotDelayMs ?? 5000;
    }

    async _fetch(endpoint, options = {}) {
        const separator = endpoint.includes('?') ? '&' : '?';
        let url = `${this.baseUrl}${endpoint}`;

        const params = [];
        if (options.page) params.push(`page=${options.page}`);
        if (options.cursor) params.push(`cursor=${options.cursor}`);

        if (params.length > 0) {
            url += `${separator}${params.join('&')}`;
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.token}`,
        };

        const isFormData = options.body && (
            options.body instanceof FormData ||
            (options.body.constructor && options.body.constructor.name === 'FormData')
        );

        if (!isFormData && options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMsg = `HTTP Error ${response.status}: ${errorData.error}`;
                } else if (errorData && errorData.message) {
                    errorMsg = `HTTP Error ${response.status}: ${errorData.message}`;
                } else if (errorData && errorData.response) {
                    errorMsg = `HTTP Error ${response.status}: ${typeof errorData.response === 'string'
                        ? errorData.response
                        : JSON.stringify(errorData.response)
                        }`;
                }
            } catch (e) {
                // response was not JSON or could not be read
            }
            throw new Error(errorMsg);
        }

        // Handle responses that might not have a body (e.g., 204 No Content)
        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    /**
     * Helper to fetch all pages of a paginated resource
     * Uses cursor-based pagination (common for links) with fallback to page-based
     * @param {string} endpoint - Base endpoint
     * @returns {Promise<Object>} Object with { response: Array } containing all items
     */
    async _fetchAll(endpoint) {
        let allItems = [];
        let cursor = null;
        let page = 1;
        const seenIds = new Set();
        const isLinks = endpoint.includes('/links');

        while (true) {
            // Use cursor for links, page for others (collections, tags)
            const options = isLinks ? { cursor } : { page };
            const data = await this._fetch(endpoint, options);
            const items = data?.response || [];
            const totalAmount = data?.totalAmount || 0;

            if (items.length === 0) break;

            let newInThisBatch = 0;
            for (const item of items) {
                if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    allItems.push(item);
                    newInThisBatch++;
                }
            }

            // Safety break: if we didn't find any NEW items, stop to prevent infinite loops
            if (newInThisBatch === 0) break;

            // Stop if we reached totalAmount (if provided)
            if (totalAmount > 0 && allItems.length >= totalAmount) break;

            // Stop if we got less than the default limit (50), indicating the end
            if (items.length < 50) break;

            // Prepare for next page/cursor
            if (isLinks) {
                cursor = items[items.length - 1].id;
            } else {
                page++;
            }

            // Global safety limit
            if (allItems.length >= 10000 || page > 200) break;
        }

        return { response: allItems, totalAmount: allItems.length };
    }

    /**
     * Test connection to the instance
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        // Often /api/v1/user or /api/v1/collections is used to verify auth
        try {
            await this._fetch('/api/v1/collections?limit=1');
            return true;
        } catch (err) {
            throw new Error('Connection failed: ' + err.message);
        }
    }

    /**
     * Get all collections
     * @returns {Promise<Object>}
     */
    async getCollections() {
        return await this._fetchAll('/api/v1/collections');
    }

    /**
     * Get all tags
     * @returns {Promise<Object>}
     */
    async getTags() {
        return await this._fetchAll('/api/v1/tags');
    }

    /**
     * Create a new collection
     * @param {string} name - The collection name
     * @returns {Promise<Object>}
     */
    async createCollection(name) {
        return await this._fetch('/api/v1/collections', {
            method: 'POST',
            body: { name, description: '' }
        });
    }

    /**
     * Save a link
     * @param {Object} params
     * @param {string} params.url - URL to save
     * @param {string} params.name - Title of the link
     * @param {string} [params.description] - Optional description
     * @param {string} [params.collectionId] - Optional collection ID
     * @param {string[]} [params.tags] - Optional tags array
     * @returns {Promise<Object>} The created link object
     */
    async saveLink({ url, name, description, collectionId, tags }) {
        const payload = {
            url,
            name,
            description: description || '',
            tags: Array.isArray(tags) ? tags.map(t => ({ name: t.trim() })).filter(t => t.name) : []
        };

        if (collectionId) {
            payload.collection = { id: parseInt(collectionId, 10) };
        }

        try {
            return await this._fetch('/api/v1/links', {
                method: 'POST',
                body: payload
            });
        } catch (err) {
            // Handle duplicate link specifically
            if (err.message && err.message.includes('409')) {
                const existingLink = await this.getLinkByUrl(url);
                if (existingLink) {
                    return { response: existingLink, id: existingLink.id, __isDuplicate: true };
                }
            }
            throw err;
        }
    }

    /**
     * Get links, optionally filtered by collection
     * @param {number|string} [collectionId] - Optional collection ID
     * @returns {Promise<Object>}
     */
    async getLinks(collectionId = null) {
        let endpoint = '/api/v1/links';
        if (collectionId) {
            endpoint += `?collectionId=${collectionId}`;
        }
        return await this._fetchAll(endpoint);
    }

    /**
     * Get a link by its exact URL
     * @param {string} url - The URL to search for
     * @returns {Promise<Object|null>}
     */
    async getLinkByUrl(url) {
        try {
            // Fetch all recent links, search for exact match. 
            // Linkwarden API doesn't have an exact URL query param yet, we'll fetch a batch.
            const data = await this._fetch(`/api/v1/links?searchQuery=${encodeURIComponent(url)}&limit=50`);
            const links = data?.response || [];

            // Normalize URLs for reliable comparison
            const normalize = (u) => {
                try {
                    const parsed = new URL(u);
                    return parsed.hostname + parsed.pathname.replace(/\/+$/, '');
                } catch {
                    return u.replace(/\/+$/, '');
                }
            };

            const targetUrl = normalize(url);
            return links.find(l => normalize(l.url) === targetUrl) || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Upload a screenshot for a specific link.
     * Delays the upload to bypass the Linkwarden background archiver which
     * otherwise overwrites this screenshot with a "Login Required" placeholder minutes later.
     * @param {number} linkId - The ID of the link
     * @param {Blob} blob - The image blob
     * @returns {Promise<Object>}
     */
    async uploadScreenshot(linkId, blob) {
        const formData = new FormData();
        formData.append('file', blob, 'screenshot.png');

        // Delay so Linkwarden's default background job finishes first, then we overwrite it.
        if (this.screenshotDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, this.screenshotDelayMs));
        }

        return await this._fetch(`/api/v1/archives/${linkId}?format=0`, {
            method: 'POST',
            body: formData
        });
    }

    /**
     * Delete a link
     * @param {number} id - The ID of the link to delete
     * @returns {Promise<null>}
     */
    async deleteLink(id) {
        return await this._fetch(`/api/v1/links/${id}`, {
            method: 'DELETE'
        });
    }
}
