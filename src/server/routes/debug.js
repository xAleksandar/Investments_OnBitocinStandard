const express = require('express');
const prisma = require('../../../config/database');
const authenticateToken = require('../../../middleware/auth');
const router = express.Router();

// Debug route to check user holdings
router.get('/holdings', authenticateToken, async (req, res) => {
  try {
    console.log('Debug: Checking holdings for user ID:', req.user.userId);
    
    // Get raw holdings from database
    const holdings = await prisma.holding.findMany({
      where: { userId: req.user.userId }
    });
    
    console.log('Raw holdings from database:', holdings);
    
    // Convert BigInt to string for JSON response
    const holdingsForJson = holdings.map(holding => ({
      ...holding,
      amount: holding.amount.toString(),
      userId: holding.userId
    }));
    
    // Also check if user exists
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    
    console.log('User info:', user);
    
    res.json({
      user: user,
      holdings: holdingsForJson,
      holdingsCount: holdings.length
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to manually create 1 BTC holding
router.post('/create-btc', authenticateToken, async (req, res) => {
  try {
    // Check if user already has BTC
    const existingBtc = await prisma.holding.findFirst({
      where: {
        userId: req.user.userId,
        assetSymbol: 'BTC'
      }
    });
    
    if (existingBtc) {
      return res.json({ message: 'User already has BTC holding', holding: existingBtc });
    }
    
    // Create 1 BTC holding
    const btcHolding = await prisma.holding.create({
      data: {
        userId: req.user.userId,
        assetSymbol: 'BTC',
        amount: BigInt(100000000) // 1 BTC = 100,000,000 satoshis
      }
    });
    
    res.json({ 
      message: '1 BTC created successfully', 
      holding: {
        ...btcHolding,
        amount: btcHolding.amount.toString()
      }
    });
    
  } catch (error) {
    console.error('Error creating BTC:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;