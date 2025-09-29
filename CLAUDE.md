# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context Preservation Philosophy

**🚨 CRITICAL: Use Agents to Preserve Context**
The main Claude instance has limited context. To work effectively on complex projects:
- **ALWAYS** use specialized agents for exploration, research, and analysis
- **NEVER** load extensive files into main context when an agent can summarize
- **DELEGATE** specialized tasks to appropriate agents
- **PRESERVE** main context for implementation and decision-making

**Mandatory Agent Usage**:
- Use `codebase-analyzer` BEFORE implementing new features to understand project structure
- Use `investigator` WHEN debugging complex issues instead of loading multiple files
- Use `docs-explorer` WHEN researching documentation instead of reading all docs
- Run agents in PARALLEL when possible for maximum efficiency

## Available Commands

### Core Development Commands
- `/plan [description]` - Create comprehensive strategic plan for complex features
- `/status [verbose|brief]` - Get comprehensive project status overview
- `/test [pattern|watch|coverage]` - Smart test execution with various modes
- `/fix [all|lint|format]` - Auto-fix common code issues
- `/deps [check|update|audit]` - Manage dependencies and security
- `/commit [instructions]` - Smart commit with logical grouping

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

- **Code Standards**: See `.claude/docs/CODE_REVIEW_STANDARDS.md` for DRY/KISS principles and financial code quality guidelines
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

## Expert Consultation Agents

### Essential Context-Preserving Agents

#### Codebase Analyzer Agent (`codebase-analyzer`)
**Use BEFORE implementing new features to understand project structure**:
- Map architecture and module relationships
- Identify coding patterns and conventions
- Find where to add new functionality
- Understand dependency relationships
- **When to invoke**: "Let me analyze the codebase structure first to understand where this should go"

#### Investigator Agent (`investigator`)
**Use for deep research that returns only essential findings**:
- Debug complex issues and find root causes
- Research API integrations and best practices
- Investigate performance bottlenecks
- Trace execution flow and data paths
- **When to invoke**: "Let me investigate why this error is happening"

#### Documentation Explorer Agent (`docs-explorer`)
**Use to research documentation without loading it all**:
- Explore API documentation efficiently
- Find configuration options and environment variables
- Research library usage patterns
- Understand project conventions
- **When to invoke**: "Let me explore the documentation for this library"

#### Test Generator Agent (`test-generator`)
**Use to create comprehensive test suites**:
- Generate unit and integration tests
- Create tests for financial calculations
- Improve test coverage systematically
- Generate test fixtures and mocks
- **When to invoke**: "I'll generate tests for this new feature"

#### Documentation Maintainer Agent (`docs-maintainer`)
**Use to keep documentation current**:
- Update architecture documentation after changes
- Document new patterns and conventions
- Capture lessons learned from bugs
- Update API documentation
- **When to invoke**: "Let me update the documentation with this new pattern"

### Senior Developer Consultant Agent

**Use the `senior-dev-consultant` agent for expert second opinions on**:
- **Complex architectural decisions** requiring deep technical evaluation
- **Difficult debugging scenarios** where initial attempts haven't resolved issues
- **Performance optimization** requiring advanced analysis and solutions
- **Security-sensitive code reviews** for authentication, data handling, or API security
- **Database schema design** or complex migration planning
- **API design decisions** with long-term architectural implications
- **Refactoring strategies** for large-scale code reorganization
- **Code quality reviews** before major releases or deployments
- **Algorithm optimization** for complex calculations (especially financial/satoshi math)
- **Concurrency issues** and race condition debugging
- **Memory leaks** and resource optimization problems

**When to invoke**: Proactively use when facing tasks that would benefit from senior-level expertise. Examples:
- "Let me consult the senior developer agent for guidance on this architecture decision"
- "This debugging issue is complex - I'll get a second opinion from the senior consultant"
- "Before implementing this critical calculation, I'll verify approach with the senior dev agent"

**Cost optimization**: This agent uses a more capable (and expensive) model - use for complex problems where expert guidance provides clear value, not for routine implementation tasks.

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

### User Confirmation Requirements

**🚨 CRITICAL: Always Seek User Confirmation Before Making Assumptions**

**Mandatory Confirmation Scenarios**:
- **Underspecified Requirements**: When task details are vague or incomplete, ASK for clarification instead of assuming intent
- **Proactive Improvements**: Before adding features, optimizations, or enhancements not explicitly requested, ASK for permission
- **Architecture Decisions**: When multiple implementation approaches exist, PRESENT options and wait for user choice
- **Scope Expansion**: If implementation requires additional changes beyond the original request, EXPLAIN and seek approval first
- **Code Style Choices**: When coding conventions aren't clear from existing code, ASK about preferred patterns
- **Technology Selections**: Before introducing new libraries, frameworks, or tools, CONFIRM with user first

**Required Confirmation Format**:
```
"I notice [specific situation]. I could [proposed approach/improvement].
Would you like me to proceed with this approach, or would you prefer something different?"
```

**Examples of When to Ask**:
- "The component could benefit from error boundaries - should I add them?"
- "I could optimize this database query, but it would change the existing pattern - proceed?"
- "The styling could be improved with CSS Grid instead of Flexbox - your preference?"
- "Should I add TypeScript types to this JavaScript file while fixing the bug?"
- "I could refactor this to use a custom hook - would that be helpful?"

**Never Assume**:
- User wants additional features beyond the request
- Code should be optimized unless performance is the stated goal
- Existing patterns should be changed without explicit direction
- Dependencies should be updated or added
- File structure should be reorganized
- Testing strategies should be modified

**When NOT to Ask** (proceed directly):
- Fixing obvious bugs or errors
- Following explicitly stated requirements
- Using existing established patterns in the codebase
- Standard formatting/linting corrections
- Following documented conventions in CLAUDE.md

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
- **NEVER commit without explicit user request**: Only create commits when the user specifically asks you to commit
- **Wait for approval**: After making changes, present them to the user and wait for their decision to commit
- **User-initiated only**: Do not proactively commit changes, even after completing tasks
- **Meaningful commits**: When asked to commit, separate unrelated changes into different commits
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