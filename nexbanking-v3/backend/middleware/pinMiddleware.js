const bcrypt = require('bcryptjs');
const { prisma } = require('../config/db');
const { sendError } = require('../utils/apiResponse');

const PIN_REGEX = /^\d{4}$/;

/**
 * Validate PIN format (exactly 4 digits). Does not log the PIN.
 */
const isValidPinFormat = (pin) => typeof pin === 'string' && PIN_REGEX.test(pin);

/**
 * Hash a 4-digit transaction PIN with bcrypt.
 */
const hashTransactionPin = async (pin) => bcrypt.hash(pin, 12);

/**
 * Compare a supplied PIN against the stored hash.
 */
const compareTransactionPin = async (pin, hash) => {
  if (!hash) return false;
  return bcrypt.compare(pin, hash);
};

/**
 * Middleware: require and verify transactionPin from the request body.
 * Must run after `protect`. Never logs or echoes the PIN.
 */
const requireTransactionPin = async (req, res, next) => {
  try {
    const { transactionPin } = req.body;

    if (transactionPin === undefined || transactionPin === null || transactionPin === '') {
      return sendError(res, 400, 'Transaction PIN is required');
    }

    if (!isValidPinFormat(String(transactionPin))) {
      return sendError(res, 400, 'Transaction PIN must be exactly 4 digits');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, transactionPinHash: true, isFrozen: true, isActive: true },
    });

    if (!user) return sendError(res, 401, 'User no longer exists.');
    if (!user.isActive) return sendError(res, 401, 'Account has been deactivated.');
    if (user.isFrozen) return sendError(res, 403, 'Account is frozen. Contact support.');

    if (!user.transactionPinHash) {
      return sendError(res, 403, 'Transaction PIN not set. Please set your PIN in Profile → Security before making transactions.');
    }

    const ok = await compareTransactionPin(String(transactionPin), user.transactionPinHash);
    if (!ok) {
      return sendError(res, 401, 'Incorrect transaction PIN');
    }

    // Strip PIN from body so downstream handlers never persist it
    delete req.body.transactionPin;
    next();
  } catch (error) {
    sendError(res, 500, 'PIN verification failed');
  }
};

/**
 * Service-level verification (for use inside controllers if needed).
 */
const verifyTransactionPin = async (userId, pin) => {
  if (!isValidPinFormat(String(pin))) {
    return { ok: false, code: 400, message: 'Transaction PIN must be exactly 4 digits' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { transactionPinHash: true },
  });

  if (!user?.transactionPinHash) {
    return {
      ok: false,
      code: 403,
      message: 'Transaction PIN not set. Please set your PIN in Profile → Security before making transactions.',
    };
  }

  const match = await compareTransactionPin(String(pin), user.transactionPinHash);
  if (!match) {
    return { ok: false, code: 401, message: 'Incorrect transaction PIN' };
  }

  return { ok: true };
};

module.exports = {
  PIN_REGEX,
  isValidPinFormat,
  hashTransactionPin,
  compareTransactionPin,
  requireTransactionPin,
  verifyTransactionPin,
};
