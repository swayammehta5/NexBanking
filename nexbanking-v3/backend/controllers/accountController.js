const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { generateAccountStats, groupTransactionsByMonth } = require('../utils/bankingUtils');
const { serialize } = require('../utils/serializers');

const getAccount = async (req, res) => {
  try {
    const account = await prisma.account.findUnique({ where: { userId: req.user.id } });
    if (!account) return sendError(res, 404, 'Account not found');
    sendSuccess(res, 200, 'Account retrieved', { account: serialize(account) });
  } catch {
    sendError(res, 500, 'Failed to retrieve account');
  }
};

const getAccountStats = async (req, res) => {
  try {
    const account = await prisma.account.findUnique({ where: { userId: req.user.id } });
    if (!account) return sendError(res, 404, 'Account not found');

    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = generateAccountStats(account, transactions);
    const chartData = groupTransactionsByMonth(transactions);

    sendSuccess(res, 200, 'Account stats retrieved', { stats, chartData });
  } catch {
    sendError(res, 500, 'Failed to retrieve stats');
  }
};

module.exports = { getAccount, getAccountStats };
