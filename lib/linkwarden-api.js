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
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.token}`,
        };

        if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMsg = errorData.error;
                } else if (errorData && errorData.message) {
                    errorMsg = errorData.message;
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
     * @returns {Promise<Array>}
     */
    async getCollections() {
        return await this._fetch('/api/v1/collections');
    }

    /**
     * Get all tags
     * @returns {Promise<Array>}
     */
    async getTags() {
        return await this._fetch('/api/v1/tags');
    }

    /**
     * Save a link
     * @param {Object} params
     * @param {string} params.url - URL to save
     * @param {string} params.name - Title of the link
     * @param {string} [params.collectionId] - Optional collection ID
     * @param {string[]} [params.tags] - Optional tags array
     * @returns {Promise<Object>} The created link object
     */
    async saveLink({ url, name, collectionId, tags }) {
        const payload = {
            url,
            name,
            collectionId: collectionId ? parseInt(collectionId, 10) : undefined,
            tags: Array.isArray(tags) ? tags.map(t => ({ name: t.trim() })).filter(t => t.name) : []
        };
        return await this._fetch('/api/v1/links', {
            method: 'POST',
            body: payload
        });
    }

    /**
     * Upload a screenshot for a specific link
     * @param {number} linkId - The ID of the link
     * @param {Blob} blob - The image blob
     * @returns {Promise<Object>}
     */
    async uploadScreenshot(linkId, blob) {
        const formData = new FormData();
        formData.append('file', blob, 'screenshot.png');
        return await this._fetch(`/api/v1/archives/${linkId}`, {
            method: 'POST',
            body: formData
        });
    }
}
