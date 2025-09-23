/**
 * Portfolio Page Component
 * Manages the portfolio page functionality extracted from BitcoinGame monolith
 */

import {
    getElementById,
    addEventListener,
    showElement,
    hideElement,
    setText,
    addClass,
    removeClass,
    clearElement,
    createElement
} from '../utils/dom-helpers.js';

import { ELEMENT_IDS, CSS_CLASSES } from '../utils/constants.js';
import {
    formatSatoshisForUI,
    formatPercentageWithStyle,
    formatHoldingDisplay,
    formatLockStatus,
    formatTimeRemaining
} from '../utils/formatters.js';

import { validateTradeAmount, validateAssetPair } from '../utils/validators.js';

export class PortfolioPage {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Portfolio data
        this.holdings = [];
        this.tradeHistory = [];

        // UI state
        this.selectedHolding = null;
        this.isTrading = false;
        this.mainAppListenersSetup = false;

        // Component elements
        this.holdingsGrid = null;
        this.tradeForm = null;
        this.assetDetailsModal = null;
        this.tradingInterface = null;
    }

    /**
     * Initialize the portfolio page component
     */
    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing portfolio page component');

            // Check authentication
            if (!this.services.authService?.isAuthenticated()) {
                this.services.notificationService?.showError('Please login to access your portfolio');
                window.location.hash = '#login';
                return;
            }

            // Get DOM elements
            this.initializeDOMElements();

            // Set up event listeners
            this.setupEventListeners();

            // Load portfolio data
            await this.loadPortfolioData();

            // Initialize components
            await this.initializeComponents();

            // Start price auto-refresh
            this.startPriceAutoRefresh();

            this.isInitialized = true;
            console.log('Portfolio page component initialized successfully');
        } catch (error) {
            console.error('Failed to initialize portfolio page:', error);
            this.services.notificationService?.showError('Failed to load portfolio page');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeDOMElements() {
        this.holdingsGrid = getElementById('holdings');
        this.tradeForm = getElementById('tradeForm');
        this.assetDetailsModal = getElementById('assetDetailsModal');
        this.tradingInterface = getElementById('tradingInterface');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (this.mainAppListenersSetup) return;
        this.mainAppListenersSetup = true;

        // Trade form submission
        if (this.tradeForm) {
            const tradeSubmitHandler = (e) => {
                e.preventDefault();
                this.executeTrade();
            };
            this.eventListeners.push(
                addEventListener(this.tradeForm, 'submit', tradeSubmitHandler)
            );
        }

        // Refresh button
        const refreshBtn = getElementById('refreshPortfolio');
        if (refreshBtn) {
            const refreshHandler = () => this.refreshPortfolio();
            this.eventListeners.push(
                addEventListener(refreshBtn, 'click', refreshHandler)
            );
        }

        // Asset dropdown changes
        const fromAssetSelect = getElementById('fromAsset');
        const toAssetSelect = getElementById('toAsset');

        if (fromAssetSelect) {
            const fromChangeHandler = () => this.handleAssetSelectionChange();
            this.eventListeners.push(
                addEventListener(fromAssetSelect, 'change', fromChangeHandler)
            );
        }

        if (toAssetSelect) {
            const toChangeHandler = () => this.handleAssetSelectionChange();
            this.eventListeners.push(
                addEventListener(toAssetSelect, 'change', toChangeHandler)
            );
        }

        // Trade amount input
        const tradeAmountInput = getElementById('tradeAmount');
        if (tradeAmountInput) {
            const amountInputHandler = () => this.handleTradeAmountInput();
            this.eventListeners.push(
                addEventListener(tradeAmountInput, 'input', amountInputHandler)
            );
        }

        // Portfolio service listeners
        this.setupPortfolioServiceListeners();
    }

    /**
     * Set up portfolio service listeners
     */
    setupPortfolioServiceListeners() {
        if (this.services.portfolioService) {
            const portfolioChangeHandler = (portfolioData) => {
                this.handlePortfolioDataUpdate(portfolioData);
            };

            this.services.portfolioService.onPortfolioChange(portfolioChangeHandler);

            // Store cleanup function
            this.eventListeners.push(() => {
                this.services.portfolioService.removePortfolioListener(portfolioChangeHandler);
            });
        }

        // Price change listeners
        if (this.services.priceService) {
            const priceChangeHandler = (priceData) => {
                this.handlePriceUpdate(priceData);
            };

            this.services.priceService.onPriceChange(priceChangeHandler);

            // Store cleanup function
            this.eventListeners.push(() => {
                this.services.priceService.removePriceListener(priceChangeHandler);
            });
        }
    }

    /**
     * Load portfolio data
     */
    async loadPortfolioData() {
        try {
            // Load portfolio and trade history in parallel
            await Promise.all([
                this.services.portfolioService?.loadPortfolio(),
                this.services.portfolioService?.loadTradeHistory()
            ]);

            // Update holdings reference
            this.holdings = this.services.portfolioService?.getHoldings() || [];
            this.tradeHistory = this.services.portfolioService?.getTradeHistory() || [];

            console.log('Portfolio data loaded successfully');
        } catch (error) {
            console.error('Failed to load portfolio data:', error);
            throw error;
        }
    }

    /**
     * Initialize portfolio components
     */
    async initializeComponents() {
        await Promise.all([
            this.initializePortfolioGrid(),
            this.initializeTradingInterface(),
            this.initializeAssetDetailsModal(),
            this.updateAssetDropdowns()
        ]);
    }

    /**
     * Initialize portfolio grid component
     */
    async initializePortfolioGrid() {
        if (!this.holdingsGrid) return;

        // Display current portfolio
        this.displayPortfolio();

        // Set up grid interactions
        this.setupPortfolioGridInteractions();
    }

    /**
     * Initialize trading interface component
     */
    async initializeTradingInterface() {
        if (!this.tradingInterface) return;

        // Set up trading form validation
        this.setupTradingValidation();

        // Initialize trade amount helper
        this.initializeTradeAmountHelper();
    }

    /**
     * Initialize asset details modal component
     */
    async initializeAssetDetailsModal() {
        if (!this.assetDetailsModal) return;

        // Set up modal close handlers
        this.setupModalCloseHandlers();
    }

    /**
     * Display portfolio data
     */
    displayPortfolio() {
        if (!this.services.portfolioService) return;

        // Get portfolio data
        const holdings = this.services.portfolioService.getHoldings();
        const totalValue = holdings.reduce((sum, holding) => sum + (holding.current_value_sats || 0), 0);

        // Update portfolio summary
        this.updatePortfolioSummary(totalValue);

        // Update holdings grid
        this.updateHoldingsGrid(holdings);

        // Update trade history
        this.updateTradeHistoryDisplay();
    }

    /**
     * Update portfolio summary
     * @param {number} totalValue - Total portfolio value in sats
     */
    updatePortfolioSummary(totalValue) {
        const totalValueDiv = getElementById('totalValue');
        const performanceDiv = getElementById('performance');

        if (totalValueDiv) {
            setText(totalValueDiv, formatSatoshisForUI(totalValue));
        }

        if (performanceDiv && this.services.portfolioService) {
            const performance = this.services.portfolioService.calculatePerformance(totalValue);
            setText(performanceDiv, performance.formatted);

            // Update performance styling
            const performanceParent = performanceDiv.parentElement;
            if (performanceParent) {
                if (performance.isPositive) {
                    performanceParent.className = 'bg-green-50 p-4 rounded';
                    performanceDiv.className = 'text-2xl font-bold text-green-600';
                } else {
                    performanceParent.className = 'bg-red-50 p-4 rounded';
                    performanceDiv.className = 'text-2xl font-bold text-red-600';
                }
            }
        }
    }

    /**
     * Update holdings grid
     * @param {Array} holdings - Array of holdings
     */
    updateHoldingsGrid(holdings) {
        if (!this.holdingsGrid) return;

        clearElement(this.holdingsGrid);

        if (!holdings || holdings.length === 0) {
            this.displayEmptyPortfolio();
            return;
        }

        // Sort holdings (BTC first, then alphabetically)
        const sortedHoldings = this.services.portfolioService?.sortHoldings(holdings) || holdings;

        // Create holding elements
        sortedHoldings.forEach(holding => {
            const holdingElement = this.createHoldingElement(holding);
            this.holdingsGrid.appendChild(holdingElement);
        });
    }

    /**
     * Create holding element
     * @param {Object} holding - Holding data
     * @returns {HTMLElement} Holding element
     */
    createHoldingElement(holding) {
        const asset = this.getAssetInfo(holding.asset_symbol);
        const bgClass = this.services.portfolioService?.getHoldingBackgroundClass(holding) || 'bg-gray-50';
        const displayAmount = this.services.portfolioService?.formatHoldingAmount(holding) || '';
        const pnl = this.services.portfolioService?.calculateHoldingPnL(holding) || {};
        const lockStatus = formatLockStatus(holding.lock_status);

        const holdingDiv = createElement('div', {
            className: `p-3 border rounded cursor-pointer hover:bg-gray-100 ${bgClass}`,
            dataset: {
                assetSymbol: holding.asset_symbol,
                holdingId: holding.id || holding.asset_symbol
            }
        });

        let lockStatusHTML = '';
        if (holding.lock_status && holding.lock_status !== 'unlocked') {
            const timeRemaining = holding.locked_until ? formatTimeRemaining(holding.locked_until) : '';
            lockStatusHTML = `
                <div class="text-xs ${lockStatus.colorClass} mt-1">
                    ${lockStatus.icon} ${lockStatus.text}
                    ${timeRemaining ? `<br>${timeRemaining}` : ''}
                </div>
            `;
        }

        holdingDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-medium">${asset?.name || holding.asset_symbol}</div>
                    <div class="text-gray-600 text-sm">${displayAmount}</div>
                    ${lockStatusHTML}
                </div>
                <div class="text-right">
                    <div class="font-medium">${pnl.currentValueBTC || '0.00000000'} BTC</div>
                    <div class="${pnl.isPositive ? 'text-green-600' : 'text-red-600'} text-sm">
                        ${pnl.pnlBTC || '0.00000000'} BTC (${pnl.pnlPercent || '0.00'}%)
                    </div>
                </div>
            </div>
        `;

        // Add click handler for asset details
        const clickHandler = () => this.showAssetDetails(holding.asset_symbol, asset?.name);
        addEventListener(holdingDiv, 'click', clickHandler);

        return holdingDiv;
    }

    /**
     * Display empty portfolio state
     */
    displayEmptyPortfolio() {
        this.holdingsGrid.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <div class="text-6xl mb-4">🪙</div>
                <h3 class="text-lg font-medium mb-2">Your Portfolio is Empty</h3>
                <p class="text-sm mb-4">Start trading to build your Bitcoin-denominated portfolio</p>
                <button onclick="document.getElementById('fromAsset').focus()"
                        class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
                    Start Trading
                </button>
            </div>
        `;
    }

    /**
     * Set up portfolio grid interactions
     */
    setupPortfolioGridInteractions() {
        // Holdings will have individual click handlers added in createHoldingElement
        // Additional grid-level interactions can be added here
    }

    /**
     * Set up trading validation
     */
    setupTradingValidation() {
        const fromAssetSelect = getElementById('fromAsset');
        const toAssetSelect = getElementById('toAsset');
        const tradeAmountInput = getElementById('tradeAmount');

        // Real-time validation
        if (fromAssetSelect && toAssetSelect) {
            const validateAssets = () => {
                const validation = validateAssetPair(fromAssetSelect.value, toAssetSelect.value);
                this.displayAssetValidation(validation);
            };

            addEventListener(fromAssetSelect, 'change', validateAssets);
            addEventListener(toAssetSelect, 'change', validateAssets);
        }

        // Amount validation
        if (tradeAmountInput && fromAssetSelect) {
            const validateAmount = () => {
                const validation = validateTradeAmount(tradeAmountInput.value, fromAssetSelect.value);
                this.displayAmountValidation(validation);
            };

            addEventListener(tradeAmountInput, 'input', validateAmount);
        }
    }

    /**
     * Initialize trade amount helper
     */
    initializeTradeAmountHelper() {
        const tradeHelper = getElementById('tradeHelper');
        if (tradeHelper) {
            // Helper will be updated by validation functions
            tradeHelper.className = 'text-sm text-gray-500 mt-1';
        }
    }

    /**
     * Set up modal close handlers
     */
    setupModalCloseHandlers() {
        const closeModalBtn = getElementById('closeAssetDetailsModal');
        if (closeModalBtn) {
            const closeHandler = () => this.hideAssetDetailsModal();
            this.eventListeners.push(
                addEventListener(closeModalBtn, 'click', closeHandler)
            );
        }

        // Close on overlay click
        if (this.assetDetailsModal) {
            const overlayClickHandler = (e) => {
                if (e.target === this.assetDetailsModal) {
                    this.hideAssetDetailsModal();
                }
            };
            this.eventListeners.push(
                addEventListener(this.assetDetailsModal, 'click', overlayClickHandler)
            );
        }
    }

    /**
     * Update asset dropdowns
     */
    async updateAssetDropdowns() {
        const fromAssetSelect = getElementById('fromAsset');
        const toAssetSelect = getElementById('toAsset');

        if (!fromAssetSelect || !toAssetSelect) return;

        try {
            // Get available assets
            const assets = await this.services.apiClient?.getAssets() || [];

            // Clear current options
            clearElement(fromAssetSelect);
            clearElement(toAssetSelect);

            // Add default options
            fromAssetSelect.appendChild(createElement('option', { value: '' }, 'Select asset to sell'));
            toAssetSelect.appendChild(createElement('option', { value: '' }, 'Select asset to buy'));

            // Add asset options based on holdings for "from" dropdown
            this.holdings.forEach(holding => {
                const asset = assets.find(a => a.symbol === holding.asset_symbol);
                const displayName = asset ? `${asset.name} (${asset.symbol})` : holding.asset_symbol;
                fromAssetSelect.appendChild(createElement('option', { value: holding.asset_symbol }, displayName));
            });

            // Add all assets to "to" dropdown
            assets.forEach(asset => {
                const displayName = `${asset.name} (${asset.symbol})`;
                toAssetSelect.appendChild(createElement('option', { value: asset.symbol }, displayName));
            });

        } catch (error) {
            console.error('Failed to update asset dropdowns:', error);
        }
    }

    // ===== EVENT HANDLERS =====

    /**
     * Handle asset selection change
     */
    handleAssetSelectionChange() {
        const fromAsset = getElementById('fromAsset')?.value;
        const toAsset = getElementById('toAsset')?.value;

        // Validate asset pair
        if (fromAsset && toAsset) {
            const validation = validateAssetPair(fromAsset, toAsset);
            this.displayAssetValidation(validation);
        }

        // Update available balance display
        this.updateAvailableBalance(fromAsset);

        // Clear amount input if assets are invalid
        if (fromAsset === toAsset && fromAsset) {
            const tradeAmountInput = getElementById('tradeAmount');
            if (tradeAmountInput) tradeAmountInput.value = '';
        }
    }

    /**
     * Handle trade amount input
     */
    handleTradeAmountInput() {
        const fromAsset = getElementById('fromAsset')?.value;
        const amount = getElementById('tradeAmount')?.value;

        if (fromAsset && amount) {
            const validation = validateTradeAmount(amount, fromAsset);
            this.displayAmountValidation(validation);
        }
    }

    /**
     * Handle portfolio data update
     * @param {Object} portfolioData - Updated portfolio data
     */
    handlePortfolioDataUpdate(portfolioData) {
        this.holdings = portfolioData.holdings || [];
        this.displayPortfolio();
        this.updateAssetDropdowns();
    }

    /**
     * Handle price update
     * @param {Object} priceData - Updated price data
     */
    handlePriceUpdate(priceData) {
        // Refresh portfolio display with new prices
        this.displayPortfolio();
    }

    // ===== TRADING INTERFACE =====

    /**
     * Execute trade
     */
    async executeTrade() {
        if (this.isTrading) return;

        const fromAsset = getElementById('fromAsset')?.value;
        const toAsset = getElementById('toAsset')?.value;
        const amount = parseFloat(getElementById('tradeAmount')?.value);

        // Validate inputs
        const assetValidation = validateAssetPair(fromAsset, toAsset);
        const amountValidation = validateTradeAmount(amount, fromAsset);

        if (!assetValidation.isValid) {
            this.services.notificationService?.showError(assetValidation.message);
            return;
        }

        if (!amountValidation.isValid) {
            this.services.notificationService?.showError(amountValidation.message);
            return;
        }

        try {
            this.isTrading = true;
            this.updateTradeButtonState(true);

            // Execute trade through portfolio service
            const result = await this.services.portfolioService?.executeTrade(fromAsset, toAsset, amount);

            if (result?.success) {
                this.services.notificationService?.showTradeSuccess(result.trade);
                this.clearTradeForm();

                // Portfolio will be refreshed through service listener
            } else {
                throw new Error(result?.error || 'Trade failed');
            }

        } catch (error) {
            console.error('Trade execution failed:', error);
            this.services.notificationService?.showTradeError(error.message);
        } finally {
            this.isTrading = false;
            this.updateTradeButtonState(false);
        }
    }

    /**
     * Show asset details modal
     * @param {string} symbol - Asset symbol
     * @param {string} name - Asset name
     */
    async showAssetDetails(symbol, name) {
        try {
            // Load asset details
            const details = await this.services.portfolioService?.getAssetDetails(symbol);

            if (details && this.assetDetailsModal) {
                this.populateAssetDetailsModal(details, symbol, name);
                showElement(this.assetDetailsModal);
            }

        } catch (error) {
            console.error('Failed to load asset details:', error);
            this.services.notificationService?.showError('Failed to load asset details');
        }
    }

    /**
     * Hide asset details modal
     */
    hideAssetDetailsModal() {
        if (this.assetDetailsModal) {
            hideElement(this.assetDetailsModal);
        }
    }

    /**
     * Refresh portfolio data
     */
    async refreshPortfolio() {
        try {
            await this.loadPortfolioData();
            this.displayPortfolio();
            this.services.notificationService?.showSuccess('Portfolio refreshed');
        } catch (error) {
            console.error('Failed to refresh portfolio:', error);
            this.services.notificationService?.showError('Failed to refresh portfolio');
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get asset information
     * @param {string} symbol - Asset symbol
     * @returns {Object|null} Asset information
     */
    getAssetInfo(symbol) {
        // This would typically come from a cached assets list
        // For now, return basic info
        return { name: symbol, symbol };
    }

    /**
     * Update available balance display
     * @param {string} fromAsset - Selected from asset
     */
    updateAvailableBalance(fromAsset) {
        const balanceDisplay = getElementById('availableBalance');
        if (!balanceDisplay || !fromAsset) return;

        const holding = this.holdings.find(h => h.asset_symbol === fromAsset);
        if (holding) {
            const displayAmount = this.services.portfolioService?.formatHoldingAmount(holding) || '0';
            setText(balanceDisplay, `Available: ${displayAmount}`);
        } else {
            setText(balanceDisplay, 'Available: 0');
        }
    }

    /**
     * Display asset validation
     * @param {Object} validation - Validation result
     */
    displayAssetValidation(validation) {
        const assetMessage = getElementById('assetValidationMessage');
        if (assetMessage) {
            setText(assetMessage, validation.message || '');
            assetMessage.className = `text-sm mt-1 ${validation.messageClass || ''}`;
        }
    }

    /**
     * Display amount validation
     * @param {Object} validation - Validation result
     */
    displayAmountValidation(validation) {
        const tradeHelper = getElementById('tradeHelper');
        if (tradeHelper) {
            setText(tradeHelper, validation.helperText || validation.message || '');
            tradeHelper.className = `text-sm mt-1 ${validation.fieldClass ? 'text-red-600' : 'text-gray-500'}`;
        }
    }

    /**
     * Update trade button state
     * @param {boolean} isLoading - Whether trade is in progress
     */
    updateTradeButtonState(isLoading) {
        const tradeButton = getElementById('executeTradeBtn');
        if (tradeButton) {
            tradeButton.disabled = isLoading;
            setText(tradeButton, isLoading ? 'Executing Trade...' : 'Execute Trade');

            if (isLoading) {
                addClass(tradeButton, 'opacity-50 cursor-not-allowed');
            } else {
                removeClass(tradeButton, 'opacity-50 cursor-not-allowed');
            }
        }
    }

    /**
     * Clear trade form
     */
    clearTradeForm() {
        const fromAsset = getElementById('fromAsset');
        const toAsset = getElementById('toAsset');
        const tradeAmount = getElementById('tradeAmount');
        const tradeHelper = getElementById('tradeHelper');
        const availableBalance = getElementById('availableBalance');

        if (fromAsset) fromAsset.value = '';
        if (toAsset) toAsset.value = '';
        if (tradeAmount) tradeAmount.value = '';
        if (tradeHelper) setText(tradeHelper, '');
        if (availableBalance) setText(availableBalance, '');
    }

    /**
     * Populate asset details modal
     * @param {Object} details - Asset details
     * @param {string} symbol - Asset symbol
     * @param {string} name - Asset name
     */
    populateAssetDetailsModal(details, symbol, name) {
        // Modal population logic would go here
        console.log('Populating asset details modal:', { details, symbol, name });
    }

    /**
     * Update trade history display
     */
    updateTradeHistoryDisplay() {
        const tradeHistoryDiv = getElementById('tradeHistory');
        if (tradeHistoryDiv && this.services.portfolioService) {
            this.services.portfolioService.displayTradeHistory(this.tradeHistory);
        }
    }

    /**
     * Start price auto-refresh
     */
    startPriceAutoRefresh() {
        if (this.services.priceService && !this.services.priceService.isAutoRefreshActive()) {
            this.services.priceService.startPriceAutoRefresh();
        }
    }

    /**
     * Render the portfolio page (called by router)
     */
    async render() {
        if (!this.isInitialized) {
            await this.init();
        }

        // Refresh data
        await this.loadPortfolioData();
        this.displayPortfolio();

        console.log('Portfolio page rendered');
    }

    /**
     * Clean up component resources
     */
    destroy() {
        // Stop price auto-refresh
        if (this.services.priceService?.isAutoRefreshActive()) {
            this.services.priceService.stopPriceAutoRefresh();
        }

        // Remove event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clean up DOM references
        this.holdingsGrid = null;
        this.tradeForm = null;
        this.assetDetailsModal = null;
        this.tradingInterface = null;

        // Reset state
        this.mainAppListenersSetup = false;
        this.isInitialized = false;

        console.log('Portfolio page component destroyed');
    }
}

export default PortfolioPage;