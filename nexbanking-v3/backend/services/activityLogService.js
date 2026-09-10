const { prisma } = require('../config/db');
const logger = require('../utils/logger');

const logActivity = async (userId, action, description = '', metadata = {}, req = null) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId || null,
        action,
        description,
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || '',
        userAgent: req?.headers?.['user-agent'] || '',
        metadata,
      },
    });
  } catch (err) {
    logger.error(`ActivityLog error: ${err.message}`);
  }
};

module.exports = { logActivity };
