const authRoutes = require('./auth');
const portfolioRoutes = require('./portfolio');
const tradeRoutes = require('./trades-prisma');
const assetRoutes = require('./assets');
const suggestionsRoutes = require('./suggestions');
const debugRoutes = require('./debug');
const setForgetPortfoliosRoutes = require('./set-forget-portfolios');

function setupRoutes(app) {
  console.log('🛣️ Setting up API routes...');

  // Magic link redirect endpoints (legacy compatibility)
  app.get('/auth/verify', (req, res) => {
    const token = req.query.token;
    res.redirect(`/?token=${token}`);
  });

  app.get('/api/auth/verify-redirect', (req, res) => {
    const token = req.query.token;
    res.redirect(`/?token=${token}`);
  });

  // Database utilities endpoints
  app.get('/api/refresh-pools', async (req, res) => {
    try {
      // Clear require cache for database connections
      delete require.cache[require.resolve('../../config/database')];
      res.json({
        message: 'Connection pools refreshed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // API route registration
  app.use('/api/auth', authRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/trades', tradeRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/suggestions', suggestionsRoutes);
  app.use('/api/debug', debugRoutes);
  app.use('/api/set-forget-portfolios', setForgetPortfoliosRoutes);

  console.log('✅ API routes configured');

  // Log registered routes in development
  if (process.env.NODE_ENV === 'development') {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push({
          method: Object.keys(middleware.route.methods)[0].toUpperCase(),
          path: middleware.route.path
        });
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const basePath = middleware.regexp.source
              .replace('\\', '')
              .replace('(?=\\/|$)', '')
              .replace('^', '');
            routes.push({
              method: Object.keys(handler.route.methods)[0].toUpperCase(),
              path: basePath + handler.route.path
            });
          }
        });
      }
    });

    console.log('📋 Registered routes:');
    routes.forEach(route => {
      console.log(`   ${route.method.padEnd(6)} ${route.path}`);
    });
  }
}

module.exports = { setupRoutes };