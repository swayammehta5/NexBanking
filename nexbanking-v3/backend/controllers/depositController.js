const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  calculateNewBalance,
  transactionQueue,
} = require('../utils/bankingUtils');
const { analyseTransaction } = require('../services/fraudDetectionService');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');
const {
  serialize,
  toNumber,
  toDecimal,
  generateTransactionId,
} = require('../utils/serializers');
const logger = require('../utils/logger');

const deposit = async (req, res) => {
  const { amount, description } = req.body;
  const numericAmount = parseFloat(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return sendError(res, 400, 'Amount must be a positive number');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock account row for atomic balance update
      await tx.$queryRaw`
        SELECT id FROM accounts WHERE "userId" = ${req.user.id} FOR UPDATE
      `;
      const account = await tx.account.findUnique({ where: { userId: req.user.id } });
      if (!account) {
        const err = new Error('Account not found');
        err.statusCode = 404;
        throw err;
      }
      if (!account.isActive) {
        const err = new Error('Account is inactive');
        err.statusCode = 400;
        throw err;
      }

      const fraud = await analyseTransaction({ type: 'deposit', amount: numericAmount }, account);
      const balanceBefore = toNumber(account.balance);
      const balanceAfter = calculateNewBalance(balanceBefore, numericAmount, 'credit');

      const transaction = await tx.transaction.create({
        data: {
          transactionId: generateTransactionId(),
          userId: req.user.id,
          accountId: account.id,
          type: 'deposit',
          amount: toDecimal(numericAmount),
          balanceBefore: toDecimal(balanceBefore),
          balanceAfter: toDecimal(balanceAfter),
          description: description || `Deposit of $${numericAmount.toFixed(2)}`,
          status: fraud.isSuspicious ? 'suspicious' : 'completed',
          isSuspicious: fraud.isSuspicious,
          fraudFlags: fraud.flags,
        },
      });

      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: {
          balance: toDecimal(balanceAfter),
          totalDeposited: toDecimal(toNumber(account.totalDeposited) + numericAmount),
        },
      });

      return { transaction, balanceAfter, fraud, updatedAccount };
    });

    transactionQueue.finalize(result.transaction.transactionId, true);
    await createNotification(
      req.user.id,
      'credit',
      [numericAmount, result.balanceAfter],
      { transactionId: result.transaction.transactionId }
    );
    if (result.fraud.isSuspicious) {
      await createNotification(req.user.id, 'fraud_alert', [
        numericAmount,
        result.fraud.flags.join('; '),
      ]);
    }
    await logActivity(req.user.id, 'deposit', `Deposited $${numericAmount}`, {}, req);

    logger.info(`Deposit: ${req.user.email} +$${numericAmount}`);
    sendSuccess(res, 200, `Successfully deposited $${numericAmount.toFixed(2)}`, {
      transaction: serialize(result.transaction),
      newBalance: result.balanceAfter,
    });
  } catch (error) {
    if (error.statusCode) return sendError(res, error.statusCode, error.message);
    logger.error(`Deposit error: ${error.message}`);
    sendError(res, 500, 'Deposit failed. Please try again.');
  }
};

module.exports = { deposit };
