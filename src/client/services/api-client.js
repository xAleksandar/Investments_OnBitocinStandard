/**
 * Centralized API client for all HTTP communication
 * Provides consistent error handling, request formatting, and authentication headers
 */
class ApiClient {
    constructor() {
        this.baseUrl = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get authorization header if token exists
     * @returns {Object} Authorization headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    /**
     * Make HTTP request with consistent error handling
     * @param {string} url - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data or throws error
     */
    async request(url, options = {}) {
        const config = {
            headers: {
                ...this.defaultHeaders,
                ...this.getAuthHeaders(),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${url}`, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return await response.text();
        } catch (error) {
            console.error(`API request failed: ${url}`, error);
            throw error;
        }
    }

    /**
     * GET request
     * @param {string} url - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    /**
     * POST request
     * @param {string} url - API endpoint
     * @param {any} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async post(url, data = null, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : null
        });
    }

    /**
     * PUT request
     * @param {string} url - API endpoint
     * @param {any} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async put(url, data = null, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : null
        });
    }

    /**
     * DELETE request
     * @param {string} url - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }

    // ===== ASSET API METHODS =====

    /**
     * Get all available assets
     * @returns {Promise<Array>} Array of assets
     */
    async getAssets() {
        return this.get('/api/assets');
    }

    /**
     * Get current prices for all assets
     * @returns {Promise<Object>} Price data by symbol
     */
    async getPrices() {
        return this.get('/api/assets/prices');
    }

    /**
     * Get asset performance data
     * @param {string} symbol - Asset symbol
     * @param {string} period - Time period (5y, 1y, etc.)
     * @returns {Promise<Object>} Performance data
     */
    async getAssetPerformance(symbol, period = '5y') {
        return this.get(`/api/assets/performance/${symbol}/${period}`);
    }

    // ===== AUTHENTICATION API METHODS =====

    /**
     * Request magic link for authentication
     * @param {string} email - User email
     * @param {string} username - Optional username
     * @returns {Promise<Object>} Response with success status
     */
    async requestMagicLink(email, username = null) {
        return this.post('/api/auth/request-link', { email, username });
    }

    /**
     * Verify magic link token
     * @param {string} token - Magic link token
     * @returns {Promise<Object>} User data and JWT token
     */
    async verifyMagicLink(token) {
        return this.get(`/api/auth/verify?token=${token}`);
    }

    /**
     * Check if user exists
     * @param {string} email - User email
     * @returns {Promise<Object>} User existence check result
     */
    async checkUser(email) {
        return this.post('/api/auth/check-user', { email });
    }

    // ===== PORTFOLIO API METHODS =====

    /**
     * Get user portfolio
     * @returns {Promise<Object>} Portfolio data
     */
    async getPortfolio() {
        return this.get('/api/portfolio');
    }

    /**
     * Get specific asset details for user
     * @param {string} symbol - Asset symbol
     * @returns {Promise<Object>} Asset details
     */
    async getAssetDetails(symbol) {
        return this.get(`/api/portfolio/asset/${symbol}`);
    }

    // ===== TRADING API METHODS =====

    /**
     * Execute a trade
     * @param {string} fromAsset - Source asset symbol
     * @param {string} toAsset - Target asset symbol
     * @param {number} amount - Amount to trade
     * @returns {Promise<Object>} Trade result
     */
    async executeTrade(fromAsset, toAsset, amount) {
        return this.post('/api/trades/execute', { fromAsset, toAsset, amount });
    }

    /**
     * Get trade history
     * @returns {Promise<Array>} Array of trades
     */
    async getTradeHistory() {
        return this.get('/api/trades/history');
    }

    // ===== SUGGESTIONS API METHODS =====

    /**
     * Check suggestion rate limit
     * @returns {Promise<Object>} Rate limit status
     */
    async getSuggestionRateLimit() {
        return this.get('/api/suggestions/rate-limit');
    }

    /**
     * Submit a suggestion
     * @param {Object} suggestion - Suggestion data
     * @returns {Promise<Object>} Submission result
     */
    async submitSuggestion(suggestion) {
        return this.post('/api/suggestions', suggestion);
    }

    /**
     * Get user's suggestions
     * @returns {Promise<Array>} Array of user suggestions
     */
    async getUserSuggestions() {
        return this.get('/api/suggestions');
    }

    /**
     * Get all public suggestions
     * @returns {Promise<Array>} Array of public suggestions
     */
    async getAllSuggestions() {
        return this.get('/api/suggestions/all');
    }
}

export { ApiClient };
export default ApiClient;