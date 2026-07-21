const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/** GET /api/notifications */
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    sendSuccess(res, 200, 'Notifications retrieved', {
      notifications,
      unreadCount,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch { sendError(res, 500, 'Failed to retrieve notifications'); }
};

/** GET /api/notifications/unread-count */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    sendSuccess(res, 200, 'Unread count', { count });
  } catch { sendError(res, 500, 'Failed to get unread count'); }
};

/** PATCH /api/notifications/:id/read */
const markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
    sendSuccess(res, 200, 'Marked as read');
  } catch { sendError(res, 500, 'Failed to mark as read'); }
};

/** PATCH /api/notifications/read-all */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    sendSuccess(res, 200, 'All notifications marked as read');
  } catch { sendError(res, 500, 'Failed to mark all as read'); }
};

/** DELETE /api/notifications/:id */
const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    sendSuccess(res, 200, 'Notification deleted');
  } catch { sendError(res, 500, 'Failed to delete notification'); }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
