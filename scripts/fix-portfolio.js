const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
});

async function fixPortfolio() {
  try {
    console.log('=== FIXING PORTFOLIO ISSUES ===');
    
    // 1. Update asset prices
    console.log('1. Updating asset prices...');
    try {
      const btcResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const btcPrice = btcResponse.data.bitcoin.usd;
      
      const prices = {
        'BTC': btcPrice,
        'AAPL': 175.50,
        'TSLA': 248.30,
        'MSFT': 378.20,
        'GOOGL': 138.45,
        'AMZN': 145.80,
        'NVDA': 485.60,
        'XAU': 2000,
        'XAG': 25,
        'WTI': 75
      };
      
      for (const [symbol, price] of Object.entries(prices)) {
        await pool.query(
          'UPDATE assets SET current_price_usd = $1, last_updated = NOW() WHERE symbol = $2',
          [price, symbol]
        );
      }
      console.log('✓ Asset prices updated');
    } catch (error) {
      console.log('⚠ Price update failed, using defaults');
    }
    
    // 2. Migrate trades to purchases
    console.log('2. Migrating trades to purchases...');
    const trades = await pool.query(`
      SELECT * FROM trades 
      WHERE from_asset = 'BTC' AND to_asset != 'BTC'
      ORDER BY created_at
    `);
    
    for (const trade of trades.rows) {
      const existing = await pool.query(
        'SELECT id FROM purchases WHERE user_id = $1 AND asset_symbol = $2 AND btc_spent = $3 AND created_at = $4',
        [trade.user_id, trade.to_asset, trade.from_amount, trade.created_at]
      );
      
      if (existing.rows.length === 0) {
        const lockUntil = new Date(new Date(trade.created_at).getTime() + 24 * 60 * 60 * 1000);
        
        await pool.query(`
          INSERT INTO purchases (user_id, asset_symbol, amount, btc_spent, purchase_price_usd, btc_price_usd, locked_until, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          trade.user_id,
          trade.to_asset,
          trade.to_amount,
          trade.from_amount,
          trade.asset_price_usd,
          trade.btc_price_usd,
          lockUntil,
          trade.created_at
        ]);
        
        console.log(`✓ Migrated: ${(trade.to_amount / 100000000).toFixed(8)} ${trade.to_asset}`);
      }
    }
    
    // 3. Check final state
    console.log('3. Final state check...');
    const finalHoldings = await pool.query('SELECT * FROM holdings');
    const finalPurchases = await pool.query('SELECT * FROM purchases');
    const finalTrades = await pool.query('SELECT * FROM trades');
    
    console.log(`Holdings: ${finalHoldings.rows.length}`);
    console.log(`Purchases: ${finalPurchases.rows.length}`);
    console.log(`Trades: ${finalTrades.rows.length}`);
    
    console.log('=== FIX COMPLETE ===');
    
  } catch (error) {
    console.error('Fix error:', error);
  } finally {
    await pool.end();
  }
}

fixPortfolio();