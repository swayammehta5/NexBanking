const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { serialize } = require('../utils/serializers');

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    sendSuccess(res, 200, 'Notifications retrieved', {
      notifications: serialize(notifications),
      unreadCount,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve notifications');
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    sendSuccess(res, 200, 'Unread count', { count });
  } catch {
    sendError(res, 500, 'Failed to get unread count');
  }
};

const markAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });
    sendSuccess(res, 200, 'Marked as read');
  } catch {
    sendError(res, 500, 'Failed to mark as read');
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    sendSuccess(res, 200, 'All notifications marked as read');
  } catch {
    sendError(res, 500, 'Failed to mark all as read');
  }
};

const deleteNotification = async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    sendSuccess(res, 200, 'Notification deleted');
  } catch {
    sendError(res, 500, 'Failed to delete notification');
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
