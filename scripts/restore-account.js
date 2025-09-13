const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function restoreAccount() {
  try {
    console.log('=== RESTORING ACCOUNT ===');
    
    // Check if user exists
    let user = await pool.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    
    if (user.rows.length === 0) {
      // Create user
      console.log('Creating user account...');
      const newUser = await pool.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
        ['testuser', 'test@example.com']
      );
      user = newUser;
      console.log('✓ User created:', user.rows[0]);
    } else {
      console.log('✓ User exists:', user.rows[0]);
    }
    
    const userId = user.rows[0].id;
    
    // Check if user has BTC holding
    const btcHolding = await pool.query(
      'SELECT * FROM holdings WHERE user_id = $1 AND asset_symbol = $2',
      [userId, 'BTC']
    );
    
    if (btcHolding.rows.length === 0) {
      // Give user 1 BTC (100M sats)
      console.log('Giving user starting 1 BTC...');
      await pool.query(
        'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
        [userId, 'BTC', 100000000]
      );
      console.log('✓ Starting balance added: 1 BTC');
    } else {
      console.log('✓ User already has BTC:', (btcHolding.rows[0].amount / 100000000), 'BTC');
    }
    
    // Create some sample trades for testing
    console.log('Creating sample trades...');
    
    // Trade 1: 0.01 BTC for Amazon
    const trade1 = await pool.query(`
      INSERT INTO trades (user_id, from_asset, to_asset, from_amount, to_amount, btc_price_usd, asset_price_usd, created_at)
      VALUES ($1, 'BTC', 'AMZN', 1000000, 686301, 115000, 145.80, NOW() - INTERVAL '2 hours')
      RETURNING *
    `, [userId]);
    
    // Trade 2: Another 0.01 BTC for Amazon
    const trade2 = await pool.query(`
      INSERT INTO trades (user_id, from_asset, to_asset, from_amount, to_amount, btc_price_usd, asset_price_usd, created_at)
      VALUES ($1, 'BTC', 'AMZN', 1000000, 686301, 115000, 145.80, NOW() - INTERVAL '1 hour')
      RETURNING *
    `, [userId]);
    
    console.log('✓ Sample trades created');
    
    // Update holdings to reflect trades
    await pool.query(
      'UPDATE holdings SET amount = amount - $1 WHERE user_id = $2 AND asset_symbol = $3',
      [2000000, userId, 'BTC'] // Subtract 0.02 BTC
    );
    
    // Add Amazon holding
    const amznHolding = await pool.query(
      'SELECT * FROM holdings WHERE user_id = $1 AND asset_symbol = $2',
      [userId, 'AMZN']
    );
    
    if (amznHolding.rows.length === 0) {
      await pool.query(
        'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
        [userId, 'AMZN', 1372602] // Total Amazon shares
      );
    } else {
      await pool.query(
        'UPDATE holdings SET amount = $1 WHERE user_id = $2 AND asset_symbol = $3',
        [1372602, userId, 'AMZN']
      );
    }
    
    // Create purchase records
    console.log('Creating purchase records...');
    
    // Purchase 1 (locked for 1 more hour)
    await pool.query(`
      INSERT INTO purchases (user_id, asset_symbol, amount, btc_spent, purchase_price_usd, btc_price_usd, locked_until, created_at)
      VALUES ($1, 'AMZN', 686301, 1000000, 145.80, 115000, NOW() + INTERVAL '1 hour', NOW() - INTERVAL '2 hours')
    `, [userId]);
    
    // Purchase 2 (locked for 2 more hours)
    await pool.query(`
      INSERT INTO purchases (user_id, asset_symbol, amount, btc_spent, purchase_price_usd, btc_price_usd, locked_until, created_at)
      VALUES ($1, 'AMZN', 686301, 1000000, 145.80, 115000, NOW() + INTERVAL '2 hours', NOW() - INTERVAL '1 hour')
    `, [userId]);
    
    console.log('✓ Purchase records created');
    
    // Final check
    const finalHoldings = await pool.query('SELECT * FROM holdings WHERE user_id = $1', [userId]);
    const finalTrades = await pool.query('SELECT * FROM trades WHERE user_id = $1', [userId]);
    const finalPurchases = await pool.query('SELECT * FROM purchases WHERE user_id = $1', [userId]);
    
    console.log('=== FINAL STATE ===');
    console.log('Holdings:', finalHoldings.rows);
    console.log('Trades:', finalTrades.rows.length);
    console.log('Purchases:', finalPurchases.rows.length);
    
    console.log('=== ACCOUNT RESTORED ===');
    
  } catch (error) {
    console.error('Restore error:', error);
  } finally {
    await pool.end();
  }
}

restoreAccount();