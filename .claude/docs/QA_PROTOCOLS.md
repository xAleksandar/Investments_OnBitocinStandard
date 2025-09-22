# QA Testing Protocols

## Automated Browser Testing

**Playwright QA Tester Agent**: Use the `playwright-qa-tester` agent for comprehensive browser testing of the Bitcoin investment game.

### When to Invoke Agent Testing

**Mandatory Testing Scenarios**:
- After implementing new trading features (buy/sell logic, portfolio calculations)
- After fixing bugs in financial calculations or portfolio valuation
- After Prisma ORM changes that affect database queries
- After authentication flow modifications (magic links, JWT handling)
- Before deploying updates that affect user money/portfolio calculations
- When suggestion system or admin functionality is modified

**Critical Financial Testing**:
- Portfolio calculation accuracy (satoshi precision, BigInt handling)
- Trade history display and data validation
- 24-hour lock enforcement and FIFO selling logic
- Performance metrics (BTC vs portfolio comparison)
- Price fetching and fallback mechanisms

### Setup Requirements

**Server Management**:
- **Development Server**: Express server managed by user via `npm run dev`
- **Port Configuration**: Check `.env` file for PORT variable (default: 3000)
- **Database Status**: Ensure PostgreSQL is running and Prisma client is generated
- **Agent Protocol**: Agents should NEVER start servers - always use provided URL

**Pre-flight Requirements**:
```bash
# Ensure system is ready for testing
npx prisma migrate status  # Verify migrations are current
npx prisma generate        # Ensure Prisma client is up to date
npm run dev                # Start development server (user responsibility)
```

## 🚨 CRITICAL WORKFLOW: Bug Fix Validation

**This is the most important protocol in the entire system**

### Pre-Fix Testing (MANDATORY)
1. **Document Current Bug**: Use playwright-qa-tester to identify and document the specific issue
2. **Reproduction Evidence**: Create detailed steps with screenshots showing the bug
3. **Expected Behavior**: Document what should happen vs what actually happens
4. **Impact Assessment**: Determine if bug affects financial calculations or user data

### Post-Fix Testing (MANDATORY)
1. **ALWAYS Re-run Agent**: After fixing any bug, ALWAYS re-run playwright-qa-tester
2. **Verify Resolution**: Confirm the specific bug is completely resolved
3. **Regression Testing**: Ensure the fix didn't break other functionality
4. **Financial Validation**: For trading/portfolio bugs, verify calculations are accurate

**⚠️ CRITICAL RULE**: Never consider a bug fix complete without agent confirmation of resolution

### Example Workflow
```
1. User reports: "Portfolio shows wrong performance calculation"
2. Run: playwright-qa-tester to document the issue
3. Fix: Update portfolio calculation logic
4. Run: playwright-qa-tester again to confirm fix
5. Verify: All financial calculations are now accurate
6. Only then: Consider bug fixed and ready to commit
```

## Agent Testing Focus Areas

### Financial System Validation
**High-Priority Testing** (these features handle user money):
- **Trading Logic**: Asset purchase/sale with proper BTC conversion
- **Portfolio Calculations**: Real-time valuation accuracy
- **24-Hour Locks**: Purchase lock enforcement and unlock timing
- **FIFO Selling**: Cost basis calculation accuracy
- **Satoshi Precision**: No fractional satoshi amounts in calculations
- **BigInt Handling**: Proper serialization of large numbers

### User Experience Validation
**Medium-Priority Testing**:
- **Authentication**: Magic link request and verification flow
- **Real-time Updates**: 30-second price refresh functionality
- **Trade History**: Proper display of trade data with error handling
- **Suggestion System**: Rate limiting and admin reply functionality
- **Responsive Design**: Mobile and desktop layout validation

### System Integration Testing
**Infrastructure Testing**:
- **Prisma Queries**: Database operations work correctly
- **API Endpoints**: All routes respond properly
- **Error Handling**: Graceful handling of API failures
- **CoinGecko Integration**: Price fetching with proper fallbacks

## Output Requirements

### Test Report Structure
For each test session, agent must provide:

**Executive Summary**:
- Overall system health assessment
- Critical issues found (especially financial calculation errors)
- Pass/fail status for each major feature tested

**Detailed Findings**:
- Step-by-step test execution details
- Screenshots for any issues discovered
- Reproduction steps for bugs
- Performance observations

**Financial Validation Results**:
- Portfolio calculation accuracy verification
- Trade execution validation
- Price display accuracy confirmation
- Lock system enforcement validation

**Actionable Recommendations**:
- Prioritized list of issues requiring immediate attention
- Suggestions for improvements
- Risk assessment for any discovered issues

### Critical Issue Escalation
**Immediate Escalation Required** for:
- Incorrect portfolio calculations or valuations
- Trading logic failures that could cause user loss
- Authentication bypasses or security issues
- Database errors affecting user data integrity
- Price calculation errors leading to wrong trade amounts

## Agent Efficiency Protocol

### Time Allocation Guidelines
- **Setup Verification**: 0-5 seconds (just URL verification)
- **Financial Testing**: 60% of time on trading and portfolio features
- **User Experience**: 25% of time on UI/UX validation
- **System Integration**: 15% of time on API and database testing

### File Output Restrictions
**Temporary Directory Usage**:
```
.temp/
├── test-results/          # Screenshots and detailed findings
├── test-screenshots/      # Visual evidence of issues
├── financial-validation/  # Portfolio calculation test results
└── agent-reports/        # Structured test reports
```

**CRITICAL**: Only write to `.temp/` directory - NO file creation outside temp

## Testing Permission Matrix

### Who Can Request Agent Testing
- **Primary Developers**: Full access to request any testing
- **Team Members**: Can request testing for their changes
- **QA Personnel**: Can request comprehensive system testing

### When Testing is Required
- **Before Commits**: For any changes affecting financial calculations
- **Before Deployment**: Full system validation required
- **After Bug Fixes**: Mandatory re-testing for verification
- **Weekly**: Comprehensive system health checks

### Testing Scope Authority
- **Main Claude**: Determines testing scope and specific areas to focus
- **Agents**: Execute only assigned testing scope, no assumptions
- **Developers**: Can specify priority areas for targeted testing

## Bitcoin Investment Game Specific Protocols

### Financial Accuracy Standards
**Zero Tolerance Areas** (must be 100% accurate):
- Satoshi calculations and BigInt precision
- Portfolio valuation against BTC holdings
- Trade execution amounts and fees
- FIFO cost basis calculations
- 24-hour lock timing enforcement

### Data Integrity Requirements
- **User Balances**: Must always be accurate and recoverable
- **Trade History**: Must maintain complete audit trail
- **Portfolio Holdings**: Must match sum of all trades
- **Price Data**: Must have fallback for CoinGecko failures

### Performance Standards
- **Page Load**: < 3 seconds for initial load
- **Trade Execution**: < 2 seconds for buy/sell operations
- **Portfolio Updates**: < 1 second for real-time refresh
- **Database Queries**: Optimized Prisma queries with proper indexing

## Error Handling Protocols

### Expected System Behaviors
**Normal Operations**:
- Price updates every 30 seconds without errors
- Trade execution with immediate UI feedback
- Portfolio calculations update in real-time
- Suggestion submissions work with rate limiting

**Acceptable Fallback Behaviors**:
- CoinGecko rate limit → Use cached prices
- API failure → Display last known prices with timestamp
- Network issues → Show retry options to user
- Database connectivity → Queue operations for retry

### Unacceptable Behaviors (Critical Failures)
- Silent calculation errors in portfolio values
- Trade execution without proper database recording
- User balance discrepancies
- Authentication bypasses or session hijacking
- Price display showing drastically incorrect values

**Goal**: Ensure the Bitcoin investment game maintains financial accuracy and user trust through comprehensive, systematic testing of all money-related functionality.