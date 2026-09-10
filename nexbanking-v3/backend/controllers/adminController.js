const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logActivity } = require('../services/activityLogService');
const { serialize, toNumber } = require('../utils/serializers');

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      frozenUsers,
      totalTransactions,
      monthlyTxns,
      dailyTxns,
      accountAgg,
      recentTxns,
      suspiciousTxns,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isFrozen: true } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.transaction.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.account.aggregate({
        _sum: { balance: true, totalDeposited: true, totalWithdrawn: true },
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.transaction.count({ where: { isSuspicious: true } }),
    ]);

    const stats = {
      totalBalance: toNumber(accountAgg._sum.balance) || 0,
      totalDeposited: toNumber(accountAgg._sum.totalDeposited) || 0,
      totalWithdrawn: toNumber(accountAgg._sum.totalWithdrawn) || 0,
    };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const chartTxns = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        type: { in: ['deposit', 'withdrawal', 'transfer_out'] },
      },
      select: { createdAt: true, type: true, amount: true },
    });

    const chartMap = {};
    for (const t of chartTxns) {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${t.type}`;
      if (!chartMap[key]) {
        chartMap[key] = {
          _id: { year: d.getFullYear(), month: d.getMonth() + 1, type: t.type },
          total: 0,
          count: 0,
        };
      }
      chartMap[key].total += toNumber(t.amount);
      chartMap[key].count += 1;
    }
    const monthlyChart = Object.values(chartMap).sort(
      (a, b) => a._id.year - b._id.year || a._id.month - b._id.month
    );

    const recentSerialized = recentTxns.map((t) => {
      const s = serialize(t);
      s.userId = t.user
        ? {
            _id: t.user.id,
            id: t.user.id,
            firstName: t.user.firstName,
            lastName: t.user.lastName,
            email: t.user.email,
          }
        : t.userId;
      delete s.user;
      return s;
    });

    sendSuccess(res, 200, 'Admin dashboard stats', {
      users: { total: totalUsers, active: activeUsers, frozen: frozenUsers },
      transactions: {
        total: totalTransactions,
        monthly: monthlyTxns,
        daily: dailyTxns,
        suspicious: suspiciousTxns,
      },
      financials: stats,
      recentTxns: recentSerialized,
      monthlyChart,
    });
  } catch {
    sendError(res, 500, 'Failed to load admin stats');
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (status === 'frozen') where.isFrozen = true;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          isFrozen: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          account: true,
        },
      }),
    ]);

    const enriched = users.map((u) => {
      const { account, ...rest } = u;
      return {
        ...serialize(rest),
        account: serialize(account),
      };
    });

    sendSuccess(res, 200, 'Users retrieved', {
      users: enriched,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve users');
  }
};

const getUserDetail = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isFrozen: true,
        lastLogin: true,
        loginHistory: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) return sendError(res, 404, 'User not found');

    const account = await prisma.account.findUnique({ where: { userId: user.id } });
    const txns = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    sendSuccess(res, 200, 'User detail', {
      user: serialize(user),
      account: serialize(account),
      recentTransactions: serialize(txns),
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve user');
  }
};

const setUserStatus = async (req, res) => {
  try {
    const { action } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return sendError(res, 404, 'User not found');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot modify admin users');

    const updates = {
      activate: { isActive: true, isFrozen: false },
      deactivate: { isActive: false, isFrozen: false },
      freeze: { isFrozen: true },
      unfreeze: { isFrozen: false },
    };
    if (!updates[action]) return sendError(res, 400, 'Invalid action');

    await prisma.user.update({ where: { id: req.params.id }, data: updates[action] });

    const logAction =
      action === 'freeze'
        ? 'admin_freeze'
        : action === 'unfreeze'
          ? 'admin_unfreeze'
          : 'admin_deactivate';
    await logActivity(
      req.user.id,
      logAction,
      `Admin ${action}d user ${user.email}`,
      { targetUserId: user.id },
      req
    );

    sendSuccess(res, 200, `User ${action}d successfully`);
  } catch {
    sendError(res, 500, 'Failed to update user status');
  }
};

const adminResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters');
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return sendError(res, 404, 'User not found');

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });
    await logActivity(
      req.user.id,
      'admin_password_reset',
      `Admin reset password for ${user.email}`,
      {},
      req
    );
    sendSuccess(res, 200, 'Password reset successfully');
  } catch {
    sendError(res, 500, 'Failed to reset password');
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return sendError(res, 404, 'User not found');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot delete admin users');

    await prisma.user.delete({ where: { id: req.params.id } });
    await logActivity(
      req.user.id,
      'admin_deactivate',
      `Admin deleted user ${user.email}`,
      {},
      req
    );
    sendSuccess(res, 200, 'User deleted');
  } catch {
    sendError(res, 500, 'Failed to delete user');
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search, suspicious } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (suspicious === 'true') where.isSuspicious = true;
    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { recipientAccountNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
    ]);

    const mapped = transactions.map((t) => {
      const s = serialize(t);
      s.userId = t.user
        ? {
            _id: t.user.id,
            id: t.user.id,
            firstName: t.user.firstName,
            lastName: t.user.lastName,
            email: t.user.email,
          }
        : t.userId;
      delete s.user;
      return s;
    });

    sendSuccess(res, 200, 'Transactions retrieved', {
      transactions: mapped,
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

const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
    ]);

    const mapped = logs.map((l) => {
      const s = serialize(l);
      s.userId = l.user
        ? {
            _id: l.user.id,
            id: l.user.id,
            firstName: l.user.firstName,
            lastName: l.user.lastName,
            email: l.user.email,
          }
        : l.userId;
      delete s.user;
      return s;
    });

    sendSuccess(res, 200, 'Activity logs retrieved', {
      logs: mapped,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve logs');
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserDetail,
  setUserStatus,
  adminResetPassword,
  deleteUser,
  getAllTransactions,
  getActivityLogs,
};
