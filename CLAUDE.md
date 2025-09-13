# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bitcoin Investment Game - A gamified investment platform where users start with 1 virtual Bitcoin and attempt to outperform holding BTC by trading it for stocks and commodities. All values are measured in satoshis instead of fiat currency, providing a Bitcoin-centric perspective on investing.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with auto-reload (port 3000)
npm run dev

# Run production server
npm start

# Initialize database tables
npm run setup-db

# Database management scripts
node scripts/wipe-database.js        # Clear all data
node scripts/rebuild-from-trades.js  # Rebuild portfolio from trade history
node scripts/rebuild-holdings.js     # Recalculate holdings
node scripts/fix-portfolio.js        # Fix portfolio inconsistencies
node scripts/debug-portfolio.js      # Debug portfolio data
```

## Architecture

### Backend Structure

**Express API Server** (`server.js`)
- Main routes mounted at `/api/*`:
  - `/api/auth` - Magic link authentication and JWT management
  - `/api/portfolio` - Portfolio tracking and valuation
  - `/api/trades` - Trade execution and history
  - `/api/assets` - Asset prices and market data
- Static frontend served from `/public`
- PostgreSQL connection pooling via `config/database.js`

### Database Schema

Key tables created in `scripts/setup-database.js`:
- **users**: User accounts with email-based auth
- **holdings**: Current asset positions per user
- **trades**: Complete trade history with BTC costs
- **magic_links**: Temporary auth tokens
- **purchases**: Asset purchase tracking with 24-hour lock

### Trading Logic

The core trading system (`routes/trades.js`) implements:
1. **24-hour Lock**: Assets cannot be sold back to BTC for 24 hours after purchase
2. **Cost Basis Tracking**: FIFO (First In, First Out) for tax-like calculations
3. **Real-time Pricing**: Integration with CoinGecko API for live BTC and asset prices
4. **Portfolio Valuation**: All values calculated in satoshis (100M sats = 1 BTC)

### Frontend Architecture

Single-page application (`public/app.js`) with:
- Vanilla JavaScript with no framework dependencies
- State management via global `window.app` object
- Real-time price updates every 30 seconds
- Tailwind CSS for styling
- Custom notification system for user feedback

## Key Implementation Details

### Authentication Flow
1. User requests magic link via email
2. Server generates JWT and stores in `magic_links` table
3. Email contains verification link with token
4. Frontend stores JWT in localStorage for session persistence

### Trade Execution Process
1. Validate user has sufficient BTC balance
2. Fetch current prices from CoinGecko
3. Calculate satoshi amounts based on USD prices
4. Create trade record and update holdings
5. Enforce 24-hour lock on new purchases

### Portfolio Calculation
- Holdings value = sum of (quantity × current_price_in_sats)
- P&L = current_value - cost_basis
- Cost basis tracked per trade for accurate calculations
- All calculations done in satoshis to avoid floating point issues

## External Dependencies

### Critical APIs
- **CoinGecko API**: Real-time price data for BTC and assets
  - No API key required for basic usage
  - Rate limits apply (50 calls/minute)
  - Fallback to cached prices if API fails

### Environment Variables
Required in `.env`:
- `DB_*`: PostgreSQL connection details
- `JWT_SECRET`: Token signing key
- `PORT`: Server port (default 3000)
- `EMAIL_*`: SMTP settings for magic links (optional in dev)

## Development Workflow

### Adding New Assets
1. Update asset list in `routes/assets.js`
2. Add CoinGecko ID mapping for price fetching
3. Update frontend UI to display new asset

### Database Migrations
- Manual SQL scripts in `scripts/` directory
- Run setup script to create initial schema
- Use rebuild scripts to fix data inconsistencies

### Testing Price Calculations
- All monetary values stored as BIGINT satoshis
- Use `Math.floor()` to avoid decimal satoshi amounts
- Test with extreme values (0.01 sats to 100M sats)

## Common Issues & Solutions

### Portfolio Discrepancies
Run `node scripts/rebuild-from-trades.js` to recalculate from trade history

### Database Connection Issues
Check PostgreSQL is running and `.env` credentials are correct

### Price Fetching Failures
- Check CoinGecko API status
- Implement fallback to last known prices
- Consider caching strategy for resilience