const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { matchesSearch } = require('../utils/bankingUtils');
const { serialize } = require('../utils/serializers');

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search, startDate, endDate } = req.query;

    const account = await prisma.account.findUnique({ where: { userId: req.user.id } });
    if (!account) return sendError(res, 404, 'Account not found');

    const where = { accountId: account.id };
    if (type && type !== 'all') where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    let transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (search) transactions = transactions.filter((t) => matchesSearch(t, search));

    const total = transactions.length;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const paginated = transactions.slice(skip, skip + parseInt(limit, 10));

    sendSuccess(res, 200, 'Transactions retrieved', {
      transactions: serialize(paginated),
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve transactions');
  }
};

const getRecentTransactions = async (req, res) => {
  try {
    const account = await prisma.account.findUnique({ where: { userId: req.user.id } });
    if (!account) return sendError(res, 404, 'Account not found');

    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    sendSuccess(res, 200, 'Recent transactions retrieved', {
      transactions: serialize(transactions),
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve recent transactions');
  }
};

module.exports = { getTransactions, getRecentTransactions };
