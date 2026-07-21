/**
 * Send a success JSON response
 */
const sendSuccess = (res, statusCode, message, data = {}) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send an error JSON response
 */
const sendError = (res, statusCode, message, errors = null) => {
  const payload = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) payload.errors = errors;
  res.status(statusCode).json(payload);
};

module.exports = { sendSuccess, sendError };
