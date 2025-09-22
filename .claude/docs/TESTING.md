# Testing Strategy

## Testing Overview

Comprehensive testing approach for Bitcoin investment game covering database integrity, trading logic, portfolio calculations, and user interface validation.

## Playwright Browser Tests

### Core Test Coverage
- **Location**: `e2e-tests/` directory (if created)
- **Commands**:
  - `npm run test:e2e` - Headless browser tests
  - `npm run test:e2e:ui` - Interactive UI mode
  - `npm run test:e2e:headed` - Visible browser testing

### Critical Test Areas for Bitcoin Investment Game
- **Authentication Flow**: Magic link request → email verification → JWT validation
- **Trading System**: Asset purchase → 24-hour lock enforcement → FIFO selling
- **Portfolio Calculations**: Real-time valuation → P&L accuracy → performance metrics
- **Prisma Integration**: Database queries → BigInt serialization → error handling
- **Suggestion System**: Rate limiting → admin workflows → notification display

## Database Testing (Prisma ORM)

### Prisma Client Testing
```javascript
// Test database connection and schema validation
npx prisma migrate status    // Verify migration state
npx prisma generate         // Regenerate client
npx prisma studio          // Manual data inspection
```

### Critical Database Tests
- **Migration Integrity**: Schema matches Prisma model definitions
- **BigInt Handling**: Satoshi calculations maintain precision
- **Trade History**: FIFO cost basis calculations are accurate
- **Purchase Locks**: 24-hour constraints properly enforced
- **Foreign Key Constraints**: User relationships maintain data integrity

### Database Testing Commands
```bash
# Prisma Testing Workflow
npx prisma migrate deploy    # Apply pending migrations
npx prisma db push          # Sync schema without migrations (dev only)
npx prisma migrate reset    # Reset database to initial state (dev only)
node scripts/debug-portfolio.js  # Validate portfolio calculations
node scripts/rebuild-from-trades.js  # Test trade history reconstruction
```

## Trading Logic Testing

### Portfolio Calculation Validation
**Critical Tests** (always run after trading logic changes):
```javascript
// 1. Satoshi Precision Tests
Math.floor(100000000.7) === 100000000  // Ensure no decimal satoshis

// 2. BigInt Serialization Tests
JSON.stringify({ amount: BigInt(100000000) })  // Should not throw

// 3. FIFO Cost Basis Tests
// Purchase: 1 BTC → 100 AAPL at $150/share
// Purchase: 1 BTC → 100 AAPL at $200/share
// Sell: 150 AAPL → Should use FIFO (100 at $150, 50 at $200)

// 4. 24-Hour Lock Tests
const lockTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
// Verify locked assets cannot be sold before lockTime
```

### Price Integration Testing
**CoinGecko API Fallback Testing**:
1. **Live API**: Test with actual CoinGecko responses
2. **Rate Limit**: Test fallback to cached prices when rate limited
3. **API Failure**: Test default $115,000 BTC fallback price
4. **Gold Conversion**: Verify gram → troy ounce conversion (multiply by 31.1035)

## Performance Testing

### Database Performance
```bash
# Query Performance Testing
npx prisma studio  # Visual query performance analysis

# Connection Pool Testing
# Monitor concurrent user simulations
# Verify connection pooling under load
```

### Frontend Performance
- **Price Updates**: 30-second auto-refresh performance impact
- **Trade History**: Large dataset rendering performance
- **Real-time Calculations**: Portfolio valuation update speed

## Critical Bug Fix Validation Workflow

**🚨 CRITICAL WORKFLOW**: Always test before AND after bug fixes

### Pre-Fix Testing Protocol
1. **Document Bug**: Use playwright-qa-tester to identify and document the specific issue
2. **Reproduction Steps**: Create detailed steps to reproduce the bug
3. **Expected vs Actual**: Document what should happen vs what actually happens
4. **Screenshots/Evidence**: Capture visual proof of the issue

### Post-Fix Testing Protocol
1. **Re-run Tests**: ALWAYS re-run playwright-qa-tester after fixing
2. **Verify Resolution**: Confirm the specific bug is resolved
3. **Regression Testing**: Ensure fix didn't break other functionality
4. **Documentation**: Update any relevant documentation if the fix changed behavior

**⚠️ Never consider a bug fix complete without agent confirmation of resolution**

## User Interface Testing

### Authentication Flow Testing
- **Magic Link Request**: Email validation, rate limiting
- **Token Verification**: JWT validation, expiration handling
- **Session Persistence**: localStorage JWT storage and retrieval
- **Admin Access**: Admin email verification and privilege escalation

### Trading Interface Testing
- **Asset Selection**: Available assets display correctly
- **Quantity Input**: Numeric validation and precision handling
- **Transaction Confirmation**: Trade execution and feedback
- **Lock Status**: Visual indication of 24-hour locks
- **Error Handling**: Insufficient balance, API failures, network issues

### Portfolio Display Testing
- **Real-time Updates**: Price refresh every 30 seconds
- **Performance Metrics**: Accurate BTC vs portfolio comparison
- **Holdings Display**: Current positions and valuations
- **Trade History**: Chronological trade list with proper formatting
- **Responsive Design**: Mobile and desktop layout validation

## Prisma-Specific Testing

### Schema Validation
```bash
# Verify schema integrity after changes
npx prisma validate
npx prisma format    # Auto-format schema file
npx prisma generate  # Regenerate client after schema changes
```

### Migration Testing
**Team Synchronization Tests**:
1. **Clean Migration**: `npx prisma migrate dev --create-only --name test`
2. **Migration Review**: Manually review generated SQL before applying
3. **Rollback Testing**: Verify migration can be safely reverted if needed
4. **Team Coordination**: Test migration application on fresh database

### Type Safety Testing
```javascript
// Verify Prisma client type safety
const user = await prisma.user.findUnique({
  where: { email: "test@example.com" },
  include: {
    trades: true,
    holdings: true,
    suggestions: true
  }
});
// TypeScript should provide full IntelliSense and error checking
```

## API Testing

### Endpoint Validation
**Authentication Endpoints**:
- `POST /api/auth/magic-link` - Email validation and rate limiting
- `GET /api/auth/verify` - Token validation and session creation

**Trading Endpoints**:
- `POST /api/trades/buy` - Purchase validation and execution
- `POST /api/trades/sell` - Lock validation and FIFO selling
- `GET /api/trades/history` - Proper Prisma query handling

**Portfolio Endpoints**:
- `GET /api/portfolio` - Real-time valuation calculation
- `GET /api/portfolio/performance` - BTC comparison accuracy

### Error Handling Testing
- **Invalid Input**: Malformed requests and data validation
- **Authentication Errors**: Invalid tokens and expired sessions
- **Database Errors**: Connection failures and constraint violations
- **External API Errors**: CoinGecko failures and fallback handling

## Development Testing Workflow

### After Making Changes
1. **Prisma Regeneration**: `npx prisma generate` (if schema changed)
2. **Migration Application**: `npx prisma migrate deploy` (if migrations pending)
3. **Portfolio Validation**: `node scripts/debug-portfolio.js`
4. **Browser Testing**: Manual testing of affected features
5. **Playwright Validation**: Run automated browser tests

### Before Committing
1. **Schema Validation**: `npx prisma validate`
2. **Migration Status**: `npx prisma migrate status`
3. **Database Integrity**: Verify no orphaned data or constraint violations
4. **Trade Calculations**: Verify all financial calculations remain accurate
5. **API Responses**: Test all modified endpoints

### Team Integration Testing
**When Pulling Changes**:
```bash
git pull
npx prisma migrate deploy  # Apply any new migrations
npx prisma generate        # Regenerate client if schema changed
npm run test:e2e          # Verify system still works
```

## Suggestion System Testing

### User Feedback Flow
- **Rate Limiting**: 1-hour cooldown enforcement
- **Authentication**: Login requirement and redirection
- **Submission Validation**: Title/description requirements
- **Admin Interface**: Status updates and reply functionality

### Admin Workflow Testing
- **Permission Validation**: Admin email verification
- **Reply System**: Admin response and notification
- **Status Management**: Open → In Progress → Closed transitions

**CRITICAL REMINDER**: The Bitcoin investment game deals with financial calculations and user money simulation. Any bug in trading logic, portfolio calculations, or price handling can lead to incorrect user balances. Always prioritize testing these critical paths and never skip post-fix validation.