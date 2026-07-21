const Account     = require('../models/Account');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError }                           = require('../utils/apiResponse');
const { hasSufficientFunds, calculateNewBalance, transactionQueue } = require('../utils/bankingUtils');
const { analyseTransaction }  = require('../services/fraudDetectionService');
const { createNotification }  = require('../services/notificationService');
const { logActivity }         = require('../services/activityLogService');
const logger = require('../utils/logger');

const withdraw = async (req, res) => {
  const { amount, description } = req.body;
  const numericAmount = parseFloat(amount);
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account)          return sendError(res, 404, 'Account not found');
    if (!account.isActive) return sendError(res, 400, 'Account is inactive');
    if (!hasSufficientFunds(account.balance, numericAmount))
      return sendError(res, 400, `Insufficient funds. Available: $${account.balance.toFixed(2)}`);

    const fraud        = await analyseTransaction({ type: 'withdrawal', amount: numericAmount }, account);
    const balanceBefore = account.balance;
    const balanceAfter  = calculateNewBalance(balanceBefore, numericAmount, 'debit');

    const transaction = await Transaction.create({
      userId: req.user._id, accountId: account._id,
      type: 'withdrawal', amount: numericAmount, balanceBefore, balanceAfter,
      description: description || `Withdrawal of $${numericAmount.toFixed(2)}`,
      status: fraud.isSuspicious ? 'suspicious' : 'completed',
      isSuspicious: fraud.isSuspicious, fraudFlags: fraud.flags,
    });

    account.balance        = balanceAfter;
    account.totalWithdrawn += numericAmount;
    await account.save();

    transactionQueue.finalize(transaction.transactionId, true);
    await createNotification(req.user._id, 'debit', [numericAmount, balanceAfter], { transactionId: transaction.transactionId });
    if (fraud.isSuspicious) await createNotification(req.user._id, 'fraud_alert', [numericAmount, fraud.flags.join('; ')]);
    await logActivity(req.user._id, 'withdrawal', `Withdrew $${numericAmount}`, {}, req);

    logger.info(`Withdrawal: ${req.user.email} -$${numericAmount}`);
    sendSuccess(res, 200, `Successfully withdrew $${numericAmount.toFixed(2)}`, { transaction, newBalance: balanceAfter });
  } catch (error) {
    logger.error(`Withdrawal error: ${error.message}`);
    sendError(res, 500, 'Withdrawal failed. Please try again.');
  }
};

module.exports = { withdraw };
