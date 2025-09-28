# Agent Testing Guide

## ⚡ CRITICAL: NO SERVER STARTUP REQUIRED

**Development server is managed by user - agents NEVER start servers**

## 🎯 Pre-Test Protocol

### 1. URL Verification

- ✅ **Test URL**: Use URL provided by main Claude (never assume port numbers)
- ✅ **Pre-flight**: Verify URL responds before testing (5 seconds max)
- ❌ **DO NOT**: Run server commands, install dependencies, or assume URLs
- ❌ **DO NOT**: Hardcode localhost:3000 or any port numbers

### 2. System Requirements Check

**Before Testing** - Verify these systems are ready:

- **Express Server**: Running via `npm run dev` (user responsibility)
- **PostgreSQL**: Database server running and accessible
- **Prisma Client**: Generated and up-to-date (`npx prisma generate`)
- **Environment**: `.env` file configured with proper database connection

### 3. If Server Issues

- **Connection Refused**: Report to human immediately - do not troubleshoot
- **404 Error**: Report URL and error - do not attempt fixes
- **Database Errors**: Report Prisma connection issues immediately
- **Slow Response**: Document but continue testing if functional

## 📁 File Output Restrictions

### CRITICAL: Only write to .temp/ directory

```
.temp/
├── test-results/          # Screenshots and detailed findings
├── test-screenshots/      # Visual evidence of issues
├── financial-validation/  # Portfolio calculation test results
├── agent-reports/         # Structured test reports
└── scratch/              # Temporary working files
```

### File Creation Rules

- ✅ **Allow**: Write reports, screenshots, logs to .temp/
- ❌ **Block**: Create test files (.spec.js) anywhere
- ❌ **Block**: Echo commands for file creation
- ❌ **Block**: Write outside .temp/ directory
- ❌ **Block**: Modify any project files or configurations

## 🔍 Measure Everything in Bitcoin Testing Protocol

### Standard Agent Flow

1. **Pre-flight**: Verify provided URL responds (5 seconds max)
2. **System Check**: Confirm database connection and Prisma client status
3. **Financial Focus**: Prioritize testing trading logic and portfolio calculations
4. **Execute**: Run specific test scenario as instructed by main Claude
5. **Document**: Screenshots + findings to .temp/test-results/
6. **Report**: Structured findings with actionable recommendations

### Measure Everything in Bitcoin Specific Responsibilities

- **Financial Accuracy**: Test all money-related calculations with zero tolerance for errors
- **Trading Logic**: Validate 24-hour locks, FIFO selling, and satoshi precision
- **Portfolio Calculations**: Verify real-time valuations and performance metrics
- **Prisma Integration**: Test database queries and BigInt serialization
- **API Fallbacks**: Verify CoinGecko price fetching and fallback mechanisms
- **Security**: Test authentication flows and admin privilege escalation

### What Agents Do NOT Do

- Start or manage servers (Express, PostgreSQL, or any services)
- Decide what to test (main Claude determines scope and priority)
- Create permanent test files or modify project structure
- Make assumptions about database schema or API endpoints
- Troubleshoot infrastructure issues or Prisma migrations
- Modify environment variables or configuration files

## 📊 Efficiency Guidelines for Financial Testing

### Time Allocation for Measure Everything in Bitcoin

- **Setup**: 0-5 seconds (just URL verification)
- **Financial Testing**: 60% - Trading system, portfolio calculations, price accuracy
- **User Experience**: 25% - Authentication, UI/UX, real-time updates
- **System Integration**: 15% - API endpoints, database integrity, error handling

### High-Priority Test Areas (Zero Error Tolerance)

1. **Portfolio Valuation**: Current holdings value in satoshis
2. **Trade Execution**: Buy/sell logic with proper BTC conversion
3. **24-Hour Locks**: Purchase lock enforcement and unlock timing
4. **FIFO Selling**: Cost basis calculation accuracy
5. **Satoshi Precision**: No fractional satoshi amounts in any calculation
6. **Performance Metrics**: BTC vs portfolio comparison accuracy

### Medium-Priority Test Areas

1. **Authentication Flow**: Magic link request and verification
2. **Real-time Updates**: 30-second price refresh functionality
3. **Trade History**: Proper display with error handling
4. **Suggestion System**: Rate limiting and admin functionality
5. **Responsive Design**: Mobile and desktop compatibility

### Success Criteria

- ✅ Immediate testing start (no setup delays)
- ✅ Financial calculations verified as 100% accurate
- ✅ Clear pass/fail determinations for each feature tested
- ✅ Actionable bug reports with reproduction steps
- ✅ Visual evidence supporting all findings
- ✅ Risk assessment for any financial calculation errors

## 🔄 Error Handling for Financial Applications

### Standard Error Response

- **URL unreachable**: Report to human, do not retry
- **Database connection errors**: Report immediately with error details
- **Prisma client errors**: Document and report, do not attempt fixes
- **Financial calculation discrepancies**: Flag as critical and escalate immediately
- **Authentication failures**: Test and document, report security implications

### Critical Financial Error Detection

**Immediate Escalation Required** for:

- Portfolio values that don't match expected calculations
- Trading operations that result in incorrect user balances
- Satoshi amounts with decimal places
- BigInt serialization failures
- Price discrepancies exceeding 1% tolerance
- Any error in cost basis or P&L calculations

### Focus Areas Based on Main Claude Instructions

**Trading System Focus**:

- Asset purchase flow with BTC conversion accuracy
- Sell operation with 24-hour lock validation
- FIFO cost basis calculations for tax purposes
- Trade history accuracy and proper formatting

**Portfolio System Focus**:

- Real-time portfolio valuation updates
- Performance comparison vs holding BTC
- Holdings display accuracy and refresh timing
- P&L calculation validation across different scenarios

**Authentication System Focus**:

- Magic link generation and validation
- JWT token handling and session persistence
- Admin privilege validation and security
- Rate limiting enforcement for suggestions

## 🚨 Critical Testing Workflow

### Pre-Fix Bug Documentation

When testing reported bugs:

1. **Reproduce Issue**: Follow exact steps to reproduce the problem
2. **Document Current State**: Screenshot current incorrect behavior
3. **Expected vs Actual**: Clearly document what should happen vs what does happen
4. **Financial Impact**: Assess if bug affects user balances or calculations

### Post-Fix Validation (MANDATORY)

After any bug fix implementation:

1. **Re-test Specific Issue**: Verify the exact bug is resolved
2. **Regression Testing**: Ensure fix didn't break other functionality
3. **Financial Validation**: For trading/portfolio bugs, verify all calculations are accurate
4. **Performance Check**: Ensure fix doesn't impact system performance

**⚠️ CRITICAL RULE**: Never consider a financial bug fix complete without agent confirmation

### Example Critical Test Scenario

```
Scenario: Portfolio Performance Calculation Bug
1. Document: Current performance shows +15% when it should show -5%
2. Test: Multiple portfolio states with known expected values
3. Verify: After fix, all performance calculations match expected results
4. Regression: Test trading, selling, and real-time updates still work
5. Confirm: Performance calculation is now accurate across all scenarios
```

## 🎯 Measure Everything in Bitcoin Test Scenarios

### Authentication Testing

- Magic link request with valid email
- Token verification and session establishment
- JWT expiration handling
- Admin privilege validation

### Trading System Testing

- Asset purchase with BTC conversion
- 24-hour lock enforcement
- FIFO selling with cost basis calculation
- Insufficient balance error handling

### Portfolio Testing

- Real-time valuation accuracy
- Performance vs BTC comparison
- Holdings display and refresh
- Trade history accuracy

### System Integration Testing

- CoinGecko API integration and fallbacks
- Prisma database query performance
- Error handling and user feedback
- Real-time price update system

**Goal**: Efficient, focused testing of the Measure Everything in Bitcoin with emphasis on financial accuracy, user security, and system reliability. Every test should contribute to maintaining user trust in the platform's financial calculations.
