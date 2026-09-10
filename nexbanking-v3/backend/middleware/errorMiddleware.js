const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Prisma: record not found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Prisma: unique constraint
  if (err.code === 'P2002') {
    statusCode = 400;
    const fields = err.meta?.target;
    const field = Array.isArray(fields) ? fields[0] : 'Field';
    message = `${String(field).charAt(0).toUpperCase()}${String(field).slice(1)} already exists`;
  }

  // Prisma: foreign key / invalid data
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Invalid related resource reference';
  }

  if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Invalid data provided';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (process.env.NODE_ENV === 'development') {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);
  } else {
    logger.error(`${statusCode} - ${req.originalUrl} - ${req.method}`);
  }

  // Never expose credentials, SQL, or hashes
  const safeMessage =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : message;

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
