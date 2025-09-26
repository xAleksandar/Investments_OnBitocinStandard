# File Organization

## Project Structure

**Measure Everything in Bitcoin** - Express.js application with Prisma ORM for PostgreSQL database management.

- `server.js` - Main Express server entry point
- `public/` - Frontend static files (vanilla JavaScript SPA)
- `routes/` - Express API route handlers
- `prisma/` - Database schema and migrations
- `scripts/` - Database utility and debugging scripts
- `config/` - Application configuration files

## Current Directory Structure

```
bitcoin-investment-game/
├── server.js                    # Express server entry point
├── package.json                 # Dependencies and npm scripts
├── .env                         # Environment variables (not committed)
│
├── public/                      # Frontend application (vanilla JavaScript)
│   ├── app.js                   # Main SPA application logic
│   ├── index.html               # Main HTML page
│   └── assets/                  # Static assets (CSS, images)
│
├── routes/                      # Express API routes
│   ├── auth.js                  # Magic link authentication
│   ├── portfolio.js             # Portfolio management and valuation
│   ├── trades.js                # Trading system with 24-hour locks
│   ├── assets.js                # Asset prices and CoinGecko integration
│   └── suggestions.js           # User feedback system
│
├── prisma/                      # Prisma ORM configuration
│   ├── schema.prisma            # Database schema definition
│   ├── migrations/              # Version-controlled database migrations
│   │   ├── 20250922182608_init/ # Baseline migration (production schema)
│   │   └── [future migrations]  # Timestamped migration files
│   └── seed.js                  # Database seeding (if needed)
│
├── scripts/                     # Database utilities (legacy/emergency use)
│   ├── setup-database.js        # Initial database setup
│   ├── rebuild-from-trades.js   # Portfolio recalculation from trade history
│   ├── debug-portfolio.js       # Portfolio debugging and validation
│   ├── wipe-database.js         # Complete data reset (dev only)
│   └── backup-database.js       # Database backup utility
│
├── config/                      # Application configuration
│   ├── database.js              # Prisma client configuration
│   └── email.js                 # SMTP email configuration
│
├── middleware/                  # Express middleware
│   ├── auth.js                  # JWT authentication middleware
│   └── validation.js            # Request validation middleware
│
├── services/                    # Business logic services
│   ├── price-service.js         # CoinGecko price fetching
│   ├── portfolio-service.js     # Portfolio calculation logic
│   └── trading-service.js       # Trading execution logic
│
├── utils/                       # Utility functions
│   ├── satoshi-calculator.js    # Bitcoin/satoshi conversion utilities
│   ├── bigint-serializer.js     # BigInt JSON serialization
│   └── date-helpers.js          # Date/time utility functions
│
├── .claude/                     # Claude Code configuration
│   ├── docs/                    # Organized documentation
│   │   ├── ARCHITECTURE.md      # System architecture details
│   │   ├── TESTING.md           # Testing strategies and protocols
│   │   ├── QA_PROTOCOLS.md      # Agent testing workflows
│   │   ├── FILE_ORGANIZATION.md # This file
│   │   └── AGENT_TESTING_GUIDE.md # Agent efficiency protocols
│   ├── agents/                  # Claude agent configurations
│   │   └── playwright-qa-tester.md # QA testing agent setup
│   ├── commands/                # Claude command configurations
│   │   └── commit.md            # Smart commit command
│   ├── settings.local.json      # Personal Claude settings
│   └── mcp-servers.json         # MCP server configuration
│
├── .temp/                       # Temporary files (gitignored)
│   ├── test-results/            # QA test outputs and screenshots
│   ├── test-screenshots/        # Visual evidence from testing
│   ├── financial-validation/    # Portfolio calculation test results
│   └── agent-reports/           # Structured test reports
│
├── e2e-tests/                   # Playwright browser tests (if created)
│   ├── auth.spec.js             # Authentication flow tests
│   ├── trading.spec.js          # Trading system tests
│   ├── portfolio.spec.js        # Portfolio calculation tests
│   └── playwright.config.js     # Playwright configuration
│
└── .kiro/                       # Task management (if created)
    └── specs/                   # Project specifications and tasks
        └── bitcoin-game-enhancements/
            ├── design.md         # Feature design documents
            ├── requirements.md   # Feature requirements
            └── tasks.md          # Trackable task list ([x] completed, [ ] pending)
```

## Claude Documentation Structure

### Main Documentation Files

- **CLAUDE.md** - Main project overview, commands, and quick references
- **.claude/docs/ARCHITECTURE.md** - Detailed system architecture and Prisma integration
- **.claude/docs/TESTING.md** - Testing strategies and database validation
- **.claude/docs/QA_PROTOCOLS.md** - Agent testing workflows and critical protocols
- **.claude/docs/FILE_ORGANIZATION.md** - This file
- **.claude/docs/AGENT_TESTING_GUIDE.md** - Agent efficiency and setup protocols

### Documentation Maintenance Guidelines

**When to Update Documentation**:

- Adding new API routes or modifying existing endpoints
- Making changes to Prisma schema or database structure
- Implementing new trading features or financial calculations
- Modifying authentication flow or user management
- Adding new services or significant utility functions
- Changing deployment or development workflows

## Prisma ORM Integration

### Database Schema Management

**Primary Files**:

- `prisma/schema.prisma` - Single source of truth for database structure
- `prisma/migrations/` - Version-controlled schema changes
- Generated Prisma client provides type-safe database access

**Migration Workflow**:

1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Commit both schema and migration files
4. Team runs `npx prisma migrate deploy` on pull

### Legacy Script Integration

**Emergency Use Only** (`scripts/` directory):

- Use only for data fixes, NOT schema changes
- Prisma migrations should handle all schema modifications
- Legacy scripts maintained for troubleshooting and data recovery

## Frontend Architecture (Vanilla JavaScript)

### Public Directory Structure

```
public/
├── index.html              # Main SPA entry point
├── app.js                  # Core application logic
├── styles/                 # CSS files (Tailwind-based)
├── components/             # Reusable UI components
├── services/               # Frontend API communication
└── utils/                  # Client-side utility functions
```

### State Management

- Global `window.app` object for application state
- JWT token stored in localStorage for session persistence
- Real-time price updates every 30 seconds
- Custom notification system for user feedback

## Development Workflow Files

### Environment Configuration

- `.env` - Environment variables (database, JWT, email config)
- `.env.example` - Template for required environment variables
- `.gitignore` - Excludes sensitive files and temporary directories

### Package Management

- `package.json` - Dependencies and npm scripts including Prisma commands
- `package-lock.json` - Locked dependency versions
- Node.js version specified for team consistency

## Temporary Files Management

### .temp/ Directory Structure

**Purpose**: Store temporary test files, screenshots, quick experiments, and test results
**Usage**: Always use `.temp/` directory instead of putting temporary files in project root
**Cleanup**: Consider these files disposable - they can be deleted anytime
**Git**: All files in `.temp/` are ignored by git and won't be committed

### QA Testing Outputs

- **Screenshots**: Visual evidence of bugs and test results
- **Test Reports**: Structured findings from playwright-qa-tester agent
- **Financial Validation**: Results of portfolio calculation accuracy tests
- **Performance Metrics**: Load time and system performance data

## Configuration Management

### Claude Code Integration

- **Agent Configurations**: Measure Everything in Bitcoin specific testing agents
- **Command Configurations**: Custom commit commands with project-specific logic
- **MCP Integration**: Playwright testing automation setup
- **Settings**: Personal Claude configurations (not committed to git)

### Development Tools

- **Prisma Studio**: Database browser accessible via `npx prisma studio`
- **Migration Tools**: `npx prisma migrate` commands for schema management
- **Client Generation**: `npx prisma generate` for type-safe database access
- **Database Reset**: `npx prisma migrate reset` for development cleanup

This file organization supports a scalable Bitcoin investment platform with clear separation of concerns, comprehensive testing infrastructure, and robust documentation for team collaboration.
