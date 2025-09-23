const BaseController = require('./base-controller');

class AdminController extends BaseController {
    constructor() {
        super();
        // Admin controller uses Prisma directly since we don't have dedicated admin services yet
        // In a full implementation, this would use dedicated admin services
        this.prisma = global.prisma || require('@prisma/client').PrismaClient();
    }

    /**
     * Get admin dashboard statistics
     * GET /api/admin/dashboard
     */
    async getDashboardStats(req, res) {
        try {
            this.requireAdmin(req);

            // Get user statistics
            const userStats = await this.prisma.$queryRaw`
                SELECT
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
                    COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d
                FROM users
            `;

            // Get portfolio statistics
            const portfolioStats = await this.prisma.$queryRaw`
                SELECT
                    COUNT(DISTINCT user_id) as users_with_portfolios,
                    SUM(amount) as total_btc_holdings,
                    COUNT(*) as total_holdings
                FROM holdings
                WHERE asset_symbol = 'BTC'
            `;

            // Get trade statistics
            const tradeStats = await this.prisma.$queryRaw`
                SELECT
                    COUNT(*) as total_trades,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as trades_7d,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as trades_30d
                FROM trades
            `;

            // Get suggestion statistics
            const suggestionStats = await this.prisma.$queryRaw`
                SELECT
                    COUNT(*) as total_suggestions,
                    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_suggestions,
                    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_suggestions,
                    COUNT(CASE WHEN type = 'bug' THEN 1 END) as bug_reports,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_suggestions
                FROM suggestions
            `;

            // Get asset price update status
            const priceUpdateStats = await this.prisma.$queryRaw`
                SELECT
                    COUNT(*) as total_assets,
                    COUNT(CASE WHEN current_price_usd IS NOT NULL THEN 1 END) as assets_with_prices,
                    MAX(last_updated) as latest_price_update
                FROM assets
            `;

            const dashboardStats = {
                users: {
                    total: parseInt(userStats[0].total_users),
                    newLast7Days: parseInt(userStats[0].new_users_7d),
                    newLast30Days: parseInt(userStats[0].new_users_30d),
                    activeLast7Days: parseInt(userStats[0].active_users_7d)
                },
                portfolios: {
                    usersWithPortfolios: parseInt(portfolioStats[0].users_with_portfolios),
                    totalBtcHoldings: portfolioStats[0].total_btc_holdings ? portfolioStats[0].total_btc_holdings.toString() : '0',
                    totalHoldings: parseInt(portfolioStats[0].total_holdings)
                },
                trades: {
                    total: parseInt(tradeStats[0].total_trades),
                    last7Days: parseInt(tradeStats[0].trades_7d),
                    last30Days: parseInt(tradeStats[0].trades_30d)
                },
                suggestions: {
                    total: parseInt(suggestionStats[0].total_suggestions),
                    open: parseInt(suggestionStats[0].open_suggestions),
                    closed: parseInt(suggestionStats[0].closed_suggestions),
                    bugs: parseInt(suggestionStats[0].bug_reports),
                    recent: parseInt(suggestionStats[0].recent_suggestions)
                },
                prices: {
                    totalAssets: parseInt(priceUpdateStats[0].total_assets),
                    assetsWithPrices: parseInt(priceUpdateStats[0].assets_with_prices),
                    latestUpdate: priceUpdateStats[0].latest_price_update
                },
                lastUpdated: new Date().toISOString()
            };

            this.sendSuccess(res, dashboardStats);
        } catch (error) {
            this.handleError(error, res, 'getDashboardStats');
        }
    }

    /**
     * Get all suggestions with admin filtering and pagination
     * GET /api/admin/suggestions
     */
    async getAllSuggestions(req, res) {
        try {
            this.requireAdmin(req);

            const { page = 1, limit = 20, status, type, search } = req.query;
            const pagination = this.validatePagination({ page, limit });

            // Build dynamic query
            let whereClause = '1=1';
            let params = [];
            let paramCount = 1;

            if (status && ['open', 'closed'].includes(status)) {
                whereClause += ` AND s.status = $${paramCount}`;
                params.push(status);
                paramCount++;
            }

            if (type && ['suggestion', 'bug'].includes(type)) {
                whereClause += ` AND s.type = $${paramCount}`;
                params.push(type);
                paramCount++;
            }

            if (search && search.trim()) {
                whereClause += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
                params.push(`%${search.trim()}%`);
                paramCount++;
            }

            // Get suggestions with user info
            const query = `
                SELECT s.id, s.type, s.title, s.description, s.status, s.admin_reply, s.replied_at, s.created_at,
                       u.id as user_id, u.username, u.email
                FROM suggestions s
                JOIN users u ON s.user_id = u.id
                WHERE ${whereClause}
                ORDER BY s.created_at DESC
                LIMIT $${paramCount} OFFSET $${paramCount + 1}
            `;
            params.push(pagination.limit, pagination.offset);

            const suggestions = await this.prisma.$queryRawUnsafe(query, ...params);

            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM suggestions s
                JOIN users u ON s.user_id = u.id
                WHERE ${whereClause}
            `;
            const countResult = await this.prisma.$queryRawUnsafe(countQuery, ...params.slice(0, -2));

            this.sendSuccess(res, {
                suggestions,
                pagination: {
                    ...pagination,
                    total: parseInt(countResult[0].total),
                    totalPages: Math.ceil(countResult[0].total / pagination.limit)
                },
                filters: { status, type, search }
            });
        } catch (error) {
            this.handleError(error, res, 'getAllSuggestions');
        }
    }

    /**
     * Add admin reply to suggestion
     * PUT /api/admin/suggestions/:id/reply
     */
    async replySuggestion(req, res) {
        try {
            this.requireAdmin(req);
            this.validateRequiredFields(req.body, ['adminReply']);

            const { id } = req.params;
            const { adminReply, closeAfterReply = false } = this.sanitizeInput(req.body);
            const suggestionId = this.validateId(id, 'suggestion ID');

            if (adminReply.length > 2000) {
                throw new Error('Admin reply must be 2000 characters or less');
            }

            // Get existing reply to append to it
            const existingSuggestion = await this.prisma.suggestion.findUnique({
                where: { id: suggestionId },
                select: { adminReply: true }
            });

            if (!existingSuggestion) {
                throw new Error('Suggestion not found');
            }

            const currentReply = existingSuggestion.adminReply;
            const timestamp = new Date().toLocaleString('en-US', {
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Append new reply to existing replies
            const newReplyContent = currentReply
                ? `${currentReply}\n\n[${timestamp}] ${adminReply}`
                : `[${timestamp}] ${adminReply}`;

            // Update suggestion
            const updateData = {
                adminReply: newReplyContent,
                repliedAt: new Date()
            };

            if (closeAfterReply) {
                updateData.status = 'closed';
            }

            const updatedSuggestion = await this.prisma.suggestion.update({
                where: { id: suggestionId },
                data: updateData,
                include: {
                    user: {
                        select: { username: true, email: true }
                    }
                }
            });

            this.sendSuccess(res, {
                message: closeAfterReply ? 'Reply added and suggestion closed' : 'Reply added successfully',
                suggestion: updatedSuggestion
            });
        } catch (error) {
            this.handleError(error, res, 'replySuggestion');
        }
    }

    /**
     * Update suggestion status
     * PUT /api/admin/suggestions/:id/status
     */
    async updateSuggestionStatus(req, res) {
        try {
            this.requireAdmin(req);
            this.validateRequiredFields(req.body, ['status']);

            const { id } = req.params;
            const { status } = this.sanitizeInput(req.body);
            const suggestionId = this.validateId(id, 'suggestion ID');

            if (!['open', 'closed'].includes(status)) {
                throw new Error('Status must be either "open" or "closed"');
            }

            const updatedSuggestion = await this.prisma.suggestion.update({
                where: { id: suggestionId },
                data: { status },
                include: {
                    user: {
                        select: { username: true, email: true }
                    }
                }
            });

            this.sendSuccess(res, {
                message: `Suggestion marked as ${status}`,
                suggestion: updatedSuggestion
            });
        } catch (error) {
            this.handleError(error, res, 'updateSuggestionStatus');
        }
    }

    /**
     * Get all users with admin filtering and pagination
     * GET /api/admin/users
     */
    async getAllUsers(req, res) {
        try {
            this.requireAdmin(req);

            const { page = 1, limit = 50, search, isAdmin } = req.query;
            const pagination = this.validatePagination({ page, limit: Math.min(100, limit) });

            // Build where clause
            const where = {};

            if (search && search.trim()) {
                where.OR = [
                    { username: { contains: search.trim(), mode: 'insensitive' } },
                    { email: { contains: search.trim(), mode: 'insensitive' } }
                ];
            }

            if (isAdmin !== undefined) {
                where.isAdmin = isAdmin === 'true';
            }

            const [users, totalCount] = await Promise.all([
                this.prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        isAdmin: true,
                        createdAt: true,
                        lastLoginAt: true,
                        _count: {
                            select: {
                                holdings: true,
                                trades: true,
                                suggestions: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: pagination.limit,
                    skip: pagination.offset
                }),
                this.prisma.user.count({ where })
            ]);

            this.sendSuccess(res, {
                users,
                pagination: {
                    ...pagination,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / pagination.limit)
                },
                filters: { search, isAdmin }
            });
        } catch (error) {
            this.handleError(error, res, 'getAllUsers');
        }
    }

    /**
     * Promote user to admin
     * POST /api/admin/users/:id/promote
     */
    async promoteUser(req, res) {
        try {
            this.requireAdmin(req);

            const { id } = req.params;
            const userId = this.validateId(id, 'user ID');

            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: { isAdmin: true },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    isAdmin: true
                }
            });

            this.sendSuccess(res, {
                message: 'User promoted to admin successfully',
                user: updatedUser
            });
        } catch (error) {
            this.handleError(error, res, 'promoteUser');
        }
    }

    /**
     * Demote user from admin
     * POST /api/admin/users/:id/demote
     */
    async demoteUser(req, res) {
        try {
            this.requireAdmin(req);

            const { id } = req.params;
            const userId = this.validateId(id, 'user ID');

            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: { isAdmin: false },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    isAdmin: true
                }
            });

            this.sendSuccess(res, {
                message: 'User demoted from admin successfully',
                user: updatedUser
            });
        } catch (error) {
            this.handleError(error, res, 'demoteUser');
        }
    }

    /**
     * Get system configuration and settings
     * GET /api/admin/system
     */
    async getSystemInfo(req, res) {
        try {
            this.requireAdmin(req);

            // Get environment info (safe subset)
            const systemInfo = {
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || 'unknown',
                nodeVersion: process.version,
                platform: process.platform,
                uptime: Math.floor(process.uptime()),
                memoryUsage: process.memoryUsage(),
                adminEmails: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').length : 0,
                features: {
                    emailEnabled: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER),
                    coinGeckoApi: !!process.env.COINGECKO_API_URL,
                    jwtConfigured: !!process.env.JWT_SECRET
                }
            };

            // Get database info
            const dbInfo = await this.prisma.$queryRaw`
                SELECT
                    (SELECT COUNT(*) FROM users) as user_count,
                    (SELECT COUNT(*) FROM assets) as asset_count,
                    (SELECT COUNT(*) FROM trades) as trade_count,
                    (SELECT COUNT(*) FROM suggestions) as suggestion_count,
                    (SELECT COUNT(*) FROM holdings) as holding_count
            `;

            systemInfo.database = {
                userCount: parseInt(dbInfo[0].user_count),
                assetCount: parseInt(dbInfo[0].asset_count),
                tradeCount: parseInt(dbInfo[0].trade_count),
                suggestionCount: parseInt(dbInfo[0].suggestion_count),
                holdingCount: parseInt(dbInfo[0].holding_count)
            };

            this.sendSuccess(res, systemInfo);
        } catch (error) {
            this.handleError(error, res, 'getSystemInfo');
        }
    }

    /**
     * Get recent activity across the system
     * GET /api/admin/activity
     */
    async getRecentActivity(req, res) {
        try {
            this.requireAdmin(req);

            const { days = 7 } = req.query;
            const daysInt = Math.min(30, Math.max(1, parseInt(days) || 7));

            // Get recent activity
            const [recentUsers, recentTrades, recentSuggestions] = await Promise.all([
                this.prisma.user.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - daysInt * 24 * 60 * 60 * 1000)
                        }
                    },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }),
                this.prisma.trade.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - daysInt * 24 * 60 * 60 * 1000)
                        }
                    },
                    select: {
                        id: true,
                        fromAsset: true,
                        toAsset: true,
                        fromAmount: true,
                        toAmount: true,
                        createdAt: true,
                        user: {
                            select: { username: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }),
                this.prisma.suggestion.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - daysInt * 24 * 60 * 60 * 1000)
                        }
                    },
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        status: true,
                        createdAt: true,
                        user: {
                            select: { username: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                })
            ]);

            this.sendSuccess(res, {
                period: `${daysInt} days`,
                recentUsers,
                recentTrades: recentTrades.map(trade => ({
                    ...trade,
                    fromAmount: trade.fromAmount.toString(),
                    toAmount: trade.toAmount.toString()
                })),
                recentSuggestions,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            this.handleError(error, res, 'getRecentActivity');
        }
    }
}

module.exports = AdminController;