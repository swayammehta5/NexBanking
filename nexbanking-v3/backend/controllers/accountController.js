const Account     = require('../models/Account');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError }       = require('../utils/apiResponse');
const { generateAccountStats, groupTransactionsByMonth } = require('../utils/bankingUtils');

/**
 * @desc  Get account details
 * @route GET /api/account
 */
const getAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');
    sendSuccess(res, 200, 'Account retrieved', { account });
  } catch {
    sendError(res, 500, 'Failed to retrieve account');
  }
};

/**
 * @desc  Get account stats + chart data for dashboard
 * @route GET /api/account/stats
 */
const getAccountStats = async (req, res) => {
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');

    const transactions = await Transaction.find({ accountId: account._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const stats     = generateAccountStats(account, transactions);
    const chartData = groupTransactionsByMonth(transactions);

    sendSuccess(res, 200, 'Account stats retrieved', { stats, chartData });
  } catch {
    sendError(res, 500, 'Failed to retrieve stats');
  }
};

module.exports = { getAccount, getAccountStats };
