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
// Get 5-year performance for an asset vs Bitcoin
router.get('/performance/:symbol/5y', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const now = new Date();
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

        // Map symbols to Yahoo Finance tickers
        const yahooSymbols = {
            'XAU': 'GC=F',    // Gold futures
            'XAG': 'SI=F',    // Silver futures
            'SPY': 'SPY',
            'AAPL': 'AAPL',
            'TSLA': 'TSLA',
            'MSFT': 'MSFT',
            'GOOGL': 'GOOGL',
            'AMZN': 'AMZN',
            'NVDA': 'NVDA',
            'VNQ': 'VNQ',
            'WTI': 'CL=F'     // Crude oil futures
        };

        const yahooSymbol = yahooSymbols[symbol];
        if (!yahooSymbol) {
            return res.json({ performance: null });
        }

        // Fetch historical data for the asset (5 years ago, with a 7-day range to ensure we get data)
        const startRange = Math.floor((fiveYearsAgo.getTime() - 7 * 24 * 60 * 60 * 1000) / 1000); // 7 days before
        const endRange = Math.floor((fiveYearsAgo.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000); // 7 days after

        const assetHistoricalUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startRange}&period2=${endRange}&interval=1d`;
        const btcHistoricalUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${startRange}&period2=${endRange}&interval=1d`;

        // Get current prices
        const assetCurrentUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        const btcCurrentUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD`;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        // Fetch all data in parallel
        const [assetHistRes, btcHistRes, assetCurrRes, btcCurrRes] = await Promise.all([
            axios.get(assetHistoricalUrl, { headers }),
            axios.get(btcHistoricalUrl, { headers }),
            axios.get(assetCurrentUrl, { headers }),
            axios.get(btcCurrentUrl, { headers })
        ]);

        // Extract historical prices (get the middle/closest date from the range)
        let assetPriceOld = null;
        const assetData = assetHistRes.data.chart.result[0];
        if (assetData.indicators?.quote?.[0]?.close) {
            const closePrices = assetData.indicators.quote[0].close.filter(price => price !== null);
            if (closePrices.length > 0) {
                // Use the middle price from available data, or the last one
                const middleIndex = Math.floor(closePrices.length / 2);
                assetPriceOld = closePrices[middleIndex] || closePrices[closePrices.length - 1];
            }
        }

        let btcPriceOld = null;
        const btcData = btcHistRes.data.chart.result[0];
        if (btcData.indicators?.quote?.[0]?.close) {
            const closePrices = btcData.indicators.quote[0].close.filter(price => price !== null);
            if (closePrices.length > 0) {
                // Use the middle price from available data, or the last one
                const middleIndex = Math.floor(closePrices.length / 2);
                btcPriceOld = closePrices[middleIndex] || closePrices[closePrices.length - 1];
            }
        }

        const assetPriceCurrent = assetCurrRes.data.chart.result[0].meta.regularMarketPrice;
        const btcPriceCurrent = btcCurrRes.data.chart.result[0].meta.regularMarketPrice;

        // Validate that we have all required data
        if (!assetPriceOld || !btcPriceOld || !assetPriceCurrent || !btcPriceCurrent) {
            console.log(`Missing price data for ${symbol}:`, {
                assetPriceOld,
                btcPriceOld,
                assetPriceCurrent,
                btcPriceCurrent
            });
            return res.json({ performance: null });
        }

        // Validate that prices are reasonable (positive numbers)
        if (assetPriceOld <= 0 || btcPriceOld <= 0 || assetPriceCurrent <= 0 || btcPriceCurrent <= 0) {
            console.log(`Invalid price data for ${symbol}:`, {
                assetPriceOld,
                btcPriceOld,
                assetPriceCurrent,
                btcPriceCurrent
            });
            return res.json({ performance: null });
        }

        // Calculate 5-year performance vs Bitcoin
        const assetRatio5YAgo = assetPriceOld / btcPriceOld;
        const assetRatioNow = assetPriceCurrent / btcPriceCurrent;
        const performance = ((assetRatioNow - assetRatio5YAgo) / assetRatio5YAgo) * 100;

        console.log(`5Y Performance for ${symbol}:`, {
            assetPriceOld,
            btcPriceOld,
            assetPriceCurrent,
            btcPriceCurrent,
            assetRatio5YAgo,
            assetRatioNow,
            performance: performance.toFixed(2) + '%'
        });

        res.json({ performance });

    } catch (error) {
        console.error('Error fetching 5Y performance:', error.message);
        res.json({ performance: null });
    }
});

// Get performance for an asset vs Bitcoin over different time periods
router.get('/performance/:symbol/:period', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const period = req.params.period;

        const now = new Date();
        let startDate;

        // Define time periods
        switch(period) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            case '5y':
                startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
                break;
            case '10y':
                startDate = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
                break;
            default:
                return res.status(400).json({ error: 'Invalid period. Use: 24h, 1y, 5y, 10y' });
        }

        // Map symbols to Yahoo Finance tickers
        const yahooSymbols = {
            'XAU': 'GC=F',    // Gold futures
            'XAG': 'SI=F',    // Silver futures
            'SPY': 'SPY',
            'AAPL': 'AAPL',
            'TSLA': 'TSLA',
            'MSFT': 'MSFT',
            'GOOGL': 'GOOGL',
            'AMZN': 'AMZN',
            'NVDA': 'NVDA',
            'VNQ': 'VNQ',
            'WTI': 'CL=F'     // Crude oil futures
        };

        const yahooSymbol = yahooSymbols[symbol];
        if (!yahooSymbol) {
            return res.json({ performance: null });
        }

        // For very long periods, adjust the range to get better data
        const timeRangeMs = now.getTime() - startDate.getTime();
        const rangeBuffer = Math.min(7 * 24 * 60 * 60 * 1000, timeRangeMs * 0.01); // 7 days or 1% of period

        const startRange = Math.floor((startDate.getTime() - rangeBuffer) / 1000);
        const endRange = Math.floor((startDate.getTime() + rangeBuffer) / 1000);

        // Fetch historical data
        const assetHistoricalUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startRange}&period2=${endRange}&interval=1d`;
        const btcHistoricalUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${startRange}&period2=${endRange}&interval=1d`;

        // Get current prices
        const assetCurrentUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        const btcCurrentUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD`;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        // Fetch all data in parallel
        const [assetHistRes, btcHistRes, assetCurrRes, btcCurrRes] = await Promise.all([
            axios.get(assetHistoricalUrl, { headers }),
            axios.get(btcHistoricalUrl, { headers }),
            axios.get(assetCurrentUrl, { headers }),
            axios.get(btcCurrentUrl, { headers })
        ]);

        // Extract historical prices
        let assetPriceOld = null;
        const assetData = assetHistRes.data.chart.result[0];
        if (assetData.indicators?.quote?.[0]?.close) {
            const closePrices = assetData.indicators.quote[0].close.filter(price => price !== null);
            if (closePrices.length > 0) {
                // Use the middle price from available data
                const middleIndex = Math.floor(closePrices.length / 2);
                assetPriceOld = closePrices[middleIndex] || closePrices[closePrices.length - 1];
            }
        }

        let btcPriceOld = null;
        const btcData = btcHistRes.data.chart.result[0];
        if (btcData.indicators?.quote?.[0]?.close) {
            const closePrices = btcData.indicators.quote[0].close.filter(price => price !== null);
            if (closePrices.length > 0) {
                // Use the middle price from available data
                const middleIndex = Math.floor(closePrices.length / 2);
                btcPriceOld = closePrices[middleIndex] || closePrices[closePrices.length - 1];
            }
        }

        const assetPriceCurrent = assetCurrRes.data.chart.result[0].meta.regularMarketPrice;
        const btcPriceCurrent = btcCurrRes.data.chart.result[0].meta.regularMarketPrice;

        // Validate data
        if (!assetPriceOld || !btcPriceOld || !assetPriceCurrent || !btcPriceCurrent ||
            assetPriceOld <= 0 || btcPriceOld <= 0 || assetPriceCurrent <= 0 || btcPriceCurrent <= 0) {
            console.log(`Missing/invalid price data for ${symbol} ${period}:`, {
                assetPriceOld, btcPriceOld, assetPriceCurrent, btcPriceCurrent
            });
            return res.json({ performance: null });
        }

        // Calculate performance vs Bitcoin
        const assetRatioOld = assetPriceOld / btcPriceOld;
        const assetRatioNow = assetPriceCurrent / btcPriceCurrent;
        const performance = ((assetRatioNow - assetRatioOld) / assetRatioOld) * 100;

        console.log(`${period.toUpperCase()} Performance for ${symbol}:`, {
            period,
            startDate: startDate.toISOString().split('T')[0],
            assetPriceOld,
            btcPriceOld,
            assetPriceCurrent,
            btcPriceCurrent,
            performance: performance.toFixed(2) + '%'
        });

        res.json({ performance, period, startDate: startDate.toISOString() });

    } catch (error) {
        console.error(`Error fetching ${req.params.period} performance:`, error.message);
        res.json({ performance: null });
    }
});

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