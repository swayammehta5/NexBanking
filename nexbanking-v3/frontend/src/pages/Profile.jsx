import { useState } from 'react';
import { User, Mail, Phone, Shield, Calendar, Copy, Check, Edit2, Save, X, Lock, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate, maskAccount, formatCurrency } from '../utils/format';
import { Input } from '../components/ui';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, account, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  // Transaction PIN state
  const [pinForm, setPinForm] = useState({
    currentTransactionPin: '',
    transactionPin: '',
    confirmTransactionPin: '',
  });
  const [pinErrors, setPinErrors] = useState({});
  const [pinLoading, setPinLoading] = useState(false);
  const [showPinForm, setShowPinForm] = useState(!user?.hasTransactionPin);

  const handlePinChange = (field, val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setPinForm((prev) => ({ ...prev, [field]: cleaned }));
    setPinErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validatePinForm = () => {
    const errs = {};
    if (user?.hasTransactionPin) {
      if (!pinForm.currentTransactionPin) {
        errs.currentTransactionPin = 'Current PIN is required';
      } else if (!/^\d{4}$/.test(pinForm.currentTransactionPin)) {
        errs.currentTransactionPin = 'Current PIN must be 4 digits';
      }
    }

    if (!pinForm.transactionPin) {
      errs.transactionPin = 'New PIN is required';
    } else if (!/^\d{4}$/.test(pinForm.transactionPin)) {
      errs.transactionPin = 'PIN must be exactly 4 digits';
    }

    if (!pinForm.confirmTransactionPin) {
      errs.confirmTransactionPin = 'Please confirm your PIN';
    } else if (pinForm.transactionPin !== pinForm.confirmTransactionPin) {
      errs.confirmTransactionPin = 'PINs do not match';
    }

    setPinErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!validatePinForm()) return;
    setPinLoading(true);
    try {
      const payload = {
        transactionPin: pinForm.transactionPin,
        confirmTransactionPin: pinForm.confirmTransactionPin,
      };
      if (user?.hasTransactionPin && pinForm.currentTransactionPin) {
        payload.currentTransactionPin = pinForm.currentTransactionPin;
      }

      const res = await api.put('/auth/transaction-pin', payload);
      toast.success(res.data.message || 'Transaction PIN saved successfully');
      if (updateUser) {
        updateUser({ hasTransactionPin: true });
      }
      setPinForm({
        currentTransactionPin: '',
        transactionPin: '',
        confirmTransactionPin: '',
      });
      setShowPinForm(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update transaction PIN';
      toast.error(msg);
    } finally {
      setPinLoading(false);
    }
  };

  const copyAccount = () => {
    navigator.clipboard.writeText(account?.accountNumber || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/auth/update-profile', form);
      localStorage.setItem('nex_user', JSON.stringify({ ...user, ...form }));
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const infoRows = [
    { icon: User,     label: 'Full Name', value: `${user?.firstName} ${user?.lastName}` },
    { icon: Mail,     label: 'Email',     value: user?.email },
    { icon: Phone,    label: 'Phone',     value: user?.phone || 'Not set' },
    { icon: Calendar, label: 'Member Since', value: user?.createdAt ? formatDate(user.createdAt) : 'N/A' },
  ];

  return (
    <div className="animate-slide-up max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage your account information</p>
      </div>

      {/* Avatar banner */}
      <div className="card p-5 flex items-center gap-5"
        style={{ background: 'var(--gradient-hero)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user?.firstName} {user?.lastName}</h2>
          <p className="text-white/70 text-sm">{user?.email}</p>
          <p className="text-white/50 text-xs mt-0.5">Member since {formatDate(user?.createdAt)}</p>
        </div>
      </div>

      {/* Account stats */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Account Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Account Number', value: maskAccount(account?.accountNumber), mono: true, copy: true },
            { label: 'Account Type',   value: account?.accountType,     capitalize: true },
            { label: 'Total Deposited', value: formatCurrency(account?.totalDeposited || 0), color: 'var(--success)' },
            { label: 'Total Withdrawn', value: formatCurrency(account?.totalWithdrawn || 0), color: 'var(--danger)' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: 'var(--bg-input)' }}>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className={`text-sm font-semibold ${item.capitalize ? 'capitalize' : ''} ${item.mono ? 'font-mono' : ''}`}
                  style={{ color: item.color || 'var(--text-primary)' }}>
                  {item.value}
                </p>
              </div>
              {item.copy && (
                <button onClick={copyAccount} style={{ color: 'var(--text-muted)' }}
                  className="transition-colors hover:text-accent">
                  {copied ? <Check className="w-4 h-4" style={{ color: 'var(--success)' }} /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Personal Info
          </h3>
          {!editing
            ? <button onClick={() => setEditing(true)} className="btn-ghost text-sm flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            : <div className="flex gap-2">
                <button onClick={handleSave} disabled={loading} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5">
                  {loading ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="btn-ghost text-sm py-1.5 px-3">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
          }
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="First Name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last Name"  value={form.lastName}  onChange={e => setForm({ ...form, lastName:  e.target.value })} />
            </div>
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm w-28 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Security & Credentials
        </h3>
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--success)' }}>
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Your account is secured with bcrypt password hashing (12 rounds) and JWT authentication.</span>
        </div>
      </div>

      {/* Transaction PIN Section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Transaction PIN
            </h3>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
              user?.hasTransactionPin
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}
          >
            {user?.hasTransactionPin ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" /> Not Configured
              </>
            )}
          </span>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          A secure 4-digit numeric PIN required to authorize all financial transactions (deposits, withdrawals, and transfers).
        </p>

        {!showPinForm && user?.hasTransactionPin ? (
          <button
            type="button"
            onClick={() => setShowPinForm(true)}
            className="btn-ghost text-sm py-2 px-4 flex items-center gap-2"
            style={{ border: '1px solid var(--border)' }}
          >
            <Lock className="w-3.5 h-3.5" /> Change Transaction PIN
          </button>
        ) : (
          <form onSubmit={handleSavePin} className="space-y-4 max-w-md">
            {user?.hasTransactionPin && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Current PIN *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.currentTransactionPin}
                  onChange={(e) => handlePinChange('currentTransactionPin', e.target.value)}
                  placeholder="••••"
                  className="input-field font-mono text-center tracking-widest text-lg w-36"
                />
                {pinErrors.currentTransactionPin && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                    {pinErrors.currentTransactionPin}
                  </p>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {user?.hasTransactionPin ? 'New 4-Digit PIN *' : '4-Digit PIN *'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.transactionPin}
                  onChange={(e) => handlePinChange('transactionPin', e.target.value)}
                  placeholder="••••"
                  className="input-field font-mono text-center tracking-widest text-lg w-full"
                />
                {pinErrors.transactionPin && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                    {pinErrors.transactionPin}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Confirm PIN *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.confirmTransactionPin}
                  onChange={(e) => handlePinChange('confirmTransactionPin', e.target.value)}
                  placeholder="••••"
                  className="input-field font-mono text-center tracking-widest text-lg w-full"
                />
                {pinErrors.confirmTransactionPin && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                    {pinErrors.confirmTransactionPin}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={pinLoading}
                className="btn-primary text-sm py-2 px-4 flex items-center justify-center gap-2"
              >
                {pinLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                {user?.hasTransactionPin ? 'Update PIN' : 'Save Transaction PIN'}
              </button>

              {user?.hasTransactionPin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPinForm(false);
                    setPinForm({
                      currentTransactionPin: '',
                      transactionPin: '',
                      confirmTransactionPin: '',
                    });
                    setPinErrors({});
                  }}
                  className="btn-ghost text-sm py-2 px-3"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
