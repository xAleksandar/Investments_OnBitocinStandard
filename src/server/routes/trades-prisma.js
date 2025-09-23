const express = require('express');
const prisma = require('../config/database');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Execute a trade
router.post('/execute', authenticateToken, async (req, res) => {
  const { fromAsset, toAsset, amount, unit } = req.body;
  
  console.log('Trade request:', { fromAsset, toAsset, amount, unit, userId: req.user.userId });

  // Convert amount to satoshis based on unit
  let amountInSats;
  if (unit === 'btc') {
    amountInSats = Math.round(amount * 100000000);
  } else if (unit === 'msat') {
    amountInSats = Math.round(amount / 1000);
  } else if (unit === 'ksat') {
    amountInSats = Math.round(amount * 1000);
  } else if (unit === 'sat') {
    amountInSats = Math.round(amount);
  } else if (unit === 'asset') {
    // For non-BTC assets, amount is stored as integer with 8 decimal precision
    amountInSats = Math.round(amount * 100000000);
  } else {
    return res.status(400).json({ error: 'Invalid unit' });
  }

  if (amountInSats <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get current prices
      const assets = await tx.asset.findMany({
        where: {
          symbol: { in: [fromAsset, toAsset] }
        }
      });
      
      const assetPrices = {};
      assets.forEach(asset => {
        assetPrices[asset.symbol] = parseFloat(asset.currentPriceUsd);
      });
      
      const btcPrice = assetPrices['BTC'];
      
      if (!btcPrice || !assetPrices[fromAsset] || !assetPrices[toAsset]) {
        throw new Error('Asset prices not available');
      }
      
      // Check user has enough of fromAsset
      const holding = await tx.holding.findFirst({
        where: {
          userId: req.user.userId,
          assetSymbol: fromAsset
        }
      });
      
      if (!holding) {
        throw new Error(`No ${fromAsset} holdings found`);
      }
      
      if (BigInt(holding.amount) < BigInt(amountInSats)) {
        throw new Error(`Insufficient ${fromAsset} balance`);
      }
      
      // Check if asset is locked (for non-BTC assets)
      if (fromAsset !== 'BTC') {
        const lockedPurchases = await tx.$queryRaw`
          SELECT SUM(amount) as locked_amount 
          FROM purchases 
          WHERE user_id = ${req.user.userId} 
            AND asset_symbol = ${fromAsset} 
            AND locked_until > NOW()
        `;
        
        const lockedAmount = BigInt(lockedPurchases[0]?.locked_amount || 0);
        
        if (lockedAmount > 0 && BigInt(amountInSats) > (BigInt(holding.amount) - lockedAmount)) {
          throw new Error(`Asset is locked. Available: ${Number(BigInt(holding.amount) - lockedAmount) / 100000000}`);
        }
      }
      
      // Calculate trade amounts
      let toAmount;
      
      if (fromAsset === 'BTC' && toAsset !== 'BTC') {
        // Buying asset with BTC
        const assetPriceUsd = assetPrices[toAsset];
        const btcValueUsd = (amountInSats / 100000000) * btcPrice;
        const assetShares = btcValueUsd / assetPriceUsd;
        toAmount = Math.round(assetShares * 100000000); // Store as integer with 8 decimal precision
      } else if (fromAsset !== 'BTC' && toAsset === 'BTC') {
        // Selling asset for BTC
        const assetPriceUsd = assetPrices[fromAsset];
        const assetShares = amountInSats / 100000000;
        const usdValue = assetShares * assetPriceUsd;
        toAmount = Math.round((usdValue / btcPrice) * 100000000);
      } else {
        throw new Error('One asset must be BTC');
      }
      
      // Update fromAsset holding
      await tx.holding.update({
        where: {
          id: holding.id
        },
        data: {
          amount: { decrement: BigInt(amountInSats) }
        }
      });
      
      // Handle toAsset holding
      if (toAsset === 'BTC') {
        // Adding to BTC (no lock)
        const btcHolding = await tx.holding.findFirst({
          where: {
            userId: req.user.userId,
            assetSymbol: 'BTC'
          }
        });
        
        if (btcHolding) {
          await tx.holding.update({
            where: { id: btcHolding.id },
            data: { amount: { increment: BigInt(toAmount) } }
          });
        } else {
          await tx.holding.create({
            data: {
              userId: req.user.userId,
              assetSymbol: 'BTC',
              amount: BigInt(toAmount)
            }
          });
        }
      } else {
        // Buying non-BTC asset (with 24-hour lock)
        const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Create individual purchase record
        await tx.purchase.create({
          data: {
            userId: req.user.userId,
            assetSymbol: toAsset,
            amount: BigInt(toAmount),
            btcSpent: BigInt(amountInSats),
            purchasePriceUsd: assetPrices[toAsset],
            btcPriceUsd: btcPrice,
            lockedUntil: lockUntil
          }
        });
        
        // Update or create aggregate holding
        const toHolding = await tx.holding.findFirst({
          where: {
            userId: req.user.userId,
            assetSymbol: toAsset
          }
        });
        
        if (toHolding) {
          await tx.holding.update({
            where: { id: toHolding.id },
            data: { amount: { increment: BigInt(toAmount) } }
          });
        } else {
          await tx.holding.create({
            data: {
              userId: req.user.userId,
              assetSymbol: toAsset,
              amount: BigInt(toAmount)
            }
          });
        }
      }
      
      // Record trade
      const trade = await tx.trade.create({
        data: {
          userId: req.user.userId,
          fromAsset,
          toAsset,
          fromAmount: BigInt(amountInSats),
          toAmount: BigInt(toAmount),
          btcPriceUsd: btcPrice,
          assetPriceUsd: assetPrices[toAsset === 'BTC' ? fromAsset : toAsset]
        }
      });
      
      return {
        trade,
        fromAmount: amountInSats,
        toAmount,
        btcPrice,
        assetPrice: assetPrices[toAsset === 'BTC' ? fromAsset : toAsset]
      };
    });
    
    console.log('Trade completed successfully');
    res.json({
      success: true,
      trade: result.trade,
      message: `Successfully traded ${result.fromAmount / 100000000} ${fromAsset} for ${result.toAmount / 100000000} ${toAsset}`
    });
    
  } catch (error) {
    console.error('Trade failed:', error);
    res.status(400).json({ error: `Trade failed: ${error.message}` });
  }
});

// Get trade history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const trades = await prisma.trade.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json(trades);
  } catch (error) {
    console.error('Error fetching trade history:', error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

module.exports = router;