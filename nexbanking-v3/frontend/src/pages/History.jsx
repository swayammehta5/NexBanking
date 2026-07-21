import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, Download, FileText, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDateTime, txnTypeColor, txnSign } from '../utils/format';
import { TxnBadge, SkeletonRow, EmptyState } from '../components/ui';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' },
];

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters]           = useState({ type: 'all', search: '', startDate: '', endDate: '' });
  const [loading, setLoading]           = useState(true);
  const [showFilters, setShowFilters]   = useState(false);
  const [downloading, setDownloading]   = useState('');

  const fetchTxns = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (filters.type !== 'all') params.type      = filters.type;
      if (filters.search)         params.search    = filters.search;
      if (filters.startDate)      params.startDate = filters.startDate;
      if (filters.endDate)        params.endDate   = filters.endDate;
      const res = await api.get('/transactions', { params });
      setTransactions(res.data.data.transactions);
      setPagination(p => ({ ...p, ...res.data.data.pagination, page }));
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [filters, pagination.limit]);

  useEffect(() => { fetchTxns(1); }, [filters]);

  const download = async (format) => {
    setDownloading(format);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate)   params.endDate   = filters.endDate;

      const res = await api.get(`/statement/${format}`, {
        params,
        responseType: 'blob',
      });

      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `NexBanking-Statement-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch { toast.error(`Failed to download ${format.toUpperCase()}`); }
    finally { setDownloading(''); }
  };

  const hasActiveFilters = filters.type !== 'all' || filters.search || filters.startDate || filters.endDate;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Transaction History</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{pagination.total} total records</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Download buttons */}
          <button onClick={() => download('pdf')} disabled={!!downloading}
            className="btn-ghost flex items-center gap-2 text-sm"
            style={{ color: downloading === 'pdf' ? 'var(--accent)' : 'var(--text-muted)' }}>
            {downloading === 'pdf'
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <FileText className="w-4 h-4" />
            }
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => download('csv')} disabled={!!downloading}
            className="btn-ghost flex items-center gap-2 text-sm"
            style={{ color: downloading === 'csv' ? 'var(--success)' : 'var(--text-muted)' }}>
            {downloading === 'csv'
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <FileSpreadsheet className="w-4 h-4" />
            }
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost flex items-center gap-2 text-sm"
            style={{ color: hasActiveFilters ? 'var(--accent)' : 'var(--text-muted)' }}>
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters{hasActiveFilters ? ' ●' : ''}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input className="input-field pl-10" placeholder="Search transactions..."
                value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="input-field sm:w-44">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 items-center">
            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="input-field flex-1 text-sm" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="input-field flex-1 text-sm" />
            {hasActiveFilters && (
              <button onClick={() => setFilters({ type: 'all', search: '', startDate: '', endDate: '' })}
                className="text-xs font-semibold whitespace-nowrap hover:underline" style={{ color: 'var(--danger)' }}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>Transaction</span><span>Type</span><span>Date</span><span className="text-right">Amount</span>
        </div>
        <div>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="px-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}><SkeletonRow /></div>)
            : transactions.length === 0
            ? <EmptyState message="No transactions match your filters" icon={Search} />
            : transactions.map((txn, i) => (
              <div key={txn._id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 transition-colors"
                style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{txn.description}</p>
                    {txn.isSuspicious && <ShieldAlert className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--danger)' }} />}
                  </div>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{txn.transactionId}</p>
                </div>
                <div className="hidden sm:flex items-center"><TxnBadge type={txn.type} /></div>
                <div className="hidden sm:flex items-center text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(txn.createdAt)}</div>
                <div className="flex items-center justify-end">
                  <span className="text-sm font-bold"
                    style={{ color: ['deposit','transfer_in'].includes(txn.type) ? 'var(--success)' : 'var(--danger)' }}>
                    {txnSign(txn.type)}{formatCurrency(txn.amount)}
                  </span>
                </div>
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
