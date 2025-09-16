const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default postgres db first
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  let gamePool;

  try {
    // Try to create database
    try {
      await pool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Database ${process.env.DB_NAME} created successfully`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log('Database already exists, continuing with table creation');
      } else {
        throw error;
      }
    }

    // Connect to our database
    gamePool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Create tables
    await gamePool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await gamePool.query(`
      CREATE TABLE holdings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        asset_symbol VARCHAR(10) NOT NULL,
        amount BIGINT NOT NULL,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await gamePool.query(`
      CREATE TABLE trades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        from_asset VARCHAR(10) NOT NULL,
        to_asset VARCHAR(10) NOT NULL,
        from_amount BIGINT NOT NULL,
        to_amount BIGINT NOT NULL,
        btc_price_usd DECIMAL(15,2),
        asset_price_usd DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await gamePool.query(`
      CREATE TABLE assets (
        symbol VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        asset_type VARCHAR(20) NOT NULL,
        current_price_usd DECIMAL(15,8),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await gamePool.query(`
      CREATE TABLE magic_links (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await gamePool.query(`
      CREATE TABLE purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        asset_symbol VARCHAR(10) NOT NULL,
        amount BIGINT NOT NULL,
        btc_spent BIGINT NOT NULL,
        purchase_price_usd DECIMAL(15,8),
        btc_price_usd DECIMAL(15,2),
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('All tables created successfully');

    // Insert initial assets
    const initialAssets = [
      ['BTC', 'Bitcoin', 'crypto'],
      ['AAPL', 'Apple Inc.', 'stock'],
      ['TSLA', 'Tesla Inc.', 'stock'],
      ['MSFT', 'Microsoft Corp.', 'stock'],
      ['GOOGL', 'Alphabet Inc.', 'stock'],
      ['AMZN', 'Amazon.com Inc.', 'stock'],
      ['NVDA', 'NVIDIA Corp.', 'stock'],
      ['SPY', 'SPDR S&P 500 ETF', 'stock'],
      ['VNQ', 'Vanguard Real Estate ETF', 'stock'],
      ['XAU', 'Gold', 'commodity'],
      ['XAG', 'Silver', 'commodity'],
      ['WTI', 'Crude Oil WTI', 'commodity']
    ];

    for (const [symbol, name, type] of initialAssets) {
      await gamePool.query(
        'INSERT INTO assets (symbol, name, asset_type) VALUES ($1, $2, $3)',
        [symbol, name, type]
      );
    }

    console.log('Initial assets inserted');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
    if (gamePool) {
      await gamePool.end();
    }
  }
}

setupDatabase();