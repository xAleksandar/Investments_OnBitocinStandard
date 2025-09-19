const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
});

async function wipeDatabase() {
  try {
    console.log('=== WIPING DATABASE ===');
    
    // Delete all data from tables (in correct order due to foreign keys)
    await pool.query('DELETE FROM purchases');
    console.log('✓ Cleared purchases');
    
    await pool.query('DELETE FROM trades');
    console.log('✓ Cleared trades');
    
    await pool.query('DELETE FROM holdings');
    console.log('✓ Cleared holdings');
    
    await pool.query('DELETE FROM magic_links');
    console.log('✓ Cleared magic links');
    
    await pool.query('DELETE FROM users');
    console.log('✓ Cleared users');
    
    // Reset auto-increment sequences
    await pool.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE holdings_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE trades_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE purchases_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE magic_links_id_seq RESTART WITH 1');
    console.log('✓ Reset ID sequences');
    
    // Update asset prices to ensure they work
    const prices = {
      'BTC': 116000,
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
    console.log('✓ Updated asset prices');
    
    // Verify everything is clean
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM holdings) as holdings,
        (SELECT COUNT(*) FROM trades) as trades,
        (SELECT COUNT(*) FROM purchases) as purchases,
        (SELECT COUNT(*) FROM magic_links) as magic_links
    `);
    
    console.log('=== FINAL COUNTS ===');
    console.log('Users:', counts.rows[0].users);
    console.log('Holdings:', counts.rows[0].holdings);
    console.log('Trades:', counts.rows[0].trades);
    console.log('Purchases:', counts.rows[0].purchases);
    console.log('Magic Links:', counts.rows[0].magic_links);
    
    console.log('=== DATABASE WIPED CLEAN ===');
    console.log('You can now register a fresh account!');
    
  } catch (error) {
    console.error('Wipe error:', error);
  } finally {
    await pool.end();
  }
}

wipeDatabase();