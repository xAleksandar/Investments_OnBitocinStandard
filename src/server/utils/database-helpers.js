/**
 * Database helper utilities for common Prisma operations and query patterns
 */

const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const {
    DATABASE_LIMITS,
    BUSINESS_RULES,
    BITCOIN_CONSTANTS
} = require('./constants');
const {
    NotFoundError,
    ValidationError,
    ConflictError
} = require('./error-handlers');

/**
 * Executes a function within a database transaction
 * @param {Function} operation - Function to execute within transaction
 * @returns {Promise} Result of the operation
 */
async function withTransaction(operation) {
    return await prisma.$transaction(operation);
}

/**
 * Safely executes a database query with error handling
 * @param {Function} query - Prisma query function
 * @param {string} context - Context for error logging
 * @returns {Promise} Query result
 */
async function safeQuery(query, context = 'database operation') {
    try {
        return await query();
    } catch (error) {
        console.error(`Database error in ${context}:`, error);

        // Handle specific Prisma errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
                case 'P2002':
                    throw new ConflictError('Resource already exists');
                case 'P2025':
                    throw new NotFoundError('Resource not found');
                case 'P2003':
                    throw new ValidationError('Invalid reference to related data');
                default:
                    throw new Error(`Database operation failed: ${error.message}`);
            }
        }

        throw error;
    }
}

/**
 * Finds a user by ID with error handling
 * @param {string} userId - User ID
 * @param {boolean} throwIfNotFound - Whether to throw error if not found
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserById(userId, throwIfNotFound = true) {
    const user = await safeQuery(
        () => prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                isAdmin: true,
                createdAt: true
            }
        }),
        'findUserById'
    );

    if (!user && throwIfNotFound) {
        throw new NotFoundError('User not found');
    }

    return user;
}

/**
 * Finds a user by email with error handling
 * @param {string} email - User email
 * @param {boolean} throwIfNotFound - Whether to throw error if not found
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserByEmail(email, throwIfNotFound = false) {
    return await safeQuery(
        () => prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: {
                id: true,
                username: true,
                email: true,
                isAdmin: true,
                createdAt: true
            }
        }),
        'findUserByEmail'
    );
}

/**
 * Creates a new user with initial BTC balance
 * @param {Object} userData - User data {username, email}
 * @returns {Promise<Object>} Created user object
 */
async function createUserWithInitialBalance(userData) {
    return await withTransaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
            data: {
                username: userData.username,
                email: userData.email.toLowerCase().trim()
            }
        });

        // Give them initial BTC balance
        await tx.holding.create({
            data: {
                userId: user.id,
                assetSymbol: 'BTC',
                amount: BigInt(BITCOIN_CONSTANTS.INITIAL_BTC_AMOUNT_SATS),
                costBasisSats: BigInt(0),
                lastPurchaseDate: new Date()
            }
        });

        return user;
    });
}

/**
 * Gets paginated results with consistent structure
 * @param {Object} query - Prisma query object
 * @param {number} limit - Items per page
 * @param {number} offset - Offset for pagination
 * @param {string} context - Context for error logging
 * @returns {Promise<Object>} Paginated results
 */
async function getPaginatedResults(query, limit = DATABASE_LIMITS.DEFAULT_QUERY_LIMIT, offset = 0, context = 'pagination') {
    const validatedLimit = Math.min(DATABASE_LIMITS.MAX_QUERY_LIMIT, Math.max(1, limit));
    const validatedOffset = Math.max(0, offset);

    const [items, total] = await Promise.all([
        safeQuery(() => prisma[query.model].findMany({
            ...query,
            take: validatedLimit,
            skip: validatedOffset
        }), context),
        safeQuery(() => prisma[query.model].count({
            where: query.where
        }), `${context}_count`)
    ]);

    return {
        items,
        pagination: {
            total,
            limit: validatedLimit,
            offset: validatedOffset,
            hasMore: (validatedOffset + validatedLimit) < total
        }
    };
}

/**
 * Gets user's holdings with calculations
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User holdings with computed values
 */
async function getUserHoldings(userId) {
    return await safeQuery(
        () => prisma.holding.findMany({
            where: { userId },
            include: {
                asset: {
                    select: {
                        symbol: true,
                        name: true,
                        currentPriceUsd: true,
                        lastUpdated: true
                    }
                }
            },
            orderBy: { lastPurchaseDate: 'desc' }
        }),
        'getUserHoldings'
    );
}

/**
 * Gets user's purchase history for specific asset with FIFO cost basis
 * @param {string} userId - User ID
 * @param {string} assetSymbol - Asset symbol
 * @returns {Promise<Object>} Purchase aggregation data
 */
async function getAssetPurchaseData(userId, assetSymbol) {
    const result = await safeQuery(
        () => prisma.$queryRaw`
            SELECT
                asset_symbol,
                SUM(btc_spent) as total_spent_sats,
                COUNT(*) as purchase_count,
                MAX(created_at) as last_purchase_date,
                SUM(CASE WHEN locked_until > NOW() THEN amount ELSE 0 END) as locked_amount,
                SUM(amount) as total_purchased_amount,
                MIN(locked_until) as earliest_unlock,
                MAX(locked_until) as latest_unlock
            FROM purchases
            WHERE user_id = ${userId} AND asset_symbol = ${assetSymbol}
            GROUP BY asset_symbol
        `,
        'getAssetPurchaseData'
    );

    return result[0] || null;
}

/**
 * Gets user's sales history for specific asset
 * @param {string} userId - User ID
 * @param {string} assetSymbol - Asset symbol
 * @returns {Promise<Object>} Sales aggregation data
 */
async function getAssetSalesData(userId, assetSymbol) {
    const result = await safeQuery(
        () => prisma.$queryRaw`
            SELECT
                from_asset as asset_symbol,
                SUM(from_amount) as total_sold_amount,
                SUM(to_amount) as total_received_sats,
                COUNT(*) as sale_count
            FROM trades
            WHERE user_id = ${userId} AND from_asset = ${assetSymbol}
            GROUP BY from_asset
        `,
        'getAssetSalesData'
    );

    return result[0] || null;
}

/**
 * Gets user's trade history with pagination
 * @param {string} userId - User ID
 * @param {number} limit - Maximum trades to return
 * @returns {Promise<Array>} Trade history
 */
async function getUserTrades(userId, limit = DATABASE_LIMITS.DEFAULT_QUERY_LIMIT) {
    const validatedLimit = Math.min(DATABASE_LIMITS.MAX_QUERY_LIMIT, limit);

    return await safeQuery(
        () => prisma.trade.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: validatedLimit
        }),
        'getUserTrades'
    );
}

/**
 * Gets current asset prices
 * @param {Array} symbols - Asset symbols to get prices for (optional)
 * @returns {Promise<Object>} Asset prices keyed by symbol
 */
async function getAssetPrices(symbols = null) {
    const whereClause = symbols ? { symbol: { in: symbols } } : {};

    const assets = await safeQuery(
        () => prisma.asset.findMany({
            where: whereClause,
            select: {
                symbol: true,
                currentPriceUsd: true,
                lastUpdated: true
            }
        }),
        'getAssetPrices'
    );

    const prices = {};
    assets.forEach(asset => {
        prices[asset.symbol] = asset.currentPriceUsd;
    });

    return prices;
}

/**
 * Creates a new purchase record
 * @param {Object} purchaseData - Purchase data
 * @returns {Promise<Object>} Created purchase record
 */
async function createPurchase(purchaseData) {
    const lockUntil = new Date(Date.now() + (BUSINESS_RULES.ASSET_LOCK_HOURS * 60 * 60 * 1000));

    return await safeQuery(
        () => prisma.purchase.create({
            data: {
                ...purchaseData,
                lockedUntil: lockUntil,
                amount: BigInt(purchaseData.amount),
                btcSpent: BigInt(purchaseData.btcSpent)
            }
        }),
        'createPurchase'
    );
}

/**
 * Creates a new trade record
 * @param {Object} tradeData - Trade data
 * @returns {Promise<Object>} Created trade record
 */
async function createTrade(tradeData) {
    return await safeQuery(
        () => prisma.trade.create({
            data: {
                ...tradeData,
                fromAmount: BigInt(tradeData.fromAmount),
                toAmount: BigInt(tradeData.toAmount)
            }
        }),
        'createTrade'
    );
}

/**
 * Updates or creates a holding record
 * @param {string} userId - User ID
 * @param {string} assetSymbol - Asset symbol
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated/created holding
 */
async function upsertHolding(userId, assetSymbol, updateData) {
    return await safeQuery(
        () => prisma.holding.upsert({
            where: {
                userId_assetSymbol: {
                    userId,
                    assetSymbol
                }
            },
            update: {
                ...updateData,
                amount: updateData.amount ? BigInt(updateData.amount) : undefined,
                costBasisSats: updateData.costBasisSats ? BigInt(updateData.costBasisSats) : undefined
            },
            create: {
                userId,
                assetSymbol,
                amount: BigInt(updateData.amount || 0),
                costBasisSats: BigInt(updateData.costBasisSats || 0),
                lastPurchaseDate: updateData.lastPurchaseDate || new Date()
            }
        }),
        'upsertHolding'
    );
}

/**
 * Gets system statistics for admin dashboard
 * @returns {Promise<Object>} System statistics
 */
async function getSystemStats() {
    const [userCount, totalTrades, totalHoldings, activeAssets] = await Promise.all([
        safeQuery(() => prisma.user.count(), 'userCount'),
        safeQuery(() => prisma.trade.count(), 'tradeCount'),
        safeQuery(() => prisma.holding.count({ where: { amount: { gt: 0 } } }), 'holdingsCount'),
        safeQuery(() => prisma.asset.count({ where: { isActive: true } }), 'activeAssetsCount')
    ]);

    // Get total portfolio value in BTC
    const totalPortfolioValue = await safeQuery(
        () => prisma.$queryRaw`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL) * current_price_usd /
                (SELECT current_price_usd FROM assets WHERE symbol = 'BTC')), 0) as total_btc_value
            FROM holdings h
            JOIN assets a ON h.asset_symbol = a.symbol
            WHERE h.amount > 0
        `,
        'totalPortfolioValue'
    );

    return {
        userCount,
        totalTrades,
        totalHoldings,
        activeAssets,
        totalPortfolioBtc: totalPortfolioValue[0]?.total_btc_value || 0
    };
}

/**
 * Executes raw SQL with proper error handling
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @param {string} context - Context for error logging
 * @returns {Promise} Query results
 */
async function executeRawQuery(sql, params = [], context = 'raw query') {
    return await safeQuery(
        () => prisma.$queryRawUnsafe(sql, ...params),
        context
    );
}

module.exports = {
    // Transaction helpers
    withTransaction,
    safeQuery,

    // User operations
    findUserById,
    findUserByEmail,
    createUserWithInitialBalance,

    // Pagination
    getPaginatedResults,

    // Portfolio operations
    getUserHoldings,
    getAssetPurchaseData,
    getAssetSalesData,
    getUserTrades,
    getAssetPrices,

    // Trade operations
    createPurchase,
    createTrade,
    upsertHolding,

    // Admin operations
    getSystemStats,

    // Raw queries
    executeRawQuery
};