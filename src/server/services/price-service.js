const axios = require('axios');
const BaseService = require('./base-service');

class PriceService extends BaseService {
    constructor() {
        super();
        this.cacheTTL = 5; // 5 minutes cache TTL
        this.rateLimitDelay = 1200; // 1.2 seconds between API calls
        this.lastApiCall = 0;
    }

    async getPrice(symbol) {
        try {
            const sanitizedSymbol = this.sanitizeInput(symbol);

            // Check cache first
            const cachedPrice = await this.getCachedPrice(sanitizedSymbol);
            if (cachedPrice !== null) {
                return cachedPrice;
            }

            // Apply rate limiting
            await this.enforceRateLimit();

            // Cache miss or expired - fetch from API
            const price = await this.fetchPrice(sanitizedSymbol);
            if (price !== null) {
                await this.cachePrice(sanitizedSymbol, price);
            }

            return price;
        } catch (error) {
            console.error(`Error getting price for ${symbol}:`, error.message);
            return null;
        }
    }

    async getPrices(symbols) {
        const prices = {};

        // Process in parallel for better performance but respect rate limits
        const results = await Promise.allSettled(
            symbols.map((symbol, index) =>
                this.delayedGetPrice(symbol, index * this.rateLimitDelay)
            )
        );

        symbols.forEach((symbol, index) => {
            const result = results[index];
            if (result.status === 'fulfilled' && result.value !== null) {
                prices[symbol] = result.value;
            }
        });

        return prices;
    }

    async delayedGetPrice(symbol, delay = 0) {
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        return this.getPrice(symbol);
    }

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

    async fetchBitcoinPrice() {
        const apiUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
        const response = await axios.get(`${apiUrl}/simple/price?ids=bitcoin&vs_currencies=usd`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Measured-in-Bitcoin/1.0'
            }
        });

        const price = response.data.bitcoin.usd;

        // Validate reasonable BTC price
        if (price && price > 10000 && price < 500000) {
            console.log(`Fetched BTC price: $${price}`);
            return price;
        }

        throw new Error(`Invalid BTC price: ${price}`);
    }

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

        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        const chart = response.data.chart;
        if (!chart || !chart.result || !chart.result[0] || !chart.result[0].meta) {
            throw new Error(`Invalid response format for ${symbol}`);
        }

        const price = chart.result[0].meta.regularMarketPrice;
        if (!price || price <= 0) {
            throw new Error(`Invalid price data for ${symbol}: ${price}`);
        }

        console.log(`Fetched ${symbol} price: $${price}`);
        return price;
    }

    async fetchStockPrice(symbol) {
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        const chart = response.data.chart;
        if (!chart || !chart.result || !chart.result[0] || !chart.result[0].meta) {
            throw new Error(`Invalid response format for ${symbol}`);
        }

        const price = chart.result[0].meta.regularMarketPrice;
        if (!price || price <= 0) {
            throw new Error(`Invalid price data for ${symbol}: ${price}`);
        }

        console.log(`Fetched ${symbol} price: $${price}`);
        return price;
    }

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

    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;

        if (timeSinceLastCall < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastApiCall = Date.now();
    }

    async updateAllPrices() {
        try {
            // Get all active assets
            const assets = await this.prisma.asset.findMany({
                where: {
                    OR: [
                        { isActive: true },
                        { isActive: null } // Handle legacy data
                    ]
                },
                select: { symbol: true }
            });

            const symbols = assets.map(asset => asset.symbol);
            console.log(`Updating prices for ${symbols.length} assets`);

            const prices = await this.getPrices(symbols);
            const updatedCount = Object.keys(prices).length;

            console.log(`Successfully updated ${updatedCount}/${symbols.length} prices`);
            return { updated: updatedCount, total: symbols.length, prices };
        } catch (error) {
            await this.handleServiceError(error, 'updateAllPrices');
        }
    }

    async getAssetMetadata(symbol) {
        try {
            const asset = await this.prisma.asset.findUnique({
                where: { symbol },
                select: {
                    symbol: true,
                    name: true,
                    type: true,
                    exchange: true,
                    description: true,
                    currentPriceUsd: true,
                    lastUpdated: true,
                    isActive: true
                }
            });

            return asset;
        } catch (error) {
            console.error(`Failed to get asset metadata for ${symbol}:`, error.message);
            return null;
        }
    }

    async validatePriceData(symbol, price) {
        if (!symbol || typeof symbol !== 'string') {
            throw new Error('Invalid symbol');
        }

        if (!price || typeof price !== 'number' || price <= 0) {
            throw new Error('Invalid price');
        }

        // Basic validation rules by asset type
        if (symbol === 'BTC' && (price < 10000 || price > 500000)) {
            throw new Error('BTC price out of reasonable range');
        }

        if (['XAU', 'XAG'].includes(symbol) && (price < 10 || price > 10000)) {
            throw new Error('Precious metal price out of reasonable range');
        }

        if (symbol === 'WTI' && (price < 10 || price > 200)) {
            throw new Error('Oil price out of reasonable range');
        }

        return true;
    }
}

module.exports = PriceService;