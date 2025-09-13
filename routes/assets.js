const express = require('express');
const axios = require('axios');
const pool = require('../config/database');
const router = express.Router();

// Get current prices and update database
router.get('/prices', async (req, res) => {
  try {
    // Get Bitcoin price
    const btcResponse = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price?ids=bitcoin&vs_currencies=usd`);
    const btcPrice = btcResponse.data.bitcoin.usd;
    
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
    let commodityPrices = {};
    try {
      const commodityResponse = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price?ids=gold,silver&vs_currencies=usd`);
      commodityPrices = {
        'XAU': commodityResponse.data.gold?.usd || 2000,
        'XAG': commodityResponse.data.silver?.usd || 25,
      };
    } catch (error) {
      console.log('Commodity API error, using fallback prices');
      commodityPrices = {
        'XAU': 2000,
        'XAG': 25,
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