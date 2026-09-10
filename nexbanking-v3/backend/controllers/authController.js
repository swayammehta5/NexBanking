const bcrypt = require('bcryptjs');
const { prisma } = require('../config/db');
const { createSendToken } = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');
const {
  isValidPinFormat,
  hashTransactionPin,
} = require('../middleware/pinMiddleware');
const { serializeUser, serialize, generateAccountNumber } = require('../utils/serializers');
const logger = require('../utils/logger');

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      transactionPin,
      confirmTransactionPin,
    } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return sendError(res, 400, 'An account with this email already exists');

    if (!isValidPinFormat(String(transactionPin || ''))) {
      return sendError(res, 400, 'Transaction PIN must be exactly 4 digits');
    }
    if (String(transactionPin) !== String(confirmTransactionPin)) {
      return sendError(res, 400, 'Transaction PIN and confirmation do not match');
    }
    const pinHash = await hashTransactionPin(String(transactionPin));

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          password: hashedPassword,
          phone: phone || null,
          transactionPinHash: pinHash,
        },
      });

      const account = await tx.account.create({
        data: {
          userId: user.id,
          accountNumber: generateAccountNumber(),
        },
      });

      return { user, account };
    });

    await logActivity(result.user.id, 'login', 'Account created', {}, req);
    await logActivity(result.user.id, 'pin_set', 'Transaction PIN set during registration', {}, req);

    logger.info(`New user registered: ${result.user.email}`);
    createSendToken(result.user, result.account, 201, res);
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    if (error.code === 'P2002') {
      return sendError(res, 400, 'An account with this email already exists');
    }
    sendError(res, 500, 'Registration failed. Please try again.');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendError(res, 401, 'Invalid email or password');
    }
    if (!user.isActive) return sendError(res, 401, 'Account deactivated. Contact support.');
    if (user.isFrozen) return sendError(res, 401, 'Account is frozen. Contact support.');

    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    const history = Array.isArray(user.loginHistory) ? [...user.loginHistory] : [];
    history.push({ ip, userAgent: req.headers['user-agent'] || '', timestamp: new Date().toISOString() });
    const trimmed = history.slice(-20);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), loginHistory: trimmed },
    });

    const account = await prisma.account.findUnique({ where: { userId: user.id } });
    await createNotification(user.id, 'new_login', [ip]);
    await logActivity(user.id, 'login', `Login from ${ip}`, { ip }, req);
    logger.info(`User logged in: ${user.email}`);
    createSendToken(updatedUser, account, 200, res);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    sendError(res, 500, 'Login failed. Please try again.');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const account = await prisma.account.findUnique({ where: { userId: req.user.id } });
    sendSuccess(res, 200, 'User profile retrieved', {
      user: serializeUser(user),
      account: serialize(account),
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, phone },
    });
    await logActivity(req.user.id, 'profile_update', 'Profile updated', {}, req);
    sendSuccess(res, 200, 'Profile updated successfully', { user: serializeUser(user) });
  } catch {
    sendError(res, 500, 'Profile update failed');
  }
};

/**
 * Set or change transaction PIN.
 * Body: { transactionPin, confirmTransactionPin, currentTransactionPin? }
 * If a PIN already exists, currentTransactionPin is required.
 */
const setTransactionPin = async (req, res) => {
  try {
    const { transactionPin, confirmTransactionPin, currentTransactionPin } = req.body;

    if (!isValidPinFormat(String(transactionPin || ''))) {
      return sendError(res, 400, 'Transaction PIN must be exactly 4 digits');
    }
    if (String(transactionPin) !== String(confirmTransactionPin)) {
      return sendError(res, 400, 'Transaction PIN and confirmation do not match');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, transactionPinHash: true },
    });

    if (!user) return sendError(res, 404, 'User not found');

    if (user.transactionPinHash) {
      if (!currentTransactionPin) {
        return sendError(res, 400, 'Current transaction PIN is required to change your PIN');
      }
      if (!isValidPinFormat(String(currentTransactionPin))) {
        return sendError(res, 400, 'Current transaction PIN must be exactly 4 digits');
      }
      const match = await bcrypt.compare(String(currentTransactionPin), user.transactionPinHash);
      if (!match) return sendError(res, 401, 'Current transaction PIN is incorrect');
    }

    const hash = await hashTransactionPin(String(transactionPin));
    await prisma.user.update({
      where: { id: user.id },
      data: { transactionPinHash: hash },
    });

    const action = user.transactionPinHash ? 'pin_change' : 'pin_set';
    await logActivity(user.id, action, user.transactionPinHash ? 'Transaction PIN changed' : 'Transaction PIN set', {}, req);

    sendSuccess(res, 200, user.transactionPinHash ? 'Transaction PIN updated successfully' : 'Transaction PIN set successfully', {
      hasTransactionPin: true,
    });
  } catch (error) {
    logger.error(`Set PIN error: ${error.message}`);
    sendError(res, 500, 'Failed to set transaction PIN');
  }
};

module.exports = { register, login, getMe, updateProfile, setTransactionPin };
