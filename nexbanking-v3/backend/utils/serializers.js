const { Prisma } = require('@prisma/client');

/**
 * Convert Prisma Decimal / string / number to a JS number for API responses.
 * Calculations should use Decimal helpers; this is for serialization only.
 */
const toNumber = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
};

const toDecimal = (value) => new Prisma.Decimal(value);

/**
 * Serialize a record for API response compatibility.
 * Adds `_id` alias for `id`, converts Decimal money fields to numbers,
 * and strips sensitive fields.
 */
const SENSITIVE = new Set(['password', 'transactionPinHash']);

const MONEY_FIELDS = new Set([
  'balance',
  'amount',
  'balanceBefore',
  'balanceAfter',
  'dailyTransferLimit',
  'totalDeposited',
  'totalWithdrawn',
]);

const serialize = (record, extras = {}) => {
  if (!record) return null;
  if (Array.isArray(record)) return record.map((r) => serialize(r, extras));

  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (SENSITIVE.has(key)) continue;
    if (key === 'user' && value && typeof value === 'object' && !Array.isArray(value)) {
      out.userId = serialize(value);
      continue;
    }
    if (MONEY_FIELDS.has(key)) {
      out[key] = toNumber(value);
      continue;
    }
    if (value instanceof Date) {
      out[key] = value;
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Nested prisma relation objects (skip raw Decimal already handled)
      if (Prisma.Decimal.isDecimal?.(value)) {
        out[key] = toNumber(value);
        continue;
      }
    }
    out[key] = value;
  }

  if (out.id) {
    out._id = out.id;
  }

  return { ...out, ...extras };
};

const serializeUser = (user) => {
  if (!user) return null;
  const base = serialize(user);
  return {
    ...base,
    hasTransactionPin: Boolean(user.transactionPinHash),
  };
};

const generateAccountNumber = () => {
  const num = Math.floor(1000000000 + Math.random() * 9000000000);
  return `NEX${num}`;
};

const generateTransactionId = () =>
  `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;

module.exports = {
  toNumber,
  toDecimal,
  serialize,
  serializeUser,
  generateAccountNumber,
  generateTransactionId,
};
