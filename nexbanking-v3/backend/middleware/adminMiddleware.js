const { sendError } = require('../utils/apiResponse');

const adminOnly = (req, res, next) => {
  if (!req.user) return sendError(res, 401, 'Authentication required');
  if (req.user.role !== 'admin') return sendError(res, 403, 'Admin access required');
  next();
};

module.exports = { adminOnly };
