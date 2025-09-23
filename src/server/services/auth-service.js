const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const BaseService = require('./base-service');

class AuthService extends BaseService {
    constructor() {
        super();
    }

    async checkUserExists(email) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email },
                select: { id: true }
            });
            return !!user;
        } catch (error) {
            await this.handleServiceError(error, 'checkUserExists');
        }
    }

    async requestMagicLink(email, username = null) {
        try {
            const sanitizedEmail = this.sanitizeInput(email);
            const sanitizedUsername = username ? this.sanitizeInput(username) : null;

            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Check if user exists
            let user = await this.prisma.user.findUnique({
                where: { email: sanitizedEmail }
            });

            if (!user && sanitizedUsername) {
                // Create new user with transaction
                user = await this.prisma.$transaction(async (prisma) => {
                    const newUser = await prisma.user.create({
                        data: {
                            username: sanitizedUsername,
                            email: sanitizedEmail
                        }
                    });

                    // Give them 1 BTC (100,000,000 satoshis)
                    await prisma.holding.create({
                        data: {
                            userId: newUser.id,
                            assetSymbol: 'BTC',
                            amount: BigInt(100000000)
                        }
                    });

                    return newUser;
                });
            }

            if (!user) {
                throw new Error('User not found. Please provide username for registration.');
            }

            // Store magic link
            await this.prisma.magicLink.create({
                data: {
                    email: sanitizedEmail,
                    token,
                    expiresAt
                }
            });

            // Generate magic link URL
            const baseUrl = process.env.APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
            const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

            return {
                token,
                magicLinkUrl,
                user
            };
        } catch (error) {
            // Handle specific Prisma errors
            if (error.code === 'P2002') {
                if (error.meta?.target?.includes('username')) {
                    throw new Error('This username is already taken. Please choose a different username.');
                }
                if (error.meta?.target?.includes('email')) {
                    throw new Error('An account with this email already exists.');
                }
            }
            await this.handleServiceError(error, 'requestMagicLink');
        }
    }

    async verifyMagicLink(token) {
        try {
            const sanitizedToken = this.sanitizeInput(token);

            const link = await this.prisma.magicLink.findFirst({
                where: {
                    token: sanitizedToken,
                    expiresAt: { gt: new Date() },
                    used: false
                }
            });

            if (!link) {
                throw new Error('Invalid or expired token');
            }

            // Mark token as used and get user in transaction
            const result = await this.prisma.$transaction(async (prisma) => {
                await prisma.magicLink.update({
                    where: { id: link.id },
                    data: { used: true }
                });

                const user = await prisma.user.findUnique({
                    where: { email: link.email }
                });

                return user;
            });

            // Check admin status
            const isAdmin = this.checkAdminStatus(result.email, result.isAdmin);

            // Generate JWT
            const jwtToken = jwt.sign(
                {
                    userId: result.id,
                    email: result.email,
                    isAdmin: isAdmin
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return {
                token: jwtToken,
                user: {
                    ...result,
                    isAdmin: isAdmin
                }
            };
        } catch (error) {
            await this.handleServiceError(error, 'verifyMagicLink');
        }
    }

    checkAdminStatus(email, dbIsAdmin = false) {
        const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map(email => email.trim())
            .filter(email => email);

        const isAdminByEmail = adminEmails.includes(email);
        return isAdminByEmail || dbIsAdmin;
    }

    async verifyJWT(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Verify user still exists
            const user = await this.prisma.user.findUnique({
                where: { id: decoded.userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            return {
                ...decoded,
                user
            };
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            await this.handleServiceError(error, 'verifyJWT');
        }
    }

    async updateLastLogin(userId) {
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: { lastLoginAt: new Date() }
            });
        } catch (error) {
            console.error('Failed to update last login:', error);
            // Don't throw - this is non-critical
        }
    }
}

module.exports = AuthService;