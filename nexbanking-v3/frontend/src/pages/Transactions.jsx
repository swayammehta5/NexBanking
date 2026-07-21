import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatCurrency } from '../utils/format';
import { Input } from '../components/ui';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'deposit',  label: 'Deposit',  icon: ArrowDownLeft,  color: 'var(--success)' },
  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight,   color: 'var(--danger)'  },
  { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: 'var(--accent)'  },
];

export default function Transactions() {
  const { account, fetchAccount } = useAuth();
  const location = useLocation();
  const [tab, setTab]       = useState(location.state?.tab || 'deposit');
  const [form, setForm]     = useState({ amount: '', description: '', recipientAccountNumber: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastTxn, setLastTxn] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  useEffect(() => { if (location.state?.tab) setTab(location.state.tab); }, [location.state]);

  useEffect(() => {
    if (tab === 'transfer') {
      api.get('/beneficiaries').then(r => setBeneficiaries(r.data.data.beneficiaries)).catch(() => {});
    }
  }, [tab]);

  const current = TABS.find(t => t.id === tab);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const selectBeneficiary = (b) => {
    setSelectedBeneficiary(b);
    set('recipientAccountNumber', b.accountNumber);
    set('description', `Transfer to ${b.name}`);
  };

  const validate = () => {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Enter a valid positive amount';
    if (tab === 'withdraw' && account && amt > account.balance)
      e.amount = `Insufficient funds (balance: ${formatCurrency(account.balance)})`;
    if (tab === 'transfer' && !form.recipientAccountNumber.trim())
      e.recipientAccountNumber = 'Recipient account number is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true); setLastTxn(null);
    try {
      const payload = {
        amount: parseFloat(form.amount), description: form.description,
        ...(tab === 'transfer' && {
          recipientAccountNumber: form.recipientAccountNumber,
          beneficiaryId: selectedBeneficiary?._id,
        }),
      };
      const res = await api.post(`/transactions/${tab}`, payload);
      toast.success(res.data.message);
      setLastTxn(res.data.data);
      setForm({ amount: '', description: '', recipientAccountNumber: '' });
      setSelectedBeneficiary(null);
      fetchAccount();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-slide-up max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Transactions</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Deposit, withdraw, or transfer funds</p>
      </div>

      {/* Balance */}
      <div className="card px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>Available Balance</p>
          <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{formatCurrency(account?.balance ?? 0)}</p>
        </div>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{account?.accountNumber}</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden p-1 gap-1" style={{ background: 'var(--bg-input)' }}>
        {TABS.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => { setTab(id); setErrors({}); setLastTxn(null); setSelectedBeneficiary(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={tab === id ? { background: 'var(--bg-card)', color, boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-muted)' }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Amount" prefix="$" type="number" min="0.01" step="0.01"
            value={form.amount} onChange={e => set('amount', e.target.value)}
            placeholder="0.00" error={errors.amount} />

          {tab === 'transfer' && (
            <>
              {/* Beneficiary dropdown */}
              {beneficiaries.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Select Beneficiary</label>
                  <div className="grid gap-2 max-h-44 overflow-y-auto">
                    {beneficiaries.map(b => (
                      <button key={b._id} type="button"
                        onClick={() => selectBeneficiary(b)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: selectedBeneficiary?._id === b._id ? 'var(--accent-glow)' : 'var(--bg-input)',
                          border: `1px solid ${selectedBeneficiary?._id === b._id ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'var(--accent)' }}>
                          {b.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                          <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{b.accountNumber}</p>
                        </div>
                        {b.isFavorite && <Star className="w-3.5 h-3.5 shrink-0" fill="currentColor" style={{ color: '#f59e0b' }} />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>or enter manually below</p>
                </div>
              )}

              <Input label="Recipient Account Number"
                value={form.recipientAccountNumber}
                onChange={e => { set('recipientAccountNumber', e.target.value); setSelectedBeneficiary(null); }}
                placeholder="NEX1234567890" error={errors.recipientAccountNumber} />
            </>
          )}

          <Input label="Description (optional)" value={form.description}
            onChange={e => set('description', e.target.value)} placeholder="What's this for?" />

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2"
            style={{ background: current.color }}>
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><current.icon className="w-4 h-4" /> Confirm {current.label}</>
            }
          </button>
        </form>
      </div>

      {/* Success */}
      {lastTxn && (
        <div className="card p-5 animate-slide-up" style={{ borderColor: 'var(--success)', borderWidth: 1 }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />
            <p className="font-semibold text-sm" style={{ color: 'var(--success)' }}>Transaction Successful</p>
          </div>
          <div className="space-y-1.5 text-sm">
            {[
              ['Amount',      formatCurrency(lastTxn.transaction?.amount)],
              ['New Balance', formatCurrency(lastTxn.newBalance)],
              ['Txn ID',      lastTxn.transaction?.transactionId],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span className="font-semibold font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
