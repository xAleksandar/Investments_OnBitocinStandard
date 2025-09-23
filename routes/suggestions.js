const express = require('express');
const prisma = require('../config/database');
const authenticateToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const router = express.Router();

// Rate limiting helper - check if user can submit (1 hour cooldown)
// Exception: If the most recent submission is closed, user can submit immediately
const checkRateLimit = async (userId) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSubmission = await prisma.suggestion.findFirst({
    where: {
      userId,
      createdAt: { gt: oneHourAgo }
    },
    select: {
      createdAt: true,
      status: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (recentSubmission) {
    const submission = recentSubmission;

    // If the most recent submission is closed, allow immediate submission
    if (submission.status === 'closed') {
      return { canSubmit: true };
    }

    // Otherwise, apply rate limiting for open submissions
    const lastSubmission = new Date(submission.createdAt);
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
    const result = await prisma.suggestion.create({
      data: {
        userId: req.user.userId,
        type,
        title: title.trim(),
        description: description.trim()
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'Suggestion submitted successfully!',
      suggestion: result
    });

  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to submit suggestion' });
  }
});

// Get user's own suggestions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT id, type, title, description, status, admin_reply, replied_at, created_at
      FROM suggestions
      WHERE user_id = ${req.user.userId}
      ORDER BY created_at DESC
    `;

    res.json({
      suggestions: result
    });

  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Get all suggestions (public view for now - will be admin only later)
router.get('/all', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT s.id, s.type, s.title, s.description, s.status, s.admin_reply, s.replied_at, s.created_at,
             u.username
      FROM suggestions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `;

    res.json({
      suggestions: result
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

    const result = await prisma.$queryRawUnsafe(query, ...params);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({
      message: 'Suggestion updated successfully',
      suggestion: result[0]
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

// ===== ADMIN ENDPOINTS =====

// Get all suggestions for admin dashboard (with pagination and filters)
router.get('/admin/suggestions', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    const limitInt = parseInt(limit);
    const pageInt = parseInt(page);
    const offset = (pageInt - 1) * limitInt;

    // Build dynamic query
    let whereClause = '1=1';
    let params = [];
    let paramCount = 1;

    if (status && ['open', 'closed'].includes(status)) {
      whereClause += ` AND s.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (type && ['suggestion', 'bug'].includes(type)) {
      whereClause += ` AND s.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (search) {
      whereClause += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Get suggestions with user info
    const query = `
      SELECT s.id, s.type, s.title, s.description, s.status, s.admin_reply, s.replied_at, s.created_at,
             u.id as user_id, u.username, u.email
      FROM suggestions s
      JOIN users u ON s.user_id = u.id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limitInt, offset);

    const result = await prisma.$queryRawUnsafe(query, ...params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM suggestions s
      JOIN users u ON s.user_id = u.id
      WHERE ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params.slice(0, -2)); // Remove limit and offset

    res.json({
      suggestions: result,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total: parseInt(countResult[0].total),
        totalPages: Math.ceil(countResult[0].total / limitInt)
      }
    });

  } catch (error) {
    console.error('Error fetching admin suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Add admin reply to suggestion
router.put('/admin/suggestions/:id/reply', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply, closeAfterReply = false } = req.body;

    if (!adminReply || adminReply.trim().length === 0) {
      return res.status(400).json({ error: 'Admin reply is required' });
    }

    if (adminReply.length > 2000) {
      return res.status(400).json({ error: 'Admin reply must be 2000 characters or less' });
    }

    // Get existing reply to append to it (preserve conversation history)
    const existingReply = await prisma.$queryRaw`SELECT admin_reply FROM suggestions WHERE id = ${id}`;

    if (existingReply.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const currentReply = existingReply[0].admin_reply;
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Append new reply to existing replies (preserve conversation history)
    const newReplyContent = currentReply
      ? `${currentReply}\n\n[${timestamp}] ${adminReply.trim()}`
      : `[${timestamp}] ${adminReply.trim()}`;

    // Update suggestion with appended reply and optionally close
    let updateQuery = `
      UPDATE suggestions
      SET admin_reply = $1, replied_at = CURRENT_TIMESTAMP
    `;
    let params = [newReplyContent];

    if (closeAfterReply) {
      updateQuery += `, status = 'closed'`;
    }

    updateQuery += ` WHERE id = $2 RETURNING *`;
    params.push(id);

    const result = await prisma.$queryRawUnsafe(updateQuery, ...params);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({
      message: closeAfterReply ? 'Reply added and suggestion closed' : 'Reply added successfully',
      suggestion: result[0]
    });

  } catch (error) {
    console.error('Error adding admin reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Update suggestion status
router.put('/admin/suggestions/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "open" or "closed"' });
    }

    const result = await prisma.$queryRawUnsafe(
      'UPDATE suggestions SET status = $1 WHERE id = $2 RETURNING *',
      status, id
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({
      message: `Suggestion marked as ${status}`,
      suggestion: result[0]
    });

  } catch (error) {
    console.error('Error updating suggestion status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get admin dashboard statistics
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    // Get counts by status
    const statusStats = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM suggestions
      GROUP BY status
    `;

    // Get counts by type
    const typeStats = await prisma.$queryRaw`
      SELECT type, COUNT(*) as count
      FROM suggestions
      GROUP BY type
    `;

    // Get recent activity (last 7 days)
    const recentActivity = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM suggestions
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;

    // Get average response time for closed suggestions with replies
    const avgResponseTime = await prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (replied_at - created_at))/3600) as avg_hours
      FROM suggestions
      WHERE status = 'closed' AND admin_reply IS NOT NULL AND replied_at IS NOT NULL
    `;

    const stats = {
      status: statusStats.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, { open: 0, closed: 0 }),
      type: typeStats.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      }, { suggestion: 0, bug: 0 }),
      recentActivity: parseInt(recentActivity[0].count),
      avgResponseTimeHours: avgResponseTime[0].avg_hours ? parseFloat(avgResponseTime[0].avg_hours).toFixed(1) : null
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Promote user to admin via database flag
router.post('/admin/users/:id/promote', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await prisma.$queryRawUnsafe(
      'UPDATE users SET is_admin = true WHERE id = $1 RETURNING id, username, email, is_admin',
      id
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User promoted to admin successfully',
      user: result[0]
    });

  } catch (error) {
    console.error('Error promoting user to admin:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

module.exports = router;