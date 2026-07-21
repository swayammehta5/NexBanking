import { useEffect, useState } from 'react';
import { Users, ArrowUpDown, ShieldAlert, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { PageLoader, TxnBadge } from '../../components/ui';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, sub, icon: Icon, color = 'var(--accent)' }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data.data))
      .catch(() => toast.error('Failed to load admin stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!stats)  return null;

  // Build monthly chart from aggregation data
  const chartMap = {};
  stats.monthlyChart.forEach(d => {
    const key = `${d._id.year}-${String(d._id.month).padStart(2,'0')}`;
    if (!chartMap[key]) chartMap[key] = { month: key, deposits: 0, withdrawals: 0, transfers: 0 };
    if (d._id.type === 'deposit')      chartMap[key].deposits     += d.total;
    if (d._id.type === 'withdrawal')   chartMap[key].withdrawals  += d.total;
    if (d._id.type === 'transfer_out') chartMap[key].transfers    += d.total;
  });
  const chartData = Object.values(chartMap).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Platform overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users"     value={stats.users.total}              sub={`${stats.users.active} active`}     icon={Users}       color="var(--accent)" />
        <StatCard title="Frozen Accounts" value={stats.users.frozen}             sub="require attention"                  icon={ShieldAlert} color="var(--warning)" />
        <StatCard title="Total Balance"   value={formatCurrency(stats.financials.totalBalance || 0)} sub="across all accounts" icon={DollarSign} color="var(--success)" />
        <StatCard title="Suspicious Txns" value={stats.transactions.suspicious}  sub="flagged by fraud engine"            icon={ShieldAlert} color="var(--danger)" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Transactions" value={stats.transactions.total}   icon={ArrowUpDown} color="var(--accent)" />
        <StatCard title="This Month"         value={stats.transactions.monthly} icon={TrendingUp}  color="var(--success)" />
        <StatCard title="Today"              value={stats.transactions.daily}   icon={Activity}    color="var(--warning)" />
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Monthly Transaction Volume (Last 6 Months)</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }} />
              <Bar dataKey="deposits"    name="Deposits"    fill="var(--success)" radius={[4,4,0,0]} />
              <Bar dataKey="withdrawals" name="Withdrawals" fill="var(--danger)"  radius={[4,4,0,0]} />
              <Bar dataKey="transfers"   name="Transfers"   fill="var(--accent)"  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No data yet</p>
        )}
      </div>

      {/* Recent transactions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Transactions (All Users)</h2>
        </div>
        {stats.recentTxns.map((txn, i) => (
          <div key={txn._id} className="flex items-center gap-4 px-5 py-3"
            style={{ borderBottom: i < stats.recentTxns.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{txn.description}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {txn.userId ? `${txn.userId.firstName} ${txn.userId.lastName}` : 'Unknown'} · {formatDateTime(txn.createdAt)}
              </p>
            </div>
            <TxnBadge type={txn.type} />
            {txn.isSuspicious && (
              <span className="badge-debit flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Suspicious</span>
            )}
            <span className="text-sm font-bold" style={{ color: ['deposit','transfer_in'].includes(txn.type) ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(txn.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
