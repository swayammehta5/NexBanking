const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const { sendError } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Authentication required. Please log in.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isFrozen: true,
        createdAt: true,
        updatedAt: true,
        transactionPinHash: true,
      },
    });

    if (!user) {
      return sendError(res, 401, 'User no longer exists.');
    }

    if (!user.isActive) {
      return sendError(res, 401, 'Account has been deactivated.');
    }

    // Expose user without hash; keep a flag only
    req.user = {
      id: user.id,
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isFrozen: user.isFrozen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasTransactionPin: Boolean(user.transactionPinHash),
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token. Please log in again.');
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired. Please log in again.');
    }
    sendError(res, 500, 'Authentication error');
  }
};

module.exports = { protect };
