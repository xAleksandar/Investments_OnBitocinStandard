// JSDoc type definitions for shared entities
// Used across both client and server for consistent type checking

/**
 * @typedef {Object} User
 * @property {number} id - Unique user identifier
 * @property {string} email - User email address
 * @property {Date} createdAt - Account creation timestamp
 * @property {Date} updatedAt - Last account update timestamp
 * @property {Date|null} lastLoginAt - Last login timestamp
 * @property {boolean} isAdmin - Whether user has admin privileges
 */

/**
 * @typedef {Object} Asset
 * @property {string} symbol - Asset symbol (e.g., 'AAPL', 'TSLA')
 * @property {string} name - Full asset name
 * @property {string} type - Asset type ('stock', 'crypto', 'etf')
 * @property {string} exchange - Exchange where asset is traded
 * @property {string} description - Asset description
 * @property {number} currentPrice - Current price in USD
 * @property {number} changePercent24h - 24-hour price change percentage
 * @property {Date} lastUpdated - Last price update timestamp
 * @property {boolean} isActive - Whether asset is available for trading
 * @property {string|null} logoUrl - URL to asset logo
 */

/**
 * @typedef {Object} Portfolio
 * @property {number} id - Unique portfolio identifier
 * @property {number} userId - Owner user ID
 * @property {Array<Holding>} holdings - Array of portfolio holdings
 * @property {BigInt} totalValueSats - Total portfolio value in satoshis
 * @property {number} totalValueUsd - Total portfolio value in USD
 * @property {BigInt} totalChangeSats - Total change in satoshis since inception
 * @property {number} totalChangePercent - Total change percentage
 * @property {Date} createdAt - Portfolio creation timestamp
 * @property {Date} updatedAt - Last portfolio update timestamp
 */

/**
 * @typedef {Object} Holding
 * @property {number} id - Unique holding identifier
 * @property {number} portfolioId - Parent portfolio ID
 * @property {string} assetSymbol - Asset symbol being held
 * @property {number} amount - Amount of asset held
 * @property {BigInt} valueInSats - Current value in satoshis
 * @property {number} valueInUsd - Current value in USD
 * @property {number} averageCostBasis - Average cost basis in USD
 * @property {BigInt} purchaseValueSats - Original purchase value in satoshis
 * @property {Date} firstPurchaseAt - First purchase timestamp
 * @property {Date} lastPurchaseAt - Last purchase timestamp
 * @property {Date} createdAt - Holding creation timestamp
 * @property {Date} updatedAt - Last holding update timestamp
 */

/**
 * @typedef {Object} Trade
 * @property {number} id - Unique trade identifier
 * @property {number} userId - User who executed the trade
 * @property {string} type - Trade type ('buy' or 'sell')
 * @property {string} fromAsset - Asset being sold (for sells) or 'USD' (for buys)
 * @property {string} toAsset - Asset being bought (for buys) or 'USD' (for sells)
 * @property {number} amount - Amount of asset traded
 * @property {number} pricePerUnit - Price per unit at time of trade
 * @property {BigInt} valueInSats - Trade value in satoshis
 * @property {number} valueInUsd - Trade value in USD
 * @property {Date} executedAt - Trade execution timestamp
 * @property {Date} createdAt - Trade record creation timestamp
 * @property {string} status - Trade status ('completed', 'pending', 'failed')
 */

/**
 * @typedef {Object} PriceData
 * @property {string} symbol - Asset symbol
 * @property {number} price - Current price in USD
 * @property {number} changePercent24h - 24-hour change percentage
 * @property {number} volume24h - 24-hour trading volume
 * @property {Date} timestamp - Price timestamp
 */

/**
 * @typedef {Object} Suggestion
 * @property {number} id - Unique suggestion identifier
 * @property {number} userId - User who made the suggestion
 * @property {string} type - Suggestion type ('feature', 'bug', 'improvement', 'other')
 * @property {string} title - Suggestion title
 * @property {string} description - Detailed description
 * @property {string} status - Status ('pending', 'reviewed', 'implemented', 'rejected')
 * @property {number|null} reviewedBy - Admin user ID who reviewed
 * @property {string|null} adminNotes - Admin review notes
 * @property {Date} createdAt - Suggestion creation timestamp
 * @property {Date} updatedAt - Last suggestion update timestamp
 */

/**
 * @typedef {Object} SetForgetPortfolio
 * @property {number} id - Unique portfolio identifier
 * @property {number} userId - Owner user ID
 * @property {string} name - Portfolio name
 * @property {Array<Allocation>} allocations - Target asset allocations
 * @property {number} rebalanceThreshold - Threshold percentage for rebalancing
 * @property {BigInt} totalValueSats - Total portfolio value in satoshis
 * @property {Date} lastRebalancedAt - Last rebalance timestamp
 * @property {boolean} isActive - Whether portfolio is active
 * @property {Date} createdAt - Portfolio creation timestamp
 * @property {Date} updatedAt - Last portfolio update timestamp
 */

/**
 * @typedef {Object} Allocation
 * @property {number} id - Unique allocation identifier
 * @property {number} portfolioId - Parent portfolio ID
 * @property {string} assetSymbol - Asset symbol
 * @property {number} targetPercentage - Target allocation percentage (0-100)
 * @property {number} currentPercentage - Current allocation percentage
 * @property {BigInt} currentValueSats - Current value in satoshis
 * @property {Date} createdAt - Allocation creation timestamp
 * @property {Date} updatedAt - Last allocation update timestamp
 */

/**
 * @typedef {Object} RebalanceHistory
 * @property {number} id - Unique rebalance record identifier
 * @property {number} portfolioId - Portfolio that was rebalanced
 * @property {Array<RebalanceAction>} actions - Actions taken during rebalance
 * @property {BigInt} totalValueBefore - Portfolio value before rebalance
 * @property {BigInt} totalValueAfter - Portfolio value after rebalance
 * @property {Date} executedAt - Rebalance execution timestamp
 * @property {string} trigger - What triggered the rebalance ('manual', 'threshold', 'scheduled')
 */

/**
 * @typedef {Object} RebalanceAction
 * @property {string} type - Action type ('buy', 'sell')
 * @property {string} assetSymbol - Asset involved in action
 * @property {number} amount - Amount traded
 * @property {number} pricePerUnit - Price per unit at execution
 * @property {BigInt} valueInSats - Action value in satoshis
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {*} data - Response data (varies by endpoint)
 * @property {string|null} error - Error message if request failed
 * @property {number} timestamp - Response timestamp
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {BigInt} totalValueSats - Total portfolio value in satoshis
 * @property {number} totalValueUsd - Total portfolio value in USD
 * @property {BigInt} totalChangeSats - Total change in satoshis
 * @property {number} totalChangePercent - Total change percentage
 * @property {BigInt} dailyChangeSats - Daily change in satoshis
 * @property {number} dailyChangePercent - Daily change percentage
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string|null} error - Error message if validation failed
 */

module.exports = {
    // Export all types for JSDoc usage
    // These are just for documentation - no runtime objects are created
};