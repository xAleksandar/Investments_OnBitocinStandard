/**
 * Portfolio Grid Component
 * Manages the main portfolio display grid with assets and performance metrics
 * Extracted from monolithic BitcoinGame class as part of Task 6.3
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatters.js';

export class PortfolioGrid {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Portfolio grid state
        this.portfolio = null;
        this.assets = [];
        this.sortBy = 'value_sats';
        this.sortOrder = 'desc';
        this.filterBy = 'all';
        this.viewMode = 'grid';

        // Grid configuration
        this.gridOptions = {
            showPerformance: true,
            showChange24h: true,
            showActions: true,
            enableSorting: true,
            enableFiltering: true,
            autoRefresh: true,
            refreshInterval: 30000 // 30 seconds
        };

        // Refresh timer
        this.refreshTimer = null;
    }

    /**
     * Initialize the portfolio grid component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('PortfolioGrid already initialized');
            return;
        }

        try {
            // Check for required services
            if (!this.services.portfolioService || !this.services.priceService) {
                console.error('PortfolioGrid requires portfolioService and priceService');
                return;
            }

            // Merge options
            this.gridOptions = { ...this.gridOptions, ...options };

            // Set up event listeners
            this.setupEventListeners();

            // Set up service listeners
            this.setupServiceListeners();

            // Load initial portfolio data
            this.loadPortfolioData();

            // Start auto-refresh if enabled
            if (this.gridOptions.autoRefresh) {
                this.startAutoRefresh();
            }

            this.isInitialized = true;
            console.log('PortfolioGrid initialized successfully');

        } catch (error) {
            console.error('Failed to initialize portfolio grid:', error);
        }
    }

    /**
     * Set up portfolio grid event listeners
     */
    setupEventListeners() {
        // Grid view controls
        this.setupViewControls();

        // Sorting controls
        this.setupSortingControls();

        // Filter controls
        this.setupFilterControls();

        // Asset interaction handlers
        this.setupAssetInteractionHandlers();

        // Refresh button
        const refreshBtn = getElementById('portfolioRefreshBtn');
        if (refreshBtn) {
            const cleanup = addEventListener(refreshBtn, 'click', () => {
                this.refreshPortfolio();
            });
            this.eventListeners.push(cleanup);
        }

        // View mode toggle
        const viewToggle = getElementById('portfolioViewToggle');
        if (viewToggle) {
            const cleanup = addEventListener(viewToggle, 'click', () => {
                this.toggleViewMode();
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up view controls
     */
    setupViewControls() {
        const gridViewBtn = getElementById('portfolioGridView');
        const listViewBtn = getElementById('portfolioListView');

        if (gridViewBtn) {
            const cleanup = addEventListener(gridViewBtn, 'click', () => {
                this.setViewMode('grid');
            });
            this.eventListeners.push(cleanup);
        }

        if (listViewBtn) {
            const cleanup = addEventListener(listViewBtn, 'click', () => {
                this.setViewMode('list');
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up sorting controls
     */
    setupSortingControls() {
        const sortOptions = document.querySelectorAll('.portfolio-sort-option');
        sortOptions.forEach(option => {
            const cleanup = addEventListener(option, 'click', (e) => {
                e.preventDefault();
                const sortBy = option.dataset.sortBy;
                if (sortBy) {
                    this.setSorting(sortBy);
                }
            });
            this.eventListeners.push(cleanup);
        });

        // Sort direction toggle
        const sortDirection = getElementById('portfolioSortDirection');
        if (sortDirection) {
            const cleanup = addEventListener(sortDirection, 'click', () => {
                this.toggleSortOrder();
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up filter controls
     */
    setupFilterControls() {
        const filterOptions = document.querySelectorAll('.portfolio-filter-option');
        filterOptions.forEach(option => {
            const cleanup = addEventListener(option, 'click', (e) => {
                e.preventDefault();
                const filterBy = option.dataset.filterBy;
                if (filterBy) {
                    this.setFilter(filterBy);
                }
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Set up asset interaction handlers
     */
    setupAssetInteractionHandlers() {
        // Handle clicks on asset cards (delegated event handling)
        const gridContainer = getElementById('portfolioGrid');
        if (gridContainer) {
            const cleanup = addEventListener(gridContainer, 'click', (e) => {
                this.handleAssetClick(e);
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up service listeners for data updates
     */
    setupServiceListeners() {
        // Listen for portfolio updates
        if (this.services.portfolioService.onPortfolioUpdate) {
            this.services.portfolioService.onPortfolioUpdate((portfolio) => {
                this.handlePortfolioUpdate(portfolio);
            });
        }

        // Listen for price updates
        if (this.services.priceService.onPriceUpdate) {
            this.services.priceService.onPriceUpdate(() => {
                this.updateAssetPrices();
            });
        }
    }

    /**
     * Load portfolio data from service
     */
    async loadPortfolioData() {
        try {
            this.showLoadingState();

            // Get portfolio data
            this.portfolio = await this.services.portfolioService?.getPortfolio();

            if (this.portfolio && this.portfolio.assets) {
                this.assets = this.portfolio.assets;
                this.sortAndFilterAssets();
                this.renderGrid();
            } else {
                this.renderEmptyState();
            }

            this.hideLoadingState();

        } catch (error) {
            console.error('Failed to load portfolio data:', error);
            this.hideLoadingState();
            this.renderErrorState();
        }
    }

    /**
     * Handle portfolio update from service
     * @param {Object} portfolio - Updated portfolio data
     */
    handlePortfolioUpdate(portfolio) {
        this.portfolio = portfolio;
        if (portfolio && portfolio.assets) {
            this.assets = portfolio.assets;
            this.sortAndFilterAssets();
            this.renderGrid();
        }
    }

    /**
     * Update asset prices in the grid
     */
    async updateAssetPrices() {
        if (!this.assets || this.assets.length === 0) return;

        try {
            // Update prices in background
            await this.services.priceService?.updateAllPrices();

            // Re-render grid with updated prices
            this.renderGrid();

        } catch (error) {
            console.error('Failed to update asset prices:', error);
        }
    }

    /**
     * Set sorting criteria
     * @param {string} sortBy - Field to sort by
     */
    setSorting(sortBy) {
        if (this.sortBy === sortBy) {
            this.toggleSortOrder();
        } else {
            this.sortBy = sortBy;
            this.sortOrder = 'desc';
        }

        this.sortAndFilterAssets();
        this.renderGrid();
        this.updateSortingUI();
    }

    /**
     * Toggle sort order
     */
    toggleSortOrder() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        this.sortAndFilterAssets();
        this.renderGrid();
        this.updateSortingUI();
    }

    /**
     * Set filter criteria
     * @param {string} filterBy - Filter criteria
     */
    setFilter(filterBy) {
        this.filterBy = filterBy;
        this.sortAndFilterAssets();
        this.renderGrid();
        this.updateFilterUI();
    }

    /**
     * Set view mode
     * @param {string} mode - View mode (grid or list)
     */
    setViewMode(mode) {
        this.viewMode = mode;
        this.renderGrid();
        this.updateViewModeUI();
    }

    /**
     * Toggle view mode
     */
    toggleViewMode() {
        this.setViewMode(this.viewMode === 'grid' ? 'list' : 'grid');
    }

    /**
     * Sort and filter assets based on current criteria
     */
    sortAndFilterAssets() {
        if (!this.assets) return;

        // Filter assets
        let filteredAssets = [...this.assets];

        switch (this.filterBy) {
            case 'profitable':
                filteredAssets = filteredAssets.filter(asset =>
                    (asset.performance_percentage || 0) > 0
                );
                break;
            case 'losing':
                filteredAssets = filteredAssets.filter(asset =>
                    (asset.performance_percentage || 0) < 0
                );
                break;
            case 'recent':
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                filteredAssets = filteredAssets.filter(asset =>
                    new Date(asset.created_at).getTime() > oneDayAgo
                );
                break;
            case 'all':
            default:
                // No filtering
                break;
        }

        // Sort assets
        filteredAssets.sort((a, b) => {
            let aValue, bValue;

            switch (this.sortBy) {
                case 'symbol':
                    aValue = a.symbol || '';
                    bValue = b.symbol || '';
                    break;
                case 'value_sats':
                    aValue = a.value_sats || 0;
                    bValue = b.value_sats || 0;
                    break;
                case 'quantity':
                    aValue = a.quantity || 0;
                    bValue = b.quantity || 0;
                    break;
                case 'performance':
                    aValue = a.performance_percentage || 0;
                    bValue = b.performance_percentage || 0;
                    break;
                case 'change_24h':
                    aValue = a.change_24h || 0;
                    bValue = b.change_24h || 0;
                    break;
                case 'created_at':
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                    break;
                default:
                    aValue = a.value_sats || 0;
                    bValue = b.value_sats || 0;
            }

            if (typeof aValue === 'string') {
                return this.sortOrder === 'asc' ?
                    aValue.localeCompare(bValue) :
                    bValue.localeCompare(aValue);
            } else {
                return this.sortOrder === 'asc' ?
                    aValue - bValue :
                    bValue - aValue;
            }
        });

        this.assets = filteredAssets;
    }

    /**
     * Render the portfolio grid
     */
    renderGrid() {
        const gridContainer = getElementById('portfolioGrid');
        if (!gridContainer) return;

        if (!this.assets || this.assets.length === 0) {
            this.renderEmptyState();
            return;
        }

        let gridContent = '';

        // Grid header
        if (this.viewMode === 'list') {
            gridContent += this.renderListHeader();
        }

        // Grid items
        this.assets.forEach(asset => {
            if (this.viewMode === 'grid') {
                gridContent += this.renderAssetCard(asset);
            } else {
                gridContent += this.renderAssetRow(asset);
            }
        });

        gridContainer.innerHTML = gridContent;

        // Update grid classes
        gridContainer.className = `portfolio-grid ${this.viewMode}-view`;

        // Update summary stats
        this.updateSummaryStats();
    }

    /**
     * Render list header for table view
     * @returns {string} HTML for list header
     */
    renderListHeader() {
        return `
            <div class="portfolio-list-header">
                <div class="asset-symbol">Asset</div>
                <div class="asset-quantity">Quantity</div>
                <div class="asset-value">Value (sats)</div>
                <div class="asset-performance">Performance</div>
                <div class="asset-change">24h Change</div>
                <div class="asset-actions">Actions</div>
            </div>
        `;
    }

    /**
     * Render asset card for grid view
     * @param {Object} asset - Asset data
     * @returns {string} HTML for asset card
     */
    renderAssetCard(asset) {
        const performanceClass = this.getPerformanceClass(asset.performance_percentage);
        const changeClass = this.getPerformanceClass(asset.change_24h);

        return `
            <div class="asset-card" data-asset-id="${asset.id}" data-symbol="${asset.symbol}">
                <div class="asset-card-header">
                    <div class="asset-symbol">
                        <span class="symbol-text">${asset.symbol}</span>
                        <span class="asset-name">${asset.name || asset.symbol}</span>
                    </div>
                    <div class="asset-value">
                        <span class="value-sats">${formatNumber(asset.value_sats)} sats</span>
                        <span class="value-usd">$${formatCurrency(asset.value_usd || 0)}</span>
                    </div>
                </div>

                <div class="asset-card-body">
                    <div class="asset-quantity">
                        <label>Quantity:</label>
                        <span>${formatNumber(asset.quantity)}</span>
                    </div>

                    ${this.gridOptions.showPerformance ? `
                        <div class="asset-performance ${performanceClass}">
                            <label>Performance:</label>
                            <span>${formatPercentage(asset.performance_percentage || 0)}</span>
                        </div>
                    ` : ''}

                    ${this.gridOptions.showChange24h ? `
                        <div class="asset-change ${changeClass}">
                            <label>24h Change:</label>
                            <span>${formatPercentage(asset.change_24h || 0)}</span>
                        </div>
                    ` : ''}
                </div>

                ${this.gridOptions.showActions ? `
                    <div class="asset-card-actions">
                        <button class="btn btn-primary btn-sm asset-trade-btn"
                                data-action="trade" data-asset-id="${asset.id}">
                            Trade
                        </button>
                        <button class="btn btn-secondary btn-sm asset-details-btn"
                                data-action="details" data-asset-id="${asset.id}">
                            Details
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render asset row for list view
     * @param {Object} asset - Asset data
     * @returns {string} HTML for asset row
     */
    renderAssetRow(asset) {
        const performanceClass = this.getPerformanceClass(asset.performance_percentage);
        const changeClass = this.getPerformanceClass(asset.change_24h);

        return `
            <div class="asset-row" data-asset-id="${asset.id}" data-symbol="${asset.symbol}">
                <div class="asset-symbol">
                    <span class="symbol-text">${asset.symbol}</span>
                    <span class="asset-name">${asset.name || asset.symbol}</span>
                </div>
                <div class="asset-quantity">${formatNumber(asset.quantity)}</div>
                <div class="asset-value">
                    <span class="value-sats">${formatNumber(asset.value_sats)} sats</span>
                    <span class="value-usd">$${formatCurrency(asset.value_usd || 0)}</span>
                </div>
                <div class="asset-performance ${performanceClass}">
                    ${formatPercentage(asset.performance_percentage || 0)}
                </div>
                <div class="asset-change ${changeClass}">
                    ${formatPercentage(asset.change_24h || 0)}
                </div>
                <div class="asset-actions">
                    <button class="btn btn-primary btn-sm asset-trade-btn"
                            data-action="trade" data-asset-id="${asset.id}">
                        Trade
                    </button>
                    <button class="btn btn-secondary btn-sm asset-details-btn"
                            data-action="details" data-asset-id="${asset.id}">
                        Details
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get CSS class for performance styling
     * @param {number} percentage - Performance percentage
     * @returns {string} CSS class name
     */
    getPerformanceClass(percentage) {
        if (!percentage || percentage === 0) return 'neutral';
        return percentage > 0 ? 'positive' : 'negative';
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const gridContainer = getElementById('portfolioGrid');
        if (!gridContainer) return;

        gridContainer.innerHTML = `
            <div class="portfolio-empty-state">
                <div class="empty-icon">📊</div>
                <h3>No Assets in Portfolio</h3>
                <p>Start building your Bitcoin-measured portfolio by converting some satoshis into other assets.</p>
                <button class="btn btn-primary" id="startTradingBtn">Start Trading</button>
            </div>
        `;

        // Set up start trading button
        const startTradingBtn = getElementById('startTradingBtn');
        if (startTradingBtn) {
            const cleanup = addEventListener(startTradingBtn, 'click', () => {
                this.services.router?.navigate('#assets');
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Render error state
     */
    renderErrorState() {
        const gridContainer = getElementById('portfolioGrid');
        if (!gridContainer) return;

        gridContainer.innerHTML = `
            <div class="portfolio-error-state">
                <div class="error-icon">⚠️</div>
                <h3>Failed to Load Portfolio</h3>
                <p>Unable to load your portfolio data. Please try again.</p>
                <button class="btn btn-primary" id="retryLoadBtn">Retry</button>
            </div>
        `;

        // Set up retry button
        const retryLoadBtn = getElementById('retryLoadBtn');
        if (retryLoadBtn) {
            const cleanup = addEventListener(retryLoadBtn, 'click', () => {
                this.loadPortfolioData();
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Handle asset click events
     * @param {Event} e - Click event
     */
    handleAssetClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            e.preventDefault();
            const action = actionBtn.dataset.action;
            const assetId = actionBtn.dataset.assetId;

            this.handleAssetAction(action, assetId);
            return;
        }

        // Handle asset card/row click
        const assetElement = e.target.closest('[data-asset-id]');
        if (assetElement) {
            const assetId = assetElement.dataset.assetId;
            this.handleAssetSelect(assetId);
        }
    }

    /**
     * Handle asset action (trade, details, etc.)
     * @param {string} action - Action type
     * @param {string} assetId - Asset ID
     */
    handleAssetAction(action, assetId) {
        const asset = this.assets.find(a => a.id.toString() === assetId);
        if (!asset) return;

        switch (action) {
            case 'trade':
                this.openTradingModal(asset);
                break;
            case 'details':
                this.showAssetDetails(asset);
                break;
            default:
                console.warn('Unknown asset action:', action);
        }
    }

    /**
     * Handle asset selection
     * @param {string} assetId - Asset ID
     */
    handleAssetSelect(assetId) {
        const asset = this.assets.find(a => a.id.toString() === assetId);
        if (asset) {
            this.emitEvent('assetSelect', { asset });
        }
    }

    /**
     * Open trading modal for asset
     * @param {Object} asset - Asset data
     */
    openTradingModal(asset) {
        // This will be handled by the trading-modal component
        this.emitEvent('openTradingModal', { asset });
    }

    /**
     * Show asset details
     * @param {Object} asset - Asset data
     */
    showAssetDetails(asset) {
        // Navigate to asset details page or show modal
        this.services.router?.navigate(`#asset/${asset.symbol}`);
    }

    /**
     * Update summary statistics
     */
    updateSummaryStats() {
        if (!this.portfolio) return;

        const totalValue = getElementById('portfolioTotalValue');
        const totalChange = getElementById('portfolioTotalChange');
        const assetCount = getElementById('portfolioAssetCount');

        if (totalValue) {
            totalValue.textContent = `${formatNumber(this.portfolio.total_value_sats || 0)} sats`;
        }

        if (totalChange) {
            const changePercentage = this.portfolio.total_change_percentage || 0;
            const changeClass = this.getPerformanceClass(changePercentage);
            totalChange.textContent = formatPercentage(changePercentage);
            totalChange.className = `portfolio-total-change ${changeClass}`;
        }

        if (assetCount) {
            assetCount.textContent = this.assets.length.toString();
        }
    }

    /**
     * Update sorting UI indicators
     */
    updateSortingUI() {
        // Update active sort option
        const sortOptions = document.querySelectorAll('.portfolio-sort-option');
        sortOptions.forEach(option => {
            if (option.dataset.sortBy === this.sortBy) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // Update sort direction indicator
        const sortDirection = getElementById('portfolioSortDirection');
        if (sortDirection) {
            sortDirection.textContent = this.sortOrder === 'asc' ? '↑' : '↓';
        }
    }

    /**
     * Update filter UI indicators
     */
    updateFilterUI() {
        const filterOptions = document.querySelectorAll('.portfolio-filter-option');
        filterOptions.forEach(option => {
            if (option.dataset.filterBy === this.filterBy) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    /**
     * Update view mode UI indicators
     */
    updateViewModeUI() {
        const gridViewBtn = getElementById('portfolioGridView');
        const listViewBtn = getElementById('portfolioListView');

        if (gridViewBtn) {
            gridViewBtn.classList.toggle('active', this.viewMode === 'grid');
        }

        if (listViewBtn) {
            listViewBtn.classList.toggle('active', this.viewMode === 'list');
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const gridContainer = getElementById('portfolioGrid');
        if (gridContainer) {
            gridContainer.innerHTML = `
                <div class="portfolio-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading portfolio...</p>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        // The loading state will be replaced by renderGrid or error state
    }

    /**
     * Refresh portfolio data
     */
    async refreshPortfolio() {
        await this.loadPortfolioData();
        this.services.notificationService?.showSuccess('Portfolio refreshed');
    }

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.updateAssetPrices();
        }, this.gridOptions.refreshInterval);
    }

    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Get current portfolio data
     * @returns {Object} Portfolio data
     */
    getPortfolio() {
        return this.portfolio;
    }

    /**
     * Get current assets list
     * @returns {Array} Assets array
     */
    getAssets() {
        return this.assets;
    }

    /**
     * Refresh component state
     */
    refresh() {
        this.loadPortfolioData();
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'PortfolioGrid' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the portfolio grid component
     */
    destroy() {
        console.log('Destroying portfolio grid');

        // Stop auto-refresh
        this.stopAutoRefresh();

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up portfolio grid event listener:', error);
            }
        });
        this.eventListeners = [];

        // Reset state
        this.portfolio = null;
        this.assets = [];
        this.isInitialized = false;

        console.log('Portfolio grid destroyed');
    }
}

// Export singleton instance factory
export function createPortfolioGrid(services) {
    return new PortfolioGrid(services);
}

export default PortfolioGrid;