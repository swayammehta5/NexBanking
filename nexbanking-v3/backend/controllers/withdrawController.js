const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  hasSufficientFunds,
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

const withdraw = async (req, res) => {
  const { amount, description } = req.body;
  const numericAmount = parseFloat(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return sendError(res, 400, 'Amount must be a positive number');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock account row for atomic balance check and debit
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
      if (!hasSufficientFunds(account.balance, numericAmount)) {
        const err = new Error(
          `Insufficient funds. Available: $${toNumber(account.balance).toFixed(2)}`
        );
        err.statusCode = 400;
        throw err;
      }

      const fraud = await analyseTransaction(
        { type: 'withdrawal', amount: numericAmount },
        account
      );
      const balanceBefore = toNumber(account.balance);
      const balanceAfter = calculateNewBalance(balanceBefore, numericAmount, 'debit');

      const transaction = await tx.transaction.create({
        data: {
          transactionId: generateTransactionId(),
          userId: req.user.id,
          accountId: account.id,
          type: 'withdrawal',
          amount: toDecimal(numericAmount),
          balanceBefore: toDecimal(balanceBefore),
          balanceAfter: toDecimal(balanceAfter),
          description: description || `Withdrawal of $${numericAmount.toFixed(2)}`,
          status: fraud.isSuspicious ? 'suspicious' : 'completed',
          isSuspicious: fraud.isSuspicious,
          fraudFlags: fraud.flags,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: {
          balance: toDecimal(balanceAfter),
          totalWithdrawn: toDecimal(toNumber(account.totalWithdrawn) + numericAmount),
        },
      });

      return { transaction, balanceAfter, fraud };
    });

    transactionQueue.finalize(result.transaction.transactionId, true);
    await createNotification(
      req.user.id,
      'debit',
      [numericAmount, result.balanceAfter],
      { transactionId: result.transaction.transactionId }
    );
    if (result.fraud.isSuspicious) {
      await createNotification(req.user.id, 'fraud_alert', [
        numericAmount,
        result.fraud.flags.join('; '),
      ]);
    }
    await logActivity(req.user.id, 'withdrawal', `Withdrew $${numericAmount}`, {}, req);

    logger.info(`Withdrawal: ${req.user.email} -$${numericAmount}`);
    sendSuccess(res, 200, `Successfully withdrew $${numericAmount.toFixed(2)}`, {
      transaction: serialize(result.transaction),
      newBalance: result.balanceAfter,
    });
  } catch (error) {
    if (error.statusCode) return sendError(res, error.statusCode, error.message);
    logger.error(`Withdrawal error: ${error.message}`);
    sendError(res, 500, 'Withdrawal failed. Please try again.');
  }
};

module.exports = { withdraw };
