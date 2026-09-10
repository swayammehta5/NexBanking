const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  validateTransfer,
  prepareTransfer,
  checkDailyTransferLimit,
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

const transfer = async (req, res) => {
  const { amount, recipientAccountNumber, description, beneficiaryId } = req.body;
  const numericAmount = parseFloat(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return sendError(res, 400, 'Amount must be a positive number');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find sender account initial record
      const senderAccountPre = await tx.account.findUnique({ where: { userId: req.user.id } });
      if (!senderAccountPre) {
        const err = new Error('Sender account not found');
        err.statusCode = 404;
        throw err;
      }
      if (!senderAccountPre.isActive) {
        const err = new Error('Your account is inactive');
        err.statusCode = 400;
        throw err;
      }
      if (senderAccountPre.accountNumber === recipientAccountNumber) {
        const err = new Error('Cannot transfer to your own account');
        err.statusCode = 400;
        throw err;
      }

      // Lock accounts in deterministic sorted order to prevent deadlocks
      const accountsToLock = [senderAccountPre.accountNumber, recipientAccountNumber].sort();
      for (const accNum of accountsToLock) {
        await tx.$queryRaw`
          SELECT id FROM accounts WHERE "accountNumber" = ${accNum} FOR UPDATE
        `;
      }

      const senderAccount = await tx.account.findUnique({ where: { userId: req.user.id } });
      const recipientAccount = await tx.account.findUnique({
        where: { accountNumber: recipientAccountNumber },
      });
      if (!recipientAccount) {
        const err = new Error('Recipient account not found.');
        err.statusCode = 404;
        throw err;
      }
      if (!recipientAccount.isActive) {
        const err = new Error('Recipient account is inactive');
        err.statusCode = 400;
        throw err;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysTxns = await tx.transaction.findMany({
        where: {
          accountId: senderAccount.id,
          type: 'transfer_out',
          createdAt: { gte: today },
        },
      });
      const dailyLimitCheck = checkDailyTransferLimit(
        todaysTxns,
        numericAmount,
        senderAccount.dailyTransferLimit
      );

      const validation = validateTransfer({
        senderBalance: senderAccount.balance,
        amount: numericAmount,
        recipientAccountNumber,
        senderAccountNumber: senderAccount.accountNumber,
        dailyLimitCheck,
      });
      if (!validation.valid) {
        const err = new Error(validation.reason);
        err.statusCode = 400;
        throw err;
      }

      // Fraud analysis uses current sender state (outside locks is fine for flags)
      const fraud = await analyseTransaction(
        { type: 'transfer_out', amount: numericAmount },
        senderAccount
      );

      const { newSenderBalance, newRecipientBalance } = prepareTransfer({
        senderBalance: senderAccount.balance,
        recipientBalance: recipientAccount.balance,
        amount: numericAmount,
      });

      const txnDesc = description || `Transfer to ${recipientAccountNumber}`;

      let validBeneficiaryId = null;
      if (beneficiaryId) {
        const ben = await tx.beneficiary.findFirst({
          where: { id: beneficiaryId, userId: req.user.id },
        });
        if (ben) validBeneficiaryId = ben.id;
      }

      const senderTxn = await tx.transaction.create({
        data: {
          transactionId: generateTransactionId(),
          userId: req.user.id,
          accountId: senderAccount.id,
          type: 'transfer_out',
          amount: toDecimal(numericAmount),
          balanceBefore: toDecimal(toNumber(senderAccount.balance)),
          balanceAfter: toDecimal(newSenderBalance),
          description: txnDesc,
          recipientAccountNumber,
          beneficiaryId: validBeneficiaryId,
          status: fraud.isSuspicious ? 'suspicious' : 'completed',
          isSuspicious: fraud.isSuspicious,
          fraudFlags: fraud.flags,
        },
      });

      await tx.transaction.create({
        data: {
          transactionId: generateTransactionId(),
          userId: recipientAccount.userId,
          accountId: recipientAccount.id,
          type: 'transfer_in',
          amount: toDecimal(numericAmount),
          balanceBefore: toDecimal(toNumber(recipientAccount.balance)),
          balanceAfter: toDecimal(newRecipientBalance),
          description: `Transfer from ${senderAccount.accountNumber}`,
          senderAccountNumber: senderAccount.accountNumber,
          status: 'completed',
        },
      });

      await tx.account.update({
        where: { id: senderAccount.id },
        data: {
          balance: toDecimal(newSenderBalance),
          totalWithdrawn: toDecimal(toNumber(senderAccount.totalWithdrawn) + numericAmount),
        },
      });

      await tx.account.update({
        where: { id: recipientAccount.id },
        data: {
          balance: toDecimal(newRecipientBalance),
          totalDeposited: toDecimal(toNumber(recipientAccount.totalDeposited) + numericAmount),
        },
      });

      return {
        senderTxn,
        newSenderBalance,
        newRecipientBalance,
        fraud,
        recipientUserId: recipientAccount.userId,
      };
    });

    transactionQueue.finalize(result.senderTxn.transactionId, true);
    await createNotification(req.user.id, 'transfer', [numericAmount, recipientAccountNumber]);
    await createNotification(result.recipientUserId, 'credit', [
      numericAmount,
      result.newRecipientBalance,
    ]);
    if (result.fraud.isSuspicious) {
      await createNotification(req.user.id, 'fraud_alert', [
        numericAmount,
        result.fraud.flags.join('; '),
      ]);
    }
    await logActivity(
      req.user.id,
      'transfer',
      `Transferred $${numericAmount} to ${recipientAccountNumber}`,
      {},
      req
    );

    logger.info(`Transfer: ${req.user.email} → ${recipientAccountNumber} $${numericAmount}`);
    sendSuccess(res, 200, `Successfully transferred $${numericAmount.toFixed(2)}`, {
      transaction: serialize(result.senderTxn),
      newBalance: result.newSenderBalance,
      recipientAccountNumber,
    });
  } catch (error) {
    if (error.statusCode) return sendError(res, error.statusCode, error.message);
    logger.error(`Transfer error: ${error.message}`);
    sendError(res, 500, 'Transfer failed. Please try again.');
  }
};

module.exports = { transfer };
