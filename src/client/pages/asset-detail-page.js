/**
 * Asset Detail Page Component
 * Manages individual asset detail pages with price charts, trading interface, and historical data
 * Extracted from monolithic BitcoinGame class as part of Task 5.5
 */

import { getElementById, hideElement, showElement, addEventListener } from '../utils/dom-helpers.js';
import { formatters } from '../utils/formatters.js';

export class AssetDetailPage {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Asset detail state
        this.currentAsset = null;
        this.assetData = null;
        this.chartInstance = null;

        // TradingView symbol mapping
        this.symbolMap = {
            // Crypto
            'BTC': 'BITSTAMP:BTCUSD',
            // Original stocks
            'AAPL': 'NASDAQ:AAPL',
            'TSLA': 'NASDAQ:TSLA',
            'MSFT': 'NASDAQ:MSFT',
            'GOOGL': 'NASDAQ:GOOGL',
            'AMZN': 'NASDAQ:AMZN',
            'META': 'NASDAQ:META',
            'NVDA': 'NASDAQ:NVDA',
            'GOOG': 'NASDAQ:GOOG',
            'NFLX': 'NASDAQ:NFLX',
            'SPY': 'AMEX:SPY',
            'QQQ': 'NASDAQ:QQQ',
            'VTI': 'AMEX:VTI',
            'VOO': 'AMEX:VOO',
            'VEA': 'AMEX:VEA',
            'VWO': 'AMEX:VWO',
            'AGG': 'NASDAQ:AGG',
            'TLT': 'NASDAQ:TLT',
            'IEF': 'NASDAQ:IEF',
            'HYG': 'AMEX:HYG',
            'LQD': 'AMEX:LQD',
            'TIP': 'NASDAQ:TIP',
            'VNQ': 'AMEX:VNQ',
            'GLD': 'AMEX:GLD',
            'SLV': 'AMEX:SLV',
            'DBC': 'AMEX:DBC',
            'USO': 'AMEX:USO',
            'UNG': 'AMEX:UNG',
            // Additional assets
            'ARKK': 'AMEX:ARKK',
            'COIN': 'NASDAQ:COIN',
            'MSTR': 'NASDAQ:MSTR',
            'GOLD': 'TVC:GOLD'
        };
    }

    /**
     * Initialize asset detail page
     * @param {string} assetSymbol - Asset symbol to display
     * @param {string} assetName - Asset name for display
     */
    async init(assetSymbol, assetName = null) {
        if (this.isInitialized && this.currentAsset === assetSymbol) {
            console.log('AssetDetailPage already initialized for', assetSymbol);
            return;
        }

        try {
            console.log('Initializing asset detail page for:', assetSymbol);

            this.currentAsset = assetSymbol;

            // Initialize DOM components
            this.initializeDOMComponents();

            // Load asset data
            await this.loadAssetData(assetSymbol, assetName);

            // Initialize TradingView chart
            this.initializeTradingViewChart(assetSymbol);

            // Set up event listeners
            this.setupEventListeners();

            // Initialize trading interface if user is authenticated
            if (this.services.authService?.isAuthenticated()) {
                this.initializeTradingInterface();
            }

            this.isInitialized = true;
            console.log('Asset detail page initialized successfully for:', assetSymbol);

        } catch (error) {
            console.error('Failed to initialize asset detail page:', error);
            this.services.notificationService?.showError('Failed to load asset details');
            throw error;
        }
    }

    /**
     * Initialize DOM components for asset detail page
     */
    initializeDOMComponents() {
        // This could be either in a modal or a dedicated page
        const container = getElementById('assetDetailContainer') || getElementById('modalContent');
        if (!container) {
            console.warn('Asset detail container not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';
    }

    /**
     * Load asset data and display details
     * @param {string} assetSymbol - Asset symbol
     * @param {string} assetName - Asset name
     */
    async loadAssetData(assetSymbol, assetName = null) {
        try {
            // Set loading state
            this.showLoadingState();

            // Load asset details from API
            const response = await this.services.apiClient.get(`/api/portfolio/asset/${assetSymbol}`);

            if (response) {
                this.assetData = response;
                this.renderAssetDetails(assetSymbol, assetName || assetSymbol);
            } else {
                throw new Error('No asset data received');
            }

        } catch (error) {
            console.error('Failed to load asset data:', error);
            this.showErrorState('Failed to load asset details');
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const container = this.getContainer();
        if (container) {
            container.innerHTML = `
                <div class="flex justify-center items-center py-20">
                    <div class="text-xl text-gray-600">Loading asset details...</div>
                </div>
            `;
        }
    }

    /**
     * Show error state
     * @param {string} message - Error message
     */
    showErrorState(message) {
        const container = this.getContainer();
        if (container) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <div class="text-xl text-red-600 mb-4">${message}</div>
                    <button onclick="window.history.back()"
                            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">
                        Go Back
                    </button>
                </div>
            `;
        }
    }

    /**
     * Render asset details
     * @param {string} assetSymbol - Asset symbol
     * @param {string} assetName - Asset name
     */
    renderAssetDetails(assetSymbol, assetName) {
        const container = this.getContainer();
        if (!container) return;

        const isAuthenticated = this.services.authService?.isAuthenticated();
        const holdings = this.assetData?.holdings || [];
        const totalValue = holdings.reduce((sum, holding) => sum + (holding.purchase_price_sats || 0), 0);

        container.innerHTML = `
            <div class="asset-detail-page">
                <!-- Header -->
                <div class="asset-detail-header mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-800">${assetName} (${assetSymbol})</h1>
                            <p class="text-gray-600">Asset Details & Performance</p>
                        </div>
                        <button id="closeAssetDetail" class="text-gray-500 hover:text-gray-700 text-2xl">
                            ×
                        </button>
                    </div>
                    <div class="asset-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div class="stat-card">
                            <div class="text-sm text-gray-500">Current Price</div>
                            <div id="currentPrice" class="text-lg font-semibold">Loading...</div>
                        </div>
                        <div class="stat-card">
                            <div class="text-sm text-gray-500">24h Change</div>
                            <div id="priceChange24h" class="text-lg font-semibold">Loading...</div>
                        </div>
                        <div class="stat-card">
                            <div class="text-sm text-gray-500">Your Holdings</div>
                            <div class="text-lg font-semibold">${holdings.length} purchases</div>
                        </div>
                        <div class="stat-card">
                            <div class="text-sm text-gray-500">Total Invested</div>
                            <div class="text-lg font-semibold">${formatters.formatSats(totalValue)} sats</div>
                        </div>
                    </div>
                </div>

                <!-- Chart Section -->
                <div class="asset-chart-section mb-8">
                    <h2 class="text-xl font-semibold mb-4">Price Chart</h2>
                    <div id="assetDetailChart" class="asset-chart-container"
                         style="height: 400px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <div class="flex items-center justify-center h-full text-gray-500">
                            Loading chart...
                        </div>
                    </div>
                </div>

                ${isAuthenticated ? this.renderTradingInterface(assetSymbol) : ''}

                <!-- Holdings History -->
                ${isAuthenticated && holdings.length > 0 ? this.renderHoldingsHistory(holdings) : ''}

                <!-- Asset Information -->
                <div class="asset-info-section">
                    <h2 class="text-xl font-semibold mb-4">Asset Information</h2>
                    <div class="asset-info-grid grid md:grid-cols-2 gap-6">
                        <div class="info-card">
                            <h3 class="font-semibold mb-2">About ${assetName}</h3>
                            <p class="text-gray-600 text-sm">
                                ${this.getAssetDescription(assetSymbol)}
                            </p>
                        </div>
                        <div class="info-card">
                            <h3 class="font-semibold mb-2">Performance vs Bitcoin</h3>
                            <div id="performanceMetrics" class="text-sm text-gray-600">
                                Loading performance data...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load current price data
        this.loadCurrentPriceData(assetSymbol);

        // Load performance metrics
        this.loadPerformanceMetrics(assetSymbol);
    }

    /**
     * Render trading interface
     * @param {string} assetSymbol - Asset symbol
     * @returns {string} Trading interface HTML
     */
    renderTradingInterface(assetSymbol) {
        return `
            <div class="trading-interface-section mb-8">
                <h2 class="text-xl font-semibold mb-4">Trade ${assetSymbol}</h2>
                <div class="trading-form bg-gray-50 p-6 rounded-lg">
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">From Asset</label>
                            <select id="fromAssetDetail" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="BTC">Bitcoin (BTC)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">To Asset</label>
                            <select id="toAssetDetail" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="${assetSymbol}">${assetSymbol}</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <input type="number" id="tradeAmountDetail"
                               class="w-full border border-gray-300 rounded-md px-3 py-2"
                               placeholder="Enter amount to trade" min="0" step="0.00000001">
                        <div id="tradeValidationDetail" class="text-sm text-red-600 mt-1 hidden"></div>
                    </div>
                    <div class="mt-4 flex gap-3">
                        <button id="executeTradeDetail"
                                class="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors">
                            Execute Trade
                        </button>
                        <button id="cancelTradeDetail"
                                class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render holdings history
     * @param {Array} holdings - Array of holdings
     * @returns {string} Holdings history HTML
     */
    renderHoldingsHistory(holdings) {
        const holdingsRows = holdings.map(holding => {
            const purchaseDate = new Date(holding.purchase_date).toLocaleDateString();
            const amount = formatters.formatSats(holding.purchase_price_sats);

            return `
                <tr class="border-b border-gray-200">
                    <td class="py-3 px-4">${purchaseDate}</td>
                    <td class="py-3 px-4">${amount} sats</td>
                    <td class="py-3 px-4">${holding.conversion_rate || 'N/A'}</td>
                    <td class="py-3 px-4">
                        <span class="text-sm text-gray-500">
                            ${this.getTimeAgo(new Date(holding.purchase_date))}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="holdings-history-section mb-8">
                <h2 class="text-xl font-semibold mb-4">Purchase History</h2>
                <div class="overflow-x-auto">
                    <table class="w-full bg-white border border-gray-200 rounded-lg">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="py-3 px-4 text-left text-sm font-medium text-gray-700">Date</th>
                                <th class="py-3 px-4 text-left text-sm font-medium text-gray-700">Amount (sats)</th>
                                <th class="py-3 px-4 text-left text-sm font-medium text-gray-700">Rate</th>
                                <th class="py-3 px-4 text-left text-sm font-medium text-gray-700">Time Ago</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${holdingsRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Initialize TradingView chart
     * @param {string} assetSymbol - Asset symbol
     */
    initializeTradingViewChart(assetSymbol) {
        const container = getElementById('assetDetailChart');
        if (!container) return;

        // Clear existing chart
        container.innerHTML = '';

        const tradingViewSymbol = this.symbolMap[assetSymbol] || `NASDAQ:${assetSymbol}`;

        const createWidget = () => {
            if (typeof TradingView === 'undefined') {
                console.error('TradingView library not loaded');
                return;
            }

            this.chartInstance = new TradingView.widget({
                "width": "100%",
                "height": "400",
                "symbol": tradingViewSymbol,
                "interval": "D",
                "timezone": "Etc/UTC",
                "theme": "light",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "hide_top_toolbar": false,
                "hide_legend": false,
                "save_image": false,
                "container_id": "assetDetailChart"
            });
        };

        // Load TradingView library if not already loaded
        if (typeof TradingView !== 'undefined') {
            createWidget();
        } else {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/tv.js';
            script.onload = createWidget;
            script.onerror = () => {
                container.innerHTML = `
                    <div class="flex items-center justify-center h-full text-gray-500">
                        Failed to load chart. Please check your internet connection.
                    </div>
                `;
            };
            document.head.appendChild(script);
        }
    }

    /**
     * Initialize trading interface
     */
    initializeTradingInterface() {
        // Populate from asset dropdown with user's holdings
        this.populateFromAssetDropdown();

        // Set up trading form validation and execution
        this.setupTradingFormHandlers();
    }

    /**
     * Populate from asset dropdown with user's holdings
     */
    populateFromAssetDropdown() {
        const dropdown = getElementById('fromAssetDetail');
        if (!dropdown) return;

        // Get user's holdings from portfolio service
        const holdings = this.services.portfolioService?.getHoldings() || [];

        dropdown.innerHTML = holdings
            .filter(holding => holding.purchase_count > 0)
            .map(holding => `
                <option value="${holding.asset_symbol}">
                    ${holding.asset_symbol} (${formatters.formatSats(holding.total_value_sats)} sats)
                </option>
            `).join('');
    }

    /**
     * Set up trading form handlers
     */
    setupTradingFormHandlers() {
        const executeBtn = getElementById('executeTradeDetail');
        const cancelBtn = getElementById('cancelTradeDetail');
        const amountInput = getElementById('tradeAmountDetail');

        if (executeBtn) {
            const cleanup = addEventListener(executeBtn, 'click', () => {
                this.executeTrade();
            });
            this.eventListeners.push(cleanup);
        }

        if (cancelBtn) {
            const cleanup = addEventListener(cancelBtn, 'click', () => {
                this.clearTradingForm();
            });
            this.eventListeners.push(cleanup);
        }

        if (amountInput) {
            const cleanup = addEventListener(amountInput, 'input', () => {
                this.validateTradeAmount();
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Load current price data
     * @param {string} assetSymbol - Asset symbol
     */
    async loadCurrentPriceData(assetSymbol) {
        try {
            const prices = this.services.priceService?.getPrices();
            if (prices && prices[assetSymbol]) {
                const price = prices[assetSymbol];
                this.updatePriceDisplay(price);
            }
        } catch (error) {
            console.error('Failed to load price data:', error);
        }
    }

    /**
     * Update price display
     * @param {Object} priceData - Price data object
     */
    updatePriceDisplay(priceData) {
        const currentPriceEl = getElementById('currentPrice');
        const priceChangeEl = getElementById('priceChange24h');

        if (currentPriceEl && priceData.usd) {
            currentPriceEl.textContent = `$${formatters.formatNumber(priceData.usd)}`;
        }

        if (priceChangeEl && priceData.usd_24h_change) {
            const change = priceData.usd_24h_change;
            const changeText = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
            priceChangeEl.textContent = changeText;
            priceChangeEl.className = `text-lg font-semibold ${change > 0 ? 'text-green-600' : 'text-red-600'}`;
        }
    }

    /**
     * Load performance metrics
     * @param {string} assetSymbol - Asset symbol
     */
    async loadPerformanceMetrics(assetSymbol) {
        try {
            // Calculate performance vs Bitcoin
            const performanceData = await this.calculateAssetPerformance(assetSymbol);
            this.updatePerformanceDisplay(performanceData);
        } catch (error) {
            console.error('Failed to load performance metrics:', error);
        }
    }

    /**
     * Calculate asset performance vs Bitcoin
     * @param {string} assetSymbol - Asset symbol
     * @returns {Object} Performance data
     */
    async calculateAssetPerformance(assetSymbol) {
        // This would typically call a service to calculate performance
        // For now, return placeholder data
        return {
            '24h': { performance: 0, status: 'loading' },
            '1y': { performance: 0, status: 'loading' },
            '5y': { performance: 0, status: 'loading' }
        };
    }

    /**
     * Update performance display
     * @param {Object} performanceData - Performance data
     */
    updatePerformanceDisplay(performanceData) {
        const container = getElementById('performanceMetrics');
        if (!container) return;

        const periods = ['24h', '1y', '5y'];
        const performanceHtml = periods.map(period => {
            const data = performanceData[period];
            if (data.status === 'loading') {
                return `<div class="mb-2">${period}: Loading...</div>`;
            }

            const performance = data.performance;
            const color = performance > 0 ? 'text-green-600' : 'text-red-600';
            return `
                <div class="mb-2">
                    ${period}: <span class="${color}">${performance > 0 ? '+' : ''}${performance.toFixed(2)}%</span>
                </div>
            `;
        }).join('');

        container.innerHTML = performanceHtml;
    }

    // ===== TRADING FUNCTIONALITY =====

    /**
     * Execute trade
     */
    async executeTrade() {
        const fromAsset = getElementById('fromAssetDetail')?.value;
        const toAsset = getElementById('toAssetDetail')?.value;
        const amount = parseFloat(getElementById('tradeAmountDetail')?.value || 0);

        if (!this.validateTrade(fromAsset, toAsset, amount)) {
            return;
        }

        try {
            // Execute trade through portfolio service
            const result = await this.services.portfolioService?.executeTrade(fromAsset, toAsset, amount);

            if (result) {
                this.services.notificationService?.showSuccess('Trade executed successfully');
                this.clearTradingForm();

                // Refresh data
                await this.loadAssetData(this.currentAsset);
            }

        } catch (error) {
            console.error('Trade execution failed:', error);
            this.services.notificationService?.showError('Trade execution failed');
        }
    }

    /**
     * Validate trade parameters
     * @param {string} fromAsset - From asset symbol
     * @param {string} toAsset - To asset symbol
     * @param {number} amount - Trade amount
     * @returns {boolean} True if valid
     */
    validateTrade(fromAsset, toAsset, amount) {
        const validationEl = getElementById('tradeValidationDetail');

        if (!fromAsset || !toAsset) {
            this.showValidationError('Please select both assets');
            return false;
        }

        if (fromAsset === toAsset) {
            this.showValidationError('Cannot trade an asset for itself');
            return false;
        }

        if (!amount || amount <= 0) {
            this.showValidationError('Please enter a valid amount');
            return false;
        }

        // Hide validation error
        if (validationEl) {
            validationEl.classList.add('hidden');
        }

        return true;
    }

    /**
     * Show validation error
     * @param {string} message - Error message
     */
    showValidationError(message) {
        const validationEl = getElementById('tradeValidationDetail');
        if (validationEl) {
            validationEl.textContent = message;
            validationEl.classList.remove('hidden');
        }
    }

    /**
     * Validate trade amount
     */
    validateTradeAmount() {
        const amount = parseFloat(getElementById('tradeAmountDetail')?.value || 0);
        if (amount <= 0 && document.getElementById('tradeAmountDetail').value !== '') {
            this.showValidationError('Amount must be greater than 0');
        } else {
            const validationEl = getElementById('tradeValidationDetail');
            if (validationEl) {
                validationEl.classList.add('hidden');
            }
        }
    }

    /**
     * Clear trading form
     */
    clearTradingForm() {
        const amountInput = getElementById('tradeAmountDetail');
        const validationEl = getElementById('tradeValidationDetail');

        if (amountInput) amountInput.value = '';
        if (validationEl) validationEl.classList.add('hidden');
    }

    // ===== EVENT HANDLING =====

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Close button
        const closeBtn = getElementById('closeAssetDetail');
        if (closeBtn) {
            const cleanup = addEventListener(closeBtn, 'click', () => {
                this.closeAssetDetail();
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Close asset detail view
     */
    closeAssetDetail() {
        // If in modal, hide modal
        const modal = getElementById('assetModal');
        if (modal) {
            hideElement(modal);
            return;
        }

        // If standalone page, navigate back
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.hash = '#portfolio';
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get container element
     * @returns {HTMLElement} Container element
     */
    getContainer() {
        return getElementById('assetDetailContainer') || getElementById('modalContent');
    }

    /**
     * Get asset description
     * @param {string} assetSymbol - Asset symbol
     * @returns {string} Asset description
     */
    getAssetDescription(assetSymbol) {
        const descriptions = {
            'BTC': 'Bitcoin is a decentralized digital currency that operates without a central authority.',
            'AAPL': 'Apple Inc. designs, manufactures, and markets consumer electronics and software.',
            'TSLA': 'Tesla Inc. designs, develops, manufactures, and sells electric vehicles and energy systems.',
            'SPY': 'SPDR S&P 500 ETF tracks the S&P 500 stock market index.',
            'GLD': 'SPDR Gold Shares tracks the price of gold bullion.',
            // Add more descriptions as needed
        };

        return descriptions[assetSymbol] || `Information about ${assetSymbol} asset.`;
    }

    /**
     * Get time ago string
     * @param {Date} date - Date object
     * @returns {string} Time ago string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    /**
     * Render asset detail page (called by router)
     */
    render() {
        // Asset detail page rendering is handled by init() method
        // This method is here for consistency with other page components
        console.log('Asset detail page render called');
    }

    /**
     * Destroy asset detail page and clean up resources
     */
    destroy() {
        console.log('Destroying asset detail page');

        // Clean up TradingView chart
        if (this.chartInstance) {
            try {
                this.chartInstance.remove();
            } catch (error) {
                console.warn('Error removing TradingView chart:', error);
            }
            this.chartInstance = null;
        }

        // Clean up all event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear asset state
        this.currentAsset = null;
        this.assetData = null;

        // Reset initialization flag
        this.isInitialized = false;

        console.log('Asset detail page destroyed');
    }
}

export default AssetDetailPage;