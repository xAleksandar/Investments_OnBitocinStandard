const BaseService = require('./base-service');

class TradeService extends BaseService {
    constructor() {
        super();
    }

    async executeTrade(userId, { fromAsset, toAsset, amount, unit }) {
        try {
            await this.validateUser(userId);

            const sanitizedData = this.sanitizeInput({
                fromAsset, toAsset, amount, unit
            });

            // Convert amount to satoshis based on unit
            const amountInSats = this.convertToSats(sanitizedData.amount, sanitizedData.unit);

            if (amountInSats <= 0) {
                throw new Error('Amount must be positive');
            }

            const result = await this.prisma.$transaction(async (tx) => {
                // Get current prices
                const assetPrices = await this.getAssetPrices(tx, [sanitizedData.fromAsset, sanitizedData.toAsset]);

                // Validate trade requirements
                await this.validateTradeRequirements(tx, userId, sanitizedData.fromAsset, amountInSats);

                // Calculate trade amounts
                const toAmount = this.calculateTradeAmount(
                    sanitizedData.fromAsset,
                    sanitizedData.toAsset,
                    amountInSats,
                    assetPrices
                );

                // Execute the trade
                await this.executeTradeOperations(tx, userId, {
                    fromAsset: sanitizedData.fromAsset,
                    toAsset: sanitizedData.toAsset,
                    fromAmount: amountInSats,
                    toAmount,
                    assetPrices
                });

                // Record the trade
                const trade = await this.recordTrade(tx, userId, {
                    fromAsset: sanitizedData.fromAsset,
                    toAsset: sanitizedData.toAsset,
                    fromAmount: amountInSats,
                    toAmount,
                    assetPrices
                });

                return {
                    trade,
                    fromAmount: amountInSats,
                    toAmount,
                    btcPrice: assetPrices['BTC'],
                    assetPrice: assetPrices[sanitizedData.toAsset === 'BTC' ? sanitizedData.fromAsset : sanitizedData.toAsset]
                };
            });

            return result;
        } catch (error) {
            await this.handleServiceError(error, 'executeTrade');
        }
    }

    async getTradeHistory(userId, limit = 50) {
        try {
            await this.validateUser(userId);

            const trades = await this.prisma.trade.findMany({
                where: { userId: parseInt(userId) },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return trades;
        } catch (error) {
            await this.handleServiceError(error, 'getTradeHistory');
        }
    }

    convertToSats(amount, unit) {
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount)) {
            throw new Error('Invalid amount');
        }

        switch (unit) {
            case 'btc':
                return Math.round(numAmount * 100000000);
            case 'msat':
                return Math.round(numAmount / 1000);
            case 'ksat':
                return Math.round(numAmount * 1000);
            case 'sat':
                return Math.round(numAmount);
            case 'asset':
                return Math.round(numAmount * 100000000);
            default:
                throw new Error('Invalid unit');
        }
    }

    async getAssetPrices(tx, symbols) {
        // Try database cache first
        const assets = await tx.asset.findMany({
            where: { symbol: { in: symbols } }
        });

        const assetPrices = {};
        assets.forEach(asset => {
            const price = parseFloat(asset.currentPriceUsd);
            if (!isNaN(price)) {
                assetPrices[asset.symbol] = price;
            }
        });

        // If any price missing, fetch on-demand and cache
        const missing = symbols.filter(sym => assetPrices[sym] === undefined || assetPrices[sym] === null);
        if (missing.length > 0) {
            try {
                const PriceCacheService = require('./price-cache-service');
                const priceCache = new PriceCacheService();
                const fetched = await priceCache.getPrices(missing);

                // Merge fetched prices
                Object.entries(fetched).forEach(([sym, price]) => {
                    if (typeof price === 'number' && !isNaN(price)) {
                        assetPrices[sym] = price;
                    }
                });
            } catch (e) {
                // Non-fatal; will validate below
                console.warn('Price fetch fallback failed:', e.message);
            }
        }

        // Validate presence of BTC and all required symbols
        const btcPrice = assetPrices['BTC'];
        const requiredPrices = symbols.every(symbol => typeof assetPrices[symbol] === 'number' && !isNaN(assetPrices[symbol]));

        if (!btcPrice || !requiredPrices) {
            throw new Error('Asset prices not available');
        }

        return assetPrices;
    }

    async validateTradeRequirements(tx, userId, fromAsset, amountInSats) {
        // Check user has enough of fromAsset
        const holding = await tx.holding.findFirst({
            where: {
                userId: parseInt(userId),
                assetSymbol: fromAsset
            }
        });

        if (!holding) {
            throw new Error(`No ${fromAsset} holdings found`);
        }

        if (BigInt(holding.amount) < BigInt(amountInSats)) {
            throw new Error(`Insufficient ${fromAsset} balance`);
        }

        // Check if asset is locked (for non-BTC assets)
        if (fromAsset !== 'BTC') {
            const lockedPurchases = await tx.$queryRaw`
                SELECT SUM(amount) as locked_amount
                FROM purchases
                WHERE user_id = ${parseInt(userId)}
                  AND asset_symbol = ${fromAsset}
                  AND locked_until > NOW()
            `;

            const lockedAmount = BigInt(lockedPurchases[0]?.locked_amount || 0);

            if (lockedAmount > 0 && BigInt(amountInSats) > (BigInt(holding.amount) - lockedAmount)) {
                const availableAmount = Number(BigInt(holding.amount) - lockedAmount) / 100000000;
                throw new Error(`Asset is locked. Available: ${availableAmount}`);
            }
        }

        return holding;
    }

    calculateTradeAmount(fromAsset, toAsset, amountInSats, assetPrices) {
        if (fromAsset === toAsset) {
            throw new Error('Cannot trade asset to itself');
        }

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

        if (toAmount <= 0) {
            throw new Error('Calculated trade amount is invalid');
        }

        return toAmount;
    }

    async executeTradeOperations(tx, userId, { fromAsset, toAsset, fromAmount, toAmount, assetPrices }) {
        // Update fromAsset holding
        await tx.holding.updateMany({
            where: {
                userId: parseInt(userId),
                assetSymbol: fromAsset
            },
            data: {
                amount: { decrement: BigInt(fromAmount) }
            }
        });

        // Handle toAsset holding
        if (toAsset === 'BTC') {
            // Adding to BTC (no lock)
            await this.updateOrCreateBtcHolding(tx, userId, toAmount);
        } else {
            // Buying non-BTC asset (with 24-hour lock)
            await this.createAssetPurchase(tx, userId, {
                assetSymbol: toAsset,
                amount: toAmount,
                btcSpent: fromAmount,
                purchasePriceUsd: assetPrices[toAsset],
                btcPriceUsd: assetPrices['BTC']
            });

            await this.updateOrCreateAssetHolding(tx, userId, toAsset, toAmount);
        }
    }

    async updateOrCreateBtcHolding(tx, userId, amount) {
        const btcHolding = await tx.holding.findFirst({
            where: {
                userId: parseInt(userId),
                assetSymbol: 'BTC'
            }
        });

        if (btcHolding) {
            await tx.holding.update({
                where: { id: btcHolding.id },
                data: { amount: { increment: BigInt(amount) } }
            });
        } else {
            await tx.holding.create({
                data: {
                    userId: parseInt(userId),
                    assetSymbol: 'BTC',
                    amount: BigInt(amount)
                }
            });
        }
    }

    async createAssetPurchase(tx, userId, { assetSymbol, amount, btcSpent, purchasePriceUsd, btcPriceUsd }) {
        const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await tx.purchase.create({
            data: {
                userId: parseInt(userId),
                assetSymbol,
                amount: BigInt(amount),
                btcSpent: BigInt(btcSpent),
                purchasePriceUsd,
                btcPriceUsd,
                lockedUntil: lockUntil
            }
        });
    }

    async updateOrCreateAssetHolding(tx, userId, assetSymbol, amount) {
        const holding = await tx.holding.findFirst({
            where: {
                userId: parseInt(userId),
                assetSymbol
            }
        });

        if (holding) {
            await tx.holding.update({
                where: { id: holding.id },
                data: { amount: { increment: BigInt(amount) } }
            });
        } else {
            await tx.holding.create({
                data: {
                    userId: parseInt(userId),
                    assetSymbol,
                    amount: BigInt(amount)
                }
            });
        }
    }

    async recordTrade(tx, userId, { fromAsset, toAsset, fromAmount, toAmount, assetPrices }) {
        return await tx.trade.create({
            data: {
                userId: parseInt(userId),
                fromAsset,
                toAsset,
                fromAmount: BigInt(fromAmount),
                toAmount: BigInt(toAmount),
                btcPriceUsd: assetPrices['BTC'],
                assetPriceUsd: assetPrices[toAsset === 'BTC' ? fromAsset : toAsset]
            }
        });
    }

    async getAssetLockInfo(userId, assetSymbol) {
        try {
            await this.validateUser(userId);

            const lockInfo = await this.prisma.$queryRaw`
                SELECT
                    SUM(amount) as locked_amount,
                    COUNT(*) as locked_purchases,
                    MIN(locked_until) as earliest_unlock,
                    MAX(locked_until) as latest_unlock
                FROM purchases
                WHERE user_id = ${parseInt(userId)}
                  AND asset_symbol = ${assetSymbol}
                  AND locked_until > NOW()
            `;

            const totalHolding = await this.prisma.holding.findFirst({
                where: {
                    userId: parseInt(userId),
                    assetSymbol
                },
                select: { amount: true }
            });

            return {
                lockedAmount: parseInt(lockInfo[0]?.locked_amount || 0),
                lockedPurchases: parseInt(lockInfo[0]?.locked_purchases || 0),
                earliestUnlock: lockInfo[0]?.earliest_unlock,
                latestUnlock: lockInfo[0]?.latest_unlock,
                totalAmount: totalHolding ? Number(totalHolding.amount) : 0,
                availableAmount: totalHolding
                    ? Number(totalHolding.amount) - parseInt(lockInfo[0]?.locked_amount || 0)
                    : 0
            };
        } catch (error) {
            await this.handleServiceError(error, 'getAssetLockInfo');
        }
    }
}

module.exports = TradeService;
