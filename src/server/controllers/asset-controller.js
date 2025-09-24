const BaseController = require('./base-controller');
const PriceService = require('../services/price-service');
const PriceCacheService = require('../services/price-cache-service');

class AssetController extends BaseController {
    constructor() {
        super();
        this.priceService = new PriceService();
        this.priceCacheService = new PriceCacheService();
    }

    /**
     * Get all available assets with their current prices
     * GET /api/assets
     */
    async getAllAssets(req, res) {
        try {
            const assets = await this.priceService.prisma.asset.findMany({
                select: {
                    symbol: true,
                    currentPriceUsd: true,
                    lastUpdated: true
                },
                orderBy: { symbol: 'asc' }
            });

            // Group assets by category for better organization
            const categorizedAssets = this.categorizeAssets(assets);

            this.sendSuccess(res, {
                assets: categorizedAssets,
                totalCount: assets.length,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            this.handleError(error, res, 'getAllAssets');
        }
    }

    /**
     * Get specific asset information
     * GET /api/assets/:symbol
     */
    async getAsset(req, res) {
        try {
            const { symbol } = req.params;
            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Invalid asset symbol');
            }

            const sanitizedSymbol = this.sanitizeInput(symbol).toUpperCase();
            const asset = await this.priceService.getAssetMetadata(sanitizedSymbol);

            if (!asset) {
                throw new Error('Asset not found');
            }

            // Get additional details for the asset
            const assetDetails = {
                ...asset,
                category: this.getAssetCategory(asset.symbol),
                fullName: this.getAssetFullName(asset.symbol),
                priceUpdatedAt: asset.lastUpdated,
                isSupported: asset.isActive !== false
            };

            this.sendSuccess(res, assetDetails);
        } catch (error) {
            this.handleError(error, res, 'getAsset');
        }
    }

    /**
     * Get current price for a specific asset
     * GET /api/assets/:symbol/price
     */
    async getAssetPrice(req, res) {
        try {
            const { symbol } = req.params;
            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Invalid asset symbol');
            }

            const sanitizedSymbol = this.sanitizeInput(symbol).toUpperCase();
            const price = await this.priceCacheService.getPrice(sanitizedSymbol);

            if (price === null) {
                throw new Error('Price not available for this asset');
            }

            this.sendSuccess(res, {
                symbol: sanitizedSymbol,
                priceUsd: price,
                timestamp: new Date().toISOString(),
                cached: true // Indicating this came from cache service
            });
        } catch (error) {
            this.handleError(error, res, 'getAssetPrice');
        }
    }

    /**
     * Get current prices for all assets
     * GET /api/assets/prices
     */
    async getAllPrices(req, res) {
        try {
            // Get all assets with their current prices
            const assets = await this.priceService.prisma.asset.findMany({
                select: {
                    symbol: true,
                    currentPriceUsd: true,
                    lastUpdated: true
                },
                orderBy: { symbol: 'asc' }
            });

            // Convert to key-value format for easier frontend consumption
            const prices = {};
            let lastUpdate = null;

            assets.forEach(asset => {
                prices[asset.symbol] = {
                    usd: asset.currentPriceUsd,
                    lastUpdated: asset.lastUpdated
                };

                // Track the most recent update
                if (!lastUpdate || (asset.lastUpdated && asset.lastUpdated > lastUpdate)) {
                    lastUpdate = asset.lastUpdated;
                }
            });

            this.sendSuccess(res, {
                prices,
                lastUpdated: lastUpdate || new Date().toISOString(),
                count: assets.length
            });
        } catch (error) {
            this.handleError(error, res, 'getAllPrices');
        }
    }

    /**
     * Get prices for multiple assets
     * POST /api/assets/prices
     */
    async getMultiplePrices(req, res) {
        try {
            this.validateRequiredFields(req.body, ['symbols']);
            const { symbols } = this.sanitizeInput(req.body);

            if (!Array.isArray(symbols) || symbols.length === 0) {
                throw new Error('Symbols must be a non-empty array');
            }

            if (symbols.length > 50) {
                throw new Error('Maximum 50 symbols allowed per request');
            }

            // Sanitize and validate symbols
            const sanitizedSymbols = symbols.map(symbol => {
                if (typeof symbol !== 'string') {
                    throw new Error('All symbols must be strings');
                }
                return this.sanitizeInput(symbol).toUpperCase();
            });

            const prices = await this.priceCacheService.getPrices(sanitizedSymbols);

            // Include metadata about which prices were found
            const response = {
                prices,
                requestedSymbols: sanitizedSymbols,
                foundSymbols: Object.keys(prices),
                missingSymbols: sanitizedSymbols.filter(symbol => !prices[symbol]),
                timestamp: new Date().toISOString()
            };

            this.sendSuccess(res, response);
        } catch (error) {
            this.handleError(error, res, 'getMultiplePrices');
        }
    }

    /**
     * Update all asset prices (admin only)
     * POST /api/assets/update-prices
     */
    async updateAllPrices(req, res) {
        try {
            this.requireAdmin(req);

            const result = await this.priceService.updateAllPrices();

            this.sendSuccess(res, {
                message: 'Price update completed',
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.handleError(error, res, 'updateAllPrices');
        }
    }

    /**
     * Get asset price history (limited functionality)
     * GET /api/assets/:symbol/history
     */
    async getAssetHistory(req, res) {
        try {
            const { symbol } = req.params;
            const { period = '24h' } = req.query;

            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Invalid asset symbol');
            }

            const sanitizedSymbol = this.sanitizeInput(symbol).toUpperCase();

            // For now, return current price as history is not implemented
            const asset = await this.priceService.getAssetMetadata(sanitizedSymbol);
            if (!asset) {
                throw new Error('Asset not found');
            }

            // Placeholder response - in a full implementation this would include historical data
            const historyResponse = {
                symbol: sanitizedSymbol,
                period,
                currentPrice: asset.currentPriceUsd,
                lastUpdated: asset.lastUpdated,
                history: [
                    {
                        timestamp: asset.lastUpdated,
                        price: asset.currentPriceUsd
                    }
                ],
                note: 'Historical price data is not yet implemented. Showing current price only.'
            };

            this.sendSuccess(res, historyResponse);
        } catch (error) {
            this.handleError(error, res, 'getAssetHistory');
        }
    }

    /**
     * Search assets by name or symbol
     * GET /api/assets/search?q=query
     */
    async searchAssets(req, res) {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string' || q.trim().length < 1) {
                throw new Error('Search query is required');
            }

            const query = this.sanitizeInput(q).toLowerCase();

            const assets = await this.priceService.prisma.asset.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { isActive: true },
                                { isActive: null }
                            ]
                        },
                        {
                            OR: [
                                {
                                    symbol: {
                                        contains: query.toUpperCase(),
                                        mode: 'insensitive'
                                    }
                                },
                                {
                                    name: {
                                        contains: query,
                                        mode: 'insensitive'
                                    }
                                },
                                {
                                    description: {
                                        contains: query,
                                        mode: 'insensitive'
                                    }
                                }
                            ]
                        }
                    ]
                },
                select: {
                    symbol: true,
                    name: true,
                    type: true,
                    description: true,
                    currentPriceUsd: true,
                    lastUpdated: true
                },
                take: 20, // Limit search results
                orderBy: [
                    { symbol: 'asc' },
                    { name: 'asc' }
                ]
            });

            // Enhance results with categories
            const enhancedResults = assets.map(asset => ({
                ...asset,
                category: this.getAssetCategory(asset.symbol),
                fullName: this.getAssetFullName(asset.symbol)
            }));

            this.sendSuccess(res, {
                query: q,
                results: enhancedResults,
                totalFound: enhancedResults.length,
                maxResults: 20
            });
        } catch (error) {
            this.handleError(error, res, 'searchAssets');
        }
    }

    /**
     * Categorize assets for organized display
     * @param {Array} assets - Array of asset objects
     * @returns {Object} Categorized assets
     */
    categorizeAssets(assets) {
        const categories = {
            'Cryptocurrency': [],
            'Stock Indices': [],
            'Technology': [],
            'Finance': [],
            'Healthcare': [],
            'Consumer': [],
            'International': [],
            'Real Estate': [],
            'Bonds': [],
            'Precious Metals': [],
            'Commodities': [],
            'Other': []
        };

        assets.forEach(asset => {
            const category = this.getAssetCategory(asset.symbol);
            if (categories[category]) {
                categories[category].push({
                    ...asset,
                    category,
                    fullName: this.getAssetFullName(asset.symbol)
                });
            } else {
                categories['Other'].push({
                    ...asset,
                    category: 'Other',
                    fullName: this.getAssetFullName(asset.symbol)
                });
            }
        });

        // Remove empty categories
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        });

        return categories;
    }

    /**
     * Get asset category
     * @param {string} symbol - Asset symbol
     * @returns {string} Category name
     */
    getAssetCategory(symbol) {
        const categories = {
            'BTC': 'Cryptocurrency',
            'XAU': 'Precious Metals',
            'XAG': 'Precious Metals',
            'SPY': 'Stock Indices',
            'QQQ': 'Stock Indices',
            'VTI': 'Stock Indices',
            'EFA': 'International',
            'VXUS': 'International',
            'EWU': 'International',
            'AAPL': 'Technology',
            'MSFT': 'Technology',
            'GOOGL': 'Technology',
            'AMZN': 'Technology',
            'TSLA': 'Technology',
            'META': 'Technology',
            'NVDA': 'Technology',
            'JNJ': 'Healthcare',
            'V': 'Finance',
            'WMT': 'Consumer',
            'BRK-B': 'Finance',
            'VNQ': 'Real Estate',
            'VNO': 'Real Estate',
            'PLD': 'Real Estate',
            'EQIX': 'Real Estate',
            'TLT': 'Bonds',
            'HYG': 'Bonds',
            'WTI': 'Commodities',
            'WEAT': 'Commodities',
            'CPER': 'Commodities',
            'DBA': 'Commodities',
            'UNG': 'Commodities',
            'URA': 'Commodities'
        };

        return categories[symbol] || 'Other';
    }

    /**
     * Get full asset name
     * @param {string} symbol - Asset symbol
     * @returns {string} Full asset name
     */
    getAssetFullName(symbol) {
        const names = {
            'BTC': 'Bitcoin',
            'XAU': 'Gold',
            'XAG': 'Silver',
            'SPY': 'S&P 500 ETF',
            'QQQ': 'NASDAQ 100 ETF',
            'VTI': 'Total Stock Market ETF',
            'EFA': 'MSCI EAFE ETF',
            'VXUS': 'Total International Stock ETF',
            'EWU': 'United Kingdom ETF',
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'META': 'Meta Platforms Inc.',
            'NVDA': 'NVIDIA Corporation',
            'JNJ': 'Johnson & Johnson',
            'V': 'Visa Inc.',
            'WMT': 'Walmart Inc.',
            'BRK-B': 'Berkshire Hathaway',
            'VNQ': 'Real Estate Investment Trust ETF',
            'VNO': 'Vornado Realty Trust',
            'PLD': 'Prologis Inc.',
            'EQIX': 'Equinix Inc.',
            'TLT': '20+ Year Treasury Bond ETF',
            'HYG': 'High Yield Corporate Bond ETF',
            'WTI': 'Crude Oil',
            'WEAT': 'Wheat ETF',
            'CPER': 'Copper ETF',
            'DBA': 'Agriculture ETF',
            'UNG': 'Natural Gas ETF',
            'URA': 'Uranium ETF'
        };

        return names[symbol] || symbol;
    }
}

module.exports = AssetController;