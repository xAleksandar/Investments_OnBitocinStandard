# Code Review Standards & Quality Guidelines

This document defines the code quality standards and review criteria for maintaining a clean, scalable, and maintainable codebase for the Bitcoin education platform.

## Core Development Principles

### DRY (Don't Repeat Yourself)
- Extract common patterns after 3+ occurrences
- Create reusable functions and utilities
- Centralize configuration and constants
- Use composition for shared behavior
- **Critical for Financial Code**: Never duplicate calculation logic

### KISS (Keep It Simple, Stupid)
- Prefer simple, readable solutions over clever ones
- Avoid premature optimization
- Write code for humans first, computers second
- If it needs extensive comments to explain, it's too complex
- **Educational Focus**: Code should be understandable for learning

### Component-Based Architecture
- Everything should be a reusable module
- Functions should be self-contained with clear interfaces
- Keep functions focused on a single responsibility
- Prefer composition over inheritance
- **Financial Accuracy**: Each calculation module must be independently testable

### Separation of Concerns
- Presentation logic separate from business logic
- Data fetching separate from rendering
- State management isolated from UI components
- Database operations separate from API routes
- **Critical**: Satoshi calculations separate from display formatting

## Code Quality Standards

### File Organization
- **One responsibility per file** - no monolithic files with multiple unrelated functions
- **Maximum file length**: ~200-300 lines for routes, ~150 lines for utilities
- **Clear file naming**: descriptive-name.js, useSomething.js, something-utils.js
- **Logical folder structure**: group by feature, not by file type

### Function Guidelines
- **Single Responsibility**: Each function does ONE thing well
- **Maximum function length**: Should fit on a single screen (~40-50 lines)
- **Parameter count**: Max 3-4 parameters, use object for more
- **Nesting depth**: Maximum 3-4 levels of nesting
- **Early returns**: Use guard clauses to reduce nesting
- **Pure functions preferred**: Minimize side effects, especially in calculations

### Code Clarity
- **Self-documenting names**: Functions/variables should clearly express intent
- **No magic numbers**: Use named constants (especially for satoshi conversions)
- **Avoid abbreviations**: `userAccount` not `usrAcct`
- **Consistent naming**: `getUserById` not `fetchUser` + `getProductById`
- **Financial precision**: Always use BigInt for satoshi amounts

## Bitcoin Platform Specific Standards

### Satoshi Calculations
- **ALWAYS use BigInt**: Never use floating point for satoshi amounts
- **Constants must be explicit**: `const SATS_PER_BTC = 100000000n`
- **Validate precision**: Check for rounding errors in every calculation
- **Test edge cases**: Zero amounts, maximum amounts, negative values
- **Document conversions**: Clear comments for BTC ↔ Satoshi conversions

### Database Operations (Prisma)
- **Use transactions for financial operations**: Ensure atomicity
- **Never raw SQL for money**: Always use Prisma's type-safe queries
- **Validate before persisting**: Check calculations before database writes
- **Migration safety**: Test migrations with production-like data
- **Audit trail**: Log all financial state changes

### API Security
- **Input validation**: Validate all financial inputs
- **Rate limiting**: Protect price APIs from abuse
- **Authentication checks**: Verify user ownership before portfolio operations
- **Sanitize outputs**: Never expose internal calculation details
- **Error messages**: Don't reveal system internals in errors

## Code Review Checklist

### ✅ Functionality
- [ ] Does the code accomplish the intended goal?
- [ ] Are all requirements from the task addressed?
- [ ] Are edge cases properly handled?
- [ ] Is error handling comprehensive and user-friendly?
- [ ] Are loading and error states implemented?
- [ ] **Financial accuracy**: Are satoshi calculations precise?

### ✅ Code Quality
- [ ] Is the code DRY (no unnecessary duplication)?
- [ ] Does it follow KISS principle?
- [ ] Are functions properly separated and reusable?
- [ ] Is the code self-documenting with clear names?
- [ ] Are functions focused on single responsibility?
- [ ] Is nesting depth reasonable (max 3-4 levels)?
- [ ] **BigInt usage**: Are all satoshi amounts using BigInt?

### ✅ Testing
- [ ] Are there tests for business logic?
- [ ] Are edge cases tested?
- [ ] Are error scenarios tested?
- [ ] **Financial tests**: Do tests verify calculation accuracy?
- [ ] **FIFO tests**: Is cost basis tracking tested?
- [ ] Are conversion limits (24-hour rule) tested?

### ✅ Security
- [ ] Is user input properly validated/sanitized?
- [ ] Are there any injection vulnerabilities?
- [ ] Is authentication/authorization properly implemented?
- [ ] Are sensitive data properly handled?
- [ ] Are API keys/secrets excluded from code?
- [ ] **Financial security**: Are portfolio operations properly authorized?

### ✅ Performance
- [ ] Are there any obvious performance issues?
- [ ] Are database queries optimized?
- [ ] Is caching used appropriately for price data?
- [ ] Are expensive operations memoized?
- [ ] **API efficiency**: Are external API calls minimized?

### ✅ Documentation
- [ ] Is complex logic documented with WHY, not WHAT?
- [ ] Are financial calculations explained?
- [ ] Are breaking changes documented?
- [ ] Is the 24-hour conversion rule documented?
- [ ] Are Prisma migrations documented?

## Warning Signs - Code Smells

### 🚨 Function Smells
- **Long Functions**: Functions over 50 lines
- **Too Many Parameters**: More than 4 parameters
- **Complex Conditionals**: Nested if/else beyond 3 levels
- **Side Effects**: Unexpected state mutations in calculations
- **Float Usage**: Using floating point for money

### 🚨 Financial Code Smells
- **Precision Loss**: Division before multiplication
- **Type Confusion**: Mixing Number and BigInt
- **Missing Validation**: No bounds checking on amounts
- **Duplicate Logic**: Same calculation in multiple places
- **Hard-coded Values**: Magic numbers in conversions

### 🚨 Database Smells
- **Missing Transactions**: Non-atomic financial operations
- **Raw SQL**: Direct SQL for financial queries
- **Missing Indexes**: Slow portfolio queries
- **N+1 Queries**: Multiple queries in loops
- **Stale Data**: Not refreshing prices appropriately

### 🚨 API Smells
- **No Rate Limiting**: Unprotected external API calls
- **Missing Fallbacks**: No handling for API failures
- **Credential Exposure**: API keys in code
- **Verbose Errors**: Exposing internal details
- **No Caching**: Repeated identical API calls

## Refactoring Triggers

**Immediate Refactoring Required When:**
- Financial calculation errors detected
- Security vulnerabilities found
- Function exceeds 80 lines
- File has more than 3 different responsibilities
- Same calculation logic appears 3+ times
- Performance degradation in portfolio views
- API rate limits being hit

**Consider Refactoring When:**
- Function approaches 50 lines
- Complex conditionals become hard to follow
- Test setup becomes complicated
- New team members struggle to understand code
- Bug fixes require changes in multiple files

## Best Practices

### Financial Calculations
```javascript
// ✅ GOOD: Using BigInt for precision
const satsPerBtc = 100000000n;
const amountInSats = BigInt(btcAmount * 100000000);
const totalValue = amountInSats * priceInSats / satsPerBtc;

// ❌ BAD: Using float (precision loss)
const totalValue = btcAmount * 0.00000001 * price;
```

### Error Handling
```javascript
// ✅ GOOD: Comprehensive error handling
try {
  const price = await fetchBitcoinPrice();
  if (!price || price <= 0) {
    throw new Error('Invalid price data');
  }
  return calculateValue(amount, price);
} catch (error) {
  console.error('Price fetch failed:', error);
  // Use cached price as fallback
  return getCachedValue(amount);
}

// ❌ BAD: Silent failures
fetchBitcoinPrice()
  .then(price => calculateValue(amount, price))
  .catch(() => {}); // Silent failure
```

### Database Operations
```javascript
// ✅ GOOD: Transactional financial operation
await prisma.$transaction(async (tx) => {
  const portfolio = await tx.portfolio.update({
    where: { userId },
    data: { btcBalance: newBalance }
  });
  await tx.auditLog.create({
    data: { userId, action: 'balance_update', amount: difference }
  });
});

// ❌ BAD: Non-atomic operations
await prisma.portfolio.update({ /* ... */ });
await prisma.auditLog.create({ /* ... */ }); // Could fail
```

## Educational Platform Specific Rules

### Code Must Educate
- Clear variable names that explain concepts
- Comments explaining financial principles
- Examples in code comments where helpful
- Function names that describe what AND why

### Zero Tolerance for Financial Errors
- All calculations must be 100% accurate
- Test with extreme values (0, MAX_SAFE_INTEGER)
- Verify FIFO cost basis tracking
- Ensure 24-hour rule is enforced

### User Trust is Paramount
- Never hide errors - explain them clearly
- Show calculation steps when possible
- Provide fallbacks for external service failures
- Keep audit logs of all financial operations

## Review Process

1. **Self-Review First**: Review your own code before requesting review
2. **Run Tests**: Ensure all tests pass, especially financial tests
3. **Check Standards**: Use this checklist before submitting
4. **Verify Calculations**: Manually verify at least one calculation
5. **Document Changes**: Update relevant documentation

## Enforcement

- **Automated**: ESLint for basic standards
- **Prisma Validation**: Type-safe database operations
- **Test Coverage**: Minimum 80% for financial code
- **Manual Review**: Human review for calculation logic
- **Continuous Monitoring**: Track calculation accuracy in production

Remember: This is an educational platform about money. Every calculation error undermines the educational mission. Precision and accuracy are not optional - they are fundamental requirements.