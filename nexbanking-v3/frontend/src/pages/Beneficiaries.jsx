import { useState, useEffect, useCallback } from 'react';
import { Star, Plus, Pencil, Trash2, Search, X, Building2, BookUser } from 'lucide-react';
import api from '../services/api';
import { formatDate } from '../utils/format';
import { PageLoader, EmptyState, Input } from '../components/ui';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', accountNumber: '', bankName: '', ifscCode: '', nickname: '' };

export default function Beneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/beneficiaries${search ? `?search=${search}` : ''}`);
      setBeneficiaries(res.data.data.beneficiaries);
    } catch { toast.error('Failed to load beneficiaries'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name          = 'Name is required';
    if (!form.accountNumber.trim()) e.accountNumber = 'Account number is required';
    if (!form.bankName.trim())      e.bankName      = 'Bank name is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const openAdd  = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setShowModal(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ name: b.name, accountNumber: b.accountNumber, bankName: b.bankName, ifscCode: b.ifscCode || '', nickname: b.nickname || '' });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await api.put(`/beneficiaries/${editing._id}`, form);
        setBeneficiaries(b => b.map(x => x._id === editing._id ? res.data.data.beneficiary : x));
        toast.success('Beneficiary updated');
      } else {
        const res = await api.post('/beneficiaries', form);
        setBeneficiaries(b => [res.data.data.beneficiary, ...b]);
        toast.success('Beneficiary added');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save beneficiary');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await api.delete(`/beneficiaries/${id}`);
      setBeneficiaries(b => b.filter(x => x._id !== id));
      toast.success('Beneficiary deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleFavorite = async (id) => {
    try {
      const res = await api.patch(`/beneficiaries/${id}/favorite`);
      setBeneficiaries(b => b.map(x => x._id === id ? res.data.data.beneficiary : x));
    } catch { toast.error('Failed to update favorite'); }
  };

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const favorites = beneficiaries.filter(b => b.isFavorite);
  const others    = beneficiaries.filter(b => !b.isFavorite);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Beneficiaries</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{beneficiaries.length} saved contacts</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Beneficiary
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input className="input-field pl-10" placeholder="Search by name, account, or bank..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? <PageLoader /> : beneficiaries.length === 0 ? (
        <div className="card p-12 text-center">
          <BookUser className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No beneficiaries yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Add contacts to speed up transfers</p>
          <button onClick={openAdd} className="btn-primary">Add your first beneficiary</button>
        </div>
      ) : (
        <>
          {/* Favorites */}
          {favorites.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                ⭐ Favourites
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map(b => <BeneficiaryCard key={b._id} b={b} onEdit={openEdit} onDelete={handleDelete} onFavorite={handleFavorite} />)}
              </div>
            </section>
          )}

          {/* Others */}
          {others.length > 0 && (
            <section>
              {favorites.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>All</p>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {others.map(b => <BeneficiaryCard key={b._id} b={b} onEdit={openEdit} onDelete={handleDelete} onFavorite={handleFavorite} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Edit Beneficiary' : 'Add Beneficiary'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" error={errors.name} />
              <Input label="Account Number *" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)}
                placeholder="NEX1234567890" error={errors.accountNumber} disabled={!!editing} />
              <Input label="Bank Name *" value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="NexBank" error={errors.bankName} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="IFSC Code" value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())} placeholder="NEXB0001234" />
                <Input label="Nickname" value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="Friend, Landlord..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                {editing ? 'Save Changes' : 'Add Beneficiary'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BeneficiaryCard({ b, onEdit, onDelete, onFavorite }) {
  const initials = b.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="card p-4 flex flex-col gap-3 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
            style={{ background: 'var(--accent)' }}>{initials}</div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
            {b.nickname && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.nickname}</p>}
          </div>
        </div>
        <button onClick={() => onFavorite(b._id)} className="p-1.5 rounded-lg transition-colors"
          style={{ color: b.isFavorite ? '#f59e0b' : 'var(--text-muted)' }}>
          <Star className="w-4 h-4" fill={b.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-muted)' }}>Account:</span>
          <span className="font-mono">{b.accountNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
          <span>{b.bankName}{b.ifscCode ? ` · ${b.ifscCode}` : ''}</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>Added {formatDate(b.createdAt)}</div>
      </div>

      <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={() => onEdit(b)} className="flex-1 btn-ghost text-xs flex items-center justify-center gap-1.5">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button onClick={() => onDelete(b._id, b.name)} className="flex-1 btn-ghost text-xs flex items-center justify-center gap-1.5"
          style={{ color: 'var(--danger)' }}>
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  );
}
