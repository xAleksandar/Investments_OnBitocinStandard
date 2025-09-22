const express = require('express');
const prisma = require('../config/database');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Get user's portfolio
router.get('/', authenticateToken, async (req, res) => {
  try {
    const holdings = await prisma.holding.findMany({
      where: { userId: req.user.userId }
    });
    
    // Get current asset prices
    const assets = await prisma.asset.findMany();
    const assetPrices = {};
    assets.forEach(asset => {
      assetPrices[asset.symbol] = asset.currentPriceUsd;
    });
    
    // Get purchase details for each asset (using raw SQL for complex aggregation)
    const purchases = await prisma.$queryRaw`
      SELECT 
        asset_symbol,
        SUM(btc_spent) as total_spent_sats,
        COUNT(*) as purchase_count,
        MAX(created_at) as last_purchase_date,
        SUM(CASE WHEN locked_until > NOW() THEN amount ELSE 0 END) as locked_amount,
        SUM(amount) as total_purchased_amount
      FROM purchases 
      WHERE user_id = ${req.user.userId}
      GROUP BY asset_symbol
    `;
    
    // Get sales data for each asset
    const sales = await prisma.$queryRaw`
      SELECT 
        from_asset as asset_symbol,
        SUM(from_amount) as total_sold_amount,
        SUM(to_amount) as total_received_sats
      FROM trades 
      WHERE user_id = ${req.user.userId} AND to_asset = 'BTC' AND from_asset != 'BTC'
      GROUP BY from_asset
    `;
    
    const purchaseMap = {};
    purchases.forEach(row => {
      purchaseMap[row.asset_symbol] = {
        total_spent_sats: parseInt(row.total_spent_sats),
        purchase_count: parseInt(row.purchase_count),
        last_purchase_date: row.last_purchase_date,
        locked_amount: parseInt(row.locked_amount),
        total_purchased_amount: parseInt(row.total_purchased_amount)
      };
    });
    
    const salesMap = {};
    sales.forEach(row => {
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
    const legacyCost = await prisma.$queryRaw`
      SELECT 
        to_asset as asset_symbol,
        SUM(from_amount) as total_spent_sats,
        COUNT(*) as trade_count,
        MAX(created_at) as last_trade_date
      FROM trades 
      WHERE user_id = ${req.user.userId} AND from_asset = 'BTC'
      GROUP BY to_asset
    `;
    legacyCost.forEach(row => {
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
    
    const portfolioHoldings = holdings.map(holding => {
      const priceUsd = assetPrices[holding.assetSymbol] || 0;
      const btcPrice = assetPrices['BTC'] || 1;
      const purchaseInfo = purchaseMap[holding.assetSymbol] || { 
        total_spent_sats: 0, 
        purchase_count: 0, 
        last_purchase_date: null,
        locked_amount: 0,
        total_purchased_amount: 0
      };
      
      const salesInfo = salesMap[holding.assetSymbol] || {
        total_sold_amount: 0,
        total_received_sats: 0
      };
      
      let valueSats = 0;
      let adjustedCostBasis = 0;
      
      // Convert BigInt to number for calculations
      const holdingAmount = Number(holding.amount) || 0;
      
      if (holding.assetSymbol === 'BTC') {
        valueSats = holdingAmount;
        adjustedCostBasis = valueSats; // BTC cost basis is itself
        totalCostSats += valueSats;
      } else {
        // Amount is stored as integer with 8 decimal precision
        // Convert back to actual shares: amount / 100M
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
      if (holding.assetSymbol !== 'BTC' && purchaseInfo.locked_amount > 0) {
        if (purchaseInfo.locked_amount >= holdingAmount) {
          lockStatus = 'locked';
        } else {
          lockStatus = 'partial';
        }
      }
      
      return {
        id: holding.id,
        user_id: holding.userId,
        asset_symbol: holding.assetSymbol,
        amount: holdingAmount, // Convert BigInt to number
        locked_until: holding.lockedUntil,
        created_at: holding.createdAt,
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
    const purchases = await prisma.$queryRaw`
      SELECT 
        id,
        amount,
        btc_spent,
        purchase_price_usd,
        btc_price_usd,
        locked_until,
        created_at,
        CASE WHEN locked_until > NOW() THEN true ELSE false END as is_locked
       FROM purchases 
       WHERE user_id = ${req.user.userId} AND asset_symbol = ${symbol}
       ORDER BY created_at DESC
    `;
    
    // Also get any sales (trades back to BTC)
    const sales = await prisma.trade.findMany({
      where: {
        userId: req.user.userId,
        fromAsset: symbol,
        toAsset: 'BTC'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      purchases: purchases,
      sales: sales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch asset details' });
  }
});

module.exports = router;