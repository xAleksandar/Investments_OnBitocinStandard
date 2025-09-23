const prisma = require('../config/database');

/**
 * Check if a user is an admin
 * First checks ADMIN_EMAILS environment variable, then database if needed
 * @param {string} email - User's email address
 * @param {number} userId - User's ID for database lookup (optional)
 * @returns {Promise<boolean>} - True if user is admin, false otherwise
 */
async function isUserAdmin(email, userId = null) {
  try {
    // First check: Environment variable admin emails (no DB query needed)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(email => email);
    const isAdminByEmail = adminEmails.includes(email);

    if (isAdminByEmail) {
      return true; // Early return - no need to query database
    }

    // Second check: Database admin flag (only if not found in env)
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true }
      });
      return user && user.isAdmin === true;
    }

    // If no userId provided and not in env, check by email
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { isAdmin: true }
    });
    return user && user.isAdmin === true;

  } catch (error) {
    console.error('Error checking admin status:', error);
    return false; // Fail closed - deny admin access on error
  }
}

/**
 * Check if a user is admin using user data object
 * @param {Object} userData - User object with email and optionally id
 * @returns {Promise<boolean>} - True if user is admin, false otherwise
 */
async function isUserAdminByData(userData) {
  if (!userData || !userData.email) {
    return false;
  }

  return await isUserAdmin(userData.email, userData.id || userData.userId);
}

module.exports = {
  isUserAdmin,
  isUserAdminByData
};