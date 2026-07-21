const jwt = require('jsonwebtoken');

/**
 * Sign a JWT for the given user ID
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Create and send JWT token + user data
 */
const createSendToken = (user, account, statusCode, res) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      account: account
        ? {
            id: account._id,
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            balance: account.balance,
            currency: account.currency,
          }
        : null,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { signToken, createSendToken };
