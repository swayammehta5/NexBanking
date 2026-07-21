const Transaction = require('../models/Transaction');

/**
 * fraudDetectionService.js
 * Rule-based fraud detection. Returns { isSuspicious, flags[] }.
 */

const THRESHOLDS = {
  largeAmount:          5000,   // single transaction >= this
  rapidTransferCount:   5,      // >= this many transfers in window
  rapidTransferWindow:  10,     // minutes
  oddHourStart:         0,      // midnight
  oddHourEnd:           5,      // 5 AM
  rapidDepletionRate:   0.80,   // balance drops by >= 80% in one transaction
};

/**
 * Analyse a transaction for fraud signals.
 * @param {Object} txn    - the new transaction (not yet saved)
 * @param {Object} account - the user's account
 * @returns {{ isSuspicious: boolean, flags: string[] }}
 */
const analyseTransaction = async (txn, account) => {
  const flags = [];

  // 1. Very large amount
  if (txn.amount >= THRESHOLDS.largeAmount) {
    flags.push(`Large amount: $${txn.amount}`);
  }

  // 2. Rapid balance depletion
  if (account.balance > 0) {
    const depletionRate = txn.amount / account.balance;
    if (depletionRate >= THRESHOLDS.rapidDepletionRate && txn.type !== 'deposit') {
      flags.push(`Rapid balance depletion: ${(depletionRate * 100).toFixed(0)}% of balance`);
    }
  }

  // 3. Odd hour transaction (00:00 – 05:00)
  const hour = new Date().getHours();
  if (hour >= THRESHOLDS.oddHourStart && hour < THRESHOLDS.oddHourEnd) {
    if (['transfer_out', 'withdrawal'].includes(txn.type)) {
      flags.push(`Transaction at odd hours (${hour}:00)`);
    }
  }

  // 4. Multiple transfers in short window
  if (txn.type === 'transfer_out') {
    const windowStart = new Date(Date.now() - THRESHOLDS.rapidTransferWindow * 60 * 1000);
    const recentTransfers = await Transaction.countDocuments({
      accountId: account._id,
      type:      'transfer_out',
      createdAt: { $gte: windowStart },
    });
    if (recentTransfers >= THRESHOLDS.rapidTransferCount) {
      flags.push(`${recentTransfers} transfers in ${THRESHOLDS.rapidTransferWindow} minutes`);
    }
  }

  return {
    isSuspicious: flags.length > 0,
    flags,
  };
};

module.exports = { analyseTransaction };
