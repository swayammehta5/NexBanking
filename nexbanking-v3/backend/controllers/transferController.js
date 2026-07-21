const Account     = require('../models/Account');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError }                                 = require('../utils/apiResponse');
const { validateTransfer, prepareTransfer, checkDailyTransferLimit, transactionQueue } = require('../utils/bankingUtils');
const { analyseTransaction } = require('../services/fraudDetectionService');
const { createNotification } = require('../services/notificationService');
const { logActivity }        = require('../services/activityLogService');
const logger = require('../utils/logger');

const transfer = async (req, res) => {
  const { amount, recipientAccountNumber, description, beneficiaryId } = req.body;
  const numericAmount = parseFloat(amount);
  try {
    const senderAccount = await Account.findOne({ userId: req.user._id });
    if (!senderAccount)          return sendError(res, 404, 'Sender account not found');
    if (!senderAccount.isActive) return sendError(res, 400, 'Your account is inactive');

    const recipientAccount = await Account.findOne({ accountNumber: recipientAccountNumber });
    if (!recipientAccount)          return sendError(res, 404, 'Recipient account not found.');
    if (!recipientAccount.isActive) return sendError(res, 400, 'Recipient account is inactive');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaysTxns = await Transaction.find({ accountId: senderAccount._id, type: 'transfer_out', createdAt: { $gte: today } });
    const dailyLimitCheck = checkDailyTransferLimit(todaysTxns, numericAmount, senderAccount.dailyTransferLimit);

    const validation = validateTransfer({
      senderBalance: senderAccount.balance, amount: numericAmount,
      recipientAccountNumber, senderAccountNumber: senderAccount.accountNumber, dailyLimitCheck,
    });
    if (!validation.valid) return sendError(res, 400, validation.reason);

    const fraud = await analyseTransaction({ type: 'transfer_out', amount: numericAmount }, senderAccount);
    const { newSenderBalance, newRecipientBalance } = prepareTransfer({
      senderBalance: senderAccount.balance, recipientBalance: recipientAccount.balance, amount: numericAmount,
    });

    const txnDesc = description || `Transfer to ${recipientAccountNumber}`;
    const [senderTxn] = await Promise.all([
      Transaction.create({
        userId: req.user._id, accountId: senderAccount._id,
        type: 'transfer_out', amount: numericAmount,
        balanceBefore: senderAccount.balance, balanceAfter: newSenderBalance,
        description: txnDesc, recipientAccountNumber,
        beneficiaryId: beneficiaryId || null,
        status: fraud.isSuspicious ? 'suspicious' : 'completed',
        isSuspicious: fraud.isSuspicious, fraudFlags: fraud.flags,
      }),
      Transaction.create({
        userId: recipientAccount.userId, accountId: recipientAccount._id,
        type: 'transfer_in', amount: numericAmount,
        balanceBefore: recipientAccount.balance, balanceAfter: newRecipientBalance,
        description: `Transfer from ${senderAccount.accountNumber}`,
        senderAccountNumber: senderAccount.accountNumber, status: 'completed',
      }),
    ]);

    await Promise.all([
      Account.findByIdAndUpdate(senderAccount._id,    { balance: newSenderBalance,    $inc: { totalWithdrawn: numericAmount } }),
      Account.findByIdAndUpdate(recipientAccount._id, { balance: newRecipientBalance, $inc: { totalDeposited: numericAmount } }),
    ]);

    transactionQueue.finalize(senderTxn.transactionId, true);
    await createNotification(req.user._id, 'transfer', [numericAmount, recipientAccountNumber]);
    await createNotification(recipientAccount.userId, 'credit', [numericAmount, newRecipientBalance]);
    if (fraud.isSuspicious) await createNotification(req.user._id, 'fraud_alert', [numericAmount, fraud.flags.join('; ')]);
    await logActivity(req.user._id, 'transfer', `Transferred $${numericAmount} to ${recipientAccountNumber}`, {}, req);

    logger.info(`Transfer: ${req.user.email} → ${recipientAccountNumber} $${numericAmount}`);
    sendSuccess(res, 200, `Successfully transferred $${numericAmount.toFixed(2)}`, {
      transaction: senderTxn, newBalance: newSenderBalance, recipientAccountNumber,
    });
  } catch (error) {
    logger.error(`Transfer error: ${error.message}`);
    sendError(res, 500, 'Transfer failed. Please try again.');
  }
};

module.exports = { transfer };
