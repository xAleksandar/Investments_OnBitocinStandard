/**
 * Frontend price service
 * Manages asset price data, updates, and auto-refresh functionality
 */
class PriceService {
    constructor(apiClient, notificationService = null) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;

        // Price data
        this.prices = {}; // Prices in satoshis
        this.pricesUsd = {}; // Prices in USD
        this.btcPrice = 100000; // Default BTC price in USD

        // Auto-refresh configuration
        this.priceRefreshInterval = null;
        this.refreshIntervalMs = 30000; // 30 seconds

        // Price change listeners
        this.priceListeners = [];
    }

    /**
     * Add listener for price changes
     * @param {Function} listener - Callback function
     */
    onPriceChange(listener) {
        this.priceListeners.push(listener);
    }

    /**
     * Remove price change listener
     * @param {Function} listener - Callback function to remove
     */
    removePriceListener(listener) {
        const index = this.priceListeners.indexOf(listener);
        if (index > -1) {
            this.priceListeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of price changes
     * @param {Object} priceData - Current price data
     */
    notifyPriceChange(priceData) {
        this.priceListeners.forEach(listener => {
            try {
                listener(priceData);
            } catch (error) {
                console.error('Error in price listener:', error);
            }
        });
    }

    /**
     * Get current prices in satoshis
     * @returns {Object} Prices by symbol in satoshis
     */
    getPrices() {
        return this.prices;
    }

    /**
     * Get current prices in USD
     * @returns {Object} Prices by symbol in USD
     */
    getPricesUsd() {
        return this.pricesUsd;
    }

    /**
     * Get current Bitcoin price in USD
     * @returns {number} BTC price in USD
     */
    getBtcPrice() {
        return this.btcPrice;
    }

    /**
     * Get price for specific asset in satoshis
     * @param {string} symbol - Asset symbol
     * @returns {number|null} Price in satoshis or null if not found
     */
    getAssetPrice(symbol) {
        return this.prices[symbol] || null;
    }

    /**
     * Get price for specific asset in USD
     * @param {string} symbol - Asset symbol
     * @returns {number|null} Price in USD or null if not found
     */
    getAssetPriceUsd(symbol) {
        return this.pricesUsd[symbol] || null;
    }

    /**
     * Load prices from API
     * @returns {Promise<Object>} Price data
     */
    async loadPrices() {
        try {
            const data = await this.apiClient.getPrices();

            // Check if response contains valid data
            if (data.error) {
                console.error('Server error loading prices:', data.error);
                if (this.notificationService) {
                    this.notificationService.showNotification('Failed to load current prices', 'error');
                }
                return null;
            }

            // Update price data
            this.prices = data.pricesInSats || {};
            this.pricesUsd = data.pricesUsd || {};
            this.btcPrice = data.btcPrice || this.btcPrice;

            // Notify listeners of price update
            this.notifyPriceChange({
                pricesInSats: this.prices,
                pricesUsd: this.pricesUsd,
                btcPrice: this.btcPrice
            });

            return data;
        } catch (error) {
            console.error('Failed to load prices:', error);
            if (this.notificationService) {
                this.notificationService.showNotification('Failed to load prices', 'error');
            }
            throw error;
        }
    }

    /**
     * Start automatic price refresh
     * @param {number} intervalMs - Refresh interval in milliseconds (optional)
     */
    startPriceAutoRefresh(intervalMs = null) {
        if (this.priceRefreshInterval) {
            this.stopPriceAutoRefresh();
        }

        const interval = intervalMs || this.refreshIntervalMs;

        this.priceRefreshInterval = setInterval(async () => {
            try {
                await this.loadPrices();
            } catch (error) {
                console.error('Auto price refresh failed:', error);
            }
        }, interval);

        console.log(`Started price auto-refresh with ${interval / 1000}s interval`);
    }

    /**
     * Stop automatic price refresh
     */
    stopPriceAutoRefresh() {
        if (this.priceRefreshInterval) {
            clearInterval(this.priceRefreshInterval);
            this.priceRefreshInterval = null;
            console.log('Stopped price auto-refresh');
        }
    }

    /**
     * Check if auto-refresh is active
     * @returns {boolean} True if auto-refresh is running
     */
    isAutoRefreshActive() {
        return this.priceRefreshInterval !== null;
    }

    /**
     * Set refresh interval
     * @param {number} intervalMs - New interval in milliseconds
     */
    setRefreshInterval(intervalMs) {
        this.refreshIntervalMs = intervalMs;

        // Restart auto-refresh with new interval if it's currently running
        if (this.isAutoRefreshActive()) {
            this.startPriceAutoRefresh(intervalMs);
        }
    }

    /**
     * Update asset prices in the UI
     * @param {Array} assets - Array of asset objects with elementId
     */
    updateAssetPricesInUI(assets) {
        if (!assets || assets.length === 0) {
            return;
        }

        assets.forEach(asset => {
            if (!asset.elementId || !asset.symbol) {
                return;
            }

            const priceElement = document.getElementById(`${asset.elementId}Price`);

            if (priceElement && this.prices[asset.symbol]) {
                const priceInBTC = this.prices[asset.symbol] / 100000000;
                priceElement.textContent = priceInBTC < 0.001
                    ? priceInBTC.toFixed(8)
                    : priceInBTC.toFixed(4);
            }
        });
    }

    /**
     * Get asset performance data
     * @param {string} symbol - Asset symbol
     * @param {string} period - Time period (5y, 1y, etc.)
     * @returns {Promise<Object>} Performance data
     */
    async getAssetPerformance(symbol, period = '5y') {
        try {
            return await this.apiClient.getAssetPerformance(symbol, period);
        } catch (error) {
            console.error(`Failed to load performance data for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Calculate value in satoshis from USD amount
     * @param {number} usdAmount - Amount in USD
     * @returns {number} Value in satoshis
     */
    usdToSatoshis(usdAmount) {
        if (!this.btcPrice || this.btcPrice === 0) {
            throw new Error('BTC price not available');
        }

        const btcAmount = usdAmount / this.btcPrice;
        return Math.round(btcAmount * 100000000);
    }

    /**
     * Calculate USD value from satoshis
     * @param {number} satoshis - Amount in satoshis
     * @returns {number} Value in USD
     */
    satoshisToUsd(satoshis) {
        const btcAmount = satoshis / 100000000;
        return btcAmount * this.btcPrice;
    }

    /**
     * Calculate asset value in satoshis
     * @param {number} assetAmount - Amount of asset
     * @param {string} assetSymbol - Asset symbol
     * @returns {number} Value in satoshis
     */
    assetToSatoshis(assetAmount, assetSymbol) {
        const assetPriceUsd = this.getAssetPriceUsd(assetSymbol);

        if (!assetPriceUsd) {
            throw new Error(`Price not available for ${assetSymbol}`);
        }

        const usdValue = assetAmount * assetPriceUsd;
        return this.usdToSatoshis(usdValue);
    }

    /**
     * Calculate asset amount from satoshis
     * @param {number} satoshis - Amount in satoshis
     * @param {string} assetSymbol - Asset symbol
     * @returns {number} Amount of asset
     */
    satoshisToAsset(satoshis, assetSymbol) {
        const assetPriceUsd = this.getAssetPriceUsd(assetSymbol);

        if (!assetPriceUsd) {
            throw new Error(`Price not available for ${assetSymbol}`);
        }

        const usdValue = this.satoshisToUsd(satoshis);
        return usdValue / assetPriceUsd;
    }

    /**
     * Format price for display
     * @param {number} price - Price value
     * @param {string} type - 'btc' or 'usd'
     * @returns {string} Formatted price string
     */
    formatPrice(price, type = 'btc') {
        if (type === 'btc') {
            return price < 0.001 ? price.toFixed(8) : price.toFixed(4);
        } else if (type === 'usd') {
            return price.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        return price.toString();
    }

    /**
     * Check if prices are stale (older than expected refresh interval)
     * @returns {boolean} True if prices might be stale
     */
    isPricesStale() {
        // This would require storing last update timestamp
        // For now, just check if we have any prices at all
        return Object.keys(this.prices).length === 0;
    }

    /**
     * Force refresh prices manually
     * @returns {Promise<Object>} Price data
     */
    async refreshPrices() {
        console.log('Manual price refresh triggered');
        return await this.loadPrices();
    }

    /**
     * Get price change for asset between current and previous
     * This would require storing historical price data
     * @param {string} symbol - Asset symbol
     * @returns {Object|null} Price change data or null
     */
    getPriceChange(symbol) {
        // Placeholder for price change calculation
        // Would need historical price storage to implement
        return null;
    }
}

export default PriceService;