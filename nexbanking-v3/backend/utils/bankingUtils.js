/**
 * bankingUtils.js
 * Self-contained banking business logic for the Node.js backend.
 * (The C++ DSA folder is a standalone academic/demo module;
 *  the backend uses these JS equivalents at runtime.)
 */

// ─── Balance Algorithms ───────────────────────────────────────────

/**
 * Calculate new balance, rounded to 2 decimal places.
 * @param {number} current
 * @param {number} amount
 * @param {'credit'|'debit'} type
 */
const calculateNewBalance = (current, amount, type) => {
  const c = Math.round(current * 100);
  const a = Math.round(amount  * 100);
  if (type === 'credit') return (c + a) / 100;
  if (type === 'debit')  return (c - a) / 100;
  throw new Error(`Unknown balance type: ${type}`);
};

/**
 * Check whether balance - amount >= reserve (default 0).
 */
const hasSufficientFunds = (balance, amount, reserve = 0) =>
  Math.round((balance - amount) * 100) / 100 >= reserve;

/**
 * Group an array of transaction documents by calendar month.
 * Returns [ { month: 'YYYY-MM', credits, debits, count }, ... ] sorted ascending.
 */
const groupTransactionsByMonth = (transactions) => {
  const map = {};
  for (const txn of transactions) {
    const d   = new Date(txn.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { month: key, credits: 0, debits: 0, count: 0 };
    const isCredit = ['deposit', 'transfer_in'].includes(txn.type);
    if (isCredit) map[key].credits += txn.amount;
    else          map[key].debits  += txn.amount;
    map[key].count++;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
};

// ─── Account Utilities ────────────────────────────────────────────

/**
 * Mask account number for display: NEX****1234
 */
const maskAccountNumber = (num = '') =>
  num.length > 7 ? `${num.slice(0, 3)}****${num.slice(-4)}` : num;

/**
 * Check whether today's transfer_out total would exceed the daily limit.
 * @param {Array}  todaysTransactions  mongoose docs
 * @param {number} requestedAmount
 * @param {number} dailyLimit
 * @returns {{ exceeded: boolean, usedToday: number, remaining: number }}
 */
const checkDailyTransferLimit = (todaysTransactions, requestedAmount, dailyLimit) => {
  const usedToday = todaysTransactions
    .filter(t => t.type === 'transfer_out')
    .reduce((s, t) => s + t.amount, 0);
  const remaining = Math.max(0, dailyLimit - usedToday);
  return {
    exceeded:  usedToday + requestedAmount > dailyLimit,
    usedToday,
    remaining,
  };
};

/**
 * Build account summary statistics used by the dashboard.
 */
const generateAccountStats = (account, transactions) => {
  const now  = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthlyCredits = thisMonth
    .filter(t => ['deposit', 'transfer_in'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0);
  const monthlyDebits = thisMonth
    .filter(t => ['withdrawal', 'transfer_out'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0);

  return {
    currentBalance:          account.balance,
    totalDeposited:          account.totalDeposited,
    totalWithdrawn:          account.totalWithdrawn,
    monthlyCredits,
    monthlyDebits,
    monthlyNet:              monthlyCredits - monthlyDebits,
    transactionCount:        transactions.length,
    monthlyTransactionCount: thisMonth.length,
  };
};

// ─── Transfer Algorithms ──────────────────────────────────────────

/**
 * Validate a transfer before executing it.
 * Returns { valid: boolean, reason: string|null }
 */
const validateTransfer = ({ senderBalance, amount, recipientAccountNumber, senderAccountNumber, dailyLimitCheck }) => {
  if (recipientAccountNumber === senderAccountNumber)
    return { valid: false, reason: 'Cannot transfer to your own account' };
  if (amount <= 0)
    return { valid: false, reason: 'Transfer amount must be positive' };
  if (!hasSufficientFunds(senderBalance, amount))
    return { valid: false, reason: `Insufficient funds. Available: $${senderBalance.toFixed(2)}` };
  if (dailyLimitCheck?.exceeded)
    return { valid: false, reason: `Daily transfer limit exceeded. Remaining today: $${dailyLimitCheck.remaining.toFixed(2)}` };
  return { valid: true, reason: null };
};

/**
 * Compute new balances for both sides of a transfer.
 */
const prepareTransfer = ({ senderBalance, recipientBalance, amount }) => ({
  newSenderBalance:    calculateNewBalance(senderBalance,    amount, 'debit'),
  newRecipientBalance: calculateNewBalance(recipientBalance, amount, 'credit'),
});

// ─── Helper Functions ─────────────────────────────────────────────

/**
 * Fuzzy-match a transaction against a search query string.
 */
const matchesSearch = (transaction, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (transaction.description          || '').toLowerCase().includes(q) ||
    (transaction.transactionId        || '').toLowerCase().includes(q) ||
    (transaction.type                 || '').toLowerCase().includes(q) ||
    (transaction.recipientAccountNumber || '').toLowerCase().includes(q)
  );
};

// ─── In-memory Transaction Queue (lightweight) ───────────────────

class _TransactionQueue {
  constructor() {
    this._pending    = [];
    this._processing = new Set();
    this.completed   = 0;
    this.failed      = 0;
  }
  enqueue(txn)               { this._pending.push({ ...txn, queuedAt: Date.now() }); }
  startProcessing(id)        { this._processing.add(id); }
  finalize(id, success=true) { this._processing.delete(id); success ? this.completed++ : this.failed++; }
  isProcessing(id)           { return this._processing.has(id); }
  getStats()                 { return { queued: this._pending.length, processing: this._processing.size, completed: this.completed, failed: this.failed }; }
}

const transactionQueue = new _TransactionQueue();

// ─── Exports ──────────────────────────────────────────────────────
module.exports = {
  // balance
  calculateNewBalance,
  hasSufficientFunds,
  groupTransactionsByMonth,
  // account
  maskAccountNumber,
  checkDailyTransferLimit,
  generateAccountStats,
  // transfer
  validateTransfer,
  prepareTransfer,
  // helpers
  matchesSearch,
  // queue singleton
  transactionQueue,
};
