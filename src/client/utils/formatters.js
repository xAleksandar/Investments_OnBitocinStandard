/**
 * Frontend-specific formatting utilities
 * Complements shared formatters with UI-specific formatting needs
 */

/**
 * Format asset display name for dropdowns and UI elements
 * @param {Object} asset - Asset object with name and symbol
 * @returns {string} Formatted display name
 */
export function formatAssetDisplayName(asset) {
    if (!asset || !asset.name || !asset.symbol) {
        return 'Unknown Asset';
    }
    return `${asset.name} (${asset.symbol})`;
}

/**
 * Format satoshis to BTC with appropriate precision for UI display
 * @param {number|string} sats - Satoshi amount
 * @param {boolean} compact - Whether to use compact formatting
 * @returns {string} Formatted BTC amount
 */
export function formatSatoshisForUI(sats, compact = false) {
    if (!sats || isNaN(sats)) return '0.00000000 BTC';

    const btc = Number(sats) / 100000000;

    if (compact) {
        // Compact formatting for smaller displays
        if (btc >= 1) {
            return `${btc.toFixed(4)} BTC`;
        } else {
            return `${btc.toFixed(8)} BTC`;
        }
    }

    // Full precision for main displays
    return btc < 0.001 ? `${btc.toFixed(8)} BTC` : `${btc.toFixed(4)} BTC`;
}

/**
 * Format percentage with proper sign and color indicators
 * @param {number} percentage - Percentage value
 * @param {boolean} includeSign - Whether to include + for positive values
 * @returns {Object} Formatted percentage with style info
 */
export function formatPercentageWithStyle(percentage, includeSign = true) {
    if (isNaN(percentage)) {
        return {
            text: '0.00%',
            colorClass: 'text-gray-500',
            isPositive: false
        };
    }

    const value = Number(percentage);
    const isPositive = value >= 0;
    const sign = includeSign && isPositive ? '+' : '';

    return {
        text: `${sign}${value.toFixed(2)}%`,
        colorClass: isPositive ? 'text-green-600' : 'text-red-600',
        isPositive
    };
}

/**
 * Format price multiplier for display (e.g., "2.5x")
 * @param {number} current - Current price
 * @param {number} old - Previous price
 * @returns {string} Formatted multiplier
 */
export function formatPriceMultiplier(current, old) {
    if (!current || !old || old === 0) return '1.0x';

    const multiplier = current / old;
    return `${multiplier.toFixed(1)}x`;
}

/**
 * Format trade amount for display in trade history
 * @param {number} amount - Raw amount (in smallest units)
 * @param {string} asset - Asset symbol
 * @returns {string} Formatted trade amount
 */
export function formatTradeAmount(amount, asset) {
    if (!amount || isNaN(amount)) return `0 ${asset}`;

    if (asset === 'BTC') {
        const btc = amount / 100000000;
        return `${btc.toFixed(8)} BTC`;
    } else {
        // Other assets stored as integer with 8 decimal precision
        const actualAmount = amount / 100000000;
        return `${actualAmount.toFixed(8)} ${asset}`;
    }
}

/**
 * Format USD amount with appropriate precision for tooltips and details
 * @param {number} amount - USD amount
 * @param {boolean} compact - Whether to use compact formatting
 * @returns {string} Formatted USD amount
 */
export function formatUsdForUI(amount, compact = false) {
    if (!amount || isNaN(amount)) return '$0.00';

    const value = Number(amount);

    if (compact && value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    } else if (compact && value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }

    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format asset amount for holding display
 * @param {Object} holding - Holding object
 * @returns {string} Formatted holding amount
 */
export function formatHoldingDisplay(holding) {
    if (!holding || !holding.asset_symbol) return '';

    if (holding.asset_symbol === 'BTC') {
        return formatSatoshisForUI(holding.amount);
    } else {
        // Convert back from stored integer to actual shares
        const actualAmount = holding.amount / 100000000;
        return `${actualAmount.toFixed(8)} ${holding.asset_symbol}`;
    }
}

/**
 * Format date for trade history and timeline displays
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export function formatDateForUI(date, includeTime = false) {
    if (!date) return '';

    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) return '';

    if (includeTime) {
        return dateObj.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format lock status for display with appropriate styling
 * @param {string} lockStatus - Lock status ('locked', 'partial', 'unlocked')
 * @returns {Object} Lock status display info
 */
export function formatLockStatus(lockStatus) {
    const statusMap = {
        locked: {
            text: 'Locked',
            icon: '🔒',
            colorClass: 'text-red-500',
            bgClass: 'bg-red-50'
        },
        partial: {
            text: 'Partially Locked',
            icon: '🔓',
            colorClass: 'text-yellow-500',
            bgClass: 'bg-yellow-50'
        },
        unlocked: {
            text: 'Available',
            icon: '',
            colorClass: 'text-green-500',
            bgClass: 'bg-green-50'
        }
    };

    return statusMap[lockStatus] || statusMap.unlocked;
}

/**
 * Format performance summary for tooltips
 * @param {Object} performance - Performance data
 * @returns {string} Formatted performance summary
 */
export function formatPerformanceTooltip(performance) {
    if (!performance) return 'No performance data';

    const {
        currentBitcoinPrice,
        currentAssetPrice,
        assetPriceOld,
        btcPriceOld,
        assetPriceCurrent,
        btcPriceCurrent,
        selectedAsset
    } = performance;

    const assetMultiplier = formatPriceMultiplier(assetPriceCurrent, assetPriceOld);
    const btcMultiplier = formatPriceMultiplier(btcPriceCurrent, btcPriceOld);

    return `${selectedAsset}: ${formatUsdForUI(assetPriceOld)} → ${formatUsdForUI(assetPriceCurrent)} (${assetMultiplier})\n` +
           `Bitcoin: ${formatUsdForUI(btcPriceOld)} → ${formatUsdForUI(btcPriceCurrent)} (${btcMultiplier})`;
}

/**
 * Format number with commas and appropriate decimal places for UI
 * @param {number} num - Number to format
 * @param {number} maxDecimals - Maximum decimal places
 * @returns {string} Formatted number
 */
export function formatNumberForUI(num, maxDecimals = 2) {
    if (!num || isNaN(num)) return '0';

    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals
    });
}

/**
 * Format time remaining for locks
 * @param {Date|string} lockUntil - Lock expiration date
 * @returns {string} Formatted time remaining
 */
export function formatTimeRemaining(lockUntil) {
    if (!lockUntil) return '';

    const lockDate = lockUntil instanceof Date ? lockUntil : new Date(lockUntil);
    const now = new Date();
    const diff = lockDate.getTime() - now.getTime();

    if (diff <= 0) return 'Unlocked';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
    } else {
        return `${minutes}m remaining`;
    }
}

/**
 * Format compact number for mobile displays
 * @param {number} num - Number to format
 * @returns {string} Compact formatted number
 */
export function formatCompactNumber(num) {
    if (!num || isNaN(num)) return '0';

    const value = Number(num);

    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
    }

    return value.toFixed(2);
}