const express = require('express');
const axios = require('axios');
const pool = require('../config/database');
const router = express.Router();

// Get current prices and update database
router.get('/prices', async (req, res) => {
  try {
    // Get Bitcoin price with error handling
    let btcPrice = 115000; // Fallback price
    try {
      const btcResponse = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price?ids=bitcoin&vs_currencies=usd`);
      btcPrice = btcResponse.data.bitcoin.usd;
    } catch (error) {
      console.log('Bitcoin API error, using fallback price:', btcPrice);
      // Try to get last known price from database
      const lastPriceResult = await pool.query(
        "SELECT current_price_usd FROM assets WHERE symbol = 'BTC' LIMIT 1"
      );
      if (lastPriceResult.rows.length > 0 && lastPriceResult.rows[0].current_price_usd) {
        btcPrice = parseFloat(lastPriceResult.rows[0].current_price_usd);
      }
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
      'NVDA': 485.60
    };
    
    // Get commodity prices from CoinGecko (with fallbacks)
    // Note: CoinGecko returns gold/silver price per GRAM, not per ounce
    // 1 troy ounce = 31.1035 grams
    let commodityPrices = {};
    try {
      const commodityResponse = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price?ids=gold,silver&vs_currencies=usd`);
      // Convert from per gram to per troy ounce
      const goldPerGram = commodityResponse.data.gold?.usd || 64.29;
      const silverPerGram = commodityResponse.data.silver?.usd || 0.80;
      commodityPrices = {
        'XAU': goldPerGram * 31.1035,  // Convert to per troy ounce
        'XAG': silverPerGram * 31.1035, // Convert to per troy ounce
      };
    } catch (error) {
      console.log('Commodity API error, using fallback prices');
      commodityPrices = {
        'XAU': 2000,  // Gold per troy ounce
        'XAG': 25,    // Silver per troy ounce
      };
    }
    
    const prices = {
      'BTC': btcPrice,
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
        pricesInSats[symbol] = Math.round((priceUsd / btcPrice) * 100000000);
      }
    }
    
    res.json({ 
      pricesUsd: prices, 
      pricesInSats,
      btcPrice 
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