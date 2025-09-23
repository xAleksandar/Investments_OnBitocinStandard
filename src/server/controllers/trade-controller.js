const BaseController = require('./base-controller');
const TradeService = require('../services/trade-service');

class TradeController extends BaseController {
    constructor() {
        super();
        this.tradeService = new TradeService();
    }

    /**
     * Execute a trade between assets
     * POST /api/trades/execute
     */
    async executeTrade(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            this.validateRequiredFields(req.body, ['fromAsset', 'toAsset', 'amount', 'unit']);

            const tradeData = this.sanitizeInput(req.body);
            const { fromAsset, toAsset, amount, unit } = tradeData;

            // Validate trade parameters
            this.validateTradeParameters(fromAsset, toAsset, amount, unit);

            const result = await this.tradeService.executeTrade(user.userId, {
                fromAsset,
                toAsset,
                amount: parseFloat(amount),
                unit
            });

            this.sendSuccess(res, {
                message: 'Trade executed successfully',
                trade: {
                    id: result.trade.id,
                    fromAsset,
                    toAsset,
                    fromAmount: result.fromAmount,
                    toAmount: result.toAmount,
                    btcPrice: result.btcPrice,
                    assetPrice: result.assetPrice,
                    executedAt: result.trade.createdAt
                }
            }, 201);
        } catch (error) {
            this.handleError(error, res, 'executeTrade');
        }
    }

    /**
     * Get user's trade history
     * GET /api/trades/history
     */
    async getTradeHistory(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const { limit = 50 } = req.query;

            // Validate limit
            const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));

            const trades = await this.tradeService.getTradeHistory(user.userId, validatedLimit);

            // Format trades for response
            const formattedTrades = trades.map(trade => ({
                id: trade.id,
                fromAsset: trade.fromAsset,
                toAsset: trade.toAsset,
                fromAmount: trade.fromAmount.toString(),
                toAmount: trade.toAmount.toString(),
                btcPriceUsd: trade.btcPriceUsd,
                assetPriceUsd: trade.assetPriceUsd,
                executedAt: trade.createdAt,
                type: trade.fromAsset === 'BTC' ? 'buy' : 'sell'
            }));

            this.sendSuccess(res, {
                trades: formattedTrades,
                totalCount: formattedTrades.length,
                limit: validatedLimit
            });
        } catch (error) {
            this.handleError(error, res, 'getTradeHistory');
        }
    }

    /**
     * Get asset lock information
     * GET /api/trades/lock-info/:symbol
     */
    async getAssetLockInfo(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const { symbol } = req.params;

            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Invalid asset symbol');
            }

            const sanitizedSymbol = this.sanitizeInput(symbol).toUpperCase();
            const lockInfo = await this.tradeService.getAssetLockInfo(user.userId, sanitizedSymbol);

            // Calculate time until unlock
            const now = new Date();
            let timeUntilUnlock = null;
            if (lockInfo.latestUnlock && new Date(lockInfo.latestUnlock) > now) {
                const unlockTime = new Date(lockInfo.latestUnlock);
                timeUntilUnlock = {
                    milliseconds: unlockTime.getTime() - now.getTime(),
                    hours: Math.ceil((unlockTime.getTime() - now.getTime()) / (1000 * 60 * 60)),
                    unlockDate: lockInfo.latestUnlock
                };
            }

            this.sendSuccess(res, {
                symbol: sanitizedSymbol,
                lockedAmount: lockInfo.lockedAmount,
                lockedPurchases: lockInfo.lockedPurchases,
                totalAmount: lockInfo.totalAmount,
                availableAmount: lockInfo.availableAmount,
                earliestUnlock: lockInfo.earliestUnlock,
                latestUnlock: lockInfo.latestUnlock,
                timeUntilUnlock,
                isLocked: lockInfo.lockedAmount > 0
            });
        } catch (error) {
            this.handleError(error, res, 'getAssetLockInfo');
        }
    }

    /**
     * Get trade statistics for user
     * GET /api/trades/stats
     */
    async getTradeStats(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            const trades = await this.tradeService.getTradeHistory(user.userId, 1000); // Get more for stats

            // Calculate statistics
            const totalTrades = trades.length;
            const buyTrades = trades.filter(t => t.fromAsset === 'BTC').length;
            const sellTrades = trades.filter(t => t.toAsset === 'BTC').length;

            // Calculate total BTC spent on purchases
            const totalBtcSpent = trades
                .filter(t => t.fromAsset === 'BTC')
                .reduce((sum, t) => sum + Number(t.fromAmount), 0);

            // Calculate total BTC received from sales
            const totalBtcReceived = trades
                .filter(t => t.toAsset === 'BTC')
                .reduce((sum, t) => sum + Number(t.toAmount), 0);

            // Get unique assets traded
            const assetsTraded = new Set();
            trades.forEach(trade => {
                if (trade.fromAsset !== 'BTC') assetsTraded.add(trade.fromAsset);
                if (trade.toAsset !== 'BTC') assetsTraded.add(trade.toAsset);
            });

            // Recent activity (last 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentTrades = trades.filter(t => new Date(t.createdAt) > sevenDaysAgo);

            const stats = {
                totalTrades,
                buyTrades,
                sellTrades,
                totalBtcSpent,
                totalBtcReceived,
                netBtcFlow: totalBtcReceived - totalBtcSpent,
                uniqueAssetsTraded: assetsTraded.size,
                assetList: Array.from(assetsTraded),
                recentActivity: {
                    tradesLast7Days: recentTrades.length,
                    btcSpentLast7Days: recentTrades
                        .filter(t => t.fromAsset === 'BTC')
                        .reduce((sum, t) => sum + Number(t.fromAmount), 0),
                    btcReceivedLast7Days: recentTrades
                        .filter(t => t.toAsset === 'BTC')
                        .reduce((sum, t) => sum + Number(t.toAmount), 0)
                },
                firstTradeDate: trades.length > 0 ? trades[trades.length - 1].createdAt : null,
                lastTradeDate: trades.length > 0 ? trades[0].createdAt : null
            };

            this.sendSuccess(res, stats);
        } catch (error) {
            this.handleError(error, res, 'getTradeStats');
        }
    }

    /**
     * Preview a trade (calculate amounts without executing)
     * POST /api/trades/preview
     */
    async previewTrade(req, res) {
        try {
            const user = this.getUserFromRequest(req);
            this.validateRequiredFields(req.body, ['fromAsset', 'toAsset', 'amount', 'unit']);

            const tradeData = this.sanitizeInput(req.body);
            const { fromAsset, toAsset, amount, unit } = tradeData;

            // Validate trade parameters
            this.validateTradeParameters(fromAsset, toAsset, amount, unit);

            // Convert amount to satoshis
            const amountInSats = this.tradeService.convertToSats(parseFloat(amount), unit);

            if (amountInSats <= 0) {
                throw new Error('Amount must be positive');
            }

            // Get current prices (using portfolio service to access asset prices)
            const PortfolioService = require('../services/portfolio-service');
            const portfolioService = new PortfolioService();
            const assetPrices = await portfolioService.getAssetPrices();

            if (!assetPrices[fromAsset] || !assetPrices[toAsset]) {
                throw new Error('Asset prices not available');
            }

            // Calculate trade preview
            let toAmount;
            if (fromAsset === 'BTC' && toAsset !== 'BTC') {
                // Buying asset with BTC
                const assetPriceUsd = assetPrices[toAsset];
                const btcValueUsd = (amountInSats / 100000000) * assetPrices['BTC'];
                const assetShares = btcValueUsd / assetPriceUsd;
                toAmount = Math.round(assetShares * 100000000);
            } else if (fromAsset !== 'BTC' && toAsset === 'BTC') {
                // Selling asset for BTC
                const assetPriceUsd = assetPrices[fromAsset];
                const assetShares = amountInSats / 100000000;
                const usdValue = assetShares * assetPriceUsd;
                toAmount = Math.round((usdValue / assetPrices['BTC']) * 100000000);
            } else {
                throw new Error('One asset must be BTC');
            }

            this.sendSuccess(res, {
                fromAsset,
                toAsset,
                fromAmount: amountInSats,
                toAmount,
                fromAmountFormatted: this.formatAmount(amountInSats, fromAsset),
                toAmountFormatted: this.formatAmount(toAmount, toAsset),
                btcPrice: assetPrices['BTC'],
                assetPrice: assetPrices[toAsset === 'BTC' ? fromAsset : toAsset],
                exchangeRate: toAsset === 'BTC' ? toAmount / amountInSats : amountInSats / toAmount,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.handleError(error, res, 'previewTrade');
        }
    }

    /**
     * Validate trade parameters
     * @param {string} fromAsset - Source asset symbol
     * @param {string} toAsset - Target asset symbol
     * @param {string|number} amount - Trade amount
     * @param {string} unit - Unit of measurement
     */
    validateTradeParameters(fromAsset, toAsset, amount, unit) {
        const validAssets = ['BTC', 'XAU', 'XAG', 'SPY', 'QQQ', 'VTI', 'EFA', 'VXUS', 'EWU',
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JNJ', 'V', 'WMT', 'BRK-B',
            'VNQ', 'VNO', 'PLD', 'EQIX', 'TLT', 'HYG', 'WTI', 'WEAT', 'CPER', 'DBA', 'UNG', 'URA'];

        if (!validAssets.includes(fromAsset.toUpperCase())) {
            throw new Error(`Invalid source asset: ${fromAsset}`);
        }

        if (!validAssets.includes(toAsset.toUpperCase())) {
            throw new Error(`Invalid target asset: ${toAsset}`);
        }

        if (fromAsset.toUpperCase() === toAsset.toUpperCase()) {
            throw new Error('Cannot trade asset to itself');
        }

        if (fromAsset !== 'BTC' && toAsset !== 'BTC') {
            throw new Error('One asset must be BTC');
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error('Amount must be a positive number');
        }

        const validUnits = ['btc', 'sat', 'msat', 'ksat', 'asset'];
        if (!validUnits.includes(unit)) {
            throw new Error(`Invalid unit: ${unit}. Must be one of: ${validUnits.join(', ')}`);
        }
    }

    /**
     * Format amount for display
     * @param {number} amount - Amount in satoshis
     * @param {string} asset - Asset symbol
     * @returns {string} Formatted amount
     */
    formatAmount(amount, asset) {
        if (asset === 'BTC') {
            return `${(amount / 100000000).toFixed(8)} BTC`;
        } else {
            return `${(amount / 100000000).toFixed(4)} ${asset}`;
        }
    }
}

module.exports = TradeController;