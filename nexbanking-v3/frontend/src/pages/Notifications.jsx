import { useEffect } from 'react';
import { Bell, CheckCheck, Trash2, ShieldAlert, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, UserPlus, Lock, LogIn, Info } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDateTime } from '../utils/format';
import { PageLoader, EmptyState } from '../components/ui';

const TYPE_CONFIG = {
  credit:            { icon: ArrowDownLeft,  color: 'var(--success)',  bg: 'rgba(16,185,129,0.12)' },
  debit:             { icon: ArrowUpRight,   color: 'var(--danger)',   bg: 'rgba(244,63,94,0.12)' },
  transfer:          { icon: ArrowLeftRight, color: 'var(--accent)',   bg: 'var(--accent-glow)' },
  beneficiary_added: { icon: UserPlus,       color: 'var(--accent)',   bg: 'var(--accent-glow)' },
  password_changed:  { icon: Lock,           color: 'var(--warning)',  bg: 'rgba(245,158,11,0.12)' },
  new_login:         { icon: LogIn,          color: 'var(--warning)',  bg: 'rgba(245,158,11,0.12)' },
  fraud_alert:       { icon: ShieldAlert,    color: 'var(--danger)',   bg: 'rgba(244,63,94,0.12)' },
  system:            { icon: Info,           color: 'var(--text-muted)', bg: 'var(--bg-input)' },
};

export default function Notifications() {
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  useEffect(() => { fetchNotifications(); }, []);

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn-ghost flex items-center gap-2 text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? <PageLoader /> : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No notifications yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Activity will appear here</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {notifications.map((n, i) => {
            const cfg  = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            const Icon = cfg.icon;
            return (
              <div key={n._id}
                className="flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer"
                style={{
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  background: n.isRead ? '' : 'var(--accent-glow)',
                }}
                onClick={() => !n.isRead && markAsRead(n._id)}>

                {/* Icon */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {n.title}
                      {!n.isRead && (
                        <span className="inline-block w-2 h-2 rounded-full ml-2 align-middle" style={{ background: 'var(--accent)' }} />
                      )}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotification(n._id); }}
                      className="shrink-0 p-1 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
