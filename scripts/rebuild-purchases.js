const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function rebuildPurchases() {
  try {
    console.log('=== REBUILDING PURCHASES FROM TRADES ===');
    
    // Clear existing purchases
    await pool.query('DELETE FROM purchases');
    
    // Get all BTC → other asset trades
    const trades = await pool.query(`
      SELECT * FROM trades 
      WHERE from_asset = 'BTC' AND to_asset != 'BTC'
      ORDER BY created_at
    `);
    
    console.log(`Found ${trades.rows.length} purchase trades`);
    
    for (const trade of trades.rows) {
      // Calculate lock time (24 hours from trade time)
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
      
      console.log(`✓ Created purchase: ${(trade.to_amount / 100000000).toFixed(8)} ${trade.to_asset} for ${(trade.from_amount / 100000000).toFixed(8)} BTC`);
    }
    
    // Show final purchases
    const finalPurchases = await pool.query('SELECT * FROM purchases ORDER BY created_at');
    console.log(`\nTotal purchases created: ${finalPurchases.rows.length}`);
    
    console.log('=== PURCHASES REBUILD COMPLETE ===');
    
  } catch (error) {
    console.error('Rebuild error:', error);
  } finally {
    await pool.end();
  }
}

rebuildPurchases();