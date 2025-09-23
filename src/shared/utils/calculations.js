// Shared calculation utilities for portfolio and asset management
// Used by both client and server for consistent calculations

const SATOSHIS_PER_BTC = 100000000; // 100 million satoshis = 1 BTC

/**
 * Converts asset value to satoshis based on current prices
 * @param {number|string} amount - Amount of the asset
 * @param {number} assetPrice - Current price of the asset in USD
 * @param {number} btcPrice - Current price of Bitcoin in USD
 * @returns {BigInt} Value in satoshis
 */
function calculateSatsValue(amount, assetPrice, btcPrice) {
    if (!assetPrice || !btcPrice || assetPrice <= 0 || btcPrice <= 0) {
        return BigInt(0);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return BigInt(0);
    }

    try {
        const usdValue = numAmount * Number(assetPrice);
        const btcValue = usdValue / Number(btcPrice);
        const satsValue = Math.floor(btcValue * SATOSHIS_PER_BTC);

        return BigInt(satsValue);
    } catch (error) {
        console.error('Error calculating sats value:', error);
        return BigInt(0);
    }
}

/**
 * Converts satoshis back to USD value
 * @param {BigInt|string|number} sats - Amount in satoshis
 * @param {number} btcPrice - Current price of Bitcoin in USD
 * @returns {number} USD value
 */
function satsToUsd(sats, btcPrice) {
    if (!btcPrice || btcPrice <= 0) return 0;

    try {
        const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats);
        const btcAmount = Number(satsBigInt) / SATOSHIS_PER_BTC;
        return btcAmount * btcPrice;
    } catch (error) {
        console.error('Error converting sats to USD:', error);
        return 0;
    }
}

/**
 * Converts satoshis to BTC amount
 * @param {BigInt|string|number} sats - Amount in satoshis
 * @returns {number} BTC amount
 */
function satsToBtc(sats) {
    try {
        const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats);
        return Number(satsBigInt) / SATOSHIS_PER_BTC;
    } catch (error) {
        console.error('Error converting sats to BTC:', error);
        return 0;
    }
}

/**
 * Converts BTC to satoshis
 * @param {number} btc - Amount in BTC
 * @returns {BigInt} Amount in satoshis
 */
function btcToSats(btc) {
    if (typeof btc !== 'number' || isNaN(btc) || btc < 0) {
        return BigInt(0);
    }

    try {
        return BigInt(Math.floor(btc * SATOSHIS_PER_BTC));
    } catch (error) {
        console.error('Error converting BTC to sats:', error);
        return BigInt(0);
    }
}

/**
 * Calculates portfolio performance metrics
 * @param {Array} holdings - Array of portfolio holdings
 * @param {Object} currentPrices - Current asset prices
 * @param {Object} historicalPrices - Historical prices for comparison
 * @returns {Object} Performance metrics
 */
function calculatePerformanceMetrics(holdings, currentPrices, historicalPrices = {}) {
    if (!holdings || !Array.isArray(holdings) || !currentPrices) {
        return {
            totalValueSats: BigInt(0),
            totalValueUsd: 0,
            totalChangeSats: BigInt(0),
            totalChangePercent: 0,
            dailyChangeSats: BigInt(0),
            dailyChangePercent: 0
        };
    }

    const btcPrice = currentPrices.BTC || 0;
    let totalCurrentSats = BigInt(0);
    let totalHistoricalSats = BigInt(0);
    let totalDailyChangeSats = BigInt(0);

    holdings.forEach(holding => {
        const symbol = holding.assetSymbol || holding.symbol;
        const amount = holding.amount || 0;

        // Current value
        const currentPrice = currentPrices[symbol] || 0;
        const currentSats = calculateSatsValue(amount, currentPrice, btcPrice);
        totalCurrentSats += currentSats;

        // Historical value for total performance
        const historicalPrice = historicalPrices[symbol] || currentPrice;
        const historicalSats = calculateSatsValue(amount, historicalPrice, btcPrice);
        totalHistoricalSats += historicalSats;

        // Daily change (if available)
        const yesterdayPrice = holding.yesterdayPrice || currentPrice;
        const yesterdaySats = calculateSatsValue(amount, yesterdayPrice, btcPrice);
        totalDailyChangeSats += (currentSats - yesterdaySats);
    });

    // Calculate percentages
    const totalChangePercent = totalHistoricalSats > 0
        ? Number((totalCurrentSats - totalHistoricalSats) * BigInt(10000) / totalHistoricalSats) / 100
        : 0;

    const dailyChangePercent = totalCurrentSats > 0
        ? Number(totalDailyChangeSats * BigInt(10000) / totalCurrentSats) / 100
        : 0;

    return {
        totalValueSats: totalCurrentSats,
        totalValueUsd: satsToUsd(totalCurrentSats, btcPrice),
        totalChangeSats: totalCurrentSats - totalHistoricalSats,
        totalChangePercent,
        dailyChangeSats: totalDailyChangeSats,
        dailyChangePercent
    };
}

/**
 * Calculates individual holding performance
 * @param {Object} holding - Portfolio holding
 * @param {Object} currentPrices - Current asset prices
 * @param {number} purchasePrice - Original purchase price
 * @returns {Object} Holding performance data
 */
function calculateHoldingPerformance(holding, currentPrices, purchasePrice = null) {
    const symbol = holding.assetSymbol || holding.symbol;
    const amount = holding.amount || 0;
    const currentPrice = currentPrices[symbol] || 0;
    const btcPrice = currentPrices.BTC || 0;

    const currentValueSats = calculateSatsValue(amount, currentPrice, btcPrice);
    const currentValueUsd = satsToUsd(currentValueSats, btcPrice);

    let performance = {
        currentValueSats: currentValueSats.toString(),
        currentValueUsd,
        currentPrice,
        changePercent: 0,
        changeSats: BigInt(0),
        changeUsd: 0
    };

    if (purchasePrice && purchasePrice > 0) {
        const purchaseValueSats = calculateSatsValue(amount, purchasePrice, btcPrice);
        const changeSats = currentValueSats - purchaseValueSats;
        const changePercent = purchaseValueSats > 0
            ? Number(changeSats * BigInt(10000) / purchaseValueSats) / 100
            : 0;

        performance.changeSats = changeSats;
        performance.changePercent = changePercent;
        performance.changeUsd = satsToUsd(changeSats, btcPrice);
        performance.purchasePrice = purchasePrice;
        performance.purchaseValueSats = purchaseValueSats.toString();
    }

    return performance;
}

/**
 * Validates calculation inputs
 * @param {Object} params - Parameters to validate
 * @returns {boolean} Whether inputs are valid
 */
function validateCalculationInputs(params) {
    const { amount, price, btcPrice } = params;

    return (
        typeof amount === 'number' && !isNaN(amount) && amount >= 0 &&
        typeof price === 'number' && !isNaN(price) && price > 0 &&
        typeof btcPrice === 'number' && !isNaN(btcPrice) && btcPrice > 0
    );
}

module.exports = {
    SATOSHIS_PER_BTC,
    calculateSatsValue,
    satsToUsd,
    satsToBtc,
    btcToSats,
    calculatePerformanceMetrics,
    calculateHoldingPerformance,
    validateCalculationInputs
};