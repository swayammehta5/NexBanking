import { useState, useEffect, useCallback } from 'react';
import { Search, ShieldAlert, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDateTime, txnSign } from '../../utils/format';
import { TxnBadge, SkeletonRow, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';

const TYPES   = ['all', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out'];
const STATUSES = ['all', 'completed', 'pending', 'failed', 'suspicious'];

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters]           = useState({ type: 'all', status: 'all', search: '', suspicious: '' });
  const [loading, setLoading]           = useState(true);
  const [showFilters, setShowFilters]   = useState(false);

  const fetchTxns = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.type !== 'all')   params.type   = filters.type;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.search)           params.search = filters.search;
      if (filters.suspicious)       params.suspicious = 'true';
      const res = await api.get('/admin/transactions', { params });
      setTransactions(res.data.data.transactions);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTxns(1); }, [filters]);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>All Transactions</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{pagination.total} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setF('suspicious', filters.suspicious ? '' : 'true')}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-all ${filters.suspicious ? '' : 'btn-ghost'}`}
            style={filters.suspicious ? { background: 'rgba(244,63,94,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' } : {}}>
            <ShieldAlert className="w-4 h-4" /> Suspicious
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost flex items-center gap-2 text-sm">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input className="input-field pl-10" placeholder="Search transaction ID or description..."
                value={filters.search} onChange={e => setF('search', e.target.value)} />
            </div>
            <select className="input-field sm:w-40" value={filters.type} onChange={e => setF('type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.replace('_', ' ')}</option>)}
            </select>
            <select className="input-field sm:w-40" value={filters.status} onChange={e => setF('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>Transaction</span><span>User</span><span>Type</span><span>Amount</span><span>Status</span><span>Date</span>
        </div>
        <div>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="px-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}><SkeletonRow /></div>)
            : transactions.length === 0
            ? <EmptyState message="No transactions found" icon={Search} />
            : transactions.map((txn, i) => (
              <div key={txn._id}
                className="grid grid-cols-[1fr_auto] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 items-center transition-colors"
                style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{txn.description}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{txn.transactionId?.slice(-12)}</p>
                </div>
                <div className="hidden lg:block text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {txn.userId ? `${txn.userId.firstName} ${txn.userId.lastName}` : '—'}
                </div>
                <div className="hidden lg:flex items-center"><TxnBadge type={txn.type} /></div>
                <div className="text-sm font-bold" style={{ color: ['deposit','transfer_in'].includes(txn.type) ? 'var(--success)' : 'var(--danger)' }}>
                  {txnSign(txn.type)}{formatCurrency(txn.amount)}
                </div>
                <div className="hidden lg:flex items-center gap-1">
                  {txn.isSuspicious && <ShieldAlert className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />}
                  <span className={txn.status === 'completed' ? 'badge-credit' : txn.status === 'suspicious' ? 'badge-debit' : 'badge-neutral'}>
                    {txn.status}
                  </span>
                </div>
                <div className="hidden lg:block text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(txn.createdAt)}</div>
              </div>
            ))
          }
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p style={{ color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => fetchTxns(pagination.page - 1)} className="btn-ghost px-3 py-2 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTxns(pagination.page + 1)} className="btn-ghost px-3 py-2 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
