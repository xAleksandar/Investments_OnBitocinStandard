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

      // Validate BTC price is reasonable (between $50k and $200k)
      if (apiBtcPrice && apiBtcPrice > 50000 && apiBtcPrice < 200000) {
        currentBtcPrice = apiBtcPrice;
        lastValidPrices.btc = apiBtcPrice; // Update cache
        console.log(`BTC: Updated to API price: $${currentBtcPrice.toFixed(2)}`);
      } else {
        console.log(`BTC: Invalid API price (${apiBtcPrice}), using last valid: $${currentBtcPrice.toFixed(2)}`);
      }
    } catch (error) {
      console.log(`Bitcoin API error, using last valid price: $${currentBtcPrice.toFixed(2)}`);
    }

    // Get stock prices from Yahoo Finance (free, no API key required)
    const stockSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'SPY', 'VNQ'];
    let stockPrices = {};

    // Fallback prices if API fails
    const fallbackStockPrices = {
      'AAPL': 175.50,
      'TSLA': 248.30,
      'MSFT': 378.20,
      'GOOGL': 138.45,
      'AMZN': 145.80,
      'NVDA': 485.60,
      'SPY': 450.00,
      'VNQ': 95.00
    };

    // Fetch real stock prices from Yahoo Finance
    try {
      const stockPromises = stockSymbols.map(async symbol => {
        try {
          // Yahoo Finance API v8 (free, no key required)
          const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          const price = response.data.chart.result[0].meta.regularMarketPrice;
          console.log(`${symbol}: Fetched real price: $${price}`);
          return { symbol, price };
        } catch (error) {
          console.log(`${symbol}: Failed to fetch, using fallback price`);
          return { symbol, price: fallbackStockPrices[symbol] };
        }
      });

      const results = await Promise.all(stockPromises);
      results.forEach(({ symbol, price }) => {
        stockPrices[symbol] = price;
      });
    } catch (error) {
      console.log('Failed to fetch stock prices, using fallback prices');
      stockPrices = fallbackStockPrices;
    }

    // Get commodity prices - fallbacks first
    let commodityPrices = {
      'XAU': 2700,  // Gold per troy ounce - default fallback
      'XAG': 32,    // Silver per troy ounce - default fallback
      'WTI': 75     // Oil per barrel - default fallback
    };

    // Try to fetch gold and silver prices from Yahoo Finance
    try {
      // Gold futures (GC=F)
      const goldResponse = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/GC=F', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const goldPrice = goldResponse.data.chart.result[0].meta.regularMarketPrice;
      commodityPrices.XAU = goldPrice;
      lastValidPrices.gold = goldPrice;
      console.log(`Gold: Fetched real price: $${goldPrice.toFixed(2)}/oz`);
    } catch (error) {
      console.log('Gold: Failed to fetch from Yahoo, using fallback price');
    }

    try {
      // Silver futures (SI=F)
      const silverResponse = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/SI=F', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const silverPrice = silverResponse.data.chart.result[0].meta.regularMarketPrice;
      commodityPrices.XAG = silverPrice;
      lastValidPrices.silver = silverPrice;
      console.log(`Silver: Fetched real price: $${silverPrice.toFixed(2)}/oz`);
    } catch (error) {
      console.log('Silver: Failed to fetch from Yahoo, using fallback price');
    }

    // Try to fetch oil price from Yahoo Finance
    try {
      const oilResponse = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/CL=F', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const oilPrice = oilResponse.data.chart.result[0].meta.regularMarketPrice;
      commodityPrices.WTI = oilPrice;
      console.log(`WTI Oil: Fetched real price: $${oilPrice}`);
    } catch (error) {
      console.log('WTI Oil: Failed to fetch, using fallback price');
    }

    const prices = {
      'BTC': currentBtcPrice,
      ...commodityPrices,
      ...stockPrices
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