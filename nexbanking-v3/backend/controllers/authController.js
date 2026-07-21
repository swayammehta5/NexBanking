const User    = require('../models/User');
const Account = require('../models/Account');
const { createSendToken } = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');
const { logActivity }        = require('../services/activityLogService');
const logger = require('../utils/logger');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    if (await User.findOne({ email })) return sendError(res, 400, 'An account with this email already exists');
    const user    = await User.create({ firstName, lastName, email, password, phone });
    const account = await Account.create({ userId: user._id });
    await logActivity(user._id, 'login', 'Account created', {}, req);
    logger.info(`New user registered: ${user.email}`);
    createSendToken(user, account, 201, res);
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    sendError(res, 500, 'Registration failed. Please try again.');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) return sendError(res, 401, 'Invalid email or password');
    if (!user.isActive) return sendError(res, 401, 'Account deactivated. Contact support.');
    if (user.isFrozen) return sendError(res, 401, 'Account is frozen. Contact support.');

    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    user.lastLogin = new Date();
    user.loginHistory.push({ ip, userAgent: req.headers['user-agent'] || '' });
    if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(-20);
    await user.save({ validateBeforeSave: false });

    const account = await Account.findOne({ userId: user._id });
    await createNotification(user._id, 'new_login', [ip]);
    await logActivity(user._id, 'login', `Login from ${ip}`, { ip }, req);
    logger.info(`User logged in: ${user.email}`);
    createSendToken(user, account, 200, res);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    sendError(res, 500, 'Login failed. Please try again.');
  }
};

const getMe = async (req, res) => {
  try {
    const user    = await User.findById(req.user._id);
    const account = await Account.findOne({ userId: req.user._id });
    sendSuccess(res, 200, 'User profile retrieved', { user, account });
  } catch { sendError(res, 500, 'Failed to retrieve profile'); }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { firstName, lastName, phone }, { new: true, runValidators: true });
    await logActivity(req.user._id, 'profile_update', 'Profile updated', {}, req);
    sendSuccess(res, 200, 'Profile updated successfully', { user });
  } catch { sendError(res, 500, 'Profile update failed'); }
};

module.exports = { register, login, getMe, updateProfile };
