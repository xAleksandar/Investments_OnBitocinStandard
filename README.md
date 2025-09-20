# Bitcoin Investment Game 🎯

A gamified investment platform where users start with 1 virtual Bitcoin and attempt to outperform holding BTC by trading it for stocks and commodities. All values are measured in satoshis instead of fiat currency, providing a Bitcoin-centric perspective on investing.

## ⚡ Quick Start

### Prerequisites
- **Node.js** (v16+ recommended)
- **PostgreSQL** (any recent version)
- **Git** (for cloning and version control)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd measured_in_btc

# 2. Install dependencies
npm install

# 3. Set up environment file
cp .env.example .env
# Edit .env with your PostgreSQL credentials:
# - DB_USER: your postgres username (often 'postgres')
# - DB_PASSWORD: your postgres password
# - Other settings can stay as defaults

# 4. Initialize database (creates bitcoin_game database and all tables)
npm run setup-db

# 5. Apply all database updates for full feature set
npm run update-db                     # Adds suggestions table and admin features
npm run update-db:kiro               # Adds achievements and set-forget portfolios
npm run update-db:portfolio-sharing  # Adds portfolio image generation
npm run update-db:expanded-assets    # Adds expanded asset universe (32 total assets)
npm run update-db:purchase-tracking  # Adds enhanced purchase tracking

# 6. Optional: Configure admin access and security
# Edit .env to add:
# - JWT_SECRET=your-unique-secret-key-here
# - ADMIN_EMAILS=your@email.com (for admin privileges)

# 7. Start development server
npm run dev
# Server runs on http://localhost:3000
# Magic links appear in console (email not configured in dev)
```

## 🛠️ Development Commands

```bash
# Development
npm run dev          # Start development server with auto-reload (port 3000)
npm start           # Run production server

# Database Management
npm run setup-db                    # Initialize database (run once after PostgreSQL setup)
npm run update-db                   # Apply suggestions and admin features
npm run update-db:kiro              # Apply achievements and portfolio features
npm run update-db:portfolio-sharing # Apply image generation features
npm run update-db:expanded-assets   # Apply expanded asset universe (32 total assets)
npm run update-db:purchase-tracking # Apply enhanced purchase tracking

# Database Utilities
node scripts/wipe-database.js        # Clear all data
node scripts/rebuild-from-trades.js  # Rebuild portfolio from trade history
node scripts/rebuild-holdings.js     # Recalculate holdings
node scripts/fix-portfolio.js        # Fix portfolio inconsistencies
node scripts/debug-portfolio.js      # Debug portfolio data
```

## 🎮 How It Works

### Core Concept
- Start with **1 Bitcoin** (100M satoshis)
- Trade BTC for stocks, commodities, and other assets
- All prices displayed in **satoshis** instead of USD
- Goal: Outperform simply holding Bitcoin

### Key Features
- **24-hour Lock**: Assets cannot be sold back to BTC for 24 hours after purchase
- **Real-time Pricing**: Integration with CoinGecko API for live prices
- **Magic Link Auth**: Email-based authentication (no passwords)
- **Achievements System**: Unlock achievements for various trading milestones
- **Set & Forget Portfolios**: Create diversified portfolios with automatic rebalancing
- **Portfolio Sharing**: Generate and share portfolio performance images
- **Suggestions System**: Submit feedback and bug reports

### Available Assets
**Basic Set (12 assets)**:
- **Cryptocurrencies**: Bitcoin (BTC)
- **Stocks**: Apple (AAPL), Tesla (TSLA), Microsoft (MSFT), Google (GOOGL), Amazon (AMZN), NVIDIA (NVDA), S&P 500 ETF (SPY), Real Estate ETF (VNQ)
- **Commodities**: Gold (XAU), Silver (XAG), Crude Oil (WTI)

**Expanded Set (32 total assets)** - after running `npm run update-db:expanded-assets`:
- **Bonds**: Treasury Bond ETF (TLT), High Yield Corporate Bond ETF (HYG)
- **International**: FTSE 100 (^FTSE), DAX (^GDAXI), Nikkei 225 (^N225), International Stock ETF (VXUS), MSCI EAFE (EFA)
- **REITs**: Vornado (VNO), Prologis (PLD), Equinix (EQIX)
- **Additional Commodities**: Copper (HG=F), Wheat (ZW=F), Natural Gas (NG=F), Uranium ETF (URA), Agriculture Fund (DBA)
- **Additional Stocks**: Meta (META), Berkshire Hathaway (BRK-B), Johnson & Johnson (JNJ), Visa (V), Walmart (WMT)

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with connection pooling
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Authentication**: JWT with magic links
- **Charts**: Chart.js with canvas rendering
- **APIs**: CoinGecko for real-time price data

### Project Structure
```
├── config/           # Database configuration
├── middleware/       # Express middleware
├── routes/          # API routes
│   ├── auth.js      # Authentication endpoints
│   ├── portfolio.js # Portfolio management
│   ├── trades.js    # Trading functionality
│   └── assets.js    # Asset prices and data
├── scripts/         # Database management scripts
├── services/        # Business logic services
├── utils/           # Utility functions
├── public/          # Frontend files
│   ├── app.js       # Main application logic
│   ├── index.html   # Main page
│   └── styles.css   # Custom styles
└── server.js        # Main server file
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bitcoin_game
DB_USER=postgres
DB_PASSWORD=your_password

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# External APIs
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# Admin Access
ADMIN_EMAILS=your@email.com,colleague@email.com

# Email (optional for development)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

## 🎯 Usage

1. **Start the server**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Create account**: Enter email, check console for magic link
4. **Start trading**: You begin with 1 Bitcoin (100M satoshis)
5. **Monitor performance**: Track your portfolio vs holding Bitcoin

### Magic Links in Development
Since email isn't configured in development, magic links appear in the server console:
```
Magic link for user@example.com: http://localhost:3000/auth/verify?token=...
```

## 🤝 Contributing

### Database Changes
- Always use migration scripts in `scripts/` directory
- Run `npm run update-db` after git pull if prompted
- Never run SQL commands directly (use scripts for team consistency)

### Code Style
- Follow existing patterns and conventions
- Keep it simple (KISS principle)
- Don't repeat yourself (DRY principle)
- Use existing libraries and utilities

### Commit Messages
- Use meaningful commit messages
- Separate unrelated changes into different commits
- Mention if teammates need to run database updates

## 🐛 Troubleshooting

### Common Issues

**Portfolio Discrepancies**
```bash
node scripts/rebuild-from-trades.js
```

**Database Connection Issues**
- Check PostgreSQL is running
- Verify `.env` credentials are correct

**Price Fetching Failures**
- Check CoinGecko API status
- Application falls back to last known prices

### Database Reset
```bash
node scripts/wipe-database.js          # Clear all data
npm run setup-db                       # Recreate tables
npm run update-db                      # Apply all updates
npm run update-db:kiro
npm run update-db:portfolio-sharing
npm run update-db:expanded-assets
npm run update-db:purchase-tracking
```

## 📊 Recent Features (Sep 2025)

- ✅ **Suggestions & Bug Report System** with rate limiting
- ✅ **Achievements System** with unlockable milestones
- ✅ **Set & Forget Portfolios** with automatic rebalancing
- ✅ **Portfolio Image Generation** for sharing
- ✅ **Admin Panel** for managing users and content
- ✅ **Performance Calculation Fixes**
- ✅ **30-Second Auto-Refresh** for real-time updates

## 📝 License

[Add your license here]

## 🔗 Links

- [Project Documentation](./CLAUDE.md) (AI development guidelines)
- [CoinGecko API](https://www.coingecko.com/api)