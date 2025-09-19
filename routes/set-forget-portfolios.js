const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

// Set & Forget Portfolio Model Class
class SetForgetPortfolio {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.initial_btc_amount = data.initial_btc_amount;
    this.share_token = data.share_token;
    this.locked_until = data.locked_until;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.allocations = data.allocations || [];
  }

  // Generate a unique share token for public sharing
  static generateShareToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate allocations sum to 100%
  static validateAllocations(allocations) {
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return { valid: false, error: 'Allocations array is required and cannot be empty' };
    }

    let totalPercentage = 0;
    const seenAssets = new Set();

    for (const allocation of allocations) {
      // Validate structure
      if (!allocation.asset_symbol || typeof allocation.allocation_percentage !== 'number') {
        return { valid: false, error: 'Each allocation must have asset_symbol and allocation_percentage' };
      }

      // Check for duplicates
      if (seenAssets.has(allocation.asset_symbol)) {
        return { valid: false, error: `Duplicate asset: ${allocation.asset_symbol}` };
      }
      seenAssets.add(allocation.asset_symbol);

      // Validate percentage range
      if (allocation.allocation_percentage < 0 || allocation.allocation_percentage > 100) {
        return { valid: false, error: `Allocation percentage must be between 0 and 100, got ${allocation.allocation_percentage} for ${allocation.asset_symbol}` };
      }

      totalPercentage += allocation.allocation_percentage;
    }

    // Check total equals 100% (with small tolerance for floating point)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { valid: false, error: `Allocations must sum to 100%, got ${totalPercentage}%` };
    }

    return { valid: true };
  }

  // Create a new Set & Forget portfolio
  static async create(userId, portfolioData, allocations) {
    const client = await pool.connect();

    try {
      // Validate allocations
      const validation = this.validateAllocations(allocations);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // This is a theoretical portfolio - no actual BTC balance check needed
      const initialBtcAmount = parseInt(portfolioData.initial_btc_amount);

      // Get current asset prices (always include BTC for calculations)
      const assetSymbols = allocations.map(a => a.asset_symbol);
      if (!assetSymbols.includes('BTC')) {
        assetSymbols.push('BTC');
      }
      const assetPrices = await client.query(
        'SELECT symbol, current_price_usd FROM assets WHERE symbol = ANY($1)',
        [assetSymbols]
      );

      const priceMap = {};
      assetPrices.rows.forEach(row => {
        priceMap[row.symbol] = parseFloat(row.current_price_usd);
      });

      const btcPrice = priceMap['BTC'];
      if (!btcPrice) {
        throw new Error('BTC price not available');
      }

      // Validate all assets exist
      for (const allocation of allocations) {
        if (!priceMap[allocation.asset_symbol]) {
          throw new Error(`Asset not found: ${allocation.asset_symbol}`);
        }
      }

      await client.query('BEGIN');

      // Create portfolio record
      const shareToken = this.generateShareToken();
      const trackingStartDate = new Date(); // Just for reference, no actual locking

      const portfolioResult = await client.query(`
        INSERT INTO set_forget_portfolios (user_id, name, initial_btc_amount, share_token, locked_until)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [userId, portfolioData.name, initialBtcAmount, shareToken, trackingStartDate]);

      const portfolio = portfolioResult.rows[0];

      // Create allocation records
      for (const allocation of allocations) {
        const btcAmount = Math.floor((allocation.allocation_percentage / 100) * initialBtcAmount);
        const assetPrice = priceMap[allocation.asset_symbol];

        let assetAmount;
        if (allocation.asset_symbol === 'BTC') {
          assetAmount = btcAmount;
        } else {
          // Calculate asset amount based on USD value
          const usdValue = (btcAmount / 100000000) * btcPrice;
          assetAmount = Math.floor((usdValue / assetPrice) * 100000000); // Store with 8 decimal precision
        }

        await client.query(`
          INSERT INTO set_forget_allocations
          (portfolio_id, asset_symbol, allocation_percentage, btc_amount, asset_amount, purchase_price_usd, btc_price_usd)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          portfolio.id,
          allocation.asset_symbol,
          allocation.allocation_percentage,
          btcAmount,
          assetAmount,
          assetPrice,
          btcPrice
        ]);
      }

      // No actual BTC deduction - this is a theoretical portfolio

      await client.query('COMMIT');

      // Return the created portfolio with allocations
      return await this.findById(portfolio.id);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Find portfolio by ID with allocations
  static async findById(portfolioId) {
    const portfolioResult = await pool.query(
      'SELECT * FROM set_forget_portfolios WHERE id = $1',
      [portfolioId]
    );

    if (portfolioResult.rows.length === 0) {
      return null;
    }

    const allocationsResult = await pool.query(
      'SELECT * FROM set_forget_allocations WHERE portfolio_id = $1 ORDER BY allocation_percentage DESC',
      [portfolioId]
    );

    const portfolioData = portfolioResult.rows[0];
    portfolioData.allocations = allocationsResult.rows;

    return new SetForgetPortfolio(portfolioData);
  }

  // Find portfolio by share token (for public sharing)
  static async findByShareToken(shareToken) {
    const portfolioResult = await pool.query(
      'SELECT * FROM set_forget_portfolios WHERE share_token = $1',
      [shareToken]
    );

    if (portfolioResult.rows.length === 0) {
      return null;
    }

    const allocationsResult = await pool.query(
      'SELECT * FROM set_forget_allocations WHERE portfolio_id = $1 ORDER BY allocation_percentage DESC',
      [portfolioResult.rows[0].id]
    );

    const portfolioData = portfolioResult.rows[0];
    portfolioData.allocations = allocationsResult.rows;

    return new SetForgetPortfolio(portfolioData);
  }

  // Find all portfolios for a user
  static async findByUserId(userId) {
    const portfoliosResult = await pool.query(
      'SELECT * FROM set_forget_portfolios WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const portfolios = [];
    for (const portfolioData of portfoliosResult.rows) {
      const allocationsResult = await pool.query(
        'SELECT * FROM set_forget_allocations WHERE portfolio_id = $1 ORDER BY allocation_percentage DESC',
        [portfolioData.id]
      );

      portfolioData.allocations = allocationsResult.rows;
      portfolios.push(new SetForgetPortfolio(portfolioData));
    }

    return portfolios;
  }

  // Calculate current portfolio performance
  async calculateCurrentPerformance() {
    try {
      // Get current asset prices (always include BTC for calculations)
      const assetSymbols = this.allocations.map(a => a.asset_symbol);
      if (!assetSymbols.includes('BTC')) {
        assetSymbols.push('BTC');
      }
      const assetPrices = await pool.query(
        'SELECT symbol, current_price_usd FROM assets WHERE symbol = ANY($1)',
        [assetSymbols]
      );

      const priceMap = {};
      assetPrices.rows.forEach(row => {
        priceMap[row.symbol] = parseFloat(row.current_price_usd);
      });

      const currentBtcPrice = priceMap['BTC'];
      if (!currentBtcPrice) {
        throw new Error('BTC price not available');
      }

      let currentValueSats = 0;
      const allocationPerformance = [];

      for (const allocation of this.allocations) {
        const currentPrice = priceMap[allocation.asset_symbol];
        if (!currentPrice) {
          throw new Error(`Price not available for ${allocation.asset_symbol}`);
        }

        let currentValueInSats;
        if (allocation.asset_symbol === 'BTC') {
          currentValueInSats = parseInt(allocation.asset_amount);
        } else {
          // Convert asset amount back to actual shares
          const actualShares = parseInt(allocation.asset_amount) / 100000000;
          const currentUsdValue = actualShares * currentPrice;
          currentValueInSats = Math.floor((currentUsdValue / currentBtcPrice) * 100000000);
        }

        currentValueSats += currentValueInSats;

        // Calculate BTC-denominated performance
        const initialBtcPrice = parseFloat(allocation.btc_price_usd);
        const initialAssetPriceInBtc = parseFloat(allocation.purchase_price_usd) / initialBtcPrice;
        const currentAssetPriceInBtc = currentPrice / currentBtcPrice;

        // For BTC itself, performance is always 0% (1 BTC = 1 BTC)
        const btcDenominatedPerformance = allocation.asset_symbol === 'BTC'
          ? 0
          : ((currentAssetPriceInBtc / initialAssetPriceInBtc) - 1) * 100;

        allocationPerformance.push({
          asset_symbol: allocation.asset_symbol,
          allocation_percentage: allocation.allocation_percentage,
          initial_btc_amount: parseInt(allocation.btc_amount),
          current_value_sats: currentValueInSats,
          initial_price_usd: parseFloat(allocation.purchase_price_usd),
          current_price_usd: currentPrice,
          initial_btc_price_usd: initialBtcPrice,
          asset_performance_percent: btcDenominatedPerformance
        });
      }

      const initialBtcAmount = parseInt(this.initial_btc_amount);
      const totalPerformancePercent = ((currentValueSats / initialBtcAmount) - 1) * 100;

      // Calculate days since creation (tracking period)
      const now = new Date();
      const createdAt = new Date(this.created_at);
      const daysTracked = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        portfolio_id: this.id,
        portfolio_name: this.name,
        initial_btc_amount: initialBtcAmount,
        current_value_sats: currentValueSats,
        total_performance_percent: totalPerformancePercent,
        created_at: this.created_at,
        days_tracked: daysTracked,
        allocations: allocationPerformance,
        current_btc_price: currentBtcPrice,
        share_token: this.share_token
      };
    } catch (error) {
      throw new Error(`Failed to calculate performance: ${error.message}`);
    }
  }
}

// API Routes

// Create a new Set & Forget portfolio
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, initial_btc_amount, allocations } = req.body;

    // Validate required fields
    if (!name || !initial_btc_amount || !allocations) {
      return res.status(400).json({
        error: 'Missing required fields: name, initial_btc_amount, allocations'
      });
    }

    // Validate name length
    if (name.length < 1 || name.length > 255) {
      return res.status(400).json({
        error: 'Portfolio name must be between 1 and 255 characters'
      });
    }

    // Validate initial BTC amount
    const btcAmount = parseInt(initial_btc_amount);
    if (isNaN(btcAmount) || btcAmount <= 0) {
      return res.status(400).json({
        error: 'Initial BTC amount must be a positive number in satoshis'
      });
    }

    const portfolio = await SetForgetPortfolio.create(
      req.user.userId,
      { name, initial_btc_amount: btcAmount },
      allocations
    );

    res.status(201).json({
      message: 'Set & Forget portfolio created successfully',
      portfolio: await portfolio.calculateCurrentPerformance()
    });

  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user's Set & Forget portfolios
router.get('/', authenticateToken, async (req, res) => {
  try {
    const portfolios = await SetForgetPortfolio.findByUserId(req.user.userId);

    const portfoliosWithPerformance = await Promise.all(
      portfolios.map(async (portfolio) => {
        return await portfolio.calculateCurrentPerformance();
      })
    );

    res.json({
      portfolios: portfoliosWithPerformance
    });

  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ error: 'Failed to fetch Set & Forget portfolios' });
  }
});

// Get specific Set & Forget portfolio by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);

    if (isNaN(portfolioId)) {
      return res.status(400).json({ error: 'Invalid portfolio ID' });
    }

    const portfolio = await SetForgetPortfolio.findById(portfolioId);

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Verify ownership
    if (portfolio.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const performance = await portfolio.calculateCurrentPerformance();
    res.json(performance);

  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Get public portfolio by share token (no authentication required)
router.get('/public/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;

    if (!shareToken || shareToken.length !== 64) {
      return res.status(400).json({ error: 'Invalid share token' });
    }

    const portfolio = await SetForgetPortfolio.findByShareToken(shareToken);

    if (!portfolio) {
      return res.status(404).json({ error: 'Shared portfolio not found' });
    }

    const performance = await portfolio.calculateCurrentPerformance();

    // Remove sensitive information for public sharing
    delete performance.user_id;

    res.json({
      ...performance,
      is_shared: true,
      share_token: shareToken
    });

  } catch (error) {
    console.error('Get shared portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch shared portfolio' });
  }
});

// Delete Set & Forget portfolio (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);

    if (isNaN(portfolioId)) {
      return res.status(400).json({ error: 'Invalid portfolio ID' });
    }

    // Check if user is admin
    const { isUserAdmin } = require('../utils/adminCheck');
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
    if (!user.rows[0]) {
      return res.status(403).json({ error: 'User not found' });
    }

    const isAdmin = await isUserAdmin(user.rows[0].email, req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get portfolio details for verification
    const portfolio = await SetForgetPortfolio.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete allocations first (foreign key constraint)
      await client.query('DELETE FROM set_forget_allocations WHERE portfolio_id = $1', [portfolioId]);

      // Delete portfolio
      await client.query('DELETE FROM set_forget_portfolios WHERE id = $1', [portfolioId]);

      await client.query('COMMIT');

      res.json({
        message: 'Portfolio deleted successfully',
        deleted_portfolio: portfolio.name
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

module.exports = router;