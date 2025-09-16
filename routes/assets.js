const express = require('express');
const axios = require('axios');
const pool = require('../config/database');
const router = express.Router();

// Cache for last valid prices - will be loaded from database on startup
let lastValidPrices = {
  btc: null,
  gold: null,
  silver: null
};

// Load last valid prices from database on startup
async function loadLastValidPrices() {
  try {
    const pricesResult = await pool.query(
      "SELECT symbol, current_price_usd FROM assets WHERE symbol IN ('BTC', 'XAU', 'XAG') AND current_price_usd IS NOT NULL"
    );

    pricesResult.rows.forEach(row => {
      const price = parseFloat(row.current_price_usd);
      if (row.symbol === 'BTC' && price > 10000 && price < 500000) {
        lastValidPrices.btc = price;
      } else if (row.symbol === 'XAU' && price > 1000 && price < 5000) {
        lastValidPrices.gold = price;
      } else if (row.symbol === 'XAG' && price > 10 && price < 100) {
        lastValidPrices.silver = price;
      }
    });

    console.log('Loaded last valid prices:', lastValidPrices);
  } catch (error) {
    console.log('Error loading last valid prices:', error.message);
  }
}

// Load prices on startup
loadLastValidPrices();

// Get current prices and update database
router.get('/prices', async (req, res) => {
  try {
    // Get Bitcoin price with error handling
    let currentBtcPrice = lastValidPrices.btc || 115000; // Use last valid or fallback

    try {
      const btcResponse = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price?ids=bitcoin&vs_currencies=usd`);
      const apiBtcPrice = btcResponse.data.bitcoin.usd;

      // Validate BTC price is reasonable (between $10k and $500k)
      if (apiBtcPrice && apiBtcPrice > 10000 && apiBtcPrice < 500000) {
        currentBtcPrice = apiBtcPrice;
        lastValidPrices.btc = apiBtcPrice; // Update cache
        console.log(`BTC: Updated to API price: $${currentBtcPrice.toFixed(2)}`);
      } else {
        console.log(`BTC: Invalid API price (${apiBtcPrice}), using last valid: $${currentBtcPrice.toFixed(2)}`);
      }
    } catch (error) {
      console.log(`Bitcoin API error, using last valid price: $${currentBtcPrice.toFixed(2)}`);
    }

    // Get stock prices (using a simple mapping for demo)
    const stockSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
    const stockPrices = {};

    // For demo, we'll use mock prices. In production, use a real stock API
    const mockStockPrices = {
      'AAPL': 175.50,
      'TSLA': 248.30,
      'MSFT': 378.20,
      'GOOGL': 138.45,
      'AMZN': 145.80,
      'NVDA': 485.60,
      'SPY': 450.00,  // S&P 500 ETF
      'VNQ': 95.00    // Real Estate ETF
    };

    // Get commodity prices from CoinGecko (with fallbacks)
    // Note: CoinGecko returns gold/silver price per GRAM, not per ounce
    // 1 troy ounce = 31.1035 grams
    let commodityPrices = {
      'XAU': lastValidPrices.gold || 2000,  // Use last valid or fallback
      'XAG': lastValidPrices.silver || 25   // Use last valid or fallback
    };

    try {
      const commodityResponse = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price?ids=gold,silver&vs_currencies=usd`);

      // Validate and convert from per gram to per troy ounce
      const goldPerGram = commodityResponse.data.gold?.usd;
      const silverPerGram = commodityResponse.data.silver?.usd;

      // Validate prices are reasonable (gold should be $50-100 per gram, silver $0.5-2 per gram)
      if (goldPerGram && goldPerGram > 50 && goldPerGram < 100) {
        const goldPrice = goldPerGram * 31.1035; // Convert to per troy ounce
        commodityPrices.XAU = goldPrice;
        lastValidPrices.gold = goldPrice; // Update cache
        console.log(`Gold: Updated to API price: $${goldPrice.toFixed(2)}/oz`);
      } else {
        console.log(`Gold: Invalid API price (${goldPerGram}), using last valid: $${commodityPrices.XAU.toFixed(2)}/oz`);
      }

      if (silverPerGram && silverPerGram > 0.5 && silverPerGram < 2) {
        const silverPrice = silverPerGram * 31.1035; // Convert to per troy ounce
        commodityPrices.XAG = silverPrice;
        lastValidPrices.silver = silverPrice; // Update cache
        console.log(`Silver: Updated to API price: $${silverPrice.toFixed(2)}/oz`);
      } else {
        console.log(`Silver: Invalid API price (${silverPerGram}), using last valid: $${commodityPrices.XAG.toFixed(2)}/oz`);
      }

    } catch (error) {
      console.log('Commodity API error, using last valid prices');
    }

    const prices = {
      'BTC': currentBtcPrice,
      'WTI': 75, // Oil per barrel - using fixed price for now
      ...commodityPrices,
      ...mockStockPrices
    };

    // Update database
    for (const [symbol, priceUsd] of Object.entries(prices)) {
      await pool.query(
        'UPDATE assets SET current_price_usd = $1, last_updated = NOW() WHERE symbol = $2',
        [priceUsd, symbol]
      );
    }

    // Calculate prices in satoshis
    const pricesInSats = {};
    for (const [symbol, priceUsd] of Object.entries(prices)) {
      if (symbol === 'BTC') {
        pricesInSats[symbol] = 100000000; // 1 BTC = 100M sats
      } else {
        pricesInSats[symbol] = Math.round((priceUsd / currentBtcPrice) * 100000000);
      }
    }

    res.json({
      pricesUsd: prices,
      pricesInSats,
      btcPrice: currentBtcPrice
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Get all available assets
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM assets ORDER BY asset_type, symbol');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

module.exports = router;