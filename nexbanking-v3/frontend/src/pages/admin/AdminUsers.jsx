import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Shield, ShieldOff, UserX, UserCheck, Trash2, RefreshCw, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatCurrency } from '../../utils/format';
import { PageLoader, EmptyState, Spinner } from '../../components/ui';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: '', label: 'All Users' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'frozen', label: 'Frozen' },
];

export default function AdminUsers() {
  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search, status]);

  useEffect(() => { fetchUsers(1); }, [search, status]);

  const viewDetail = async (userId) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setSelectedUser(res.data.data);
    } catch { toast.error('Failed to load user detail'); }
    finally { setDetailLoading(false); }
  };

  const doAction = async (userId, action) => {
    setActionLoading(action + userId);
    try {
      await api.patch(`/admin/users/${userId}/status`, { action });
      toast.success(`User ${action}d successfully`);
      fetchUsers(pagination.page);
      if (selectedUser?.user?._id === userId) viewDetail(userId);
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(''); }
  };

  const doDelete = async (userId, name) => {
    if (!window.confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted');
      setUsers(u => u.filter(x => x._id !== userId));
      if (selectedUser?.user?._id === userId) setSelectedUser(null);
    } catch { toast.error('Failed to delete user'); }
  };

  const StatusBadge = ({ user }) => {
    if (!user.isActive) return <span className="badge-debit">Inactive</span>;
    if (user.isFrozen)  return <span className="badge-debit">Frozen</span>;
    return <span className="badge-credit">Active</span>;
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>User Management</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{pagination.total} total users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input className="input-field pl-10" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-40" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button onClick={() => fetchUsers(pagination.page)} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-5">
        {/* User table */}
        <div className="flex-1 min-w-0">
          <div className="card overflow-hidden">
            {loading ? <PageLoader /> : users.length === 0 ? <EmptyState message="No users found" icon={Search} /> : (
              <>
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <span>User</span><span>Balance</span><span>Status</span><span>Actions</span>
                </div>
                {users.map((u, i) => (
                  <div key={u._id}
                    className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 items-center transition-colors"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {u.firstName} {u.lastName}
                        {u.role === 'admin' && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>Admin</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Joined {formatDate(u.createdAt)}</p>
                    </div>
                    <div className="hidden md:block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {u.account ? formatCurrency(u.account.balance) : '—'}
                    </div>
                    <div className="hidden md:block"><StatusBadge user={u} /></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => viewDetail(u._id)} className="btn-ghost p-2" title="View detail">
                        <Eye className="w-4 h-4" />
                      </button>
                      {u.role !== 'admin' && (
                        <>
                          {u.isFrozen
                            ? <button onClick={() => doAction(u._id, 'unfreeze')} disabled={!!actionLoading} className="btn-ghost p-2" title="Unfreeze" style={{ color: 'var(--success)' }}>
                                <ShieldOff className="w-4 h-4" />
                              </button>
                            : <button onClick={() => doAction(u._id, 'freeze')} disabled={!!actionLoading} className="btn-ghost p-2" title="Freeze" style={{ color: 'var(--warning)' }}>
                                <Shield className="w-4 h-4" />
                              </button>
                          }
                          {u.isActive
                            ? <button onClick={() => doAction(u._id, 'deactivate')} disabled={!!actionLoading} className="btn-ghost p-2" title="Deactivate" style={{ color: 'var(--danger)' }}>
                                <UserX className="w-4 h-4" />
                              </button>
                            : <button onClick={() => doAction(u._id, 'activate')} disabled={!!actionLoading} className="btn-ghost p-2" title="Activate" style={{ color: 'var(--success)' }}>
                                <UserCheck className="w-4 h-4" />
                              </button>
                          }
                          <button onClick={() => doDelete(u._id, `${u.firstName} ${u.lastName}`)} className="btn-ghost p-2" title="Delete" style={{ color: 'var(--danger)' }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p style={{ color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)} className="btn-ghost px-3 py-2 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)} className="btn-ghost px-3 py-2 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User detail panel */}
        {selectedUser && (
          <div className="w-72 shrink-0 card p-5 h-fit space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>User Detail</p>
              <button onClick={() => setSelectedUser(null)} className="btn-ghost p-1" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            {detailLoading ? <div className="flex justify-center py-4"><Spinner /></div> : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: 'var(--accent)' }}>
                  {selectedUser.user.firstName[0]}{selectedUser.user.lastName[0]}
                </div>
                <div className="space-y-1.5 text-sm">
                  {[
                    ['Name',    `${selectedUser.user.firstName} ${selectedUser.user.lastName}`],
                    ['Email',   selectedUser.user.email],
                    ['Phone',   selectedUser.user.phone || '—'],
                    ['Joined',  formatDate(selectedUser.user.createdAt)],
                    ['Balance', selectedUser.account ? formatCurrency(selectedUser.account.balance) : '—'],
                    ['Total Txns', selectedUser.recentTransactions?.length || 0],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span className="font-medium text-right" style={{ color: 'var(--text-primary)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
