/**
 * Frontend portfolio service
 * Manages portfolio data, calculations, and display logic
 */
class PortfolioService {
    constructor(apiClient, notificationService = null) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;

        // Portfolio data
        this.holdings = [];
        this.tradeHistory = [];
        this.assets = [];

        // Portfolio baseline: always compare against 1 BTC (100M satoshis)
        this.PORTFOLIO_BASELINE_SATS = 100000000;

        // Portfolio state listeners
        this.portfolioListeners = [];
    }

    /**
     * Add listener for portfolio state changes
     * @param {Function} listener - Callback function
     */
    onPortfolioChange(listener) {
        this.portfolioListeners.push(listener);
    }

    /**
     * Remove portfolio state change listener
     * @param {Function} listener - Callback function to remove
     */
    removePortfolioListener(listener) {
        const index = this.portfolioListeners.indexOf(listener);
        if (index > -1) {
            this.portfolioListeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of portfolio state change
     * @param {Object} portfolioData - Current portfolio data
     */
    notifyPortfolioChange(portfolioData) {
        this.portfolioListeners.forEach(listener => {
            try {
                listener(portfolioData);
            } catch (error) {
                console.error('Error in portfolio listener:', error);
            }
        });
    }

    /**
     * Set assets data for portfolio calculations
     * @param {Array} assets - Array of available assets
     */
    setAssets(assets) {
        this.assets = assets;
    }

    /**
     * Get current holdings
     * @returns {Array} Array of holdings
     */
    getHoldings() {
        return this.holdings;
    }

    /**
     * Get trade history
     * @returns {Array} Array of trades
     */
    getTradeHistory() {
        return this.tradeHistory;
    }

    /**
     * Load portfolio data from API
     * @returns {Promise<Object>} Portfolio data
     */
    async loadPortfolio() {
        try {
            const data = await this.apiClient.getPortfolio();

            // Store holdings for use in dropdown updates
            this.holdings = data.holdings || [];

            // Notify listeners
            this.notifyPortfolioChange(data);

            return data;
        } catch (error) {
            console.error('Failed to load portfolio:', error);
            if (this.notificationService) {
                this.notificationService.showNotification('Failed to load portfolio', 'error');
            }
            throw error;
        }
    }

    /**
     * Load trade history from API
     * @returns {Promise<Array>} Trade history
     */
    async loadTradeHistory() {
        try {
            const resp = await this.apiClient.getTradeHistory();
            const rawTrades = Array.isArray(resp) ? resp : (resp?.trades || []);

            // Normalize trade objects for UI components expecting snake_case
            const trades = rawTrades.map(t => {
                // If already in expected shape, return as-is
                if (t && (t.from_asset || t.created_at)) return t;

                const fromAmount = typeof t.fromAmount === 'string' ? Number(t.fromAmount) : (t.fromAmount ?? 0);
                const toAmount = typeof t.toAmount === 'string' ? Number(t.toAmount) : (t.toAmount ?? 0);
                const createdAt = t.executedAt || t.createdAt || t.created_at || null;
                const btcPriceUsd = t.btc_price_usd ?? t.btcPriceUsd ?? null;
                const assetPriceUsd = t.asset_price_usd ?? t.assetPriceUsd ?? null;

                return {
                    id: t.id,
                    from_asset: t.fromAsset || t.from_asset,
                    to_asset: t.toAsset || t.to_asset,
                    from_amount: fromAmount,
                    to_amount: toAmount,
                    created_at: createdAt,
                    btc_price_usd: btcPriceUsd !== null ? Number(btcPriceUsd) : null,
                    asset_price_usd: assetPriceUsd !== null ? Number(assetPriceUsd) : null
                };
            });

            this.tradeHistory = trades;
            return trades;
        } catch (error) {
            console.error('Failed to load trade history:', error);
            this.tradeHistory = [];
            throw error;
        }
    }

    /**
     * Get asset details for specific symbol
     * @param {string} symbol - Asset symbol
     * @returns {Promise<Object>} Asset details
     */
    async getAssetDetails(symbol) {
        try {
            return await this.apiClient.getAssetDetails(symbol);
        } catch (error) {
            console.error(`Failed to load asset details for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Format satoshis to BTC with appropriate decimal places
     * @param {number} sats - Satoshi amount
     * @returns {string} Formatted BTC amount
     */
    formatSatoshis(sats) {
        const btc = sats / 100000000;
        return btc < 0.001 ? btc.toFixed(8) : btc.toFixed(4);
    }

    /**
     * Calculate portfolio performance against baseline
     * @param {number} totalValueSats - Current total portfolio value in sats
     * @returns {Object} Performance metrics
     */
    calculatePerformance(totalValueSats) {
        const startingBalance = this.PORTFOLIO_BASELINE_SATS; // 1 BTC in sats
        const currentValue = totalValueSats || 0;

        // Performance = (current - initial) / initial * 100
        const performanceValue = ((currentValue - startingBalance) / startingBalance) * 100;
        const isPositive = performanceValue >= 0;

        return {
            value: performanceValue,
            isPositive,
            formatted: `${isPositive ? '+' : ''}${performanceValue.toFixed(2)}%`
        };
    }

    /**
     * Sort holdings for display (BTC first, then alphabetically)
     * @param {Array} holdings - Array of holdings
     * @returns {Array} Sorted holdings
     */
    sortHoldings(holdings) {
        return [...holdings].sort((a, b) => {
            // BTC always comes first
            if (a.asset_symbol === 'BTC') return -1;
            if (b.asset_symbol === 'BTC') return 1;

            // Get asset names for comparison
            const assetA = this.assets.find(asset => asset.symbol === a.asset_symbol);
            const assetB = this.assets.find(asset => asset.symbol === b.asset_symbol);

            const nameA = assetA?.name || a.asset_symbol;
            const nameB = assetB?.name || b.asset_symbol;

            // Sort alphabetically by name
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Format holding amount for display
     * @param {Object} holding - Holding object
     * @returns {string} Formatted amount
     */
    formatHoldingAmount(holding) {
        if (holding.asset_symbol === 'BTC') {
            return `${(holding.amount / 100000000).toFixed(8)} BTC`;
        } else {
            // Convert back from stored integer to actual shares
            const actualAmount = holding.amount / 100000000;
            return `${actualAmount.toFixed(8)} ${holding.asset_symbol}`;
        }
    }

    /**
     * Calculate holding P&L metrics
     * @param {Object} holding - Holding object
     * @returns {Object} P&L metrics
     */
    calculateHoldingPnL(holding) {
        const currentValue = holding.current_value_sats;
        const costBasis = holding.cost_basis_sats;
        const pnl = currentValue - costBasis;
        const pnlBTC = (pnl / 100000000).toFixed(8);
        const pnlPercent = costBasis > 0 ? ((pnl / costBasis) * 100).toFixed(2) : '0.00';

        return {
            pnl,
            pnlBTC,
            pnlPercent,
            isPositive: pnl >= 0,
            currentValueBTC: (currentValue / 100000000).toFixed(8),
            costBasisBTC: (costBasis / 100000000).toFixed(8)
        };
    }

    /**
     * Get background class for holding based on lock status
     * @param {Object} holding - Holding object
     * @returns {string} CSS class string
     */
    getHoldingBackgroundClass(holding) {
        let bgClass = 'bg-gray-50';
        if (holding.lock_status === 'locked') {
            bgClass = 'bg-red-50 border-red-200';
        } else if (holding.lock_status === 'partial') {
            bgClass = 'bg-yellow-50 border-yellow-200';
        }
        return bgClass;
    }

    /**
     * Display portfolio data in the UI
     * @param {Object} data - Portfolio data from API
     */
    displayPortfolio(data) {
        const holdingsDiv = document.getElementById('holdings');
        const totalValueDiv = document.getElementById('totalValue');
        const performanceDiv = document.getElementById('performance');

        if (!holdingsDiv || !totalValueDiv || !performanceDiv) {
            console.error('Portfolio display elements not found');
            return;
        }

        // Update total value
        const totalSats = data.total_value_sats || 0;
        const totalBTC = (totalSats / 100000000).toFixed(8);
        totalValueDiv.textContent = `${totalBTC} BTC`;

        // Calculate and display performance
        const performance = this.calculatePerformance(data.total_value_sats);
        performanceDiv.textContent = performance.formatted;

        // Update performance styling
        const performanceParent = performanceDiv.parentElement;
        if (performance.isPositive) {
            performanceParent.className = 'bg-green-50 p-4 rounded';
            performanceDiv.className = 'text-2xl font-bold text-green-600';
        } else {
            performanceParent.className = 'bg-red-50 p-4 rounded';
            performanceDiv.className = 'text-2xl font-bold text-red-600';
        }

        // Clear and display holdings
        holdingsDiv.innerHTML = '';
        const sortedHoldings = this.sortHoldings(data.holdings);

        sortedHoldings.forEach(holding => {
            const holdingDiv = this.createHoldingElement(holding);
            holdingsDiv.appendChild(holdingDiv);
        });
    }

    /**
     * Create a holding element for display
     * @param {Object} holding - Holding data
     * @returns {HTMLElement} Holding display element
     */
    createHoldingElement(holding) {
        const asset = this.assets.find(a => a.symbol === holding.asset_symbol);
        const bgClass = this.getHoldingBackgroundClass(holding);
        const displayAmount = this.formatHoldingAmount(holding);
        const pnl = this.calculateHoldingPnL(holding);

        const holdingDiv = document.createElement('div');
        holdingDiv.className = `p-3 border rounded cursor-pointer hover:bg-gray-100 ${bgClass}`;

        const lockStatusIcon = this.getLockStatusIcon(holding.lock_status);
        const pnlColorClass = pnl.isPositive ? 'text-green-600' : 'text-red-600';

        holdingDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-medium">${asset?.name || holding.asset_symbol} ${lockStatusIcon}</div>
                    <div class="text-gray-600">${displayAmount}</div>
                </div>
                <div class="text-right">
                    <div class="font-medium">${pnl.currentValueBTC} BTC</div>
                    <div class="${pnlColorClass} text-sm">
                        ${pnl.pnlBTC} BTC (${pnl.pnlPercent}%)
                    </div>
                </div>
            </div>
        `;

        // Add click handler for asset details
        holdingDiv.addEventListener('click', () => {
            this.showAssetDetails(holding.asset_symbol);
        });

        return holdingDiv;
    }

    /**
     * Get lock status icon for display
     * @param {string} lockStatus - Lock status
     * @returns {string} HTML icon string
     */
    getLockStatusIcon(lockStatus) {
        switch (lockStatus) {
            case 'locked':
                return '<span class="text-red-500 ml-1">🔒</span>';
            case 'partial':
                return '<span class="text-yellow-500 ml-1">🔓</span>';
            default:
                return '';
        }
    }

    /**
     * Show asset details modal/page
     * @param {string} symbol - Asset symbol
     */
    async showAssetDetails(symbol) {
        try {
            const details = await this.getAssetDetails(symbol);
            // This would trigger navigation to asset detail page or show modal
            // Implementation depends on routing system
            console.log('Asset details:', details);
        } catch (error) {
            console.error('Failed to show asset details:', error);
            if (this.notificationService) {
                this.notificationService.showNotification('Failed to load asset details', 'error');
            }
        }
    }

    /**
     * Display trade history in the UI
     * @param {Array} trades - Array of trade objects
     */
    displayTradeHistory(trades) {
        const historyDiv = document.getElementById('tradeHistory');
        if (!historyDiv) {
            console.error('Trade history element not found');
            return;
        }

        if (!trades || trades.length === 0) {
            historyDiv.innerHTML = '<p class="text-gray-500">No trades yet</p>';
            return;
        }

        historyDiv.innerHTML = '';
        trades.forEach(trade => {
            const tradeElement = this.createTradeElement(trade);
            historyDiv.appendChild(tradeElement);
        });
    }

    /**
     * Create a trade element for display
     * @param {Object} trade - Trade data
     * @returns {HTMLElement} Trade display element
     */
    createTradeElement(trade) {
        const tradeDiv = document.createElement('div');
        tradeDiv.className = 'p-3 border-b last:border-b-0';

        const fromAmount = this.formatTradeAmount(trade.from_amount, trade.from_asset);
        const toAmount = this.formatTradeAmount(trade.to_amount, trade.to_asset);
        const tradeDate = new Date(trade.created_at).toLocaleDateString();

        tradeDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-medium">${fromAmount} → ${toAmount}</div>
                    <div class="text-gray-600 text-sm">${tradeDate}</div>
                </div>
                <div class="text-right text-sm text-gray-500">
                    <div>BTC: $${Number(trade.btc_price_usd).toLocaleString()}</div>
                    ${trade.asset_price_usd ? `<div>${trade.from_asset === 'BTC' ? trade.to_asset : trade.from_asset}: $${Number(trade.asset_price_usd).toFixed(2)}</div>` : ''}
                </div>
            </div>
        `;

        return tradeDiv;
    }

    /**
     * Format trade amount for display
     * @param {number} amount - Raw amount
     * @param {string} asset - Asset symbol
     * @returns {string} Formatted amount
     */
    formatTradeAmount(amount, asset) {
        if (asset === 'BTC') {
            return `${(amount / 100000000).toFixed(8)} BTC`;
        } else {
            const actualAmount = amount / 100000000;
            return `${actualAmount.toFixed(8)} ${asset}`;
        }
    }

    /**
     * Execute a trade
     * @param {string} fromAsset - Source asset symbol
     * @param {string} toAsset - Target asset symbol
     * @param {number} amount - Amount to trade
     * @returns {Promise<Object>} Trade result
     */
    async executeTrade(fromAsset, toAsset, amount) {
        try {
            const result = await this.apiClient.executeTrade(fromAsset, toAsset, amount);

            // Reload portfolio after successful trade
            await this.loadPortfolio();

            return result;
        } catch (error) {
            console.error('Trade execution failed:', error);
            if (this.notificationService) {
                this.notificationService.showNotification(`Trade failed: ${error.message}`, 'error');
            }
            throw error;
        }
    }

    /**
     * Get portfolio baseline in satoshis
     * @returns {number} Baseline amount in satoshis
     */
    getPortfolioBaseline() {
        return this.PORTFOLIO_BASELINE_SATS;
    }

    /**
     * Methods for app.js integration
     */
    async startPeriodicUpdates(intervalMs = 60000) {
        console.log('📊 Starting portfolio periodic updates...');
        // Load initial portfolio
        await this.loadUserPortfolio();

        // Set up periodic refresh
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadPortfolio();
            } catch (error) {
                console.error('Portfolio update failed:', error);
            }
        }, intervalMs);
    }

    stopPeriodicUpdates() {
        console.log('⏹️ Stopping portfolio updates');
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async loadUserPortfolio() {
        console.log('👤 Loading user portfolio...');
        try {
            const portfolio = await this.loadPortfolio();
            const trades = await this.loadTradeHistory();
            console.log('✅ User portfolio loaded');
            return { portfolio, trades };
        } catch (error) {
            console.error('Failed to load user portfolio:', error);
            return null;
        }
    }

    clearPortfolio() {
        console.log('🧹 Clearing portfolio data');
        this.holdings = [];
        this.tradeHistory = [];
        this.notifyPortfolioChange({
            holdings: [],
            totalValueSats: 0,
            performance: { percentageChange: 0, isPositive: true }
        });
    }

    /**
     * Trade and conversion methods for user actions
     */
    async convertAsset(data) {
        // Alias for executeTrade with specific conversion logic
        return await this.executeTrade(data.fromAsset, data.toAsset, data.amount);
    }

    async exportPortfolio(format = 'json') {
        console.log('📤 Exporting portfolio...');
        const portfolio = {
            holdings: this.holdings,
            trades: this.tradeHistory,
            exportDate: new Date().toISOString()
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(portfolio, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `portfolio-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        return portfolio;
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.stopPeriodicUpdates();
        this.portfolioListeners = [];
        this.holdings = [];
        this.tradeHistory = [];
    }
}

export { PortfolioService };
export default PortfolioService;
