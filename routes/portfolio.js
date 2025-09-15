const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Get user's portfolio
router.get('/', authenticateToken, async (req, res) => {
  try {
    const holdings = await pool.query(
      'SELECT * FROM holdings WHERE user_id = $1',
      [req.user.userId]
    );
    
    // Get current asset prices
    const assets = await pool.query('SELECT * FROM assets');
    const assetPrices = {};
    assets.rows.forEach(asset => {
      assetPrices[asset.symbol] = asset.current_price_usd;
    });
    
    // Get purchase details for each asset
    const purchasesQuery = `
      SELECT 
        asset_symbol,
        SUM(btc_spent) as total_spent_sats,
        COUNT(*) as purchase_count,
        MAX(created_at) as last_purchase_date,
        SUM(CASE WHEN locked_until > NOW() THEN amount ELSE 0 END) as locked_amount,
        SUM(amount) as total_purchased_amount
      FROM purchases 
      WHERE user_id = $1
      GROUP BY asset_symbol
    `;
    
    // Get sales data for each asset
    const salesQuery = `
      SELECT 
        from_asset as asset_symbol,
        SUM(from_amount) as total_sold_amount,
        SUM(to_amount) as total_received_sats
      FROM trades 
      WHERE user_id = $1 AND to_asset = 'BTC' AND from_asset != 'BTC'
      GROUP BY from_asset
    `;
    const purchases = await pool.query(purchasesQuery, [req.user.userId]);
    const sales = await pool.query(salesQuery, [req.user.userId]);
    
    const purchaseMap = {};
    purchases.rows.forEach(row => {
      purchaseMap[row.asset_symbol] = {
        total_spent_sats: parseInt(row.total_spent_sats),
        purchase_count: parseInt(row.purchase_count),
        last_purchase_date: row.last_purchase_date,
        locked_amount: parseInt(row.locked_amount),
        total_purchased_amount: parseInt(row.total_purchased_amount)
      };
    });
    
    const salesMap = {};
    sales.rows.forEach(row => {
      salesMap[row.asset_symbol] = {
        total_sold_amount: parseInt(row.total_sold_amount),
        total_received_sats: parseInt(row.total_received_sats)
      };
    });

    // Also get legacy cost basis from trades for BTC holdings
    const legacyCostQuery = `
      SELECT 
        to_asset as asset_symbol,
        SUM(from_amount) as total_spent_sats,
        COUNT(*) as trade_count,
        MAX(created_at) as last_trade_date
      FROM trades 
      WHERE user_id = $1 AND from_asset = 'BTC'
      GROUP BY to_asset
    `;
    const legacyCost = await pool.query(legacyCostQuery, [req.user.userId]);
    legacyCost.rows.forEach(row => {
      if (!purchaseMap[row.asset_symbol]) {
        purchaseMap[row.asset_symbol] = {
          total_spent_sats: parseInt(row.total_spent_sats),
          purchase_count: parseInt(row.trade_count),
          last_purchase_date: row.last_trade_date,
          locked_amount: 0,
          total_amount: 0
        };
      }
    });
    
    // Calculate portfolio value
    let totalValueSats = 0;
    let totalCostSats = 0;
    
    const portfolioHoldings = holdings.rows.map(holding => {
      const priceUsd = assetPrices[holding.asset_symbol] || 0;
      const btcPrice = assetPrices['BTC'] || 1;
      const purchaseInfo = purchaseMap[holding.asset_symbol] || { 
        total_spent_sats: 0, 
        purchase_count: 0, 
        last_purchase_date: null,
        locked_amount: 0,
        total_purchased_amount: 0
      };
      
      const salesInfo = salesMap[holding.asset_symbol] || {
        total_sold_amount: 0,
        total_received_sats: 0
      };
      
      let valueSats = 0;
      let adjustedCostBasis = 0;
      
      if (holding.asset_symbol === 'BTC') {
        valueSats = parseInt(holding.amount) || 0;
        adjustedCostBasis = valueSats; // BTC cost basis is itself
        totalCostSats += valueSats;
      } else {
        // Amount is stored as integer with 8 decimal precision
        // Convert back to actual shares: amount / 100M
        const holdingAmount = parseInt(holding.amount) || 0;
        const actualShares = holdingAmount / 100000000;
        const usdValue = actualShares * priceUsd;
        valueSats = Math.round((usdValue / btcPrice) * 100000000);
        
        // Calculate adjusted cost basis for remaining holdings
        const totalPurchased = purchaseInfo.total_purchased_amount || 0;
        const totalSold = salesInfo.total_sold_amount || 0;
        const remainingRatio = totalPurchased > 0 ? holdingAmount / totalPurchased : 0;
        adjustedCostBasis = Math.round((purchaseInfo.total_spent_sats || 0) * remainingRatio);
        
        totalCostSats += adjustedCostBasis;
      }
      
      totalValueSats += valueSats;
      
      // Determine lock status
      let lockStatus = 'unlocked';
      if (holding.asset_symbol !== 'BTC' && purchaseInfo.locked_amount > 0) {
        const holdingAmount = parseInt(holding.amount) || 0;
        if (purchaseInfo.locked_amount >= holdingAmount) {
          lockStatus = 'locked';
        } else {
          lockStatus = 'partial';
        }
      }
      
      return {
        ...holding,
        current_value_sats: valueSats,
        cost_basis_sats: adjustedCostBasis,
        purchase_count: purchaseInfo.purchase_count || 0,
        last_purchase_date: purchaseInfo.last_purchase_date,
        locked_amount: purchaseInfo.locked_amount || 0,
        lock_status: lockStatus,
        current_price_usd: priceUsd,
        // Additional info for debugging
        total_spent_sats: purchaseInfo.total_spent_sats || 0,
        total_received_from_sales: salesInfo.total_received_sats || 0
      };
    });
    
    res.json({
      holdings: portfolioHoldings,
      total_value_sats: totalValueSats,
      total_cost_sats: totalCostSats,
      btc_price: assetPrices['BTC']
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Get detailed purchase history for a specific asset
router.get('/asset/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Get individual purchases
    const purchases = await pool.query(
      `SELECT 
        id,
        amount,
        btc_spent,
        purchase_price_usd,
        btc_price_usd,
        locked_until,
        created_at,
        CASE WHEN locked_until > NOW() THEN true ELSE false END as is_locked
       FROM purchases 
       WHERE user_id = $1 AND asset_symbol = $2
       ORDER BY created_at DESC`,
      [req.user.userId, symbol]
    );
    
    // Also get any sales (trades back to BTC)
    const sales = await pool.query(
      `SELECT * FROM trades 
       WHERE user_id = $1 AND from_asset = $2 AND to_asset = 'BTC'
       ORDER BY created_at DESC`,
      [req.user.userId, symbol]
    );
    
    res.json({
      purchases: purchases.rows,
      sales: sales.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch asset details' });
  }
});

module.exports = router;