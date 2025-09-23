# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Measured in Bitcoin - An educational platform that teaches users about Bitcoin as a unit of account and alternative measure of wealth. Users explore how asset values change when measured in satoshis instead of dollars, demonstrating the difference between inflationary (dollar) and deflationary (Bitcoin) monetary systems.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with nodemon (auto-restart on changes)
- `npm start` - Start production server
- `npm run test:e2e` - Run Playwright browser tests (headless)
- `npm run test:e2e:ui` - Run Playwright tests with interactive UI
- `npm run test:e2e:headed` - Run Playwright tests in visible browser

### Targeted Testing (Time-Efficient)
**Run Specific Tests Only**: Avoid full test suites during debugging - target specific functionality:
- `npx playwright test --grep "specific test name"` - Run tests matching pattern
- `npx playwright test tests/specific-file.spec.js` - Run single test file
- `npx playwright test --project=chromium` - Run tests in specific browser only
- **Manual Testing**: Use browser dev tools and direct URL testing for quick validation
- **Component Testing**: Test individual functions/components in isolation before full integration
- **API Testing**: Use curl or Postman for quick endpoint validation without UI overhead

### Rapid Debugging Test Pattern
**Create Temporary Test Files for Debugging**:
```javascript
// tests/debug-issue.spec.js - DELETE after fixing
test('Minimal reproduction', async ({ page }) => {
    page.on('pageerror', e => console.log('ERROR:', e.message));
    await page.goto('http://localhost:3000');
    // Test ONLY what's broken
});
```
**Run repeatedly**: `npx playwright test tests/debug-issue.spec.js --reporter=list`
**Clean up after**: `rm tests/debug-*.spec.js`

### Database Management (Prisma ORM)
- `npx prisma migrate dev --name <name>` - Create and apply new migration
- `npx prisma migrate deploy` - Apply pending migrations (production)
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma studio` - Open database browser
- `node scripts/debug-portfolio.js` - Debug portfolio calculations

### Server Details
- Development server port configured in `.env` file (PORT variable)
- Server entry point: `server.js`
- Uses Express.js with Prisma ORM for PostgreSQL database
- Serves static files from `public/` directory

## Quick References

- **Architecture**: See `.claude/docs/ARCHITECTURE.md` for detailed Prisma ORM integration and database schema
- **Testing**: See `.claude/docs/TESTING.md` for testing strategies, Prisma testing, and database validation
- **Rapid Debugging**: See `.claude/docs/RAPID_DEBUGGING.md` for fast error-first debugging methodology
- **QA Testing**: See `.claude/docs/QA_PROTOCOLS.md` for automated browser testing protocols and critical bug fix workflows
- **File Structure**: See `.claude/docs/FILE_ORGANIZATION.md` for directory organization and Prisma integration
- **Agent Testing**: See `.claude/docs/AGENT_TESTING_GUIDE.md` for agent testing protocols and financial validation requirements

## Key Implementation Notes

### Database & ORM
- **Prisma ORM**: PostgreSQL database with type-safe queries and migration system
- **Schema**: Defined in `prisma/schema.prisma` with version-controlled migrations
- **BigInt Storage**: All satoshi amounts stored as BigInt for precision
- **Team Sync**: Use `npx prisma migrate deploy` after git pull for schema updates

### Value Conversion Logic
- **24-hour Reflection Period**: Assets cannot be converted back to BTC for 24 hours, encouraging thoughtful observation
- **FIFO Cost Basis**: First In, First Out accounting for accurate value tracking
- **Satoshi Precision**: All calculations in satoshis (100M sats = 1 BTC), no decimal amounts
- **Real-time Pricing**: CoinGecko API integration with database fallbacks

### Authentication & Security
- **Magic Links**: Email-based authentication with JWT tokens
- **Admin Access**: Controlled via `ADMIN_EMAILS` environment variable
- **Session Persistence**: JWT stored in localStorage

## External Dependencies

### Critical APIs
- **CoinGecko API**: Real-time price data for BTC and assets
  - Rate limits: 50 calls/minute (no API key required)
  - Fallback to cached prices if API fails

### Environment Variables
Required in `.env`:
- `POSTGRES_URL` - Full PostgreSQL connection string for Prisma
- `JWT_SECRET` - Token signing key
- `PORT` - Server port (default 3000)
- `ADMIN_EMAILS` - Comma-separated admin email addresses
- `EMAIL_*` - SMTP settings for magic links (optional in dev)

## Automated Browser Testing

**Playwright QA Tester Agent**: Use the `playwright-qa-tester` agent for comprehensive browser testing:
- **When to invoke**: After implementing new features, fixing bugs, or making changes that need validation
- **Critical Workflow**: Always test before AND after bug fixes to confirm resolution
- **Educational Focus**: Zero tolerance for errors in portfolio calculations, conversion logic, or satoshi precision

**Agent Invocation Requirements**: When calling the playwright-qa-tester agent, MUST provide:
- **Specific test commands**: `npm run test:e2e` (headless), `npm run test:e2e:ui` (interactive), or `npm run test:e2e:headed` (visible browser)
- **Test focus areas**: Specify which features/functionality to validate (e.g., "routing fixes", "portfolio calculations", "authentication flow")
- **Expected behaviors**: Describe what should work correctly after changes
- **Known test files**: Reference specific test files in `tests/` directory if targeting particular functionality
- **Server setup**: Mention if dev server needs to be running (`npm run dev` on port from .env)

**See `.claude/docs/QA_PROTOCOLS.md` for complete QA testing protocols.**

## Development Workflow Principles

### Task Management and Planning
**Automatic Todo List Creation**: Claude MUST automatically create todo lists for complex tasks using the TodoWrite tool:
- **When to create**: Any task requiring 3+ distinct steps, multi-file changes, or systematic operations
- **Examples**: Feature implementation, bug fixes with multiple components, database migrations, refactoring
- **Task tracking**: Mark tasks as `in_progress` before starting work, `completed` immediately after finishing
- **Progress visibility**: Update status in real-time to show user progress throughout implementation
- **Planning benefits**: Break down complex work into manageable, trackable steps

**Task List Modification Rules**:
- **ONLY change** `[ ]` to `[x]` when marking tasks complete
- **NEVER add** comments, emojis, status indicators, or extra details to task items
- **NEVER modify** task descriptions or bullet points unless explicitly asked
- **Keep format clean**: Maintain established task list syntax without decoration
- **Document details elsewhere**: Use separate files for implementation notes and completion reports

### Database Changes
**Prisma Migration Approach**:
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <descriptive_name>`
3. Commit both schema changes and migration files
4. Team members run `npx prisma migrate deploy` on git pull

**Legacy Scripts**: Use `scripts/` only for data fixes, NOT schema changes

### Code Quality
- **DRY and KISS**: Keep it simple, avoid repetition, reuse components and functions
- **Don't assume**: Always check function names, database tables, and API endpoints
- **Alert problems**: Report code issues even if unrelated to current task

### Debugging Methodology

**Rapid Error-First Debugging** (PREFERRED APPROACH):
1. **Create Minimal Test Files**: Write the smallest possible Playwright test that exposes the issue
   - `tests/debug-[issue].spec.js` - Temporary, focused test files
   - Capture console logs and errors immediately
   - Check specific DOM elements or app state

2. **Get Errors First, Fix Second**:
   - Use `page.on('pageerror')` to capture JavaScript errors
   - Don't speculate - get the EXACT error message
   - Fix one error at a time, re-run test after each fix
   - New errors often appear after fixing the first - this is progress!

3. **Use grep/bash Efficiently**:
   ```bash
   grep -n "export.*ClassName" src/**/*.js  # Find export patterns
   tail -20 file.js                          # Check file endings for exports
   for file in *.js; do echo $file; done     # Quick file iteration
   ```

4. **Batch Fix Similar Issues**:
   - Create temporary shell scripts for repetitive fixes
   - Fix all similar issues at once (e.g., missing exports)
   - Clean up scripts after use

5. **Test-Fix-Verify Cycle**:
   - Run test → Get error → Fix error → Re-run test
   - Continue until no errors
   - THEN test actual functionality

**Strategic Logging** (when needed):
- **Minimal Logs Only**: Add only at critical decision points
- **Execution Flow**: Log entering key functions, not every line
- **Remove After Fixing**: Clean up ALL debug logs
- **Use Descriptive Prefixes**: `🔍 Routing:`, `📄 Page load:`, `❌ Error:`

### Commit Guidelines
- **Meaningful commits**: Separate unrelated changes into different commits
- **CLAUDE.md updates**: Keep AI instruction changes in separate commits
- **Team coordination**: Document required actions in commit messages
- **Task tracking**: Reference Kiro task completion when applicable

### Task Completion Validation
- **Mandatory Validation**: Before marking any development task as complete, use the `task-completion-validator` agent to verify the implementation
- **Quality Assurance**: The validator checks requirements fulfillment, code quality, testing coverage, and project-specific standards
- **Critical for Finance**: Especially important for portfolio calculations, satoshi conversions, and database changes where errors undermine educational integrity
- **When to Validate**: After implementing features, fixing bugs, adding migrations, or making significant code changes

### Educational Platform Rules
- **Test before AND after fixes**: Always re-run tests to confirm bug resolution
- **Zero tolerance**: Value calculations must be 100% accurate for educational integrity
- **Documentation updates**: Any conversion/portfolio logic change must update ARCHITECTURE.md
- **Never commit .gitignore'd files**: They're ignored for security/cleanup reasons

## Temporary Files

Use `.temp/` directory for all temporary files, test results, screenshots, and quick experiments
- **Not version controlled**: All files in .temp/ are ignored by git
- **Auto-cleanup**: Consider these files disposable

## Documentation Maintenance

**CRITICAL**: When making changes that affect project structure, architecture, or key processes, update relevant documentation:

### Update This File When:
- Adding new essential npm scripts or Prisma commands
- Changing server configuration or core implementation patterns
- Adding new major systems or educational/conversion features

### Update `.claude/docs/` Files When:
- **ARCHITECTURE.md**: Database schema, API routes, conversion logic changes
- **TESTING.md**: Testing procedures, financial validation changes
- **QA_PROTOCOLS.md**: Agent testing workflows, critical testing requirements

**Goal**: Keep documentation current so future sessions have accurate context without confusion or outdated information. This is especially critical for educational applications where incorrect documentation could lead to calculation errors and undermine learning objectives.