const BaseController = require('./base-controller');
const PortfolioService = require('../services/portfolio-service');

class PortfolioController extends BaseController {
    constructor() {
        super();
        this.portfolioService = new PortfolioService();
    }

    /**
     * Get user's complete portfolio
     * GET /api/portfolio
     */
    async getPortfolio(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const portfolio = await this.portfolioService.getUserPortfolio(user.userId);

            this.sendSuccess(res, portfolio);
        } catch (error) {
            this.handleError(error, res, 'getPortfolio');
        }
    }

    /**
     * Get details for a specific asset in user's portfolio
     * GET /api/portfolio/asset/:symbol
     */
    async getAssetDetails(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const { symbol } = req.params;

            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Invalid asset symbol');
            }

            const sanitizedSymbol = this.sanitizeInput(symbol).toUpperCase();
            const assetDetails = await this.portfolioService.getAssetDetails(user.userId, sanitizedSymbol);

            this.sendSuccess(res, {
                symbol: sanitizedSymbol,
                ...assetDetails
            });
        } catch (error) {
            this.handleError(error, res, 'getAssetDetails');
        }
    }

    /**
     * Get portfolio value calculation
     * GET /api/portfolio/value
     */
    async getPortfolioValue(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const portfolioValue = await this.portfolioService.calculatePortfolioValue(user.userId);

            this.sendSuccess(res, portfolioValue);
        } catch (error) {
            this.handleError(error, res, 'getPortfolioValue');
        }
    }

    /**
     * Get portfolio summary stats
     * GET /api/portfolio/summary
     */
    async getPortfolioSummary(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const portfolio = await this.portfolioService.getUserPortfolio(user.userId);

            // Calculate summary statistics
            const totalAssets = portfolio.holdings.length;
            const totalValue = portfolio.total_value_sats;
            const totalCost = portfolio.total_cost_sats;
            const totalGainLoss = totalValue - totalCost;
            const totalGainLossPercent = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

            // Find largest holding by value
            const largestHolding = portfolio.holdings.reduce((max, holding) =>
                holding.current_value_sats > (max?.current_value_sats || 0) ? holding : max, null);

            // Count locked assets
            const lockedAssets = portfolio.holdings.filter(h =>
                h.lock_status === 'locked' || h.lock_status === 'partial').length;

            const summary = {
                totalAssets,
                totalValueSats: totalValue,
                totalCostSats: totalCost,
                totalGainLossSats: totalGainLoss,
                totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
                btcPrice: portfolio.btc_price,
                largestHolding: largestHolding ? {
                    symbol: largestHolding.asset_symbol,
                    valueSats: largestHolding.current_value_sats,
                    amount: largestHolding.amount
                } : null,
                lockedAssets,
                lastUpdated: new Date().toISOString()
            };

            this.sendSuccess(res, summary);
        } catch (error) {
            this.handleError(error, res, 'getPortfolioSummary');
        }
    }

    /**
     * Get portfolio performance data
     * GET /api/portfolio/performance
     */
    async getPortfolioPerformance(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const { period = '24h' } = req.query;

            // Validate period
            const validPeriods = ['1h', '24h', '7d', '30d', '90d', '1y'];
            if (!validPeriods.includes(period)) {
                throw new Error('Invalid period. Must be one of: ' + validPeriods.join(', '));
            }

            const portfolio = await this.portfolioService.getUserPortfolio(user.userId);

            // Group holdings by category for performance breakdown
            const categories = {};
            let totalValue = 0;
            let totalCost = 0;

            portfolio.holdings.forEach(holding => {
                const category = this.getAssetCategory(holding.asset_symbol);
                if (!categories[category]) {
                    categories[category] = {
                        totalValue: 0,
                        totalCost: 0,
                        assets: []
                    };
                }

                categories[category].totalValue += holding.current_value_sats;
                categories[category].totalCost += holding.cost_basis_sats;
                categories[category].assets.push({
                    symbol: holding.asset_symbol,
                    value: holding.current_value_sats,
                    cost: holding.cost_basis_sats
                });

                totalValue += holding.current_value_sats;
                totalCost += holding.cost_basis_sats;
            });

            // Calculate category percentages and performance
            const categoryPerformance = Object.entries(categories).map(([category, data]) => ({
                category,
                totalValueSats: data.totalValue,
                totalCostSats: data.totalCost,
                gainLossSats: data.totalValue - data.totalCost,
                gainLossPercent: data.totalCost > 0 ? ((data.totalValue - data.totalCost) / data.totalCost) * 100 : 0,
                portfolioPercentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0,
                assetCount: data.assets.length
            }));

            const performance = {
                period,
                totalPerformance: {
                    totalValueSats: totalValue,
                    totalCostSats: totalCost,
                    gainLossSats: totalValue - totalCost,
                    gainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
                },
                categoryBreakdown: categoryPerformance,
                btcPrice: portfolio.btc_price,
                lastUpdated: new Date().toISOString()
            };

            this.sendSuccess(res, performance);
        } catch (error) {
            this.handleError(error, res, 'getPortfolioPerformance');
        }
    }

    /**
     * Get asset category for grouping
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
     * Get locked asset information
     * GET /api/portfolio/locked-assets
     */
    async getLockedAssets(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const portfolio = await this.portfolioService.getUserPortfolio(user.userId);

            const lockedAssets = portfolio.holdings
                .filter(holding => holding.lock_status === 'locked' || holding.lock_status === 'partial')
                .map(holding => ({
                    symbol: holding.asset_symbol,
                    amount: holding.amount,
                    lockedAmount: holding.locked_amount,
                    lockStatus: holding.lock_status,
                    currentValueSats: holding.current_value_sats,
                    lockedUntil: holding.locked_until,
                    lastPurchaseDate: holding.last_purchase_date
                }));

            this.sendSuccess(res, {
                lockedAssets,
                totalLockedAssets: lockedAssets.length,
                totalLockedValue: lockedAssets.reduce((sum, asset) => sum + asset.currentValueSats, 0)
            });
        } catch (error) {
            this.handleError(error, res, 'getLockedAssets');
        }
    }
}

module.exports = PortfolioController;