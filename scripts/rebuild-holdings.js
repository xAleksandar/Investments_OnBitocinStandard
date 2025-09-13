const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function rebuildHoldings() {
  try {
    console.log('=== REBUILDING HOLDINGS FROM TRADES ===');
    
    // Get all users
    const users = await pool.query('SELECT * FROM users');
    console.log('Found users:', users.rows);
    
    for (const user of users.rows) {
      console.log(`\nProcessing user: ${user.username} (ID: ${user.id})`);
      
      // Clear existing holdings for this user
      await pool.query('DELETE FROM holdings WHERE user_id = $1', [user.id]);
      
      // Give starting 1 BTC
      await pool.query(
        'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
        [user.id, 'BTC', 100000000]
      );
      console.log('✓ Added starting 1 BTC');
      
      // Get all trades for this user
      const trades = await pool.query(
        'SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at',
        [user.id]
      );
      
      console.log(`Found ${trades.rows.length} trades`);
      
      // Process each trade
      for (const trade of trades.rows) {
        console.log(`Processing trade: ${trade.from_asset} → ${trade.to_asset}`);
        
        // Subtract from_asset
        const fromHolding = await pool.query(
          'SELECT * FROM holdings WHERE user_id = $1 AND asset_symbol = $2',
          [user.id, trade.from_asset]
        );
        
        if (fromHolding.rows.length > 0) {
          await pool.query(
            'UPDATE holdings SET amount = amount - $1 WHERE user_id = $2 AND asset_symbol = $3',
            [trade.from_amount, user.id, trade.from_asset]
          );
        }
        
        // Add to_asset
        const toHolding = await pool.query(
          'SELECT * FROM holdings WHERE user_id = $1 AND asset_symbol = $2',
          [user.id, trade.to_asset]
        );
        
        if (toHolding.rows.length === 0) {
          await pool.query(
            'INSERT INTO holdings (user_id, asset_symbol, amount) VALUES ($1, $2, $3)',
            [user.id, trade.to_asset, trade.to_amount]
          );
        } else {
          await pool.query(
            'UPDATE holdings SET amount = amount + $1 WHERE user_id = $2 AND asset_symbol = $3',
            [trade.to_amount, user.id, trade.to_asset]
          );
        }
        
        console.log(`✓ Trade processed: -${trade.from_amount} ${trade.from_asset}, +${trade.to_amount} ${trade.to_asset}`);
      }
      
      // Show final holdings for this user
      const finalHoldings = await pool.query(
        'SELECT * FROM holdings WHERE user_id = $1',
        [user.id]
      );
      
      console.log('Final holdings:');
      finalHoldings.rows.forEach(holding => {
        const amount = holding.asset_symbol === 'BTC' 
          ? (holding.amount / 100000000).toFixed(8) + ' BTC'
          : (holding.amount / 100000000).toFixed(8) + ' ' + holding.asset_symbol;
        console.log(`  ${holding.asset_symbol}: ${amount}`);
      });
    }
    
    console.log('\n=== REBUILD COMPLETE ===');
    
  } catch (error) {
    console.error('Rebuild error:', error);
  } finally {
    await pool.end();
  }
}

rebuildHoldings();