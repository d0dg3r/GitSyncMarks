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
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.token = token;
    }

    async _fetch(endpoint, options = {}) {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${this.baseUrl}${endpoint}${options.page ? `${separator}page=${options.page}` : ''}`;
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
     * @param {string} endpoint - Base endpoint
     * @returns {Promise<Object>} Object with { response: Array } containing all items
     */
    async _fetchAll(endpoint) {
        let allItems = [];
        let page = 1;

        while (true) {
            const data = await this._fetch(endpoint, { page });
            const items = data?.response || [];
            const totalAmount = data?.totalAmount || 0;

            if (items.length === 0) break;

            allItems = allItems.concat(items);

            // If we have totalAmount and reached it, or if no more items came, stop.
            // Also stop if items.length is less than 50 (default limit), which indicates the last page.
            if ((totalAmount > 0 && allItems.length >= totalAmount) || items.length < 50) break;

            page++;

            // Safety break to prevent infinite loops (max 100 pages = 5000 items)
            if (page > 100) break;
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

        // Delay by 10s so Linkwarden's default background job finishes first, then we overwrite it.
        await new Promise(resolve => setTimeout(resolve, 10000));

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
