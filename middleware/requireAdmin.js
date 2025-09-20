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

    // Check admin status using centralized utility
    const { isUserAdmin } = require('../utils/adminCheck');
    const isAdmin = await isUserAdmin(user.email, user.userId);

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