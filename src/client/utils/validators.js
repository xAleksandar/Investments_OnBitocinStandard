/**
 * Frontend-specific validation utilities
 * Complements shared validation rules with UI-focused validation and feedback
 */

import { VALIDATION_RULES } from '../../shared/constants/validation-rules.js';

/**
 * Validate email with real-time feedback
 * @param {string} email - Email to validate
 * @returns {Object} Validation result with UI feedback
 */
export function validateEmail(email) {
    const rule = VALIDATION_RULES.USER.EMAIL;
    const trimmedEmail = email?.trim();

    if (!trimmedEmail) {
        return {
            isValid: false,
            message: 'Email is required',
            fieldClass: 'border-red-300 focus:border-red-500',
            messageClass: 'text-red-600'
        };
    }

    if (trimmedEmail.length > rule.maxLength) {
        return {
            isValid: false,
            message: `Email must be less than ${rule.maxLength} characters`,
            fieldClass: 'border-red-300 focus:border-red-500',
            messageClass: 'text-red-600'
        };
    }

    if (!rule.pattern.test(trimmedEmail)) {
        return {
            isValid: false,
            message: rule.message,
            fieldClass: 'border-red-300 focus:border-red-500',
            messageClass: 'text-red-600'
        };
    }

    return {
        isValid: true,
        message: 'Valid email address',
        fieldClass: 'border-green-300 focus:border-green-500',
        messageClass: 'text-green-600'
    };
}

/**
 * Validate trade amount with BTC minimum and UI feedback
 * @param {number|string} amount - Amount to validate
 * @param {string} fromAsset - Source asset symbol
 * @returns {Object} Validation result with trade-specific feedback
 */
export function validateTradeAmount(amount, fromAsset) {
    const numAmount = Number(amount);
    const MIN_TRADE_SATS = 100000; // 100k sats

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
        return {
            isValid: false,
            message: 'Please enter a valid amount',
            helperText: '⚠️ Amount must be greater than 0',
            fieldClass: 'border-red-300 focus:border-red-500'
        };
    }

    // Special validation for BTC minimum trade
    if (fromAsset === 'BTC' && numAmount < MIN_TRADE_SATS) {
        return {
            isValid: false,
            message: `Minimum trade amount is ${MIN_TRADE_SATS.toLocaleString()} sats (100 kSats)`,
            helperText: `⚠️ Minimum trade: 100 kSats (${MIN_TRADE_SATS.toLocaleString()} sats)`,
            fieldClass: 'border-yellow-300 focus:border-yellow-500'
        };
    }

    // Check general trade amount limits
    const rule = VALIDATION_RULES.TRADE.AMOUNT;
    if (numAmount > rule.max) {
        return {
            isValid: false,
            message: `Maximum trade amount is ${rule.max.toLocaleString()}`,
            helperText: '⚠️ Amount exceeds maximum limit',
            fieldClass: 'border-red-300 focus:border-red-500'
        };
    }

    return {
        isValid: true,
        message: 'Valid trade amount',
        helperText: '✓ Amount is valid',
        fieldClass: 'border-green-300 focus:border-green-500'
    };
}

/**
 * Validate asset symbols for trading
 * @param {string} fromAsset - Source asset
 * @param {string} toAsset - Target asset
 * @returns {Object} Validation result
 */
export function validateAssetPair(fromAsset, toAsset) {
    if (!fromAsset || !toAsset) {
        return {
            isValid: false,
            message: 'Please select both assets',
            messageClass: 'text-red-600'
        };
    }

    if (fromAsset === toAsset) {
        return {
            isValid: false,
            message: 'Cannot trade the same asset',
            messageClass: 'text-red-600'
        };
    }

    // Ensure one asset is BTC (business rule)
    if (fromAsset !== 'BTC' && toAsset !== 'BTC') {
        return {
            isValid: false,
            message: 'One asset must be BTC',
            messageClass: 'text-yellow-600'
        };
    }

    return {
        isValid: true,
        message: 'Valid asset pair',
        messageClass: 'text-green-600'
    };
}

/**
 * Validate username with frontend-specific requirements
 * @param {string} username - Username to validate
 * @returns {Object} Validation result
 */
export function validateUsername(username) {
    const trimmedUsername = username?.trim();

    if (!trimmedUsername) {
        return {
            isValid: false,
            message: 'Username is required for new accounts',
            fieldClass: 'border-red-300 focus:border-red-500',
            messageClass: 'text-red-600'
        };
    }

    if (trimmedUsername.length < 2) {
        return {
            isValid: false,
            message: 'Username must be at least 2 characters',
            fieldClass: 'border-red-300 focus:border-red-500',
            messageClass: 'text-red-600'
        };
    }

    if (trimmedUsername.length > 50) {
        return {
            isValid: false,
            message: 'Username must be less than 50 characters',
            fieldClass: 'border-red-300 focus:border-red-500',
            messageClass: 'text-red-600'
        };
    }

    // Basic username pattern (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        return {
            isValid: false,
            message: 'Username can only contain letters, numbers, underscore, and hyphen',
            fieldClass: 'border-red-300 focus:border-red-500',
            messageClass: 'text-red-600'
        };
    }

    return {
        isValid: true,
        message: 'Valid username',
        fieldClass: 'border-green-300 focus:border-green-500',
        messageClass: 'text-green-600'
    };
}

/**
 * Validate form field with real-time feedback
 * @param {HTMLElement} field - Form field element
 * @param {string} type - Validation type ('email', 'username', 'amount')
 * @param {Object} options - Additional validation options
 * @returns {Object} Validation result
 */
export function validateField(field, type, options = {}) {
    if (!field) {
        return { isValid: false, message: 'Field not found' };
    }

    const value = field.value;
    let result;

    switch (type) {
        case 'email':
            result = validateEmail(value);
            break;
        case 'username':
            result = validateUsername(value);
            break;
        case 'amount':
            result = validateTradeAmount(value, options.fromAsset);
            break;
        default:
            return { isValid: false, message: 'Unknown validation type' };
    }

    // Apply visual feedback to field
    if (result.fieldClass) {
        field.className = field.className.replace(/border-\w+-\d+/g, '').replace(/focus:border-\w+-\d+/g, '');
        field.className += ` ${result.fieldClass}`;
    }

    return result;
}

/**
 * Validate entire form with multiple fields
 * @param {Object} formData - Form data object
 * @param {Array} validationRules - Array of validation rule objects
 * @returns {Object} Form validation result
 */
export function validateForm(formData, validationRules) {
    const errors = [];
    const fieldErrors = {};

    validationRules.forEach(rule => {
        const { field, type, options = {} } = rule;
        const value = formData[field];

        let result;
        switch (type) {
            case 'email':
                result = validateEmail(value);
                break;
            case 'username':
                result = validateUsername(value);
                break;
            case 'amount':
                result = validateTradeAmount(value, options.fromAsset);
                break;
            default:
                result = { isValid: false, message: 'Unknown validation type' };
        }

        if (!result.isValid) {
            errors.push(result.message);
            fieldErrors[field] = result;
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        fieldErrors,
        message: errors.length > 0 ? errors[0] : 'Form is valid'
    };
}

/**
 * Check if user has sufficient balance for trade
 * @param {number} requestedAmount - Amount user wants to trade
 * @param {number} availableAmount - Available balance
 * @param {number} lockedAmount - Locked amount (for non-BTC assets)
 * @param {string} assetSymbol - Asset symbol
 * @returns {Object} Balance validation result
 */
export function validateSufficientBalance(requestedAmount, availableAmount, lockedAmount = 0, assetSymbol) {
    const actualAvailable = availableAmount - lockedAmount;

    if (requestedAmount > availableAmount) {
        const requestedDecimal = (requestedAmount / 100000000).toFixed(8);
        const availableDecimal = (availableAmount / 100000000).toFixed(8);

        return {
            isValid: false,
            message: `Insufficient balance. You have ${availableDecimal} ${assetSymbol}, but tried to sell ${requestedDecimal} ${assetSymbol}`,
            messageClass: 'text-red-600'
        };
    }

    if (lockedAmount > 0 && requestedAmount > actualAvailable) {
        const requestedDecimal = (requestedAmount / 100000000).toFixed(8);
        const lockedDecimal = (lockedAmount / 100000000).toFixed(8);
        const availableDecimal = (actualAvailable / 100000000).toFixed(8);

        return {
            isValid: false,
            message: `Cannot sell locked assets. You tried to sell ${requestedDecimal} ${assetSymbol}. Currently locked: ${lockedDecimal} ${assetSymbol}. Available to sell: ${availableDecimal} ${assetSymbol}.`,
            messageClass: 'text-yellow-600'
        };
    }

    return {
        isValid: true,
        message: 'Sufficient balance available',
        messageClass: 'text-green-600'
    };
}

/**
 * Validate suggestion/feedback input
 * @param {string} title - Suggestion title
 * @param {string} description - Suggestion description
 * @param {string} type - Suggestion type
 * @returns {Object} Suggestion validation result
 */
export function validateSuggestion(title, description, type) {
    const errors = [];

    if (!title?.trim()) {
        errors.push('Title is required');
    } else if (title.trim().length < 5) {
        errors.push('Title must be at least 5 characters');
    } else if (title.trim().length > 100) {
        errors.push('Title must be less than 100 characters');
    }

    if (!description?.trim()) {
        errors.push('Description is required');
    } else if (description.trim().length < 10) {
        errors.push('Description must be at least 10 characters');
    } else if (description.trim().length > 1000) {
        errors.push('Description must be less than 1000 characters');
    }

    if (!type || !['feature', 'bug', 'improvement'].includes(type)) {
        errors.push('Please select a valid suggestion type');
    }

    return {
        isValid: errors.length === 0,
        errors,
        message: errors.length > 0 ? errors[0] : 'Valid suggestion'
    };
}

/**
 * Real-time input sanitization for numbers
 * @param {string} input - User input
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized input
 */
export function sanitizeNumberInput(input, options = {}) {
    const { maxDecimals = 8, allowNegative = false } = options;

    let sanitized = input.replace(/[^0-9.-]/g, '');

    // Handle negative numbers
    if (!allowNegative) {
        sanitized = sanitized.replace(/-/g, '');
    }

    // Ensure only one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
        sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places
    if (parts.length === 2 && parts[1].length > maxDecimals) {
        sanitized = parts[0] + '.' + parts[1].substring(0, maxDecimals);
    }

    return sanitized;
}

/**
 * Debounced validation for real-time feedback
 * @param {Function} validationFn - Validation function
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced validation function
 */
export function createDebouncedValidator(validationFn, delay = 300) {
    let timeoutId;

    return function(...args) {
        clearTimeout(timeoutId);
        return new Promise((resolve) => {
            timeoutId = setTimeout(() => {
                resolve(validationFn(...args));
            }, delay);
        });
    };
}