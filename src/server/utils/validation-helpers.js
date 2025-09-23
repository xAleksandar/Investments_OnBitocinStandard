/**
 * Validation helpers for server-side input validation and sanitization
 */

const {
    BITCOIN_CONSTANTS,
    UNIT_TYPES,
    VALID_UNITS,
    UNIT_MULTIPLIERS,
    SUPPORTED_ASSETS,
    VALID_TIME_PERIODS,
    VALIDATION_REGEX,
    ERROR_MESSAGES
} = require('./constants');

/**
 * Validates required fields in request body
 * @param {Object} body - Request body object
 * @param {Array} requiredFields - Array of required field names
 * @throws {Error} If any required fields are missing
 */
function validateRequiredFields(body, requiredFields) {
    const missing = requiredFields.filter(field =>
        body[field] === undefined ||
        body[field] === null ||
        (typeof body[field] === 'string' && body[field].trim() === '')
    );

    if (missing.length > 0) {
        throw new Error(`${ERROR_MESSAGES.MISSING_REQUIRED_FIELDS}: ${missing.join(', ')}`);
    }
}

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    return VALIDATION_REGEX.EMAIL.test(email.trim().toLowerCase());
}

/**
 * Validates username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username format
 */
function isValidUsername(username) {
    if (typeof username !== 'string') return false;
    return VALIDATION_REGEX.USERNAME.test(username.trim());
}

/**
 * Validates asset symbol
 * @param {string} symbol - Asset symbol to validate
 * @returns {boolean} True if valid and supported asset symbol
 */
function isValidAssetSymbol(symbol) {
    if (typeof symbol !== 'string') return false;
    const upperSymbol = symbol.toUpperCase().trim();
    return SUPPORTED_ASSETS.includes(upperSymbol);
}

/**
 * Validates positive number
 * @param {string|number} value - Value to validate
 * @returns {boolean} True if valid positive number
 */
function isValidPositiveNumber(value) {
    if (typeof value === 'number') {
        return value > 0 && !isNaN(value) && isFinite(value);
    }

    if (typeof value === 'string') {
        return VALIDATION_REGEX.POSITIVE_NUMBER.test(value.trim()) && parseFloat(value) > 0;
    }

    return false;
}

/**
 * Validates unit type
 * @param {string} unit - Unit to validate
 * @returns {boolean} True if valid unit type
 */
function isValidUnit(unit) {
    if (typeof unit !== 'string') return false;
    return VALID_UNITS.includes(unit.toLowerCase());
}

/**
 * Validates time period
 * @param {string} period - Time period to validate
 * @returns {boolean} True if valid time period
 */
function isValidTimePeriod(period) {
    if (typeof period !== 'string') return false;
    return VALID_TIME_PERIODS.includes(period);
}

/**
 * Converts amount to satoshis based on unit
 * @param {number|string} amount - Amount to convert
 * @param {string} unit - Unit type (btc, sat, msat, ksat, asset)
 * @returns {number} Amount in satoshis
 * @throws {Error} If invalid amount or unit
 */
function convertToSatoshis(amount, unit) {
    // Validate unit
    if (!isValidUnit(unit)) {
        throw new Error(`${ERROR_MESSAGES.INVALID_UNIT}: ${unit}`);
    }

    // Validate amount
    if (!isValidPositiveNumber(amount)) {
        throw new Error(`${ERROR_MESSAGES.INVALID_AMOUNT}: ${amount}`);
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const multiplier = UNIT_MULTIPLIERS[unit.toLowerCase()];

    const amountInSats = Math.round(numAmount * multiplier);

    // Validate satoshi amount bounds
    if (amountInSats < BITCOIN_CONSTANTS.MIN_TRADE_AMOUNT_SATS) {
        throw new Error(ERROR_MESSAGES.TRADE_AMOUNT_TOO_SMALL);
    }

    if (amountInSats > BITCOIN_CONSTANTS.MAX_TRADE_AMOUNT_SATS) {
        throw new Error(ERROR_MESSAGES.TRADE_AMOUNT_TOO_LARGE);
    }

    return amountInSats;
}

/**
 * Converts satoshis to specified unit
 * @param {number} satoshis - Amount in satoshis
 * @param {string} unit - Target unit type
 * @returns {number} Amount in specified unit
 * @throws {Error} If invalid unit
 */
function convertFromSatoshis(satoshis, unit) {
    if (!isValidUnit(unit)) {
        throw new Error(`${ERROR_MESSAGES.INVALID_UNIT}: ${unit}`);
    }

    const multiplier = UNIT_MULTIPLIERS[unit.toLowerCase()];
    return satoshis / multiplier;
}

/**
 * Formats amount for display based on asset type
 * @param {number} amountInSats - Amount in satoshis
 * @param {string} assetSymbol - Asset symbol
 * @param {number} decimals - Number of decimal places (default: auto-detect)
 * @returns {string} Formatted amount string
 */
function formatAmount(amountInSats, assetSymbol, decimals = null) {
    const amount = amountInSats / BITCOIN_CONSTANTS.SATOSHIS_PER_BTC;

    if (decimals !== null) {
        return `${amount.toFixed(decimals)} ${assetSymbol}`;
    }

    // Auto-detect decimal places
    if (assetSymbol === 'BTC') {
        return `${amount.toFixed(8)} BTC`;
    } else {
        return `${amount.toFixed(4)} ${assetSymbol}`;
    }
}

/**
 * Validates trade parameters
 * @param {string} fromAsset - Source asset symbol
 * @param {string} toAsset - Target asset symbol
 * @param {string|number} amount - Trade amount
 * @param {string} unit - Unit of measurement
 * @throws {Error} If any validation fails
 */
function validateTradeParameters(fromAsset, toAsset, amount, unit) {
    // Validate asset symbols
    if (!isValidAssetSymbol(fromAsset)) {
        throw new Error(`${ERROR_MESSAGES.INVALID_ASSET_SYMBOL}: ${fromAsset}`);
    }

    if (!isValidAssetSymbol(toAsset)) {
        throw new Error(`${ERROR_MESSAGES.INVALID_ASSET_SYMBOL}: ${toAsset}`);
    }

    // Check for same asset trade
    if (fromAsset.toUpperCase() === toAsset.toUpperCase()) {
        throw new Error(ERROR_MESSAGES.SAME_ASSET_TRADE);
    }

    // Validate that one asset must be BTC
    if (fromAsset.toUpperCase() !== 'BTC' && toAsset.toUpperCase() !== 'BTC') {
        throw new Error('One asset must be BTC');
    }

    // Validate amount and unit (this will throw if invalid)
    convertToSatoshis(amount, unit);
}

/**
 * Sanitizes input object by trimming strings and removing potential XSS
 * @param {any} input - Input to sanitize
 * @returns {any} Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input === 'string') {
        return input.trim().replace(/[<>]/g, ''); // Basic XSS protection
    }

    if (Array.isArray(input)) {
        return input.map(sanitizeInput);
    }

    if (input && typeof input === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }

    return input;
}

/**
 * Validates pagination parameters
 * @param {string|number} limit - Items per page
 * @param {string|number} offset - Offset for pagination
 * @returns {Object} Validated pagination object {limit, offset}
 */
function validatePagination(limit = 50, offset = 0) {
    const validatedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 50));
    const validatedOffset = Math.max(0, parseInt(offset) || 0);

    return {
        limit: validatedLimit,
        offset: validatedOffset
    };
}

/**
 * Validates search query parameters
 * @param {string} query - Search query
 * @param {number} minLength - Minimum query length (default: 1)
 * @returns {string} Sanitized and validated query
 * @throws {Error} If query is invalid
 */
function validateSearchQuery(query, minLength = 1) {
    if (!query || typeof query !== 'string') {
        throw new Error('Search query is required');
    }

    const sanitizedQuery = sanitizeInput(query);

    if (sanitizedQuery.length < minLength) {
        throw new Error(`Search query must be at least ${minLength} characters`);
    }

    return sanitizedQuery;
}

/**
 * Validates array input with size limits
 * @param {any} input - Input to validate as array
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} maxSize - Maximum array size
 * @param {number} minSize - Minimum array size (default: 1)
 * @returns {Array} Validated array
 * @throws {Error} If validation fails
 */
function validateArray(input, fieldName, maxSize, minSize = 1) {
    if (!Array.isArray(input)) {
        throw new Error(`${fieldName} must be an array`);
    }

    if (input.length < minSize) {
        throw new Error(`${fieldName} must contain at least ${minSize} item(s)`);
    }

    if (input.length > maxSize) {
        throw new Error(`${fieldName} cannot contain more than ${maxSize} items`);
    }

    return input;
}

module.exports = {
    validateRequiredFields,
    isValidEmail,
    isValidUsername,
    isValidAssetSymbol,
    isValidPositiveNumber,
    isValidUnit,
    isValidTimePeriod,
    convertToSatoshis,
    convertFromSatoshis,
    formatAmount,
    validateTradeParameters,
    sanitizeInput,
    validatePagination,
    validateSearchQuery,
    validateArray
};