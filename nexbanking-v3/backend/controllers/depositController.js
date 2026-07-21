const Account     = require('../models/Account');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError }                   = require('../utils/apiResponse');
const { calculateNewBalance, transactionQueue }    = require('../utils/bankingUtils');
const { analyseTransaction }                       = require('../services/fraudDetectionService');
const { createNotification }                       = require('../services/notificationService');
const { logActivity }                              = require('../services/activityLogService');
const logger = require('../utils/logger');

const deposit = async (req, res) => {
  const { amount, description } = req.body;
  const numericAmount = parseFloat(amount);
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account)          return sendError(res, 404, 'Account not found');
    if (!account.isActive) return sendError(res, 400, 'Account is inactive');

    const fraud        = await analyseTransaction({ type: 'deposit', amount: numericAmount }, account);
    const balanceBefore = account.balance;
    const balanceAfter  = calculateNewBalance(balanceBefore, numericAmount, 'credit');

    const transaction = await Transaction.create({
      userId: req.user._id, accountId: account._id,
      type: 'deposit', amount: numericAmount, balanceBefore, balanceAfter,
      description: description || `Deposit of $${numericAmount.toFixed(2)}`,
      status: fraud.isSuspicious ? 'suspicious' : 'completed',
      isSuspicious: fraud.isSuspicious, fraudFlags: fraud.flags,
    });

    account.balance        = balanceAfter;
    account.totalDeposited += numericAmount;
    await account.save();

    transactionQueue.finalize(transaction.transactionId, true);

    await createNotification(req.user._id, 'credit', [numericAmount, balanceAfter], { transactionId: transaction.transactionId });
    if (fraud.isSuspicious) await createNotification(req.user._id, 'fraud_alert', [numericAmount, fraud.flags.join('; ')]);
    await logActivity(req.user._id, 'deposit', `Deposited $${numericAmount}`, {}, req);

    logger.info(`Deposit: ${req.user.email} +$${numericAmount}`);
    sendSuccess(res, 200, `Successfully deposited $${numericAmount.toFixed(2)}`, { transaction, newBalance: balanceAfter });
  } catch (error) {
    logger.error(`Deposit error: ${error.message}`);
    sendError(res, 500, 'Deposit failed. Please try again.');
  }
};

module.exports = { deposit };
