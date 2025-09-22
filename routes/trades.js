const express = require('express');
const prisma = require('../config/database');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Execute a trade
router.post('/', authenticateToken, async (req, res) => {
  const { fromAsset, toAsset, amount } = req.body;
  
  console.log('=== BACKEND TRADE DEBUG ===');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  console.log('From Asset:', fromAsset);
  console.log('To Asset:', toAsset);
  console.log('Amount:', amount, typeof amount);
  
  // Validate minimum trade amount
  const MIN_TRADE_SATS = 100000; // 100k sats
  console.log('Min trade check:', fromAsset === 'BTC', amount < MIN_TRADE_SATS);
  
  if (fromAsset === 'BTC' && amount < MIN_TRADE_SATS) {
    console.log('REJECTED: Below minimum trade amount');
    return res.status(400).json({ 
      error: `Minimum trade amount is ${MIN_TRADE_SATS.toLocaleString()} sats (100 kSats)` 
    });
  }
  
  console.log('Minimum trade check passed, proceeding...');
  
  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      
      // Get current prices
      const assets = await tx.asset.findMany({
        where: {
          symbol: { in: [fromAsset, toAsset] }
        }
      });
      console.log('Found assets:', assets);
      
      const assetPrices = {};
      assets.forEach(asset => {
        assetPrices[asset.symbol] = asset.currentPriceUsd;
      });
    
      console.log('Asset prices:', assetPrices);
      
      const btcPrice = assetPrices['BTC'];
      
      if (!btcPrice || !assetPrices[fromAsset] || !assetPrices[toAsset]) {
        throw new Error('Asset prices not available');
      }
      
      // Check user has enough of fromAsset
      const holding = await tx.holding.findFirst({
        where: {
          userId: req.user.userId,
          assetSymbol: fromAsset
        }
      });
    });
    
    console.log('User holding:', holding.rows);
    console.log('Required amount:', amount, 'Available:', holding.rows[0]?.amount);
    
    if (holding.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: `No ${fromAsset} holdings found` });
    }
    
    if (holding.rows[0].amount < amount) {
      await pool.query('ROLLBACK');
      // Convert raw stored values to decimal for display
      const availableDecimal = (holding.rows[0].amount / 100000000).toFixed(8);
      const requestedDecimal = (amount / 100000000).toFixed(8);
      return res.status(400).json({
        error: `Insufficient balance. You have ${availableDecimal} ${fromAsset}, but tried to sell ${requestedDecimal} ${fromAsset}`
      });
    }
    
    // Check if asset is locked (need to check purchases table for lock status)
    if (fromAsset !== 'BTC') {
      const lockedPurchases = await pool.query(
        'SELECT SUM(amount) as locked_amount FROM purchases WHERE user_id = $1 AND asset_symbol = $2 AND locked_until > NOW()',
        [req.user.userId, fromAsset]
      );

      const lockedAmount = lockedPurchases.rows[0]?.locked_amount || 0;

      console.log(`Checking lock: ${fromAsset} requested: ${amount}, locked: ${lockedAmount}, available: ${holding.rows[0].amount - lockedAmount}`);

      if (lockedAmount > 0 && amount > (holding.rows[0].amount - lockedAmount)) {
        await pool.query('ROLLBACK');
        const availableAmount = holding.rows[0].amount - lockedAmount;

        // Convert to decimal asset amounts for display
        const requestedDecimal = (amount / 100000000).toFixed(8);
        const lockedDecimal = (lockedAmount / 100000000).toFixed(8);
        const availableDecimal = (availableAmount / 100000000).toFixed(8);

        return res.status(400).json({
          error: `Cannot sell locked assets. You tried to sell ${requestedDecimal} ${fromAsset}. Currently locked: ${lockedDecimal} ${fromAsset}. Available to sell: ${availableDecimal} ${fromAsset}.`
        });
      }
    }
    
    // Calculate conversion
    let toAmount;
    console.log('Starting conversion calculation...');
    console.log('fromAsset:', fromAsset, 'toAsset:', toAsset);
    console.log('BTC price:', btcPrice);
    
    if (fromAsset === 'BTC') {
      // BTC to other asset
      const assetPriceUsd = assetPrices[toAsset];
      console.log(`Converting ${amount} sats to ${toAsset} at $${assetPriceUsd}`);
      
      if (!assetPriceUsd) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: `Price not available for ${toAsset}` });
      }
      
      // Convert: (sats / 100M) * btcPrice / assetPrice
      const btcAmount = amount / 100000000;
      const usdValue = btcAmount * btcPrice;
      const rawAmount = usdValue / assetPriceUsd;
      
      // Store as integer with 8 decimal precision (like satoshis)
      // So 1.5 shares becomes 150000000 (1.5 * 100M)
      toAmount = Math.round(rawAmount * 100000000);
      
      console.log(`${amount} sats = ${btcAmount} BTC = $${usdValue} = ${rawAmount} raw shares = ${toAmount} stored units`);
      
    } else if (toAsset === 'BTC') {
      // Other asset to BTC
      const assetPriceUsd = assetPrices[fromAsset];
      console.log(`Converting ${amount} ${fromAsset} to BTC at $${assetPriceUsd}`);

      if (!assetPriceUsd) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: `Price not available for ${fromAsset}` });
      }

      // Amount is stored as integer with 8 decimal precision (like satoshis)
      // Convert back to actual units: amount / 100M
      const actualUnits = amount / 100000000;
      const usdValue = actualUnits * assetPriceUsd;
      const btcAmount = usdValue / btcPrice;
      toAmount = Math.round(btcAmount * 100000000); // Convert to sats

      console.log(`${amount} stored units = ${actualUnits} ${fromAsset} = $${usdValue} = ${btcAmount} BTC = ${toAmount} sats`);
      
    } else {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'One asset must be BTC' });
    }
    
    console.log('Final toAmount:', toAmount);
    
    // Update fromAsset holding
    console.log(`Updating ${fromAsset} holding: subtracting ${amount}`);
    const updateResult = await pool.query(
      'UPDATE holdings SET amount = amount - $1 WHERE user_id = $2 AND asset_symbol = $3 RETURNING *',
      [amount, req.user.userId, fromAsset]
    );
    console.log('Update result:', updateResult.rows);
    
    // Handle toAsset - different logic for BTC vs other assets
    let lockUntil = null; // Initialize lockUntil for all trades
    
    if (toAsset === 'BTC') {
      // For BTC, just update the holdings (no lock)
      console.log(`Adding ${toAmount} sats to BTC holding`);
      const toHolding = await pool.query(
        'SELECT * FROM holdings WHERE user_id = $1 AND asset_symbol = $2',
        [req.user.userId, toAsset]
      );
      
      if (toHolding.rows.length === 0) {
        await pool.query(
          'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
          [req.user.userId, toAsset, toAmount]
        );
      } else {
        await pool.query(
          'UPDATE holdings SET amount = amount + $1 WHERE user_id = $2 AND asset_symbol = $3',
          [toAmount, req.user.userId, toAsset]
        );
      }
      // lockUntil remains null for BTC
    } else {
      // For other assets, create individual purchase record
      lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      console.log(`Creating individual purchase record for ${toAmount} ${toAsset}`);
      await pool.query(
        'INSERT INTO purchases (user_id, asset_symbol, amount, btc_spent, purchase_price_usd, btc_price_usd, locked_until) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [req.user.userId, toAsset, toAmount, amount, assetPrices[toAsset], btcPrice, lockUntil]
      );
      
      // Update or create aggregate holding for display
      const toHolding = await pool.query(
        'SELECT * FROM holdings WHERE user_id = $1 AND asset_symbol = $2',
        [req.user.userId, toAsset]
      );
      
      if (toHolding.rows.length === 0) {
        await pool.query(
          'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
          [req.user.userId, toAsset, toAmount]
        );
      } else {
        await pool.query(
          'UPDATE holdings SET amount = amount + $1 WHERE user_id = $2 AND asset_symbol = $3',
          [toAmount, req.user.userId, toAsset]
        );
      }
    }
    
    // Record trade
    console.log('Recording trade in history...');
    const tradeResult = await pool.query(
      'INSERT INTO trades (user_id, from_asset, to_asset, from_amount, to_amount, btc_price_usd, asset_price_usd) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.userId, fromAsset, toAsset, amount, toAmount, btcPrice, assetPrices[toAsset === 'BTC' ? fromAsset : toAsset]]
    );
    console.log('Trade recorded:', tradeResult.rows);
    
    await pool.query('COMMIT');
    
    res.json({
      success: true,
      trade: {
        fromAsset,
        toAsset,
        fromAmount: amount,
        toAmount,
        lockedUntil: lockUntil
      }
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('FULL TRADE ERROR:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ error: `Trade failed: ${error.message}` });
  }
});

// Get trade history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const trades = await prisma.trade.findMany({
      where: {
        userId: req.user.userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Transform to match frontend expectations (snake_case field names)
    // Convert BigInt to Number for JSON serialization
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      user_id: trade.userId,
      from_asset: trade.fromAsset,
      to_asset: trade.toAsset,
      from_amount: Number(trade.fromAmount),
      to_amount: Number(trade.toAmount),
      btc_price_usd: trade.btcPriceUsd ? Number(trade.btcPriceUsd) : null,
      asset_price_usd: trade.assetPriceUsd ? Number(trade.assetPriceUsd) : null,
      created_at: trade.createdAt
    }));
    res.json(transformedTrades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

module.exports = router;