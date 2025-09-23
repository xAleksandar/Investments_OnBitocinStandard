/**
 * Server-side constants for the Bitcoin education platform
 */

// Bitcoin and satoshi conversion constants
const BITCOIN_CONSTANTS = {
    SATOSHIS_PER_BTC: 100000000,
    PORTFOLIO_BASELINE_SATS: 100000000, // 1 BTC baseline for portfolio comparison
    INITIAL_BTC_AMOUNT_SATS: 100000000, // New users get 1 BTC
    MIN_TRADE_AMOUNT_SATS: 1,
    MAX_TRADE_AMOUNT_SATS: 2100000000000000 // 21M BTC in sats
};

// Unit types for trading and conversion
const UNIT_TYPES = {
    BTC: 'btc',
    SATOSHI: 'sat',
    MILLISATOSHI: 'msat',
    KILOSATOSHI: 'ksat',
    ASSET: 'asset'
};

// Valid unit types array for validation
const VALID_UNITS = Object.values(UNIT_TYPES);

// Unit conversion multipliers (to satoshis)
const UNIT_MULTIPLIERS = {
    [UNIT_TYPES.BTC]: BITCOIN_CONSTANTS.SATOSHIS_PER_BTC,
    [UNIT_TYPES.SATOSHI]: 1,
    [UNIT_TYPES.MILLISATOSHI]: 0.001,
    [UNIT_TYPES.KILOSATOSHI]: 1000,
    [UNIT_TYPES.ASSET]: BITCOIN_CONSTANTS.SATOSHIS_PER_BTC // Assets use 8 decimal precision
};

// Supported asset symbols
const SUPPORTED_ASSETS = [
    'BTC', 'XAU', 'XAG', 'SPY', 'QQQ', 'VTI', 'EFA', 'VXUS', 'EWU',
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JNJ',
    'V', 'WMT', 'BRK-B', 'VNQ', 'VNO', 'PLD', 'EQIX', 'TLT', 'HYG',
    'WTI', 'WEAT', 'CPER', 'DBA', 'UNG', 'URA'
];

// Asset categories for organization
const ASSET_CATEGORIES = {
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

// Time periods for performance analysis
const TIME_PERIODS = {
    ONE_HOUR: '1h',
    TWENTY_FOUR_HOURS: '24h',
    SEVEN_DAYS: '7d',
    THIRTY_DAYS: '30d',
    NINETY_DAYS: '90d',
    ONE_YEAR: '1y'
};

const VALID_TIME_PERIODS = Object.values(TIME_PERIODS);

// Business rules
const BUSINESS_RULES = {
    ASSET_LOCK_HOURS: 24, // Assets locked for 24 hours after purchase
    MAGIC_LINK_EXPIRY_MINUTES: 15,
    MAX_SEARCH_RESULTS: 20,
    MAX_BULK_PRICE_REQUEST: 50,
    MAX_TRADE_HISTORY_LIMIT: 1000,
    DEFAULT_TRADE_HISTORY_LIMIT: 50,
    MAX_PORTFOLIO_LIMIT: 100
};

// HTTP status codes for consistent responses
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// Common error messages
const ERROR_MESSAGES = {
    // Authentication
    INVALID_TOKEN: 'Invalid or expired token',
    UNAUTHORIZED: 'Unauthorized access',
    ADMIN_REQUIRED: 'Admin access required',
    USER_NOT_FOUND: 'User not found',

    // Validation
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_ASSET_SYMBOL: 'Invalid asset symbol',
    INVALID_AMOUNT: 'Amount must be a positive number',
    INVALID_UNIT: 'Invalid unit type',
    INVALID_TIME_PERIOD: 'Invalid time period',

    // Trading
    SAME_ASSET_TRADE: 'Cannot trade asset to itself',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    ASSET_LOCKED: 'Asset is locked for trading',
    TRADE_AMOUNT_TOO_SMALL: 'Trade amount too small',
    TRADE_AMOUNT_TOO_LARGE: 'Trade amount too large',
    PRICE_NOT_AVAILABLE: 'Price not available for this asset',

    // General
    SERVER_ERROR: 'Internal server error',
    NOT_FOUND: 'Resource not found',
    ASSET_NOT_FOUND: 'Asset not found',
    INVALID_REQUEST: 'Invalid request'
};

// Success messages
const SUCCESS_MESSAGES = {
    USER_CREATED: 'User created successfully',
    MAGIC_LINK_SENT: 'Magic link sent successfully',
    LOGIN_SUCCESSFUL: 'Login successful',
    TRADE_EXECUTED: 'Trade executed successfully',
    PRICES_UPDATED: 'Prices updated successfully',
    DATA_RETRIEVED: 'Data retrieved successfully'
};

// Database query limits and defaults
const DATABASE_LIMITS = {
    MAX_QUERY_LIMIT: 1000,
    DEFAULT_QUERY_LIMIT: 50,
    MAX_SEARCH_LIMIT: 100,
    DEFAULT_SEARCH_LIMIT: 20
};

// Regular expressions for validation
const VALIDATION_REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
    ASSET_SYMBOL: /^[A-Z0-9-]{1,10}$/,
    POSITIVE_NUMBER: /^\d*\.?\d+$/
};

module.exports = {
    BITCOIN_CONSTANTS,
    UNIT_TYPES,
    VALID_UNITS,
    UNIT_MULTIPLIERS,
    SUPPORTED_ASSETS,
    ASSET_CATEGORIES,
    TIME_PERIODS,
    VALID_TIME_PERIODS,
    BUSINESS_RULES,
    HTTP_STATUS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DATABASE_LIMITS,
    VALIDATION_REGEX
};