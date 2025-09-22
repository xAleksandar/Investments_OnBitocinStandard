# Architecture Overview

## Measured in Bitcoin - Express.js + Prisma ORM Application

An educational platform that teaches users about Bitcoin as a unit of account and alternative measure of wealth. Users explore how asset values change when measured in satoshis instead of dollars, demonstrating the difference between inflationary (dollar) and deflationary (Bitcoin) monetary systems.

## Core Backend Architecture (Node.js/Express + Prisma)

**Express API Server** (`server.js`)
- **Main Routes**: All API endpoints mounted at `/api/*`
- **Static Serving**: Frontend served from `/public` directory
- **Database**: Prisma ORM with PostgreSQL (`prisma/schema.prisma`)
- **Authentication**: Magic link email authentication with JWT tokens

## Database Architecture (Prisma ORM)

### Prisma Integration (September 2025 Migration)
**Critical Infrastructure Change**: Migrated from raw SQL to Prisma ORM for:
- **Type Safety**: All database queries use type-safe Prisma client
- **Migration System**: Version-controlled schema changes via `prisma/migrations/`
- **Performance**: Optimized queries and connection pooling
- **Developer Experience**: IntelliSense and compile-time error checking

### Database Schema (`prisma/schema.prisma`)

#### Core User & Authentication System
```prisma
model User {
  id                  Int      @id @default(autoincrement())
  username            String   @unique @db.VarChar(50)
  email               String   @unique @db.VarChar(255)
  isPublic            Boolean? @default(false)
  isAdmin             Boolean? @default(false)
  createdAt           DateTime @default(now())
}

model MagicLink {
  id        Int      @id @default(autoincrement())
  email     String   @db.VarChar(255)
  token     String   @unique @db.VarChar(255)
  expiresAt DateTime @db.Timestamp(6)
  used      Boolean? @default(false)
}
```

#### Trading & Portfolio System
```prisma
model Trade {
  fromAsset     String   @db.VarChar(10)  // 'BTC' or asset symbol
  toAsset       String   @db.VarChar(10)  // Asset symbol or 'BTC'
  fromAmount    BigInt   // Amount in satoshis or asset units
  toAmount      BigInt   // Amount received
  btcPriceUsd   Decimal? @db.Decimal(15, 2)
  assetPriceUsd Decimal? @db.Decimal(15, 2)
}

model Purchase {
  assetSymbol      String   @db.VarChar(10)
  amount           BigInt   // Asset units purchased
  btcSpent         BigInt   // BTC cost in satoshis
  purchasePriceUsd Decimal? @db.Decimal(15, 8)
  lockedUntil      DateTime @db.Timestamp(6)  // 24-hour lock
}

model Holding {
  assetSymbol String   @db.VarChar(10)
  amount      BigInt   // Current holdings
  lockedUntil DateTime @db.Timestamp(6)
}
```

#### Gamification System
```prisma
model Achievement {
  code        String @unique @db.VarChar(50)
  name        String @db.VarChar(255)
  description String
  criteria    Json   // Flexible achievement criteria
  icon        String @db.VarChar(100)
}

model user_achievements {
  user_id        Int
  achievement_id Int
  earned_at      DateTime @default(now())
  @@unique([user_id, achievement_id])
}
```

#### Set & Forget Portfolio System
```prisma
model SetForgetPortfolio {
  name                   String   @db.VarChar(255)
  share_token            String?  @unique @db.VarChar(255)
  locked_until           DateTime @db.Timestamp(6)
  lastImageGenerated     DateTime @db.Timestamp(6)
}

model set_forget_allocations {
  asset_symbol          String  @db.VarChar(10)
  allocation_percentage Decimal @db.Decimal(5, 2)
  btc_amount            BigInt
  asset_amount          BigInt
  purchase_price_usd    Decimal @db.Decimal(15, 8)
}
```

#### User Feedback System
```prisma
model Suggestion {
  type        String   @db.VarChar(20)  // 'suggestion' | 'bug_report'
  title       String   @db.VarChar(255)
  description String
  status      String   @default("open") // 'open' | 'in_progress' | 'closed'
  adminReply  String?
  repliedAt   DateTime @db.Timestamp(6)
}
```

## API Route Architecture

### `/api/auth` - Authentication System
- **POST** `/api/auth/magic-link` - Request magic link via email
- **GET** `/api/auth/verify` - Verify magic link token and establish session
- **POST** `/api/auth/logout` - Clear authentication session
- **Middleware**: JWT validation for protected routes

**Implementation Notes**:
- Magic links expire after 1 hour
- JWT tokens stored in localStorage on frontend
- Admin status determined by email in `ADMIN_EMAILS` environment variable

### `/api/portfolio` - Portfolio Management
- **GET** `/api/portfolio` - Current portfolio valuation and holdings
- **GET** `/api/portfolio/performance` - Performance vs holding BTC comparison

**Prisma Queries**:
```javascript
const holdings = await prisma.holding.findMany({
  where: { userId },
  include: { user: true }
});
```

### `/api/trades` - Asset Conversion System
- **POST** `/api/trades/buy` - Convert BTC to assets for educational comparison
- **POST** `/api/trades/sell` - Convert assets back to BTC (24-hour reflection period enforced)
- **GET** `/api/trades/history` - Complete conversion history with value tracking

**Critical Migration Fix**: Replaced broken `pool.query()` calls with Prisma:
```javascript
// OLD (Broken)
const result = await pool.query('SELECT * FROM trades WHERE user_id = $1', [userId]);

// NEW (Fixed with Prisma)
const trades = await prisma.trade.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
});
```

### `/api/assets` - Market Data
- **GET** `/api/assets/prices` - Current BTC and asset prices from CoinGecko
- **GET** `/api/assets/list` - Available assets for trading

**Price Caching with Prisma**:
```javascript
const cachedPrice = await prisma.asset.findUnique({
  where: { symbol: assetSymbol }
});
```

### `/api/suggestions` - User Feedback System
- **POST** `/api/suggestions` - Submit suggestion/bug report (auth required)
- **GET** `/api/suggestions` - Get user's suggestions (auth required)
- **GET** `/api/suggestions/all` - Get all suggestions (admin only)
- **PUT** `/api/suggestions/:id` - Update status/reply (admin only)

## Trading Logic Architecture

### 24-Hour Lock System
```javascript
// Implemented in routes/trades.js with Prisma
const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

await prisma.purchase.create({
  data: {
    userId,
    assetSymbol,
    amount: assetAmount,
    btcSpent: btcCost,
    lockedUntil: lockUntil
  }
});
```

### FIFO Cost Basis Tracking
- **First In, First Out** accounting for tax-like calculations
- Cost basis tracked per individual purchase via `Purchase` model
- Accurate P&L calculation for portfolio performance analysis

### Satoshi Precision Calculations
- All monetary values stored as `BigInt` in satoshis (100M sats = 1 BTC)
- `Math.floor()` used to avoid decimal satoshi amounts
- Prisma handles BigInt serialization automatically

**BigInt JSON Serialization Fix**:
```javascript
// Convert BigInt to Number for JSON serialization
const serializedTrades = trades.map(trade => ({
  ...trade,
  fromAmount: Number(trade.fromAmount),
  toAmount: Number(trade.toAmount)
}));
```

## Frontend Architecture (Vanilla JavaScript)

**Single-Page Application** (`public/app.js`)
- **State Management**: Global `window.app` object
- **Real-time Updates**: Price refresh every 30 seconds
- **Authentication**: JWT stored in localStorage
- **UI Framework**: Tailwind CSS for styling
- **Notifications**: Custom notification system for user feedback

### Enhanced Frontend Features
- **Trade History Display**: Robust validation and error handling for trade data
- **Performance Metrics**: Real-time BTC vs portfolio performance comparison
- **Suggestions System**: Floating action button with two-tab modal interface
- **Auto-refresh**: Automatic price and portfolio updates every 30 seconds

## Migration System Architecture

### Prisma Migration Workflow
**Team Synchronization Process**:
1. **Schema Changes**: Modify `prisma/schema.prisma`
2. **Generate Migration**: `npx prisma migrate dev --name <descriptive_name>`
3. **Commit Files**: Both schema changes and migration files must be committed
4. **Team Update**: Other developers run `npx prisma migrate deploy` on git pull

**Migration Files** (`prisma/migrations/`):
- **Baseline**: `20250922182608_init` - Current production schema snapshot
- **Version Control**: Each migration is a timestamped SQL file
- **Rollback**: Prisma supports migration rollbacks if needed

### Legacy Script Compatibility
**Emergency Troubleshooting Only**:
- `scripts/rebuild-from-trades.js` - Portfolio recalculation from trade history
- `scripts/debug-portfolio.js` - Portfolio debugging and validation
- `scripts/wipe-database.js` - Complete data reset (development only)

**Critical Note**: Use legacy scripts only for data fixes, NOT schema changes

## External Dependencies & Integration

### CoinGecko API Integration
**Real-time Price Fetching**:
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price`
- **Rate Limits**: 50 calls/minute (no API key required)
- **Fallback Strategy**:
  1. Live API call
  2. Cached price in `Asset` model
  3. Default fallback ($115,000 BTC)

**Gold Price Conversion**:
- CoinGecko returns price per gram
- Multiply by 31.1035 for troy ounce pricing
- Corrected in database with migration

### Email System (Magic Links)
**SMTP Configuration** (optional in development):
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Environment Configuration

**Required Variables** (`.env`):
```bash
# Database (Prisma)
POSTGRES_URL="postgresql://user:password@localhost:5432/bitcoin_game"

# Authentication
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=3000

# Admin Configuration
ADMIN_EMAILS=admin@email.com,dev@email.com

# Email (Optional in dev)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Performance & Security Architecture

### Database Performance
- **Connection Pooling**: Prisma manages connection pool automatically
- **Query Optimization**: Prisma generates optimized SQL queries
- **Indexing**: Strategic indexes on high-query fields (user_id, asset_symbol, timestamps)

### Security Measures
- **SQL Injection**: Eliminated via Prisma's parameterized queries
- **Input Validation**: Server-side validation for all conversion operations
- **Rate Limiting**: 1-hour cooldown for suggestion submissions
- **Precision Safety**: BigInt storage prevents floating-point financial errors

### Type Safety Benefits
- **Compile-time Validation**: TypeScript-like safety for database operations
- **Auto-completion**: Full IntelliSense support for database schemas
- **Runtime Error Prevention**: Catch schema mismatches before deployment

This architecture supports a scalable, educational platform for learning about Bitcoin as a unit of account, with robust type safety, comprehensive value tracking, and advanced features like learning milestones and portfolio visualization.