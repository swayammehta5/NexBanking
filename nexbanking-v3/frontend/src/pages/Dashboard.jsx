import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpDown,
  ArrowRight, RefreshCw, Plus, Minus, Send,
  Bell, CheckCircle, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatCurrency, formatDateTime, txnTypeColor, txnSign } from '../utils/format';
import { StatCard, TxnBadge, SkeletonRow, SkeletonCard, PageLoader } from '../components/ui';
import toast from 'react-hot-toast';

// ─── Chart tooltip ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs shadow-lg" style={{ minWidth: 130 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Quick Action Button ──────────────────────────────────────────
const QuickAction = ({ to, icon: Icon, label, color }) => (
  <Link to={to}
    className="card card-hover flex flex-col items-center gap-2 p-4 text-center transition-all"
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: color + '22' }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
  </Link>
);

// ─── Notification item ────────────────────────────────────────────
const notificationsData = [
  { id: 1, type: 'success', msg: 'Your account is active and verified.', time: 'Just now' },
  { id: 2, type: 'info',    msg: 'New security features are available.',  time: '1h ago' },
  { id: 3, type: 'warning', msg: 'Set up 2FA to increase security.',      time: '2h ago' },
];

export default function Dashboard() {
  const { user, account, fetchAccount } = useAuth();
  const [stats, setStats]       = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentTxns, setRecentTxns] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        api.get('/account/stats'),
        api.get('/transactions/recent'),
      ]);
      setStats(statsRes.data.data.stats);
      setChartData(statsRes.data.data.chartData);
      setRecentTxns(recentRes.data.data.transactions);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAccount();
    load();
  };

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  // Pie chart for deposit vs withdrawal split
  const pieData = stats ? [
    { name: 'Credits', value: stats.monthlyCredits  || 0 },
    { name: 'Debits',  value: stats.monthlyDebits   || 0 },
  ] : [];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {greeting()}, {user?.firstName} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Here's your financial overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="btn-ghost relative p-2">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: 'var(--danger)' }} />
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-72 card shadow-theme z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</p>
                </div>
                {notificationsData.map(n => (
                  <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-opacity-50 transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {n.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />}
                    {n.type !== 'success' && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: n.type === 'warning' ? 'var(--warning)' : 'var(--accent)' }} />}
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{n.msg}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Hero Balance Card */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'var(--gradient-hero)', boxShadow: '0 8px 32px var(--accent-glow)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium">Total Balance</p>
          <p className="text-4xl font-bold mt-1 tracking-tight">
            {formatCurrency(account?.balance ?? 0)}
          </p>
          <p className="text-white/60 text-sm mt-1 font-mono">{account?.accountNumber}</p>
          <div className="flex items-center gap-3 mt-5">
            <Link to="/transactions" state={{ tab: 'deposit' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
              <Plus className="w-4 h-4" /> Deposit
            </Link>
            <Link to="/transactions" state={{ tab: 'transfer' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
              <Send className="w-4 h-4" /> Transfer
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly Income"  value={formatCurrency(stats?.monthlyCredits ?? 0)}   icon={TrendingUp}  trend={12}  trendLabel="vs last month" />
        <StatCard title="Monthly Spent"   value={formatCurrency(stats?.monthlyDebits ?? 0)}    icon={TrendingDown} trend={-5} trendLabel="vs last month" />
        <StatCard title="Net This Month"  value={formatCurrency(stats?.monthlyNet ?? 0)}        icon={Wallet}       sub="income minus expenses" />
        <StatCard title="All Transactions" value={stats?.transactionCount ?? 0}                icon={ArrowUpDown}  sub="lifetime total" />
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Quick Actions</p>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction to="/transactions" icon={Plus}  label="Deposit"  color="var(--success)" />
          <QuickAction to="/transactions" icon={Minus} label="Withdraw" color="var(--danger)"  />
          <QuickAction to="/transactions" icon={Send}  label="Transfer" color="var(--accent)"  />
          <QuickAction to="/history"      icon={ArrowUpDown} label="History" color="var(--warning)" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Cash Flow</h2>
            <span className="badge-neutral text-xs">Monthly</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCredits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDebits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--danger)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="credits" name="Income" stroke="var(--success)" strokeWidth={2} fill="url(#gCredits)" />
                <Area type="monotone" dataKey="debits"  name="Spent"  stroke="var(--danger)"  strokeWidth={2} fill="url(#gDebits)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Make your first transaction to see cash flow
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>This Month Split</h2>
          {pieData[0]?.value || pieData[1]?.value ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={4} dataKey="value">
                    <Cell fill="var(--success)" />
                    <Cell fill="var(--danger)"  />
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {[
                  { label: 'Credits', value: stats?.monthlyCredits, color: 'var(--success)' },
                  { label: 'Debits',  value: stats?.monthlyDebits,  color: 'var(--danger)'  },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                    </div>
                    <span className="font-semibold" style={{ color: r.color }}>{formatCurrency(r.value || 0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
          <Link to="/history" className="flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: 'var(--accent)' }}>
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {recentTxns.length === 0
            ? <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
            : recentTxns.map(txn => (
              <div key={txn._id} className="flex items-center gap-3 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: ['deposit','transfer_in'].includes(txn.type) ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                    color: ['deposit','transfer_in'].includes(txn.type) ? 'var(--success)' : 'var(--danger)',
                  }}>
                  {txnSign(txn.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{txn.description}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(txn.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: ['deposit','transfer_in'].includes(txn.type) ? 'var(--success)' : 'var(--danger)' }}>
                    {txnSign(txn.type)}{formatCurrency(txn.amount)}
                  </p>
                  <TxnBadge type={txn.type} />
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
