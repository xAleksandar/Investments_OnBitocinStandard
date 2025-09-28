# Testing Strategy

## Testing Overview

Comprehensive testing approach for Measure Everything in Bitcoin covering database integrity, trading logic, portfolio calculations, and user interface validation.

## Playwright Browser Tests

### Core Test Coverage

- **Location**: `tests/` directory
- **Commands** (Chrome-only by default for efficiency):
  - `npm run test:e2e` - Headless browser tests (Chrome only)
  - `npm run test:e2e:ui` - Interactive UI mode (Chrome only)
  - `npm run test:e2e:headed` - Visible browser testing (Chrome only)
- **Targeted Testing**:
  - `npx playwright test --grep "test name"` - Run specific tests
  - `npx playwright test tests/file.spec.js` - Run single test file
  - `npx playwright test --project=firefox` - Cross-browser when needed

### Critical Test Areas for Measure Everything in Bitcoin

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
Math.floor(100000000.7) === 100000000; // Ensure no decimal satoshis

// 2. BigInt Serialization Tests
JSON.stringify({ amount: BigInt(100000000) }); // Should not throw

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

### Rapid Debugging Methodology (Highly Efficient Approach)

**Core Principle**: Get error messages FIRST, then fix systematically

#### 1. Create Minimal Diagnostic Tests

```javascript
// Create targeted test files for specific issues
// tests/debug-routing.spec.js - Focus ONLY on the problem
test("Check routing to different pages", async ({ page }) => {
  const consoleLogs = [];
  page.on("console", (msg) => consoleLogs.push(msg.text()));

  await page.goto("http://localhost:3000");
  // Capture specific state
  const homeVisible = await page.locator("#homePage").isVisible();
  const assetsVisible = await page.locator("#assetsPage").isVisible();

  console.log("Homepage visible:", homeVisible);
  console.log("Assets page visible:", assetsVisible);
  console.log("Console logs:", consoleLogs);
});
```

#### 2. Error-First Debugging

```javascript
// tests/check-console-errors.spec.js - Get ALL errors immediately
test("Check for JavaScript errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("http://localhost:3000");

  if (errors.length > 0) {
    console.log("❌ JavaScript Errors Found:");
    errors.forEach((e) => console.log(e));
  }

  // Check app initialization
  const appStatus = await page.evaluate(() =>
    window.bitcoinApp ? "exists" : "missing"
  );
  console.log("App status:", appStatus);
});
```

#### 3. Strategic Console Logging

- Add logs at critical points ONLY
- Focus on execution flow, not speculation
- Remove logs after fixing

```javascript
// Add strategic debugging
console.log("🔍 Executing route:", route.name, "pageId:", route.pageId);
console.log("📄 Page element found:", !!pageElement);
```

#### 4. Batch Fixing with Scripts

```bash
#!/bin/bash
# fix-exports.sh - Fix multiple similar issues at once
for file in src/client/services/*.js; do
    if ! grep -q "export { " "$file"; then
        className=$(grep "^class " "$file" | awk '{print $2}')
        echo "export { $className };" >> "$file"
    fi
done
```

#### 5. Rapid Test-Fix-Verify Cycle

1. **Create minimal test** → Run → Get error
2. **Fix ONLY that error** → Re-run test
3. **New error appears** → Fix it → Re-run
4. **Repeat until working** → Clean up test files

### Efficient Testing Strategy

**Default Approach**: Use Chrome-only testing for speed during development

- Run targeted tests first: `npx playwright test --grep "specific feature"`
- Use single file tests: `npx playwright test tests/relevant-test.spec.js`
- Only run cross-browser tests before major releases or deployments

### Pre-Fix Testing Protocol

1. **Create Minimal Test**: Write smallest possible test that reproduces the issue
2. **Capture Error Messages**: Get the EXACT error, not symptoms
3. **Use grep/find Efficiently**: `grep -n "pattern" src/**/*.js` to locate issues quickly
4. **Document Pattern**: If multiple files have same issue, prepare batch fix

### Post-Fix Testing Protocol

1. **Re-run Minimal Test**: Verify specific error is gone
2. **Check for New Errors**: Often fixing one reveals another
3. **Run Broader Tests**: Only after minimal test passes
4. **Clean Up**: Remove debug logs and test files

**⚠️ Never consider a bug fix complete without test confirmation**

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
    suggestions: true,
  },
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

**CRITICAL REMINDER**: The Measure Everything in Bitcoin deals with financial calculations and user money simulation. Any bug in trading logic, portfolio calculations, or price handling can lead to incorrect user balances. Always prioritize testing these critical paths and never skip post-fix validation.
