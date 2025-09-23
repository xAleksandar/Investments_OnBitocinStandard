const { PrismaClient } = require('@prisma/client');

class BaseService {
    constructor() {
        this.prisma = global.prisma || new PrismaClient();
        if (!global.prisma) {
            global.prisma = this.prisma;
        }
    }

    async handleServiceError(error, context = '') {
        console.error(`Service error in ${context}:`, error);

        if (error.code === 'P2002') {
            throw new Error('Duplicate entry found');
        } else if (error.code === 'P2025') {
            throw new Error('Record not found');
        } else if (error.code === 'P2003') {
            throw new Error('Foreign key constraint failed');
        } else {
            throw new Error(`Database operation failed: ${error.message}`);
        }
    }

    async validateUser(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    async beginTransaction() {
        return this.prisma.$transaction.bind(this.prisma);
    }

    sanitizeInput(data) {
        if (typeof data === 'string') {
            return data.trim();
        }

        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string') {
                    sanitized[key] = value.trim();
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        }

        return data;
    }

    async disconnect() {
        if (this.prisma && this.prisma.$disconnect) {
            await this.prisma.$disconnect();
        }
    }
}

module.exports = BaseService;