const BaseService = require('./base-service');

class PortfolioService extends BaseService {
    constructor() {
        super();
    }

    async getUserPortfolio(userId) {
        try {
            await this.validateUser(userId);

            const holdings = await this.prisma.holding.findMany({
                where: { userId: parseInt(userId) }
            });

            // Get current asset prices
            const assetPrices = await this.getAssetPrices();

            // Get purchase details for each asset
            const purchases = await this.getPurchaseData(userId);
            const sales = await this.getSalesData(userId);
            const legacyCost = await this.getLegacyCostData(userId);

            // Build lookup maps
            const purchaseMap = this.buildPurchaseMap(purchases, legacyCost);
            const salesMap = this.buildSalesMap(sales);

            // Calculate portfolio metrics
            const { portfolioHoldings, totalValueSats, totalCostSats } =
                this.calculatePortfolioMetrics(holdings, assetPrices, purchaseMap, salesMap);

            return {
                holdings: portfolioHoldings,
                total_value_sats: totalValueSats,
                total_cost_sats: totalCostSats,
                btc_price: assetPrices['BTC'] || 0
            };
        } catch (error) {
            await this.handleServiceError(error, 'getUserPortfolio');
        }
    }

    async getAssetDetails(userId, symbol) {
        try {
            await this.validateUser(userId);

            const sanitizedSymbol = this.sanitizeInput(symbol);

            // Get individual purchases
            const purchases = await this.prisma.$queryRaw`
                SELECT
                    id,
                    amount,
                    btc_spent,
                    purchase_price_usd,
                    btc_price_usd,
                    locked_until,
                    created_at,
                    CASE WHEN locked_until > NOW() THEN true ELSE false END as is_locked
                FROM purchases
                WHERE user_id = ${parseInt(userId)} AND asset_symbol = ${sanitizedSymbol}
                ORDER BY created_at DESC
            `;

            // Get any sales (trades back to BTC)
            const sales = await this.prisma.trade.findMany({
                where: {
                    userId: parseInt(userId),
                    fromAsset: sanitizedSymbol,
                    toAsset: 'BTC'
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                purchases,
                sales
            };
        } catch (error) {
            await this.handleServiceError(error, 'getAssetDetails');
        }
    }

    async getAssetPrices() {
        try {
            const assets = await this.prisma.asset.findMany();
            const assetPrices = {};

            assets.forEach(asset => {
                assetPrices[asset.symbol] = asset.currentPriceUsd;
            });

            return assetPrices;
        } catch (error) {
            console.error('Error fetching asset prices:', error);
            return {};
        }
    }

    async getPurchaseData(userId) {
        try {
            return await this.prisma.$queryRaw`
                SELECT
                    asset_symbol,
                    SUM(btc_spent) as total_spent_sats,
                    COUNT(*) as purchase_count,
                    MAX(created_at) as last_purchase_date,
                    SUM(CASE WHEN locked_until > NOW() THEN amount ELSE 0 END) as locked_amount,
                    SUM(amount) as total_purchased_amount
                FROM purchases
                WHERE user_id = ${parseInt(userId)}
                GROUP BY asset_symbol
            `;
        } catch (error) {
            console.error('Error fetching purchase data:', error);
            return [];
        }
    }

    async getSalesData(userId) {
        try {
            return await this.prisma.$queryRaw`
                SELECT
                    from_asset as asset_symbol,
                    SUM(from_amount) as total_sold_amount,
                    SUM(to_amount) as total_received_sats
                FROM trades
                WHERE user_id = ${parseInt(userId)} AND to_asset = 'BTC' AND from_asset != 'BTC'
                GROUP BY from_asset
            `;
        } catch (error) {
            console.error('Error fetching sales data:', error);
            return [];
        }
    }

    async getLegacyCostData(userId) {
        try {
            return await this.prisma.$queryRaw`
                SELECT
                    to_asset as asset_symbol,
                    SUM(from_amount) as total_spent_sats,
                    COUNT(*) as trade_count,
                    MAX(created_at) as last_trade_date
                FROM trades
                WHERE user_id = ${parseInt(userId)} AND from_asset = 'BTC'
                GROUP BY to_asset
            `;
        } catch (error) {
            console.error('Error fetching legacy cost data:', error);
            return [];
        }
    }

    buildPurchaseMap(purchases, legacyCost) {
        const purchaseMap = {};

        // Process direct purchases
        purchases.forEach(row => {
            purchaseMap[row.asset_symbol] = {
                total_spent_sats: parseInt(row.total_spent_sats),
                purchase_count: parseInt(row.purchase_count),
                last_purchase_date: row.last_purchase_date,
                locked_amount: parseInt(row.locked_amount),
                total_purchased_amount: parseInt(row.total_purchased_amount)
            };
        });

        // Add legacy cost data
        legacyCost.forEach(row => {
            if (!purchaseMap[row.asset_symbol]) {
                purchaseMap[row.asset_symbol] = {
                    total_spent_sats: parseInt(row.total_spent_sats),
                    purchase_count: parseInt(row.trade_count),
                    last_purchase_date: row.last_trade_date,
                    locked_amount: 0,
                    total_purchased_amount: 0
                };
            }
        });

        return purchaseMap;
    }

    buildSalesMap(sales) {
        const salesMap = {};

        sales.forEach(row => {
            salesMap[row.asset_symbol] = {
                total_sold_amount: parseInt(row.total_sold_amount),
                total_received_sats: parseInt(row.total_received_sats)
            };
        });

        return salesMap;
    }

    calculatePortfolioMetrics(holdings, assetPrices, purchaseMap, salesMap) {
        let totalValueSats = 0;
        let totalCostSats = 0;

        const portfolioHoldings = holdings.map(holding => {
            const priceUsd = assetPrices[holding.assetSymbol] || 0;
            const btcPrice = assetPrices['BTC'] || 1;

            const purchaseInfo = purchaseMap[holding.assetSymbol] || {
                total_spent_sats: 0,
                purchase_count: 0,
                last_purchase_date: null,
                locked_amount: 0,
                total_purchased_amount: 0
            };

            const salesInfo = salesMap[holding.assetSymbol] || {
                total_sold_amount: 0,
                total_received_sats: 0
            };

            const holdingAmount = Number(holding.amount) || 0;
            let valueSats = 0;
            let adjustedCostBasis = 0;

            if (holding.assetSymbol === 'BTC') {
                valueSats = holdingAmount;
                adjustedCostBasis = valueSats;
                totalCostSats += valueSats;
            } else {
                // Convert back to actual shares: amount / 100M
                const actualShares = holdingAmount / 100000000;
                const usdValue = actualShares * priceUsd;
                valueSats = Math.round((usdValue / btcPrice) * 100000000);

                // Calculate adjusted cost basis for remaining holdings
                const totalPurchased = purchaseInfo.total_purchased_amount || 0;
                const remainingRatio = totalPurchased > 0 ? holdingAmount / totalPurchased : 0;
                adjustedCostBasis = Math.round((purchaseInfo.total_spent_sats || 0) * remainingRatio);

                totalCostSats += adjustedCostBasis;
            }

            totalValueSats += valueSats;

            // Determine lock status
            let lockStatus = 'unlocked';
            if (holding.assetSymbol !== 'BTC' && purchaseInfo.locked_amount > 0) {
                if (purchaseInfo.locked_amount >= holdingAmount) {
                    lockStatus = 'locked';
                } else {
                    lockStatus = 'partial';
                }
            }

            return {
                id: holding.id,
                user_id: holding.userId,
                asset_symbol: holding.assetSymbol,
                amount: holdingAmount,
                locked_until: holding.lockedUntil,
                created_at: holding.createdAt,
                current_value_sats: valueSats,
                cost_basis_sats: adjustedCostBasis,
                purchase_count: purchaseInfo.purchase_count || 0,
                last_purchase_date: purchaseInfo.last_purchase_date,
                locked_amount: purchaseInfo.locked_amount || 0,
                lock_status: lockStatus,
                current_price_usd: priceUsd,
                total_spent_sats: purchaseInfo.total_spent_sats || 0,
                total_received_from_sales: salesInfo.total_received_sats || 0
            };
        });

        return {
            portfolioHoldings,
            totalValueSats,
            totalCostSats
        };
    }

    async calculatePortfolioValue(userId) {
        try {
            const portfolio = await this.getUserPortfolio(userId);

            return {
                totalValueSats: portfolio.total_value_sats,
                totalCostSats: portfolio.total_cost_sats,
                gainLossSats: portfolio.total_value_sats - portfolio.total_cost_sats,
                gainLossPercent: portfolio.total_cost_sats > 0
                    ? ((portfolio.total_value_sats - portfolio.total_cost_sats) / portfolio.total_cost_sats) * 100
                    : 0
            };
        } catch (error) {
            await this.handleServiceError(error, 'calculatePortfolioValue');
        }
    }
}

module.exports = PortfolioService;