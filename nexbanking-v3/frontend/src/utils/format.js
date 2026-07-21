export const formatCurrency = (amount = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const formatDateTime = (dateStr) =>
  new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const maskAccount = (num = '') =>
  num.length > 7 ? `${num.slice(0, 3)}••••${num.slice(-4)}` : num;

export const txnTypeLabel = (type) => ({
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
}[type] || type);

export const txnTypeColor = (type) => ({
  deposit: 'text-emerald-400',
  transfer_in: 'text-emerald-400',
  withdrawal: 'text-rose-400',
  transfer_out: 'text-rose-400',
}[type] || 'text-slate-400');

export const txnSign = (type) =>
  ['deposit', 'transfer_in'].includes(type) ? '+' : '-';
