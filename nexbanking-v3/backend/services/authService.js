const jwt = require('jsonwebtoken');
const { serializeUser, serialize, toNumber } = require('../utils/serializers');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const createSendToken = (user, account, statusCode, res) => {
  const token = signToken(user.id);
  const safeUser = serializeUser(user);

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user: {
        id: safeUser.id,
        _id: safeUser.id,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        email: safeUser.email,
        phone: safeUser.phone,
        role: safeUser.role,
        hasTransactionPin: safeUser.hasTransactionPin,
        createdAt: safeUser.createdAt,
      },
      account: account
        ? {
            id: account.id,
            _id: account.id,
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            balance: toNumber(account.balance),
            currency: account.currency,
            totalDeposited: toNumber(account.totalDeposited),
            totalWithdrawn: toNumber(account.totalWithdrawn),
          }
        : null,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { signToken, createSendToken };
