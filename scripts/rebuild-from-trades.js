const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
});

async function rebuildFromTrades() {
  try {
    console.log('=== REBUILDING HOLDINGS FROM TRADES ===');
    
    // Get all users
    const users = await pool.query('SELECT * FROM users');
    console.log('Found users:', users.rows.length);
    
    for (const user of users.rows) {
      console.log(`\nProcessing user: ${user.username} (ID: ${user.id})`);
      
      // Clear existing holdings
      await pool.query('DELETE FROM holdings WHERE user_id = $1', [user.id]);
      
      // Start with 1 BTC
      let btcBalance = 100000000; // 1 BTC in sats
      const assetBalances = {};
      
      // Process all trades chronologically
      const trades = await pool.query(
        'SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at',
        [user.id]
      );
      
      console.log(`Processing ${trades.rows.length} trades...`);
      
      for (const trade of trades.rows) {
        if (trade.from_asset === 'BTC') {
          // Selling BTC for other asset
          btcBalance -= parseInt(trade.from_amount);
          
          if (!assetBalances[trade.to_asset]) {
            assetBalances[trade.to_asset] = 0;
          }
          assetBalances[trade.to_asset] += parseInt(trade.to_amount);
          
          console.log(`  Trade: -${trade.from_amount} BTC, +${trade.to_amount} ${trade.to_asset}`);
        } else if (trade.to_asset === 'BTC') {
          // Selling other asset for BTC
          btcBalance += parseInt(trade.to_amount);
          
          if (assetBalances[trade.from_asset]) {
            assetBalances[trade.from_asset] -= parseInt(trade.from_amount);
          }
          
          console.log(`  Trade: -${trade.from_amount} ${trade.from_asset}, +${trade.to_amount} BTC`);
        }
      }
      
      // Create holdings
      if (btcBalance > 0) {
        await pool.query(
          'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
          [user.id, 'BTC', btcBalance]
        );
        console.log(`✓ Created BTC holding: ${btcBalance / 100000000} BTC`);
      }
      
      for (const [asset, amount] of Object.entries(assetBalances)) {
        if (amount > 0) {
          await pool.query(
            'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
            [user.id, asset, amount]
          );
          console.log(`✓ Created ${asset} holding: ${amount / 100000000} ${asset}`);
        }
      }
    }
    
    // Also rebuild purchases from trades
    console.log('\n=== REBUILDING PURCHASES ===');
    await pool.query('DELETE FROM purchases');
    
    const btcTrades = await pool.query(`
      SELECT * FROM trades 
      WHERE from_asset = 'BTC' AND to_asset != 'BTC'
      ORDER BY created_at
    `);
    
    for (const trade of btcTrades.rows) {
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
    }
    
    console.log(`✓ Created ${btcTrades.rows.length} purchase records`);
    
    console.log('\n=== REBUILD COMPLETE ===');
    
  } catch (error) {
    console.error('Rebuild error:', error);
  } finally {
    await pool.end();
  }
}

rebuildFromTrades();