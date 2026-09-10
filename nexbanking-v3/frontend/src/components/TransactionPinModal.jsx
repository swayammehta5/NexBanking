import { useState, useRef, useEffect } from 'react';
import { Lock, X } from 'lucide-react';

/**
 * Transaction PIN confirmation modal.
 * Collects a 4-digit PIN and calls onConfirm(pin). Never stores the PIN.
 */
export default function TransactionPinModal({
  open,
  title = 'Confirm Transaction',
  subtitle = 'Enter your 4-digit transaction PIN',
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputs = useRef([]);

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const pin = digits.join('');

  const handleChange = (index, raw) => {
    const value = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 3) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && pin.length === 4 && !loading) {
      onConfirm(pin);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const next = ['', '', '', ''];
    pasted.split('').forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    inputs.current[Math.min(pasted.length, 3)]?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
    >
      <div className="card w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 id="pin-modal-title" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost p-1.5"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>

        <div className="flex justify-center gap-3 mb-3" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              disabled={loading}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-mono rounded-xl outline-none"
              style={{
                background: 'var(--bg-input)',
                border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                color: 'var(--text-primary)',
              }}
              aria-label={`PIN digit ${i + 1}`}
            />
          ))}
        </div>

        {error ? (
          <p className="text-xs text-center mb-3" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        ) : (
          <p className="text-xs text-center mb-3" style={{ color: 'var(--text-muted)' }}>
            Numbers only · exactly 4 digits
          </p>
        )}

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || pin.length !== 4}
            onClick={() => onConfirm(pin)}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
