# =� Bitcoin Investment Game - Project Savegame #1

## <� Game Status: MVP Complete (Phase 1)
**Date**: January 2025
**Version**: 1.0.0
**Status**: Core Platform Functional 

---

## =� The Story So Far

### The Vision
Created as a gamified investment platform with a simple yet profound question: **"Can you beat Bitcoin?"**

Players start with 1 virtual Bitcoin (100M satoshis) and attempt to outperform simply holding BTC by trading it for stocks and commodities. The twist? Everything is measured in satoshis instead of fiat currency, forcing players to think in Bitcoin terms and understand opportunity cost.

### Creator's Notes (from Discord)
**PlamenAndonov** built this as a working prototype and is happy with what's been achieved so far. The core functionality is complete and working:
- "при мен вече това работи" (it's already working for me)
- The portfolio shows when you're down against Bitcoin (0.9999 BTC after trades)
- Multiple purchase tracking with 24-hour locks ("fully locked" vs "partially locked")
- Flexible input units: Bitcoin, mSat (1M sats), kSat (1K sats), or individual Sats
- Magic link authentication (currently copying from console, email not configured yet)
- Full trade history tracking

Creator's immediate plans:
- Get a domain and deploy it
- Continue development with community help (1kalin joining as contributor)
- Keep repository public for now, may go private if significant work is invested

### What's Been Built
The MVP successfully implements the core game loop:
- Users can sign up with just an email (magic link authentication)
- Each player starts with exactly 1 BTC
- Trading engine allows swapping BTC for stocks and commodities
- 24-hour lock mechanism prevents day trading (FIFO unlock system)
- Portfolio tracking shows real-time P&L in satoshis
- Clean, responsive UI built with vanilla JavaScript
- Multiple input formats for trading (BTC, mSat, kSat, Sat)

---

##  Completed Features (What Works Today)

### = **Authentication System**
-  Magic link authentication via email
-  JWT token management
-  User session persistence
-  Secure passwordless login flow

### =� **Core Trading Engine**
-  BTC � Asset trading functionality
-  Asset � BTC trading (with 24-hour lock)
-  Real-time price fetching from CoinGecko API
-  Satoshi-based calculations (no fiat confusion)
-  FIFO cost basis tracking for accurate P&L

### =� **Portfolio Management**
-  Holdings display with current values
-  P&L tracking (both sats and percentage)
-  Trade history with detailed breakdowns
-  Click-to-view asset trade details
-  Real-time portfolio valuation

### <� **User Interface**
-  Clean, modern design with Tailwind CSS
-  Mobile-responsive layout
-  Custom notification system
-  Real-time price updates (30-second intervals)
-  Intuitive trading interface

### =� **Database & Infrastructure**
-  PostgreSQL database with proper schema
-  Connection pooling for performance
-  Database rebuild/repair scripts
-  Environment-based configuration

### =� **Available Assets**
**Stocks (6):**
- AAPL (Apple)
- TSLA (Tesla)
- MSFT (Microsoft)
- GOOGL (Google)
- AMZN (Amazon)
- NVDA (Nvidia)

**Commodities (3):**
- XAU (Gold)
- XAG (Silver)
- WTI (Oil)

---

## =� What Needs Building (Roadmap to Glory)

### =� **Phase 2: Competition & Social** (Next Priority)
**Why**: Engagement and retention through competition

#### <� Leaderboards
- [ ] Global leaderboard showing top performers
- [ ] Time-based leaderboards (24h, 7d, 30d, all-time)
- [ ] Filter by strategy type (stocks-only, commodities-only, mixed)
- [ ] Performance metrics display (total return %, max drawdown)

#### =d Public Profiles
- [ ] Optional public profile toggle
- [ ] Share portfolio allocation (without amounts)
- [ ] Performance badge system
- [ ] Trading style indicators

#### <� Basic Challenges
- [ ] Monthly trading competitions
- [ ] Theme challenges (e.g., "Tech stocks only")
- [ ] Entry fee system for prize pools
- [ ] Winner announcements and rewards

### =� **Phase 3: Monetization**
**Why**: Sustainable revenue model

#### � Lightning Integration
- [ ] Lightning Network payment infrastructure
- [ ] QR code generation for donations
- [ ] Sats withdrawal for competition winners
- [ ] Payment verification system

#### =� Premium Features
- [ ] Multiple portfolio management (1,000 sats each)
- [ ] Advanced analytics dashboard
- [ ] Priority API access
- [ ] Custom avatar/badges

#### =� Donation System
- [ ] Tip jar with Lightning QR codes
- [ ] Supporter badges
- [ ] Donation leaderboard
- [ ] Thank you page/recognition

### =� **Phase 4: Advanced Features**
**Why**: Depth and sophistication for power users

#### =� Advanced Analytics
- [ ] Sharpe ratio calculation vs Bitcoin
- [ ] Maximum drawdown tracking
- [ ] Volatility analysis
- [ ] Risk-adjusted return metrics
- [ ] Correlation heatmaps
- [ ] Performance attribution analysis

#### <� Gamification System
- [ ] Achievement badges:
  - "Diamond Hands" (hold 1 year)
  - "Contrarian" (buy during crashes)
  - "Diversifier" (10+ assets)
  - "Perfect Timing" (sell at peak)
- [ ] Streak tracking system
- [ ] Experience points and levels
- [ ] Player type classification

#### > Trading Automation
- [ ] DCA (Dollar Cost Averaging) scheduler
- [ ] Portfolio rebalancing rules
- [ ] Stop-loss orders
- [ ] Limit orders
- [ ] Strategy templates

### =� **Phase 5: Scale & Mobile**
**Why**: Mass adoption and accessibility

#### =� Mobile Applications
- [ ] React Native mobile app
- [ ] Push notifications for price alerts
- [ ] Biometric authentication
- [ ] Offline mode with sync

#### = API & Integrations
- [ ] Public REST API
- [ ] WebSocket for real-time data
- [ ] Telegram bot integration
- [ ] Twitter sharing integration
- [ ] Webhook support

#### <� Institutional Features
- [ ] Team/company accounts
- [ ] Bulk user management
- [ ] Custom competitions
- [ ] White-label options
- [ ] Advanced reporting

---

## = Known Issues & Technical Debt

### Critical Issues
- W Stock prices are currently mocked (need real API integration)
- W No email service configured (magic links don't actually send)
- W No rate limiting on API endpoints
- W Missing proper error handling in some routes

### Performance Improvements Needed
- � Database queries not optimized (no indexes on key columns)
- � No caching layer for price data
- � Frontend makes too many API calls
- � No pagination for trade history

### Security Enhancements Required
- = Add CSRF protection
- = Implement rate limiting
- = Add input validation middleware
- = Security headers missing
- = SQL injection prevention review

### Code Quality
- =� No unit tests
- =� No integration tests
- =� Missing API documentation
- =� Inconsistent error handling
- =� Code duplication in routes

---

## <� Quick Wins (Easy Improvements)

1. **Real Stock Prices** (2-3 hours)
   - Integrate Alpha Vantage or Yahoo Finance API
   - Replace mock prices with real data
   - Add caching layer

2. **Email Service** (1-2 hours)
   - Configure SendGrid or similar
   - Test magic link delivery
   - Add email templates

3. **Basic Leaderboard** (3-4 hours)
   - Create leaderboard endpoint
   - Add UI component
   - Calculate rankings

4. **Rate Limiting** (1 hour)
   - Add express-rate-limit
   - Configure per-endpoint limits
   - Add user feedback

5. **More Assets** (2-3 hours)
   - Add more stocks (SPY, QQQ, etc.)
   - Add crypto (ETH, SOL)
   - Update UI to handle pagination

---

## =� Strategic Decisions Needed

### Business Model Questions
1. **Monetization Priority**: Donations vs Premium features vs Competition fees?
2. **Target Audience**: Crypto natives vs Traditional investors vs Gamers?
3. **Geographic Focus**: Global vs US-focused (regulatory considerations)?

### Technical Architecture
1. **Real-time Updates**: WebSockets vs Polling vs SSE?
2. **Scaling Strategy**: Vertical vs Horizontal? When to add Redis?
3. **Mobile Strategy**: PWA vs Native apps vs Hybrid?

### Feature Prioritization
1. **Social Features**: How important is community aspect?
2. **Automation**: Should we focus on DCA/rebalancing early?
3. **Education**: Add tutorials and learning content?

---

## =� Next Sprint Recommendations

### Week 1-2: Foundation & Quick Wins
1. Fix email service for magic links
2. Integrate real stock price API
3. Add basic rate limiting
4. Create database indexes
5. Add error handling middleware

### Week 3-4: Engagement Features
1. Build basic leaderboard
2. Add public profile toggle
3. Create first monthly challenge
4. Implement achievement system (basic badges)

### Week 5-6: Monetization Prep
1. Research Lightning integration options
2. Design premium feature tiers
3. Add donation button (even if just Bitcoin address initially)
4. Create pricing strategy

### Week 7-8: Polish & Launch
1. Add comprehensive testing
2. Security audit
3. Performance optimization
4. Documentation
5. Marketing website

---

## =� Success Metrics to Track

### User Engagement
- Daily Active Users (DAU)
- Average session duration
- Trades per user per day
- Retention rate (D1, D7, D30)

### Game Metrics
- % of users beating Bitcoin
- Average portfolio diversification
- Most traded assets
- Average hold time per asset

### Business Metrics
- User acquisition cost
- Conversion to premium
- Donation amounts
- Competition participation rate

---

## <� Final Boss Features (Long-term Vision)

- **AI Trading Opponent**: Compete against AI strategies
- **Historical Mode**: Trade through historical events
- **Education Mode**: Learn with virtual money first
- **Social Trading**: Copy successful traders
- **NFT Achievements**: On-chain achievement badges
- **Cross-game Assets**: Use winnings in other games
- **Prediction Markets**: Bet on price movements
- **Options Trading**: Add derivatives for advanced players

---

## =� Developer Notes

### Current Pain Points
- Frontend state management is getting complex (consider Redux/Zustand)
- Database migrations are manual (need migration tool)
- No development/staging environment separation
- Deployment is manual (need CI/CD)

### Recommended Next Technical Steps
1. Add TypeScript for type safety
2. Implement proper logging (Winston/Pino)
3. Add monitoring (Sentry/DataDog)
4. Create API documentation (Swagger)
5. Set up automated testing pipeline

### Repository Maintenance
- Keep GOALS.md updated with completed features
- Document API changes in CLAUDE.md
- Create CHANGELOG.md for version tracking
- Add GitHub Issues for bug tracking

---

*This savegame represents the current state of the Bitcoin Investment Game as of January 2025. The foundation is solid, the vision is clear, and the path forward is mapped. Time to level up! =�*
## Creator's Additional Context (Discord Discussion)

### What PlamenAndonov Says is Working:
- Portfolio correctly shows BTC balance reduction when assets are purchased (showing 0.9999 BTC after trades)
- Click on any asset to see full trade history with timestamps
- Partial vs full lock status for assets (some purchases unlocked after 24h, others still locked)
- Flexible input system: trade in BTC, mSat (0.001 BTC = 1M sats), kSat (0.00001 BTC = 1K sats), or individual Sats
- Complete trade history with all details
- Magic link authentication (currently copying from console log)

### Known Issues from Creator:
- Performance calculation in top-right corner is incorrect ("перформанса в дясно горе... е грешен")
- Email sending not configured yet (copying magic link from console)
- Needs proper deployment with domain

### Creator's Next Steps:
- Get domain and deploy the application
- Open to community contributions (1kalin already contributing)
- Keep public for now, may go private if significant work invested
- Creator is "happy with what's done so far" ("съм хепи с него")
