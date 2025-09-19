const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const tradeRoutes = require('./routes/trades');
const assetRoutes = require('./routes/assets');
const suggestionsRoutes = require('./routes/suggestions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// Magic link redirect (for user-friendly URLs)
app.get('/auth/verify', (req, res) => {
  const token = req.query.token;
  res.redirect(`/?token=${token}`);
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});