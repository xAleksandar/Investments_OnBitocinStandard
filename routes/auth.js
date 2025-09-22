const express = require('express');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const router = express.Router();

// Check if user exists
router.post('/check-user', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    res.json({ exists: !!user });
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
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user && username) {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          username,
          email
        }
      });

      // Give them 1 BTC (100,000,000 satoshis)
      await prisma.holding.create({
        data: {
          userId: newUser.id,
          assetSymbol: 'BTC',
          amount: BigInt(100000000)
        }
      });

      user = newUser;
    }

    if (!user) {
      return res.status(400).json({ error: 'User not found. Please provide username for registration.' });
    }

    // Store magic link
    await prisma.magicLink.create({
      data: {
        email,
        token,
        expiresAt
      }
    });

    // Generate magic link URL based on environment
    const baseUrl = process.env.APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    // Try /auth/verify first, fallback to API route if needed
    const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;
    const fallbackUrl = `${baseUrl}/api/auth/verify-redirect?token=${token}`;
    console.log(`Magic link for ${email}: ${magicLinkUrl}`);
    console.log(`Fallback URL: ${fallbackUrl}`);

    res.json({
      message: 'Magic link sent! Check console for now.',
      magicLink: magicLinkUrl // Include the link in response for dev mode
    });
  } catch (error) {
    console.error(error);

    // Handle duplicate username error
    if (error.code === '23505' && error.constraint === 'users_username_key') {
      return res.status(400).json({ error: 'This username is already taken. Please choose a different username.' });
    }

    // Handle duplicate email error
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    res.status(500).json({ error: 'Server error' });
  }
});

// Verify magic link
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    const link = await prisma.magicLink.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        used: false
      }
    });

    if (!link) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Mark token as used
    await prisma.magicLink.update({
      where: { id: link.id },
      data: { used: true }
    });

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: link.email }
    });

    // Check admin status for JWT token (dual verification)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(email => email);
    const isAdminByEmail = adminEmails.includes(user.email);
    const isAdminByDB = user.isAdmin === true;
    const isAdmin = isAdminByEmail || isAdminByDB;

    // Generate JWT with admin status
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isAdmin: isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Include admin status in user object for frontend
    const userWithAdmin = {
      ...user,
      isAdmin: isAdmin
    };

    res.json({ token: jwtToken, user: userWithAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;