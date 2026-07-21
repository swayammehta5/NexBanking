import { useState, useRef, useEffect } from 'react';
import { Brain, Send, TrendingUp, TrendingDown, Wallet, RefreshCw, Bot, User, Lightbulb, RepeatIcon, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { PageLoader, Spinner } from '../../components/ui';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  "What is my current balance?",
  "How much did I spend this month?",
  "Show my biggest transaction",
  "How many transfers did I make?",
  "Which month had the highest expenses?",
  "What's my savings rate?",
];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs shadow-lg">
      <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export default function AIAssistant() {
  const [tab, setTab]         = useState('analysis');
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your AI financial assistant. Ask me anything about your account.", ts: new Date() }
  ]);
  const [input, setInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);

  const fetchAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await api.get('/ai/analysis');
      setAnalysis(res.data.data);
    } catch { toast.error('Failed to load analysis'); }
    finally { setLoadingAnalysis(false); }
  };

  useEffect(() => { if (tab === 'analysis') fetchAnalysis(); }, [tab]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg, ts: new Date() }]);
    setChatLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: msg });
      setMessages(m => [...m, { role: 'assistant', text: res.data.data.reply, ts: new Date() }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: "Sorry, I couldn't process that. Please try again.", ts: new Date() }]);
    } finally { setChatLoading(false); }
  };

  return (
    <div className="animate-slide-up space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Assistant</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Spending insights & financial chatbot</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden p-1 gap-1" style={{ background: 'var(--bg-input)' }}>
        {[['analysis', 'Spending Analysis'], ['chat', 'AI Chatbot']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={tab === id ? { background: 'var(--bg-card)', color: 'var(--accent)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Analysis Tab ─────────────────────────────────────────── */}
      {tab === 'analysis' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button onClick={fetchAnalysis} disabled={loadingAnalysis} className="btn-ghost flex items-center gap-2 text-sm">
              <RefreshCw className={`w-4 h-4 ${loadingAnalysis ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loadingAnalysis ? <PageLoader /> : !analysis ? null : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'This Month Spent', value: formatCurrency(analysis.summary.thisMonthSpend), icon: TrendingDown, color: 'var(--danger)' },
                  { label: 'This Month Income', value: formatCurrency(analysis.summary.thisMonthIncome), icon: TrendingUp, color: 'var(--success)' },
                  { label: 'Savings Rate', value: `${analysis.summary.savingsRate.toFixed(1)}%`, icon: Wallet, color: 'var(--accent)' },
                  { label: 'Avg Daily Spend', value: formatCurrency(analysis.summary.avgDailySpend), icon: RepeatIcon, color: 'var(--warning)' },
                ].map(s => (
                  <div key={s.label} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                      <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                    {s.label === 'This Month Spent' && analysis.summary.spendChange !== 0 && (
                      <p className="text-xs mt-1" style={{ color: analysis.summary.spendChange > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {analysis.summary.spendChange > 0 ? '↑' : '↓'} {Math.abs(analysis.summary.spendChange).toFixed(1)}% vs last month
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Monthly Trend Chart */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>12-Month Cash Flow</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analysis.monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aiIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="aiExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="income"   name="Income" stroke="var(--success)" strokeWidth={2} fill="url(#aiIncome)" />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="var(--danger)" strokeWidth={2} fill="url(#aiExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                {/* Recurring payments */}
                {analysis.recurring.length > 0 && (
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <RepeatIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Recurring Patterns
                    </h2>
                    <div className="space-y-2">
                      {analysis.recurring.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(r.amount)}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.count}× this year</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Largest expense */}
                {analysis.summary.largestExpense && (
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} /> Largest Expense
                    </h2>
                    <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>{formatCurrency(analysis.summary.largestExpense.amount)}</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{analysis.summary.largestExpense.description}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(analysis.summary.largestExpense.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Lightbulb className="w-4 h-4" style={{ color: 'var(--warning)' }} /> AI Recommendations
                </h2>
                <div className="space-y-2">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Chatbot Tab ──────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 240px)', minHeight: 480 }}>
          {/* Messages */}
          <div className="card flex-1 overflow-y-auto p-4 space-y-4 mb-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: m.role === 'user' ? 'var(--accent)' : 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
                  {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                  style={m.role === 'user'
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
                  }>
                  {m.text.split('\n').map((line, j) => (
                    <span key={j}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}{j < m.text.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2" style={{ background: 'var(--bg-input)' }}>
                  <Spinner size="sm" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.slice(0, 3).map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="Ask about your finances..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={chatLoading}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || chatLoading} className="btn-primary px-4">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
