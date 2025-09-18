const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const requireAdmin = async (req, res, next) => {
  try {
    // First, verify the user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;

    // Now check admin status with dual verification
    // 1. Check environment variables for admin emails
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(email => email);
    const isAdminByEmail = adminEmails.includes(user.email);

    // 2. Check database for admin flag
    const dbResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [user.userId]
    );

    const isAdminByDB = dbResult.rows.length > 0 && dbResult.rows[0].is_admin === true;

    // User is admin if EITHER condition is true
    const isAdmin = isAdminByEmail || isAdminByDB;

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Admin access required',
        details: 'This endpoint requires administrator privileges'
      });
    }

    // Add admin flag to request for use in route handlers
    req.user.isAdmin = true;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }

    console.error('Admin verification error:', error);
    return res.status(500).json({ error: 'Admin verification failed' });
  }
};

module.exports = requireAdmin;