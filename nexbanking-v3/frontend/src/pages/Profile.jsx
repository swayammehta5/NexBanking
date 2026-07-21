import { useState } from 'react';
import { User, Mail, Phone, Shield, Calendar, Copy, Check, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate, maskAccount, formatCurrency } from '../utils/format';
import { Input } from '../components/ui';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, account } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

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
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Security</h3>
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--success)' }}>
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Your account is secured with bcrypt password hashing (12 rounds) and RS256 JWT authentication.</span>
        </div>
      </div>
    </div>
  );
}
