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

**See `.claude/docs/QA_PROTOCOLS.md` for complete QA testing protocols.**

## Development Workflow Principles

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

### Commit Guidelines
- **Meaningful commits**: Separate unrelated changes into different commits
- **CLAUDE.md updates**: Keep AI instruction changes in separate commits
- **Team coordination**: Document required actions in commit messages
- **Task tracking**: Reference Kiro task completion when applicable

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