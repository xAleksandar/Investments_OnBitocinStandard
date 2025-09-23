const axios = require('axios');
const BaseService = require('./base-service');

/**
 * Lazy-loading price cache service
 * Fetches prices on-demand and caches them in database
 */
class PriceCacheService extends BaseService {
  constructor() {
    super();
    // Cache TTL in minutes
    this.cacheTTL = 5; // 5 minutes
  }

  /**
   * Get price for a symbol, fetching and caching if needed
   * @param {string} symbol - Asset symbol (BTC, AAPL, CPER, etc.)
   * @returns {Promise<number|null>} Price in USD or null if failed
   */
  async getPrice(symbol) {
    try {
      // Check cache first
      const cachedPrice = await this.getCachedPrice(symbol);
      if (cachedPrice !== null) {
        return cachedPrice;
      }

      // Cache miss or expired - fetch from API
      const price = await this.fetchPrice(symbol);
      if (price !== null) {
        await this.cachePrice(symbol, price);
      }

      return price;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Get multiple prices at once
   * @param {string[]} symbols - Array of symbols
   * @returns {Promise<Object>} Map of symbol -> price
   */
  async getPrices(symbols) {
    const prices = {};

    // Process in parallel for better performance
    const results = await Promise.allSettled(
      symbols.map(symbol => this.getPrice(symbol))
    );

    symbols.forEach((symbol, index) => {
      const result = results[index];
      if (result.status === 'fulfilled' && result.value !== null) {
        prices[symbol] = result.value;
      }
    });

    return prices;
  }

  /**
   * Check if we have a cached price that's not expired
   * @param {string} symbol
   * @returns {Promise<number|null>}
   */
  async getCachedPrice(symbol) {
    try {
      const cacheExpiry = new Date();
      cacheExpiry.setMinutes(cacheExpiry.getMinutes() - this.cacheTTL);

      const result = await this.prisma.asset.findFirst({
        where: {
          symbol: symbol,
          lastUpdated: {
            gt: cacheExpiry
          },
          currentPriceUsd: {
            not: null
          }
        },
        select: {
          currentPriceUsd: true,
          lastUpdated: true
        }
      });

      if (result && result.currentPriceUsd) {
        const price = parseFloat(result.currentPriceUsd);
        console.log(`Cache hit for ${symbol}: $${price}`);
        return price;
      }

      return null;
    } catch (error) {
      console.error(`Cache check failed for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch price from external API
   * @param {string} symbol
   * @returns {Promise<number|null>}
   */
  async fetchPrice(symbol) {
    try {
      if (symbol === 'BTC') {
        return await this.fetchBitcoinPrice();
      } else if (['XAU', 'XAG', 'WTI'].includes(symbol)) {
        return await this.fetchCommodityPrice(symbol);
      } else {
        return await this.fetchStockPrice(symbol);
      }
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch Bitcoin price from CoinGecko
   */
  async fetchBitcoinPrice() {
    const response = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price?ids=bitcoin&vs_currencies=usd`);
    const price = response.data.bitcoin.usd;

    // Validate reasonable BTC price
    if (price && price > 50000 && price < 200000) {
      console.log(`Fetched BTC price: $${price}`);
      return price;
    }

    throw new Error(`Invalid BTC price: ${price}`);
  }

  /**
   * Fetch commodity prices from Yahoo Finance
   */
  async fetchCommodityPrice(symbol) {
    const yahooSymbols = {
      'XAU': 'GC=F',  // Gold futures
      'XAG': 'SI=F',  // Silver futures
      'WTI': 'CL=F'   // Oil futures
    };

    const yahooSymbol = yahooSymbols[symbol];
    if (!yahooSymbol) {
      throw new Error(`No Yahoo symbol mapping for ${symbol}`);
    }

    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const price = response.data.chart.result[0].meta.regularMarketPrice;
    console.log(`Fetched ${symbol} price: $${price}`);
    return price;
  }

  /**
   * Fetch stock/ETF prices from Yahoo Finance
   */
  async fetchStockPrice(symbol) {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const price = response.data.chart.result[0].meta.regularMarketPrice;
    console.log(`Fetched ${symbol} price: $${price}`);
    return price;
  }

  /**
   * Cache price in database using UPSERT
   * @param {string} symbol
   * @param {number} price
   */
  async cachePrice(symbol, price) {
    try {
      await this.prisma.asset.upsert({
        where: { symbol: symbol },
        update: {
          currentPriceUsd: price,
          lastUpdated: new Date()
        },
        create: {
          symbol: symbol,
          currentPriceUsd: price,
          lastUpdated: new Date()
        }
      });

      console.log(`Cached ${symbol} price: $${price}`);
    } catch (error) {
      console.error(`Failed to cache price for ${symbol}:`, error.message);
      // Don't throw - caching failure shouldn't break the request
    }
  }
}

module.exports = PriceCacheService;