const User        = require('../models/User');
const Account     = require('../models/Account');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logActivity }            = require('../services/activityLogService');
const bcrypt = require('bcryptjs');

// ── Dashboard Analytics ───────────────────────────────────────────

const getDashboardStats = async (req, res) => {
  try {
    const now      = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers, activeUsers, frozenUsers,
      totalTransactions, monthlyTxns, dailyTxns,
      accountStats, recentTxns, suspiciousTxns,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isFrozen: true }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ createdAt: { $gte: monthStart } }),
      Transaction.countDocuments({ createdAt: { $gte: dayStart } }),
      Account.aggregate([{ $group: { _id: null, totalBalance: { $sum: '$balance' }, totalDeposited: { $sum: '$totalDeposited' }, totalWithdrawn: { $sum: '$totalWithdrawn' } } }]),
      Transaction.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'firstName lastName email').lean(),
      Transaction.countDocuments({ isSuspicious: true }),
    ]);

    const stats = accountStats[0] || { totalBalance: 0, totalDeposited: 0, totalWithdrawn: 0 };

    // Monthly revenue chart (last 6 months)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyChart = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, type: { $in: ['deposit', 'withdrawal', 'transfer_out'] } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, type: '$type' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    sendSuccess(res, 200, 'Admin dashboard stats', {
      users:        { total: totalUsers, active: activeUsers, frozen: frozenUsers },
      transactions: { total: totalTransactions, monthly: monthlyTxns, daily: dailyTxns, suspicious: suspiciousTxns },
      financials:   stats,
      recentTxns,
      monthlyChart,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load admin stats');
  }
};

// ── User Management ───────────────────────────────────────────────

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const filter = {};
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ firstName: q }, { lastName: q }, { email: q }];
    }
    if (status === 'active')   filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'frozen')   filter.isFrozen = true;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).select('-password -loginHistory').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean();

    // Attach account info
    const userIds  = users.map(u => u._id);
    const accounts = await Account.find({ userId: { $in: userIds } }).lean();
    const accMap   = Object.fromEntries(accounts.map(a => [a.userId.toString(), a]));

    const enriched = users.map(u => ({ ...u, account: accMap[u._id.toString()] || null }));
    sendSuccess(res, 200, 'Users retrieved', { users: enriched, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch { sendError(res, 500, 'Failed to retrieve users'); }
};

const getUserDetail = async (req, res) => {
  try {
    const user    = await User.findById(req.params.id).select('-password').lean();
    if (!user) return sendError(res, 404, 'User not found');
    const account = await Account.findOne({ userId: user._id }).lean();
    const txns    = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean();
    sendSuccess(res, 200, 'User detail', { user, account, recentTransactions: txns });
  } catch { sendError(res, 500, 'Failed to retrieve user'); }
};

const setUserStatus = async (req, res) => {
  try {
    const { action } = req.body; // activate | deactivate | freeze | unfreeze
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot modify admin users');

    const updates = {
      activate:   { isActive: true,  isFrozen: false },
      deactivate: { isActive: false, isFrozen: false },
      freeze:     { isFrozen: true },
      unfreeze:   { isFrozen: false },
    };
    if (!updates[action]) return sendError(res, 400, 'Invalid action');
    await User.findByIdAndUpdate(req.params.id, updates[action]);

    const logAction = action === 'freeze' ? 'admin_freeze' : action === 'unfreeze' ? 'admin_unfreeze' : 'admin_deactivate';
    await logActivity(req.user._id, logAction, `Admin ${action}d user ${user.email}`, { targetUserId: user._id }, req);

    sendSuccess(res, 200, `User ${action}d successfully`);
  } catch { sendError(res, 500, 'Failed to update user status'); }
};

const adminResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return sendError(res, 400, 'Password must be at least 6 characters');
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found');
    user.password = newPassword;
    await user.save();
    await logActivity(req.user._id, 'admin_password_reset', `Admin reset password for ${user.email}`, {}, req);
    sendSuccess(res, 200, 'Password reset successfully');
  } catch { sendError(res, 500, 'Failed to reset password'); }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot delete admin users');
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Account.deleteMany({ userId: req.params.id }),
      Transaction.deleteMany({ userId: req.params.id }),
    ]);
    await logActivity(req.user._id, 'admin_deactivate', `Admin deleted user ${user.email}`, {}, req);
    sendSuccess(res, 200, 'User deleted');
  } catch { sendError(res, 500, 'Failed to delete user'); }
};

// ── Transaction Management ────────────────────────────────────────

const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search, suspicious } = req.query;
    const filter = {};
    if (type)        filter.type   = type;
    if (status)      filter.status = status;
    if (suspicious === 'true') filter.isSuspicious = true;
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ transactionId: q }, { description: q }, { recipientAccountNumber: q }];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();

    sendSuccess(res, 200, 'Transactions retrieved', {
      transactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch { sendError(res, 500, 'Failed to retrieve transactions'); }
};

// ── Activity Logs ─────────────────────────────────────────────────

const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await ActivityLog.countDocuments(filter);
    const logs  = await ActivityLog.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
    sendSuccess(res, 200, 'Activity logs retrieved', { logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch { sendError(res, 500, 'Failed to retrieve logs'); }
};

module.exports = { getDashboardStats, getAllUsers, getUserDetail, setUserStatus, adminResetPassword, deleteUser, getAllTransactions, getActivityLogs };
