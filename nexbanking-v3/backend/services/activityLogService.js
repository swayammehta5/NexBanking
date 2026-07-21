const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * Log an activity. Fire-and-forget — never throws.
 */
const logActivity = async (userId, action, description = '', metadata = {}, req = null) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      description,
      ip:        req?.ip || req?.headers?.['x-forwarded-for'] || '',
      userAgent: req?.headers?.['user-agent'] || '',
      metadata,
    });
  } catch (err) {
    logger.error(`ActivityLog error: ${err.message}`);
  }
};

module.exports = { logActivity };
