const { prisma } = require('../config/db');
const { toNumber } = require('../utils/serializers');

const THRESHOLDS = {
  largeAmount: 5000,
  rapidTransferCount: 5,
  rapidTransferWindow: 10,
  oddHourStart: 0,
  oddHourEnd: 5,
  rapidDepletionRate: 0.8,
};

const analyseTransaction = async (txn, account) => {
  const flags = [];
  const amount = toNumber(txn.amount);
  const balance = toNumber(account.balance);

  if (amount >= THRESHOLDS.largeAmount) {
    flags.push(`Large amount: $${amount}`);
  }

  if (balance > 0) {
    const depletionRate = amount / balance;
    if (depletionRate >= THRESHOLDS.rapidDepletionRate && txn.type !== 'deposit') {
      flags.push(`Rapid balance depletion: ${(depletionRate * 100).toFixed(0)}% of balance`);
    }
  }

  const hour = new Date().getHours();
  if (hour >= THRESHOLDS.oddHourStart && hour < THRESHOLDS.oddHourEnd) {
    if (['transfer_out', 'withdrawal'].includes(txn.type)) {
      flags.push(`Transaction at odd hours (${hour}:00)`);
    }
  }

  if (txn.type === 'transfer_out') {
    const windowStart = new Date(Date.now() - THRESHOLDS.rapidTransferWindow * 60 * 1000);
    const recentTransfers = await prisma.transaction.count({
      where: {
        accountId: account.id,
        type: 'transfer_out',
        createdAt: { gte: windowStart },
      },
    });
    if (recentTransfers >= THRESHOLDS.rapidTransferCount) {
      flags.push(`${recentTransfers} transfers in ${THRESHOLDS.rapidTransferWindow} minutes`);
    }
  }

  return { isSuspicious: flags.length > 0, flags };
};

module.exports = { analyseTransaction };
