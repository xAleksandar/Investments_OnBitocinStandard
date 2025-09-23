// Shared formatting utilities for numbers, currency, and percentages
// Used by both client and server for consistent display formatting

/**
 * Formats a number with commas for thousands separators
 * @param {number|string} num - Number to format
 * @param {number} decimals - Number of decimal places (optional)
 * @returns {string} Formatted number string
 */
function formatNumber(num, decimals = null) {
    if (num === null || num === undefined || isNaN(num)) return '0';

    const number = Number(num);
    const options = {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals !== null ? decimals : 8
    };

    return number.toLocaleString('en-US', options);
}

/**
 * Formats a USD amount with proper currency display
 * @param {number|string} amount - Amount in USD
 * @param {boolean} showCents - Whether to show cents (default: true)
 * @returns {string} Formatted USD string
 */
function formatUsd(amount, showCents = true) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';

    const number = Number(amount);
    const options = {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: showCents ? 2 : 0,
        maximumFractionDigits: showCents ? 2 : 0
    };

    return number.toLocaleString('en-US', options);
}

/**
 * Formats satoshis as Bitcoin amount
 * @param {BigInt|string|number} sats - Amount in satoshis
 * @param {number} decimals - Number of decimal places (default: 8)
 * @returns {string} Formatted BTC string
 */
function formatBtc(sats, decimals = 8) {
    if (sats === null || sats === undefined) return '0 BTC';

    try {
        const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats);
        const btcAmount = Number(satsBigInt) / 100000000; // 100M sats = 1 BTC

        const options = {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        };

        return `${btcAmount.toLocaleString('en-US', options)} BTC`;
    } catch (error) {
        return '0 BTC';
    }
}

/**
 * Formats satoshis with "sats" suffix
 * @param {BigInt|string|number} sats - Amount in satoshis
 * @returns {string} Formatted sats string
 */
function formatSats(sats) {
    if (sats === null || sats === undefined) return '0 sats';

    try {
        const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats);
        const satsNumber = Number(satsBigInt);

        return `${formatNumber(satsNumber, 0)} sats`;
    } catch (error) {
        return '0 sats';
    }
}

/**
 * Formats a percentage with proper sign and color indication
 * @param {number|string} percent - Percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {boolean} showSign - Whether to show + for positive values (default: true)
 * @returns {Object} Object with formatted string and color class
 */
function formatPercentage(percent, decimals = 2, showSign = true) {
    if (percent === null || percent === undefined || isNaN(percent)) {
        return { formatted: '0.00%', colorClass: 'neutral' };
    }

    const number = Number(percent);
    const sign = number > 0 && showSign ? '+' : '';
    const formatted = `${sign}${number.toFixed(decimals)}%`;

    let colorClass = 'neutral';
    if (number > 0) {
        colorClass = 'positive';
    } else if (number < 0) {
        colorClass = 'negative';
    }

    return { formatted, colorClass };
}

/**
 * Formats a compact number with K, M, B suffixes
 * @param {number|string} num - Number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Compact formatted number
 */
function formatCompactNumber(num, decimals = 1) {
    if (num === null || num === undefined || isNaN(num)) return '0';

    const number = Number(num);
    const absNumber = Math.abs(number);

    if (absNumber < 1000) {
        return formatNumber(number, decimals);
    } else if (absNumber < 1000000) {
        return `${(number / 1000).toFixed(decimals)}K`;
    } else if (absNumber < 1000000000) {
        return `${(number / 1000000).toFixed(decimals)}M`;
    } else {
        return `${(number / 1000000000).toFixed(decimals)}B`;
    }
}

/**
 * Formats a compact USD amount with K, M, B suffixes
 * @param {number|string} amount - USD amount to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Compact formatted USD string
 */
function formatCompactUsd(amount, decimals = 1) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0';

    const number = Number(amount);
    const absNumber = Math.abs(number);
    const sign = number < 0 ? '-' : '';

    if (absNumber < 1000) {
        return formatUsd(number, true);
    } else if (absNumber < 1000000) {
        return `${sign}$${(absNumber / 1000).toFixed(decimals)}K`;
    } else if (absNumber < 1000000000) {
        return `${sign}$${(absNumber / 1000000).toFixed(decimals)}M`;
    } else {
        return `${sign}$${(absNumber / 1000000000).toFixed(decimals)}B`;
    }
}

/**
 * Formats a number for input fields (removes formatting)
 * @param {string} formattedNumber - Formatted number string
 * @returns {string} Clean number string for input
 */
function parseFormattedNumber(formattedNumber) {
    if (!formattedNumber) return '';

    // Remove commas, currency symbols, and other formatting
    return formattedNumber
        .toString()
        .replace(/[$,\s]/g, '')
        .replace(/[^\d.-]/g, '');
}

/**
 * Formats a price change with proper styling
 * @param {number} currentPrice - Current price
 * @param {number} previousPrice - Previous price
 * @param {boolean} showUsd - Whether to show USD amounts (default: true)
 * @returns {Object} Object with formatted values and styling
 */
function formatPriceChange(currentPrice, previousPrice, showUsd = true) {
    if (!currentPrice || !previousPrice) {
        return {
            change: '$0.00',
            changePercent: '0.00%',
            colorClass: 'neutral'
        };
    }

    const changeAmount = currentPrice - previousPrice;
    const changePercent = (changeAmount / previousPrice) * 100;

    const change = showUsd ? formatUsd(changeAmount) : formatNumber(changeAmount, 2);
    const percentFormatted = formatPercentage(changePercent);

    return {
        change,
        changePercent: percentFormatted.formatted,
        colorClass: percentFormatted.colorClass
    };
}

/**
 * Formats an asset amount with proper precision
 * @param {number|string} amount - Amount of asset
 * @param {string} symbol - Asset symbol
 * @param {number} maxDecimals - Maximum decimal places (default: 8)
 * @returns {string} Formatted asset amount
 */
function formatAssetAmount(amount, symbol, maxDecimals = 8) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return `0 ${symbol}`;
    }

    const number = Number(amount);

    // For very small amounts, show more decimals
    let decimals = maxDecimals;
    if (number < 0.001) {
        decimals = 8;
    } else if (number < 1) {
        decimals = 6;
    } else if (number < 100) {
        decimals = 4;
    } else {
        decimals = 2;
    }

    decimals = Math.min(decimals, maxDecimals);

    return `${formatNumber(number, decimals)} ${symbol}`;
}

/**
 * Formats a large satoshi amount for display (shows both sats and BTC)
 * @param {BigInt|string|number} sats - Amount in satoshis
 * @returns {string} Formatted string showing both units
 */
function formatLargeSats(sats) {
    if (sats === null || sats === undefined) return '0 sats (0 BTC)';

    try {
        const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats);
        const satsNumber = Number(satsBigInt);
        const btcAmount = satsNumber / 100000000;

        if (satsNumber >= 100000000) { // 1 BTC or more
            return `${formatNumber(satsNumber, 0)} sats (${formatNumber(btcAmount, 8)} BTC)`;
        } else {
            return formatSats(sats);
        }
    } catch (error) {
        return '0 sats';
    }
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';

    return text.substring(0, maxLength - 3) + '...';
}

module.exports = {
    formatNumber,
    formatUsd,
    formatBtc,
    formatSats,
    formatPercentage,
    formatCompactNumber,
    formatCompactUsd,
    parseFormattedNumber,
    formatPriceChange,
    formatAssetAmount,
    formatLargeSats,
    truncateText
};