import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * useNotifications — polls unread count + fetches notifications on demand.
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data.count);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=30');
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const markAsRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id) => {
    const was = notifications.find(n => n._id === id);
    await api.delete(`/notifications/${id}`);
    setNotifications(n => n.filter(x => x._id !== id));
    if (was && !was.isRead) setUnreadCount(c => Math.max(0, c - 1));
  };

  // Poll every 60 seconds
  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  return { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification };
};
