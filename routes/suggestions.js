const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Rate limiting helper - check if user can submit (1 hour cooldown)
const checkRateLimit = async (userId) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSubmission = await pool.query(
    'SELECT created_at FROM suggestions WHERE user_id = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT 1',
    [userId, oneHourAgo]
  );

  if (recentSubmission.rows.length > 0) {
    const lastSubmission = new Date(recentSubmission.rows[0].created_at);
    const nextAllowedTime = new Date(lastSubmission.getTime() + 60 * 60 * 1000);
    const remainingMs = nextAllowedTime.getTime() - Date.now();

    return {
      canSubmit: false,
      remainingMs,
      nextAllowedTime
    };
  }

  return { canSubmit: true };
};

// Submit new suggestion or bug report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, description } = req.body;

    // Validate input
    if (!type || !['suggestion', 'bug'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "suggestion" or "bug"' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (title.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' });
    }

    if (description.length > 5000) {
      return res.status(400).json({ error: 'Description must be 5000 characters or less' });
    }

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(req.user.userId);
    if (!rateLimitCheck.canSubmit) {
      return res.status(429).json({
        error: 'Rate limit exceeded. You can only submit one suggestion per hour.',
        remainingMs: rateLimitCheck.remainingMs,
        nextAllowedTime: rateLimitCheck.nextAllowedTime
      });
    }

    // Create suggestion
    const result = await pool.query(
      `INSERT INTO suggestions (user_id, type, title, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, title, description, status, created_at`,
      [req.user.userId, type, title.trim(), description.trim()]
    );

    res.status(201).json({
      message: 'Suggestion submitted successfully!',
      suggestion: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to submit suggestion' });
  }
});

// Get user's own suggestions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, title, description, status, admin_reply, replied_at, created_at
       FROM suggestions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json({
      suggestions: result.rows
    });

  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Get all suggestions (public view for now - will be admin only later)
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.type, s.title, s.description, s.status, s.admin_reply, s.replied_at, s.created_at,
              u.username
       FROM suggestions s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC`
    );

    res.json({
      suggestions: result.rows
    });

  } catch (error) {
    console.error('Error fetching all suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Update suggestion status and/or add admin reply (public for now - will be admin only later)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    // Validate status if provided
    if (status && !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "open" or "closed"' });
    }

    // Build dynamic query based on what's being updated
    let query = 'UPDATE suggestions SET ';
    let params = [];
    let paramCount = 1;

    if (status) {
      query += `status = $${paramCount}`;
      params.push(status);
      paramCount++;

      if (adminReply) {
        query += ', ';
      }
    }

    if (adminReply) {
      query += `admin_reply = $${paramCount}, replied_at = CURRENT_TIMESTAMP`;
      params.push(adminReply);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({
      message: 'Suggestion updated successfully',
      suggestion: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// Check rate limit status for current user
router.get('/rate-limit', authenticateToken, async (req, res) => {
  try {
    const rateLimitCheck = await checkRateLimit(req.user.userId);
    res.json(rateLimitCheck);
  } catch (error) {
    console.error('Error checking rate limit:', error);
    res.status(500).json({ error: 'Failed to check rate limit' });
  }
});

module.exports = router;