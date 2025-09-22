const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const tradeRoutes = require('./routes/trades-prisma');
const assetRoutes = require('./routes/assets');
const suggestionsRoutes = require('./routes/suggestions');
const debugRoutes = require('./routes/debug');
const setForgetPortfoliosRoutes = require('./routes/set-forget-portfolios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Safely serialize BigInt values in all JSON responses
// Converts BigInt to string to avoid JSON.stringify errors
const bigIntReplacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value);
const originalJson = express.response.json;
express.response.json = function (body) {
  try {
    const sanitized = JSON.parse(JSON.stringify(body, bigIntReplacer));
    return originalJson.call(this, sanitized);
  } catch (e) {
    // Fallback if body isn't plain-serializable
    return originalJson.call(this, body);
  }
};

// Force refresh connection pools
app.get('/api/refresh-pools', async (req, res) => {
  try {
    // This will force all route modules to reconnect
    delete require.cache[require.resolve('./config/database.js')];
    res.json({ message: 'Connection pools refreshed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint with fresh connection
app.get('/api/debug', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
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
  
  try {
    await client.connect();
    const result = await client.query('SELECT COUNT(*) as trade_count FROM trades');
    const dbInfo = await client.query('SELECT current_database(), current_user');
    
    res.json({
      database: dbInfo.rows[0].current_database,
      user: dbInfo.rows[0].current_user,
      trade_count: result.rows[0].trade_count,
      connection_type: 'fresh_client',
      env: {
        connectionString: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
        // Fallback to individual credentials if no connection string
        ...((!process.env.POSTGRES_URL && !process.env.PRISMA_DATABASE_URL) && {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        })
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/set-forget-portfolios', setForgetPortfoliosRoutes);

// Magic link redirect (for user-friendly URLs)
app.get('/auth/verify', (req, res) => {
  const token = req.query.token;
  res.redirect(`/?token=${token}`);
});

// Alternative API route for magic link verification (backup)
app.get('/api/auth/verify-redirect', (req, res) => {
  const token = req.query.token;
  res.redirect(`/?token=${token}`);
});

// Serve frontend - catch-all for non-API, non-static routes
app.get('*', (req, res) => {
  // Only serve index.html for non-static file requests
  if (!req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    // Let static middleware handle file requests (should have been caught already)
    res.status(404).send('File not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
