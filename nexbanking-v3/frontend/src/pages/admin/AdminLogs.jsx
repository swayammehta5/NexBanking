import { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { PageLoader, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  login: 'var(--success)', logout: 'var(--text-muted)',
  transfer: 'var(--accent)', deposit: 'var(--success)', withdrawal: 'var(--danger)',
  profile_update: 'var(--warning)', password_change: 'var(--warning)',
  beneficiary_added: 'var(--accent)', beneficiary_deleted: 'var(--danger)',
  admin_freeze: 'var(--danger)', admin_unfreeze: 'var(--success)',
  admin_deactivate: 'var(--danger)', admin_password_reset: 'var(--warning)',
};

export default function AdminLogs() {
  const [logs, setLogs]             = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/admin/logs', { params });
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  }, [actionFilter]);

  useEffect(() => { fetchLogs(1); }, [actionFilter]);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Activity Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{pagination.total} entries</p>
        </div>
        <select className="input-field w-48" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? <EmptyState message="No logs found" icon={Shield} /> : (
        <div className="card overflow-hidden">
          {logs.map((log, i) => (
            <div key={log._id} className="flex items-start gap-4 px-5 py-3 transition-colors"
              style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: ACTION_COLORS[log.action] || 'var(--text-muted)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System'}
                  </span>
                  <span className="badge-neutral">{log.action.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{log.description}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatDateTime(log.createdAt)}</span>
                  {log.ip && <span>IP: {log.ip}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p style={{ color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)} className="btn-ghost px-3 py-2 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLogs(pagination.page + 1)} className="btn-ghost px-3 py-2 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
