const express = require('express');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

// Check if user exists
router.post('/check-user', async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    res.json({ exists: user.rows.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request magic link
router.post('/request-link', async (req, res) => {
  const { email, username } = req.body;
  
  try {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Check if user exists
    let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (user.rows.length === 0 && username) {
      // Create new user
      const newUser = await pool.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
        [username, email]
      );
      
      // Give them 1 BTC (100,000,000 satoshis)
      await pool.query(
        'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
        [newUser.rows[0].id, 'BTC', 100000000]
      );
      
      user = newUser;
    }
    
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'User not found. Please provide username for registration.' });
    }
    
    // Store magic link
    await pool.query(
      'INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, token, expiresAt]
    );
    
    // In production, send email here
    console.log(`Magic link for ${email}: http://localhost:3000/auth/verify?token=${token}`);
    
    res.json({ message: 'Magic link sent! Check console for now.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify magic link
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  
  try {
    const link = await pool.query(
      'SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW() AND used = false',
      [token]
    );
    
    if (link.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // Mark token as used
    await pool.query('UPDATE magic_links SET used = true WHERE token = $1', [token]);
    
    // Get user
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [link.rows[0].email]);
    
    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token: jwtToken, user: user.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;