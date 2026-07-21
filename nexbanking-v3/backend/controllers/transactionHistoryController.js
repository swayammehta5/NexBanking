const Account     = require('../models/Account');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { matchesSearch }          = require('../utils/bankingUtils');

/**
 * @desc  Get transaction history with search / filter / pagination
 * @route GET /api/transactions
 */
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search, startDate, endDate } = req.query;

    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');

    const filter = { accountId: account._id };
    if (type && type !== 'all') filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(endDate);
    }

    let transactions = await Transaction.find(filter).sort({ createdAt: -1 }).lean();

    if (search) transactions = transactions.filter(t => matchesSearch(t, search));

    const total     = transactions.length;
    const skip      = (parseInt(page) - 1) * parseInt(limit);
    const paginated = transactions.slice(skip, skip + parseInt(limit));

    sendSuccess(res, 200, 'Transactions retrieved', {
      transactions: paginated,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve transactions');
  }
};

/**
 * @desc  Get last 5 transactions for dashboard
 * @route GET /api/transactions/recent
 */
const getRecentTransactions = async (req, res) => {
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');

    const transactions = await Transaction.find({ accountId: account._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    sendSuccess(res, 200, 'Recent transactions retrieved', { transactions });
  } catch {
    sendError(res, 500, 'Failed to retrieve recent transactions');
  }
};

module.exports = { getTransactions, getRecentTransactions };
