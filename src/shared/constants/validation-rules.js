// Shared validation rules and constraints
// Used by both client and server for consistent validation

const VALIDATION_RULES = {
    USER: {
        EMAIL: {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            maxLength: 255,
            message: 'Please enter a valid email address'
        }
    },

    PORTFOLIO: {
        AMOUNT: {
            min: 0,
            max: 1000000000,
            decimals: 8,
            message: 'Amount must be between 0 and 1,000,000,000 with maximum 8 decimal places'
        },
        ASSET_SYMBOL: {
            required: true,
            pattern: /^[A-Z]{1,10}$/,
            maxLength: 10,
            message: 'Asset symbol must be 1-10 uppercase letters'
        }
    },

    TRADE: {
        TRADE_TYPE: {
            required: true,
            enum: ['buy', 'sell'],
            message: 'Trade type must be either "buy" or "sell"'
        },
        AMOUNT: {
            min: 0.00000001,
            max: 1000000000,
            decimals: 8,
            message: 'Trade amount must be between 0.00000001 and 1,000,000,000'
        }
    },

    SUGGESTION: {
        TYPE: {
            required: true,
            enum: ['feature', 'bug', 'improvement', 'other'],
            message: 'Suggestion type must be feature, bug, improvement, or other'
        },
        TITLE: {
            required: true,
            minLength: 5,
            maxLength: 100,
            message: 'Title must be between 5 and 100 characters'
        },
        DESCRIPTION: {
            required: true,
            minLength: 10,
            maxLength: 1000,
            message: 'Description must be between 10 and 1000 characters'
        }
    },

    SET_FORGET: {
        NAME: {
            required: true,
            minLength: 1,
            maxLength: 50,
            message: 'Portfolio name must be between 1 and 50 characters'
        },
        ALLOCATION_PERCENTAGE: {
            min: 0.01,
            max: 100,
            decimals: 2,
            message: 'Allocation percentage must be between 0.01% and 100%'
        },
        REBALANCE_THRESHOLD: {
            min: 1,
            max: 50,
            decimals: 2,
            message: 'Rebalance threshold must be between 1% and 50%'
        }
    }
};

const ERROR_MESSAGES = {
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_AMOUNT: 'Please enter a valid amount',
    INVALID_PERCENTAGE: 'Please enter a valid percentage',
    AMOUNT_TOO_SMALL: 'Amount is too small',
    AMOUNT_TOO_LARGE: 'Amount is too large',
    INVALID_ASSET: 'Invalid asset symbol',
    INSUFFICIENT_BALANCE: 'Insufficient balance for this trade',
    TRADE_TOO_SOON: 'Cannot trade this asset yet (24-hour reflection period)',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    SERVER_ERROR: 'An error occurred. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    RATE_LIMITED: 'Too many requests. Please wait before trying again.'
};

/**
 * Validates an email address
 * @param {string} email - Email to validate
 * @returns {Object} Validation result with isValid and error message
 */
function validateEmail(email) {
    if (!email) {
        return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
    }

    const rule = VALIDATION_RULES.USER.EMAIL;

    if (email.length > rule.maxLength) {
        return { isValid: false, error: 'Email address is too long' };
    }

    if (!rule.pattern.test(email)) {
        return { isValid: false, error: rule.message };
    }

    return { isValid: true, error: null };
}

/**
 * Validates a numeric amount
 * @param {number|string} amount - Amount to validate
 * @param {Object} rules - Validation rules (min, max, decimals)
 * @returns {Object} Validation result
 */
function validateAmount(amount, rules = VALIDATION_RULES.PORTFOLIO.AMOUNT) {
    const numAmount = Number(amount);

    if (isNaN(numAmount)) {
        return { isValid: false, error: ERROR_MESSAGES.INVALID_AMOUNT };
    }

    if (numAmount < rules.min) {
        return { isValid: false, error: ERROR_MESSAGES.AMOUNT_TOO_SMALL };
    }

    if (numAmount > rules.max) {
        return { isValid: false, error: ERROR_MESSAGES.AMOUNT_TOO_LARGE };
    }

    // Check decimal places
    if (rules.decimals !== undefined) {
        const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
        if (decimalPlaces > rules.decimals) {
            return {
                isValid: false,
                error: `Maximum ${rules.decimals} decimal places allowed`
            };
        }
    }

    return { isValid: true, error: null };
}

/**
 * Validates asset symbol format
 * @param {string} symbol - Asset symbol to validate
 * @returns {Object} Validation result
 */
function validateAssetSymbol(symbol) {
    if (!symbol) {
        return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
    }

    const rule = VALIDATION_RULES.PORTFOLIO.ASSET_SYMBOL;

    if (!rule.pattern.test(symbol)) {
        return { isValid: false, error: rule.message };
    }

    return { isValid: true, error: null };
}

/**
 * Validates percentage value
 * @param {number|string} percentage - Percentage to validate (0-100)
 * @returns {Object} Validation result
 */
function validatePercentage(percentage) {
    const numPercentage = Number(percentage);

    if (isNaN(numPercentage)) {
        return { isValid: false, error: ERROR_MESSAGES.INVALID_PERCENTAGE };
    }

    if (numPercentage < 0 || numPercentage > 100) {
        return { isValid: false, error: 'Percentage must be between 0 and 100' };
    }

    return { isValid: true, error: null };
}

/**
 * Validates string length
 * @param {string} value - String to validate
 * @param {Object} rules - Validation rules (minLength, maxLength)
 * @returns {Object} Validation result
 */
function validateStringLength(value, rules) {
    if (!value && rules.required) {
        return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
    }

    if (rules.minLength && value.length < rules.minLength) {
        return {
            isValid: false,
            error: `Minimum ${rules.minLength} characters required`
        };
    }

    if (rules.maxLength && value.length > rules.maxLength) {
        return {
            isValid: false,
            error: `Maximum ${rules.maxLength} characters allowed`
        };
    }

    return { isValid: true, error: null };
}

// Export for ES modules (client)
export {
    VALIDATION_RULES,
    ERROR_MESSAGES,
    validateEmail,
    validateAmount,
    validateAssetSymbol,
    validatePercentage,
    validateStringLength
};

// Also export for CommonJS (server)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VALIDATION_RULES,
        ERROR_MESSAGES,
        validateEmail,
        validateAmount,
        validateAssetSymbol,
        validatePercentage,
        validateStringLength
    };
}