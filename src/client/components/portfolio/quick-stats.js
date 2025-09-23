/**
 * Quick Stats Component
 * Portfolio summary statistics and key metrics display
 * Extracted from monolithic BitcoinGame class as part of Task 6.3
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from '../../utils/formatters.js';

export class QuickStats {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Stats instances
        this.statsInstances = new Map();

        // Stats configuration
        this.defaultOptions = {
            animated: true,
            showChange: true,
            showIcon: true,
            clickable: true,
            refreshInterval: 30000, // 30 seconds
            autoRefresh: true,
            compact: false
        };

        // Available stat types
        this.statTypes = {
            totalValue: {
                label: 'Total Portfolio Value',
                icon: '💰',
                format: 'sats',
                description: 'Current total value of your portfolio'
            },
            totalAssets: {
                label: 'Total Assets',
                icon: '📊',
                format: 'number',
                description: 'Number of different assets in portfolio'
            },
            totalChange24h: {
                label: '24h Change',
                icon: '📈',
                format: 'percentage',
                description: 'Portfolio value change in last 24 hours'
            },
            totalChangeWeek: {
                label: '7d Change',
                icon: '📅',
                format: 'percentage',
                description: 'Portfolio value change in last 7 days'
            },
            totalChangeMonth: {
                label: '30d Change',
                icon: '📆',
                format: 'percentage',
                description: 'Portfolio value change in last 30 days'
            },
            bestPerformer: {
                label: 'Best Performer',
                icon: '🏆',
                format: 'asset',
                description: 'Asset with highest performance'
            },
            worstPerformer: {
                label: 'Worst Performer',
                icon: '📉',
                format: 'asset',
                description: 'Asset with lowest performance'
            },
            avgCostBasis: {
                label: 'Avg Cost Basis',
                icon: '💵',
                format: 'sats',
                description: 'Average cost basis of all assets'
            },
            unrealizedPnL: {
                label: 'Unrealized P&L',
                icon: '💹',
                format: 'sats',
                description: 'Unrealized profit and loss'
            },
            lastUpdated: {
                label: 'Last Updated',
                icon: '🕒',
                format: 'time',
                description: 'Last portfolio update time'
            }
        };

        // Refresh timer
        this.refreshTimer = null;
    }

    /**
     * Initialize the quick stats component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('QuickStats already initialized');
            return;
        }

        try {
            // Check for required services
            if (!this.services.portfolioService) {
                console.error('QuickStats requires portfolioService');
                return;
            }

            // Merge options
            this.defaultOptions = { ...this.defaultOptions, ...options };

            // Enhance existing stats
            this.enhanceExistingStats();

            // Set up service listeners
            this.setupServiceListeners();

            // Start auto-refresh if enabled
            if (this.defaultOptions.autoRefresh) {
                this.startAutoRefresh();
            }

            this.isInitialized = true;
            console.log('QuickStats initialized successfully');

        } catch (error) {
            console.error('Failed to initialize quick stats:', error);
        }
    }

    /**
     * Enhance existing stats elements in the DOM
     */
    enhanceExistingStats() {
        const existingStats = document.querySelectorAll('[data-quick-stat], .quick-stat');
        existingStats.forEach(stat => {
            if (!stat.dataset.statEnhanced) {
                this.enhanceStat(stat);
            }
        });
    }

    /**
     * Set up service listeners
     */
    setupServiceListeners() {
        // Listen for portfolio updates
        if (this.services.portfolioService.onPortfolioUpdate) {
            this.services.portfolioService.onPortfolioUpdate(() => {
                this.refreshAllStats();
            });
        }

        // Listen for price updates
        if (this.services.priceService?.onPriceUpdate) {
            this.services.priceService.onPriceUpdate(() => {
                this.refreshAllStats();
            });
        }
    }

    /**
     * Create a new quick stats component
     * @param {HTMLElement} container - Container element
     * @param {Array} statKeys - Array of stat keys to display
     * @param {Object} options - Stats options
     * @returns {string} Stats ID
     */
    create(container, statKeys = [], options = {}) {
        if (!container) {
            console.error('Container element is required for quick stats');
            return null;
        }

        const statsOptions = { ...this.defaultOptions, ...options };
        const statsId = this.generateStatsId();

        // Set up container
        this.setupStatsContainer(container, statsOptions);

        // Create stats structure
        this.createStatsStructure(container, statKeys, statsId);

        // Set up event listeners
        this.setupStatsEventListeners(container, statsId);

        // Store stats instance
        this.statsInstances.set(statsId, {
            container: container,
            statKeys: statKeys,
            options: statsOptions,
            data: null
        });

        container.dataset.statsId = statsId;

        // Load initial data
        this.loadStatsData(statsId);

        return statsId;
    }

    /**
     * Enhance an existing stats element
     * @param {HTMLElement} container - Stats container element
     * @param {Object} options - Enhancement options
     */
    enhanceStat(container, options = {}) {
        if (!container || container.dataset.statEnhanced) return;

        // Extract stat keys from data attributes or child elements
        const statKeys = this.extractStatKeysFromElement(container);
        const statsId = this.create(container, statKeys, options);

        container.dataset.statEnhanced = 'true';
        return statsId;
    }

    /**
     * Set up stats container
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Stats options
     */
    setupStatsContainer(container, options) {
        container.classList.add('quick-stats-container');

        if (options.compact) {
            container.classList.add('compact');
        }

        if (options.animated) {
            container.classList.add('animated');
        }
    }

    /**
     * Create stats HTML structure
     * @param {HTMLElement} container - Container element
     * @param {Array} statKeys - Stat keys to display
     * @param {string} statsId - Stats ID
     */
    createStatsStructure(container, statKeys, statsId) {
        let structure = '<div class="quick-stats-grid">';

        statKeys.forEach(statKey => {
            const statConfig = this.statTypes[statKey];
            if (statConfig) {
                structure += this.renderStatCard(statKey, statConfig, statsId);
            }
        });

        structure += '</div>';

        // Add refresh button if enabled
        if (this.defaultOptions.autoRefresh) {
            structure += `
                <div class="stats-controls">
                    <button class="btn btn-sm stats-refresh-btn" data-stats-id="${statsId}">
                        <span class="refresh-icon">🔄</span>
                        Refresh
                    </button>
                    <span class="last-update" id="statsLastUpdate-${statsId}">--</span>
                </div>
            `;
        }

        container.innerHTML = structure;
    }

    /**
     * Render individual stat card
     * @param {string} statKey - Stat key
     * @param {Object} statConfig - Stat configuration
     * @param {string} statsId - Stats ID
     * @returns {string} HTML for stat card
     */
    renderStatCard(statKey, statConfig, statsId) {
        return `
            <div class="stat-card" data-stat-key="${statKey}" data-stats-id="${statsId}">
                <div class="stat-header">
                    ${this.defaultOptions.showIcon ? `<span class="stat-icon">${statConfig.icon}</span>` : ''}
                    <span class="stat-label">${statConfig.label}</span>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="statValue-${statsId}-${statKey}">
                        <span class="loading-placeholder">--</span>
                    </div>
                    ${this.defaultOptions.showChange ? `
                        <div class="stat-change" id="statChange-${statsId}-${statKey}">
                            <span class="change-placeholder">--</span>
                        </div>
                    ` : ''}
                </div>
                <div class="stat-description" title="${statConfig.description}">
                    ${statConfig.description}
                </div>
            </div>
        `;
    }

    /**
     * Set up stats event listeners
     * @param {HTMLElement} container - Container element
     * @param {string} statsId - Stats ID
     */
    setupStatsEventListeners(container, statsId) {
        // Refresh button
        const refreshBtn = container.querySelector('.stats-refresh-btn');
        if (refreshBtn) {
            const cleanup = addEventListener(refreshBtn, 'click', () => {
                this.refreshStats(statsId);
            });
            this.eventListeners.push(cleanup);
        }

        // Stat card clicks
        if (this.defaultOptions.clickable) {
            const statCards = container.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                const cleanup = addEventListener(card, 'click', () => {
                    this.handleStatClick(card.dataset.statKey, statsId);
                });
                this.eventListeners.push(cleanup);
            });
        }
    }

    /**
     * Load stats data
     * @param {string} statsId - Stats ID
     */
    async loadStatsData(statsId) {
        const statsData = this.statsInstances.get(statsId);
        if (!statsData) return;

        try {
            this.showLoadingState(statsId);

            // Get portfolio data
            const portfolio = await this.services.portfolioService?.getPortfolio();
            const portfolioStats = await this.services.portfolioService?.getPortfolioStats();

            if (portfolio && portfolioStats) {
                statsData.data = this.processStatsData(portfolio, portfolioStats);
                this.renderStats(statsId);
                this.updateLastUpdateTime(statsId);
            }

        } catch (error) {
            console.error('Failed to load stats data:', error);
        } finally {
            this.hideLoadingState(statsId);
        }
    }

    /**
     * Process portfolio data into stats format
     * @param {Object} portfolio - Portfolio data
     * @param {Object} portfolioStats - Portfolio statistics
     * @returns {Object} Processed stats data
     */
    processStatsData(portfolio, portfolioStats) {
        const assets = portfolio.assets || [];

        // Calculate performance metrics
        const performances = assets.map(asset => asset.performance_percentage || 0);
        const bestPerformance = Math.max(...performances);
        const worstPerformance = Math.min(...performances);

        const bestPerformer = assets.find(asset =>
            (asset.performance_percentage || 0) === bestPerformance
        );
        const worstPerformer = assets.find(asset =>
            (asset.performance_percentage || 0) === worstPerformance
        );

        return {
            totalValue: {
                current: portfolio.total_value_sats || 0,
                change: portfolioStats.change_24h_percentage || 0
            },
            totalAssets: {
                current: assets.length,
                change: portfolioStats.assets_count_change || 0
            },
            totalChange24h: {
                current: portfolioStats.change_24h_percentage || 0,
                change: portfolioStats.change_24h_trend || 0
            },
            totalChangeWeek: {
                current: portfolioStats.change_7d_percentage || 0,
                change: portfolioStats.change_7d_trend || 0
            },
            totalChangeMonth: {
                current: portfolioStats.change_30d_percentage || 0,
                change: portfolioStats.change_30d_trend || 0
            },
            bestPerformer: {
                current: bestPerformer,
                change: bestPerformance
            },
            worstPerformer: {
                current: worstPerformer,
                change: worstPerformance
            },
            avgCostBasis: {
                current: portfolioStats.avg_cost_basis_sats || 0,
                change: portfolioStats.avg_cost_basis_change || 0
            },
            unrealizedPnL: {
                current: portfolioStats.unrealized_pnl_sats || 0,
                change: portfolioStats.unrealized_pnl_change || 0
            },
            lastUpdated: {
                current: new Date(),
                change: 0
            }
        };
    }

    /**
     * Render stats to UI
     * @param {string} statsId - Stats ID
     */
    renderStats(statsId) {
        const statsData = this.statsInstances.get(statsId);
        if (!statsData || !statsData.data) return;

        statsData.statKeys.forEach(statKey => {
            const statInfo = statsData.data[statKey];
            const statConfig = this.statTypes[statKey];

            if (statInfo && statConfig) {
                this.updateStatDisplay(statsId, statKey, statInfo, statConfig);
            }
        });

        // Add animation class
        if (statsData.options.animated) {
            setTimeout(() => {
                const container = statsData.container;
                container.classList.add('stats-loaded');
            }, 100);
        }
    }

    /**
     * Update individual stat display
     * @param {string} statsId - Stats ID
     * @param {string} statKey - Stat key
     * @param {Object} statInfo - Stat information
     * @param {Object} statConfig - Stat configuration
     */
    updateStatDisplay(statsId, statKey, statInfo, statConfig) {
        const valueElement = getElementById(`statValue-${statsId}-${statKey}`);
        const changeElement = getElementById(`statChange-${statsId}-${statKey}`);

        if (!valueElement) return;

        // Update value based on format type
        let formattedValue = this.formatStatValue(statInfo.current, statConfig.format);
        valueElement.innerHTML = `<span class="stat-number">${formattedValue}</span>`;

        // Update change if enabled and element exists
        if (changeElement && this.defaultOptions.showChange) {
            const change = statInfo.change;
            const changeClass = this.getChangeClass(change, statConfig.format);
            const changeIcon = this.getChangeIcon(change, statConfig.format);
            const formattedChange = this.formatStatChange(change, statConfig.format);

            changeElement.className = `stat-change ${changeClass}`;
            changeElement.innerHTML = `
                <span class="change-icon">${changeIcon}</span>
                <span class="change-value">${formattedChange}</span>
            `;
        }
    }

    /**
     * Format stat value based on type
     * @param {*} value - Value to format
     * @param {string} format - Format type
     * @returns {string} Formatted value
     */
    formatStatValue(value, format) {
        switch (format) {
            case 'sats':
                return formatNumber(value) + ' sats';
            case 'number':
                return formatNumber(value);
            case 'percentage':
                return formatPercentage(value);
            case 'asset':
                return value ? `${value.symbol} (${formatPercentage(value.performance_percentage || 0)})` : '--';
            case 'time':
                return formatDate(value);
            default:
                return value?.toString() || '--';
        }
    }

    /**
     * Format stat change based on type
     * @param {*} change - Change value
     * @param {string} format - Format type
     * @returns {string} Formatted change
     */
    formatStatChange(change, format) {
        switch (format) {
            case 'sats':
                return formatNumber(Math.abs(change)) + ' sats';
            case 'number':
                return formatNumber(Math.abs(change));
            case 'percentage':
                return formatPercentage(Math.abs(change));
            case 'asset':
                return formatPercentage(Math.abs(change));
            case 'time':
                return 'Updated';
            default:
                return '';
        }
    }

    /**
     * Get CSS class for change styling
     * @param {number} change - Change value
     * @param {string} format - Format type
     * @returns {string} CSS class
     */
    getChangeClass(change, format) {
        if (format === 'time' || change === 0) return 'neutral';
        return change > 0 ? 'positive' : 'negative';
    }

    /**
     * Get icon for change direction
     * @param {number} change - Change value
     * @param {string} format - Format type
     * @returns {string} Icon
     */
    getChangeIcon(change, format) {
        if (format === 'time') return '🕒';
        if (change === 0) return '⚬';
        return change > 0 ? '↗' : '↘';
    }

    /**
     * Handle stat card click
     * @param {string} statKey - Stat key
     * @param {string} statsId - Stats ID
     */
    handleStatClick(statKey, statsId) {
        const statsData = this.statsInstances.get(statsId);
        if (!statsData) return;

        // Emit event for stat click
        this.emitEvent('statClick', { statKey, statsId, data: statsData.data[statKey] });

        // Default actions for specific stats
        switch (statKey) {
            case 'bestPerformer':
            case 'worstPerformer':
                const asset = statsData.data[statKey].current;
                if (asset) {
                    this.services.router?.navigate(`#asset/${asset.symbol}`);
                }
                break;
            case 'totalAssets':
                this.services.router?.navigate('#portfolio');
                break;
            default:
                // Show stat details or navigate to relevant page
                break;
        }
    }

    /**
     * Extract stat keys from DOM element
     * @param {HTMLElement} element - Element to extract from
     * @returns {Array} Array of stat keys
     */
    extractStatKeysFromElement(element) {
        // Try to get from data attribute
        const statKeysAttr = element.dataset.statKeys;
        if (statKeysAttr) {
            return statKeysAttr.split(',').map(key => key.trim());
        }

        // Try to find from existing stat cards
        const statCards = element.querySelectorAll('[data-stat-key]');
        if (statCards.length > 0) {
            return Array.from(statCards).map(card => card.dataset.statKey);
        }

        // Default stats
        return ['totalValue', 'totalAssets', 'totalChange24h', 'bestPerformer'];
    }

    /**
     * Show loading state
     * @param {string} statsId - Stats ID
     */
    showLoadingState(statsId) {
        const statsData = this.statsInstances.get(statsId);
        if (!statsData) return;

        const container = statsData.container;
        container.classList.add('loading');

        // Show loading placeholders
        const placeholders = container.querySelectorAll('.loading-placeholder, .change-placeholder');
        placeholders.forEach(placeholder => {
            placeholder.textContent = '...';
        });
    }

    /**
     * Hide loading state
     * @param {string} statsId - Stats ID
     */
    hideLoadingState(statsId) {
        const statsData = this.statsInstances.get(statsId);
        if (!statsData) return;

        const container = statsData.container;
        container.classList.remove('loading');
    }

    /**
     * Update last update time
     * @param {string} statsId - Stats ID
     */
    updateLastUpdateTime(statsId) {
        const lastUpdateElement = getElementById(`statsLastUpdate-${statsId}`);
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `Updated ${formatDate(new Date())}`;
        }
    }

    /**
     * Refresh specific stats
     * @param {string} statsId - Stats ID
     */
    async refreshStats(statsId) {
        await this.loadStatsData(statsId);
        this.services.notificationService?.showSuccess('Stats refreshed');
    }

    /**
     * Refresh all stats instances
     */
    refreshAllStats() {
        for (const statsId of this.statsInstances.keys()) {
            this.loadStatsData(statsId);
        }
    }

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.refreshAllStats();
        }, this.defaultOptions.refreshInterval);
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
     * Generate unique stats ID
     * @returns {string} Stats ID
     */
    generateStatsId() {
        return 'stats_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Remove stats instance
     * @param {string} statsId - Stats ID
     */
    removeStats(statsId) {
        const statsData = this.statsInstances.get(statsId);
        if (statsData) {
            this.statsInstances.delete(statsId);
        }
    }

    /**
     * Get stats data
     * @param {string} statsId - Stats ID
     * @returns {Object} Stats data
     */
    getStatsData(statsId) {
        return this.statsInstances.get(statsId);
    }

    /**
     * Get all available stat types
     * @returns {Object} Available stat types
     */
    getAvailableStatTypes() {
        return { ...this.statTypes };
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'QuickStats' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the quick stats component
     */
    destroy() {
        console.log('Destroying quick stats component');

        // Stop auto-refresh
        this.stopAutoRefresh();

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up quick stats event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear stats instances
        this.statsInstances.clear();

        // Reset state
        this.isInitialized = false;

        console.log('Quick stats component destroyed');
    }
}

// Create and export singleton instance
export const quickStats = new QuickStats();

// Convenience functions
export function createQuickStats(container, statKeys = [], options = {}) {
    return quickStats.create(container, statKeys, options);
}

export function refreshQuickStats(statsId) {
    quickStats.refreshStats(statsId);
}

export default quickStats;