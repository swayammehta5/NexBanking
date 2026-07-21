import { forwardRef } from 'react';

// ─── Card ────────────────────────────────────────────────────────
export const Card = ({ children, className = '', hover = false, style = {} }) => (
  <div
    className={`card p-5 ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
    style={style}
  >
    {children}
  </div>
);

// ─── Stat Card ───────────────────────────────────────────────────
export const StatCard = ({ title, value, sub, icon: Icon, trend, trendLabel }) => (
  <div className="card p-5 flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      {Icon && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-glow)' }}>
          <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
      )}
    </div>
    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    {(sub || trend !== undefined) && (
      <div className="flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span style={{ color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}
            className="font-semibold">
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {trendLabel && <span style={{ color: 'var(--text-muted)' }}>{trendLabel}</span>}
        {sub && !trendLabel && <span style={{ color: 'var(--text-muted)' }}>{sub}</span>}
      </div>
    )}
  </div>
);

// ─── Transaction Badge ───────────────────────────────────────────
export const TxnBadge = ({ type }) => {
  const isCredit = ['deposit', 'transfer_in'].includes(type);
  const labels = {
    deposit: 'Deposit', transfer_in: 'Transfer In',
    withdrawal: 'Withdrawal', transfer_out: 'Transfer Out',
  };
  return (
    <span className={isCredit ? 'badge-credit' : 'badge-debit'}>
      {labels[type] || type}
    </span>
  );
};

// ─── Spinner ─────────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const sz = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-10 h-10 border-[3px]' }[size];
  return (
    <div className={`${sz} rounded-full animate-spin`}
      style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center py-24">
    <Spinner size="lg" />
  </div>
);

// ─── Skeleton ────────────────────────────────────────────────────
export const SkeletonRow = () => (
  <div className="flex items-center gap-4 py-3">
    <div className="skeleton w-10 h-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="skeleton h-3 w-2/5 rounded" />
      <div className="skeleton h-3 w-1/4 rounded" />
    </div>
    <div className="skeleton h-4 w-20 rounded" />
  </div>
);

export const SkeletonCard = () => (
  <div className="card p-5 space-y-3">
    <div className="skeleton h-3 w-1/3 rounded" />
    <div className="skeleton h-7 w-1/2 rounded" />
    <div className="skeleton h-3 w-1/4 rounded" />
  </div>
);

// ─── Empty State ─────────────────────────────────────────────────
export const EmptyState = ({ message = 'No data found', icon: Icon }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    {Icon && <Icon className="w-10 h-10 opacity-20" style={{ color: 'var(--text-muted)' }} />}
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
  </div>
);

// ─── Input ───────────────────────────────────────────────────────
export const Input = forwardRef(({ label, error, prefix, suffix, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
    )}
    <div className="relative">
      {prefix && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: 'var(--text-muted)' }}>
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        className={`input-field ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''} ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {suffix}
        </span>
      )}
    </div>
    {error && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
  </div>
));
Input.displayName = 'Input';

// ─── Select ──────────────────────────────────────────────────────
export const Select = ({ label, error, children, ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
    )}
    <select
      className={`input-field ${error ? 'input-error' : ''}`}
      style={{ appearance: 'auto' }}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
  </div>
);

// ─── Divider ─────────────────────────────────────────────────────
export const Divider = ({ label }) => (
  <div className="flex items-center gap-3 my-2">
    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
    {label && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>}
    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
  </div>
);
