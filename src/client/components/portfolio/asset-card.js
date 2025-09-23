/**
 * Asset Card Component
 * Individual asset display component with interactive features and detailed information
 * Extracted from monolithic BitcoinGame class as part of Task 6.3
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from '../../utils/formatters.js';

export class AssetCard {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Asset card instances
        this.assetCards = new Map();

        // Card configuration
        this.defaultOptions = {
            showPerformance: true,
            showChange24h: true,
            showActions: true,
            showDetails: true,
            interactive: true,
            compact: false,
            animated: true
        };
    }

    /**
     * Initialize the asset card component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('AssetCard already initialized');
            return;
        }

        try {
            // Enhance existing asset cards in the DOM
            this.enhanceExistingCards();

            this.isInitialized = true;
            console.log('AssetCard initialized successfully');

        } catch (error) {
            console.error('Failed to initialize asset card:', error);
        }
    }

    /**
     * Enhance existing asset cards in the DOM
     */
    enhanceExistingCards() {
        const existingCards = document.querySelectorAll('[data-asset-card], .asset-card');
        existingCards.forEach(card => {
            if (!card.dataset.assetCardEnhanced) {
                this.enhanceCard(card);
            }
        });
    }

    /**
     * Create a new asset card
     * @param {Object} asset - Asset data
     * @param {Object} options - Card options
     * @returns {HTMLElement} Asset card element
     */
    create(asset, options = {}) {
        if (!asset) {
            console.error('Asset data is required to create asset card');
            return null;
        }

        const cardOptions = { ...this.defaultOptions, ...options };
        const cardElement = document.createElement('div');

        this.setupCard(cardElement, asset, cardOptions);

        // Store card instance
        const cardId = this.generateCardId();
        this.assetCards.set(cardId, {
            element: cardElement,
            asset: asset,
            options: cardOptions
        });

        cardElement.dataset.assetCardId = cardId;

        return cardElement;
    }

    /**
     * Enhance an existing asset card element
     * @param {HTMLElement} cardElement - Card element to enhance
     * @param {Object} options - Enhancement options
     */
    enhanceCard(cardElement, options = {}) {
        if (!cardElement || cardElement.dataset.assetCardEnhanced) return;

        // Extract asset data from element attributes
        const asset = this.extractAssetDataFromElement(cardElement);
        if (!asset) {
            console.error('Could not extract asset data from card element');
            return;
        }

        const cardOptions = { ...this.defaultOptions, ...options };
        this.setupCard(cardElement, asset, cardOptions);

        // Store card instance
        const cardId = this.generateCardId();
        this.assetCards.set(cardId, {
            element: cardElement,
            asset: asset,
            options: cardOptions
        });

        cardElement.dataset.assetCardId = cardId;
        cardElement.dataset.assetCardEnhanced = 'true';
    }

    /**
     * Set up asset card styling and content
     * @param {HTMLElement} cardElement - Card element
     * @param {Object} asset - Asset data
     * @param {Object} options - Card options
     */
    setupCard(cardElement, asset, options) {
        // Base classes
        let className = 'asset-card';

        if (options.compact) className += ' compact';
        if (options.animated) className += ' animated';
        if (options.interactive) className += ' interactive';

        cardElement.className = className;

        // Set data attributes
        cardElement.dataset.assetId = asset.id;
        cardElement.dataset.symbol = asset.symbol;

        // Generate card content
        this.updateCardContent(cardElement, asset, options);

        // Set up event listeners if interactive
        if (options.interactive) {
            this.setupCardEventListeners(cardElement, asset);
        }
    }

    /**
     * Update card content
     * @param {HTMLElement} cardElement - Card element
     * @param {Object} asset - Asset data
     * @param {Object} options - Card options
     */
    updateCardContent(cardElement, asset, options) {
        const performanceClass = this.getPerformanceClass(asset.performance_percentage);
        const changeClass = this.getPerformanceClass(asset.change_24h);

        let content = '';

        if (options.compact) {
            content = this.renderCompactCard(asset, options, performanceClass, changeClass);
        } else {
            content = this.renderFullCard(asset, options, performanceClass, changeClass);
        }

        cardElement.innerHTML = content;
    }

    /**
     * Render full asset card
     * @param {Object} asset - Asset data
     * @param {Object} options - Card options
     * @param {string} performanceClass - Performance CSS class
     * @param {string} changeClass - Change CSS class
     * @returns {string} HTML content
     */
    renderFullCard(asset, options, performanceClass, changeClass) {
        return `
            <div class="asset-card-header">
                <div class="asset-info">
                    <div class="asset-symbol">
                        <span class="symbol-text">${asset.symbol}</span>
                        ${asset.name ? `<span class="asset-name">${asset.name}</span>` : ''}
                    </div>
                    <div class="asset-logo">
                        ${this.renderAssetLogo(asset)}
                    </div>
                </div>
                <div class="asset-value">
                    <div class="value-sats">
                        <span class="value-amount">${formatNumber(asset.value_sats || 0)}</span>
                        <span class="value-unit">sats</span>
                    </div>
                    ${asset.value_usd ? `
                        <div class="value-usd">
                            $${formatCurrency(asset.value_usd)}
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="asset-card-body">
                <div class="asset-quantity-section">
                    <label class="asset-label">Quantity:</label>
                    <span class="asset-quantity">${formatNumber(asset.quantity || 0)}</span>
                </div>

                <div class="asset-price-section">
                    <label class="asset-label">Current Price:</label>
                    <div class="asset-price">
                        <span class="price-sats">${formatNumber(asset.current_price_sats || 0)} sats</span>
                        ${asset.current_price_usd ? `
                            <span class="price-usd">$${formatCurrency(asset.current_price_usd)}</span>
                        ` : ''}
                    </div>
                </div>

                ${options.showPerformance && asset.performance_percentage !== undefined ? `
                    <div class="asset-performance-section">
                        <label class="asset-label">Performance:</label>
                        <div class="asset-performance ${performanceClass}">
                            <span class="performance-percentage">${formatPercentage(asset.performance_percentage)}</span>
                            <span class="performance-icon">${this.getPerformanceIcon(asset.performance_percentage)}</span>
                        </div>
                    </div>
                ` : ''}

                ${options.showChange24h && asset.change_24h !== undefined ? `
                    <div class="asset-change-section">
                        <label class="asset-label">24h Change:</label>
                        <div class="asset-change ${changeClass}">
                            <span class="change-percentage">${formatPercentage(asset.change_24h)}</span>
                            <span class="change-icon">${this.getPerformanceIcon(asset.change_24h)}</span>
                        </div>
                    </div>
                ` : ''}

                ${options.showDetails ? `
                    <div class="asset-details-section">
                        <div class="asset-detail">
                            <label>Cost Basis:</label>
                            <span>${formatNumber(asset.cost_basis_sats || 0)} sats</span>
                        </div>
                        ${asset.created_at ? `
                            <div class="asset-detail">
                                <label>Acquired:</label>
                                <span>${formatDate(asset.created_at)}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

            ${options.showActions ? `
                <div class="asset-card-actions">
                    <button class="btn btn-primary btn-sm asset-action-btn"
                            data-action="trade" data-asset-id="${asset.id}">
                        <span class="btn-icon">💱</span>
                        Trade
                    </button>
                    <button class="btn btn-secondary btn-sm asset-action-btn"
                            data-action="details" data-asset-id="${asset.id}">
                        <span class="btn-icon">📊</span>
                        Details
                    </button>
                    <button class="btn btn-outline btn-sm asset-action-btn"
                            data-action="convert" data-asset-id="${asset.id}">
                        <span class="btn-icon">🔄</span>
                        Convert
                    </button>
                </div>
            ` : ''}
        `;
    }

    /**
     * Render compact asset card
     * @param {Object} asset - Asset data
     * @param {Object} options - Card options
     * @param {string} performanceClass - Performance CSS class
     * @param {string} changeClass - Change CSS class
     * @returns {string} HTML content
     */
    renderCompactCard(asset, options, performanceClass, changeClass) {
        return `
            <div class="asset-card-compact">
                <div class="asset-basic-info">
                    <div class="asset-symbol-compact">
                        ${this.renderAssetLogo(asset, true)}
                        <span class="symbol-text">${asset.symbol}</span>
                    </div>
                    <div class="asset-value-compact">
                        <span class="value-sats">${formatNumber(asset.value_sats || 0)} sats</span>
                    </div>
                </div>

                <div class="asset-metrics-compact">
                    <div class="asset-quantity-compact">
                        <span class="quantity-label">Qty:</span>
                        <span class="quantity-value">${formatNumber(asset.quantity || 0)}</span>
                    </div>

                    ${options.showPerformance && asset.performance_percentage !== undefined ? `
                        <div class="asset-performance-compact ${performanceClass}">
                            ${formatPercentage(asset.performance_percentage)}
                            ${this.getPerformanceIcon(asset.performance_percentage)}
                        </div>
                    ` : ''}
                </div>

                ${options.showActions ? `
                    <div class="asset-actions-compact">
                        <button class="btn btn-icon btn-sm asset-action-btn"
                                data-action="trade" data-asset-id="${asset.id}"
                                title="Trade ${asset.symbol}">
                            💱
                        </button>
                        <button class="btn btn-icon btn-sm asset-action-btn"
                                data-action="details" data-asset-id="${asset.id}"
                                title="View Details">
                            📊
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render asset logo
     * @param {Object} asset - Asset data
     * @param {boolean} small - Whether to render small version
     * @returns {string} HTML for asset logo
     */
    renderAssetLogo(asset, small = false) {
        const sizeClass = small ? 'small' : 'medium';

        if (asset.logo_url) {
            return `
                <img src="${asset.logo_url}"
                     alt="${asset.symbol} logo"
                     class="asset-logo-img ${sizeClass}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                <div class="asset-logo-fallback ${sizeClass}" style="display: none;">
                    ${asset.symbol.charAt(0)}
                </div>
            `;
        } else {
            return `
                <div class="asset-logo-fallback ${sizeClass}">
                    ${asset.symbol.charAt(0)}
                </div>
            `;
        }
    }

    /**
     * Set up card event listeners
     * @param {HTMLElement} cardElement - Card element
     * @param {Object} asset - Asset data
     */
    setupCardEventListeners(cardElement, asset) {
        // Card click handler
        const cardClickHandler = (e) => {
            // Don't trigger if clicking on buttons
            if (e.target.closest('button')) return;

            this.handleCardClick(asset, cardElement);
        };

        const cleanup1 = addEventListener(cardElement, 'click', cardClickHandler);
        this.eventListeners.push(cleanup1);

        // Action button handlers
        const actionButtons = cardElement.querySelectorAll('.asset-action-btn');
        actionButtons.forEach(button => {
            const cleanup = addEventListener(button, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = button.dataset.action;
                const assetId = button.dataset.assetId;

                this.handleActionClick(action, assetId, asset);
            });
            this.eventListeners.push(cleanup);
        });

        // Hover effects for interactive cards
        const hoverEnterHandler = () => {
            cardElement.classList.add('hovered');
            this.emitEvent('assetCardHover', { asset, action: 'enter' });
        };

        const hoverLeaveHandler = () => {
            cardElement.classList.remove('hovered');
            this.emitEvent('assetCardHover', { asset, action: 'leave' });
        };

        const cleanup2 = addEventListener(cardElement, 'mouseenter', hoverEnterHandler);
        const cleanup3 = addEventListener(cardElement, 'mouseleave', hoverLeaveHandler);
        this.eventListeners.push(cleanup2, cleanup3);
    }

    /**
     * Handle card click
     * @param {Object} asset - Asset data
     * @param {HTMLElement} cardElement - Card element
     */
    handleCardClick(asset, cardElement) {
        // Add click animation
        cardElement.classList.add('clicked');
        setTimeout(() => {
            cardElement.classList.remove('clicked');
        }, 200);

        // Emit card click event
        this.emitEvent('assetCardClick', { asset });

        // Default action: show asset details
        this.showAssetDetails(asset);
    }

    /**
     * Handle action button click
     * @param {string} action - Action type
     * @param {string} assetId - Asset ID
     * @param {Object} asset - Asset data
     */
    handleActionClick(action, assetId, asset) {
        this.emitEvent('assetCardAction', { action, assetId, asset });

        switch (action) {
            case 'trade':
                this.openTradingModal(asset);
                break;
            case 'details':
                this.showAssetDetails(asset);
                break;
            case 'convert':
                this.openConvertModal(asset);
                break;
            default:
                console.warn('Unknown asset action:', action);
        }
    }

    /**
     * Open trading modal for asset
     * @param {Object} asset - Asset data
     */
    openTradingModal(asset) {
        this.emitEvent('openTradingModal', { asset });
    }

    /**
     * Show asset details
     * @param {Object} asset - Asset data
     */
    showAssetDetails(asset) {
        // Navigate to asset details page
        this.services.router?.navigate(`#asset/${asset.symbol}`);
    }

    /**
     * Open convert modal for asset
     * @param {Object} asset - Asset data
     */
    openConvertModal(asset) {
        this.emitEvent('openConvertModal', { asset });
    }

    /**
     * Update asset card with new data
     * @param {string} cardId - Card ID
     * @param {Object} asset - Updated asset data
     */
    updateCard(cardId, asset) {
        const cardData = this.assetCards.get(cardId);
        if (!cardData) {
            console.error('Card not found:', cardId);
            return;
        }

        cardData.asset = { ...cardData.asset, ...asset };
        this.updateCardContent(cardData.element, cardData.asset, cardData.options);
    }

    /**
     * Update asset card by asset ID
     * @param {string} assetId - Asset ID
     * @param {Object} asset - Updated asset data
     */
    updateCardByAssetId(assetId, asset) {
        for (const [cardId, cardData] of this.assetCards) {
            if (cardData.asset.id.toString() === assetId.toString()) {
                this.updateCard(cardId, asset);
                break;
            }
        }
    }

    /**
     * Extract asset data from DOM element
     * @param {HTMLElement} element - Card element
     * @returns {Object|null} Asset data
     */
    extractAssetDataFromElement(element) {
        const assetId = element.dataset.assetId;
        const symbol = element.dataset.symbol;

        if (!assetId || !symbol) {
            return null;
        }

        // Extract data from element content
        const asset = {
            id: assetId,
            symbol: symbol
        };

        // Try to extract other data from the element
        const valueElement = element.querySelector('[data-value-sats]');
        if (valueElement) {
            asset.value_sats = parseInt(valueElement.dataset.valueSats) || 0;
        }

        const quantityElement = element.querySelector('[data-quantity]');
        if (quantityElement) {
            asset.quantity = parseFloat(quantityElement.dataset.quantity) || 0;
        }

        return asset;
    }

    /**
     * Get CSS class for performance styling
     * @param {number} percentage - Performance percentage
     * @returns {string} CSS class name
     */
    getPerformanceClass(percentage) {
        if (percentage === undefined || percentage === null || percentage === 0) {
            return 'neutral';
        }
        return percentage > 0 ? 'positive' : 'negative';
    }

    /**
     * Get performance icon
     * @param {number} percentage - Performance percentage
     * @returns {string} Icon character
     */
    getPerformanceIcon(percentage) {
        if (percentage === undefined || percentage === null || percentage === 0) {
            return '⚬';
        }
        return percentage > 0 ? '↗' : '↘';
    }

    /**
     * Generate unique card ID
     * @returns {string} Card ID
     */
    generateCardId() {
        return 'asset_card_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Remove asset card
     * @param {string} cardId - Card ID
     */
    removeCard(cardId) {
        const cardData = this.assetCards.get(cardId);
        if (cardData) {
            cardData.element.remove();
            this.assetCards.delete(cardId);
        }
    }

    /**
     * Get card by asset ID
     * @param {string} assetId - Asset ID
     * @returns {Object|null} Card data
     */
    getCardByAssetId(assetId) {
        for (const [cardId, cardData] of this.assetCards) {
            if (cardData.asset.id.toString() === assetId.toString()) {
                return { cardId, ...cardData };
            }
        }
        return null;
    }

    /**
     * Get all cards
     * @returns {Map} Map of all cards
     */
    getAllCards() {
        return new Map(this.assetCards);
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'AssetCard' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the asset card component
     */
    destroy() {
        console.log('Destroying asset card component');

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up asset card event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear card instances
        this.assetCards.clear();

        // Reset state
        this.isInitialized = false;

        console.log('Asset card component destroyed');
    }
}

// Create and export singleton instance
export const assetCard = new AssetCard();

// Convenience functions
export function createAssetCard(asset, options = {}) {
    return assetCard.create(asset, options);
}

export function updateAssetCard(assetId, asset) {
    assetCard.updateCardByAssetId(assetId, asset);
}

export default assetCard;