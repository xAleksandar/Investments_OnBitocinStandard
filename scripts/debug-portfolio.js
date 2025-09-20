const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
  // Fallback to individual credentials if no connection string
  ...((!process.env.POSTGRES_URL && !process.env.PRISMA_DATABASE_URL) && {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })
});

async function debugPortfolio() {
  try {
    console.log('=== DATABASE DEBUG ===');
    
    // Check users
    const users = await pool.query('SELECT * FROM users');
    console.log('Users:', users.rows);
    
    // Check holdings
    const holdings = await pool.query('SELECT * FROM holdings');
    console.log('Holdings:', holdings.rows);
    
    // Check trades
    const trades = await pool.query('SELECT * FROM trades');
    console.log('Trades:', trades.rows);
    
    // Check purchases
    const purchases = await pool.query('SELECT * FROM purchases');
    console.log('Purchases:', purchases.rows);
    
    // Check assets
    const assets = await pool.query('SELECT symbol, current_price_usd FROM assets WHERE current_price_usd IS NOT NULL');
    console.log('Assets with prices:', assets.rows);
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugPortfolio();