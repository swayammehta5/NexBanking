const Transaction = require('../models/Transaction');
const Account     = require('../models/Account');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// ── Spending Analysis ─────────────────────────────────────────────

const getSpendingAnalysis = async (req, res) => {
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd    = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    const [allTxns, thisMonthTxns, prevMonthTxns] = await Promise.all([
      Transaction.find({ accountId: account._id, createdAt: { $gte: yearStart } }).lean(),
      Transaction.find({ accountId: account._id, createdAt: { $gte: monthStart } }).lean(),
      Transaction.find({ accountId: account._id, createdAt: { $gte: prevStart, $lte: prevEnd } }).lean(),
    ]);

    const debitTypes  = ['withdrawal', 'transfer_out'];
    const creditTypes = ['deposit', 'transfer_in'];

    const thisMonthSpend = thisMonthTxns.filter(t => debitTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const prevMonthSpend = prevMonthTxns.filter(t => debitTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const thisMonthIncome = thisMonthTxns.filter(t => creditTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const spendChange = prevMonthSpend > 0 ? ((thisMonthSpend - prevMonthSpend) / prevMonthSpend) * 100 : 0;

    // Monthly grouped data (last 12 months)
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const twelveMonthTxns = await Transaction.find({ accountId: account._id, createdAt: { $gte: twelveMonthsAgo } }).lean();
    const monthlyMap = {};
    twelveMonthTxns.forEach(t => {
      const d   = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expenses: 0, net: 0 };
      if (creditTypes.includes(t.type)) monthlyMap[key].income   += t.amount;
      else                               monthlyMap[key].expenses += t.amount;
    });
    const monthlyTrend = Object.values(monthlyMap).map(m => ({ ...m, net: m.income - m.expenses })).sort((a, b) => a.month.localeCompare(b.month));

    // Largest transaction
    const allDebits  = allTxns.filter(t => debitTypes.includes(t.type));
    const largest    = allDebits.length ? allDebits.reduce((max, t) => t.amount > max.amount ? t : max, allDebits[0]) : null;

    // Average daily spending
    const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth    = now.getDate();
    const avgDailySpend = dayOfMonth > 0 ? thisMonthSpend / dayOfMonth : 0;

    // Savings rate
    const savingsRate = thisMonthIncome > 0 ? ((thisMonthIncome - thisMonthSpend) / thisMonthIncome) * 100 : 0;

    // Recurring detection: amounts seen 2+ times this year
    const amountFreq = {};
    allTxns.filter(t => debitTypes.includes(t.type)).forEach(t => {
      const key = t.amount.toFixed(2);
      amountFreq[key] = (amountFreq[key] || 0) + 1;
    });
    const recurring = Object.entries(amountFreq)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([amount, count]) => ({ amount: parseFloat(amount), count }));

    // AI recommendations
    const recommendations = [];
    if (spendChange > 20) recommendations.push(`⚠️ Your spending increased by ${spendChange.toFixed(0)}% compared to last month.`);
    if (savingsRate < 10 && thisMonthIncome > 0) recommendations.push(`💡 Your savings rate is ${savingsRate.toFixed(0)}%. Aim for at least 20%.`);
    if (avgDailySpend > 0) recommendations.push(`📊 You're spending an average of $${avgDailySpend.toFixed(2)} per day this month.`);
    if (thisMonthSpend > thisMonthIncome && thisMonthIncome > 0) recommendations.push(`🚨 You're spending more than you earn this month.`);
    if (recurring.length > 0) recommendations.push(`🔄 You have ${recurring.length} recurring payment pattern(s) detected.`);
    if (recommendations.length === 0) recommendations.push(`✅ Your spending looks healthy this month. Keep it up!`);

    sendSuccess(res, 200, 'Spending analysis', {
      summary: {
        thisMonthSpend:   parseFloat(thisMonthSpend.toFixed(2)),
        prevMonthSpend:   parseFloat(prevMonthSpend.toFixed(2)),
        thisMonthIncome:  parseFloat(thisMonthIncome.toFixed(2)),
        spendChange:      parseFloat(spendChange.toFixed(2)),
        savingsRate:      parseFloat(savingsRate.toFixed(2)),
        avgDailySpend:    parseFloat(avgDailySpend.toFixed(2)),
        largestExpense:   largest ? { amount: largest.amount, description: largest.description, date: largest.createdAt } : null,
        recurringCount:   recurring.length,
      },
      monthlyTrend,
      recurring,
      recommendations,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to generate spending analysis');
  }
};

// ── AI Chatbot ────────────────────────────────────────────────────

const chatbot = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return sendError(res, 400, 'Message is required');

    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');

    const q = message.toLowerCase();

    // Fetch data lazily based on query type
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let reply = '';

    if (q.includes('balance')) {
      reply = `Your current balance is **$${account.balance.toFixed(2)}**.`;

    } else if (q.includes('spend') || q.includes('spent') || q.includes('expense')) {
      const txns = await Transaction.find({ accountId: account._id, type: { $in: ['withdrawal', 'transfer_out'] }, createdAt: { $gte: monthStart } }).lean();
      const total = txns.reduce((s, t) => s + t.amount, 0);
      reply = `You've spent **$${total.toFixed(2)}** this month across ${txns.length} transaction(s).`;

    } else if (q.includes('biggest') || q.includes('largest')) {
      const txns = await Transaction.find({ accountId: account._id, type: { $in: ['withdrawal', 'transfer_out'] } }).sort({ amount: -1 }).limit(1).lean();
      if (txns.length) reply = `Your largest expense was **$${txns[0].amount.toFixed(2)}** — "${txns[0].description}" on ${new Date(txns[0].createdAt).toLocaleDateString()}.`;
      else reply = 'No expense transactions found yet.';

    } else if (q.includes('transfer') && (q.includes('many') || q.includes('how'))) {
      const count = await Transaction.countDocuments({ accountId: account._id, type: 'transfer_out', createdAt: { $gte: monthStart } });
      reply = `You made **${count} transfer(s)** this month.`;

    } else if (q.includes('income') || q.includes('received') || q.includes('credit')) {
      const txns = await Transaction.find({ accountId: account._id, type: { $in: ['deposit', 'transfer_in'] }, createdAt: { $gte: monthStart } }).lean();
      const total = txns.reduce((s, t) => s + t.amount, 0);
      reply = `You received **$${total.toFixed(2)}** this month across ${txns.length} credit(s).`;

    } else if (q.includes('highest') || q.includes('most expensive month')) {
      const monthlyAgg = await Transaction.aggregate([
        { $match: { accountId: account._id, type: { $in: ['withdrawal', 'transfer_out'] } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }, { $limit: 1 },
      ]);
      if (monthlyAgg.length) {
        const { y, m } = monthlyAgg[0]._id;
        reply = `Your highest-spending month was **${new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}** with $${monthlyAgg[0].total.toFixed(2)}.`;
      } else reply = 'Not enough data to determine this yet.';

    } else if (q.includes('transaction') && (q.includes('count') || q.includes('many') || q.includes('total'))) {
      const count = await Transaction.countDocuments({ accountId: account._id });
      reply = `You have **${count} total transaction(s)** on your account.`;

    } else if (q.includes('recent') || q.includes('last')) {
      const txns = await Transaction.find({ accountId: account._id }).sort({ createdAt: -1 }).limit(3).lean();
      if (txns.length) {
        reply = `Your last ${txns.length} transactions:\n` +
          txns.map(t => `• ${t.type}: $${t.amount.toFixed(2)} — ${t.description}`).join('\n');
      } else reply = 'No transactions yet.';

    } else if (q.includes('saving') || q.includes('save')) {
      const income  = await Transaction.find({ accountId: account._id, type: { $in: ['deposit', 'transfer_in'] },   createdAt: { $gte: monthStart } }).lean();
      const expense = await Transaction.find({ accountId: account._id, type: { $in: ['withdrawal', 'transfer_out'] }, createdAt: { $gte: monthStart } }).lean();
      const totalIncome  = income.reduce((s, t)  => s + t.amount, 0);
      const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
      const saved = totalIncome - totalExpense;
      reply = saved >= 0
        ? `You've **saved $${saved.toFixed(2)}** this month (${totalIncome > 0 ? ((saved / totalIncome) * 100).toFixed(0) : 0}% savings rate).`
        : `You've spent **$${Math.abs(saved).toFixed(2)} more** than you earned this month.`;

    } else {
      reply = `I can help you with:\n• Current balance\n• Monthly spending\n• Largest transaction\n• Number of transfers\n• Monthly income\n• Savings rate\n• Recent transactions\n• Highest expense month\n\nTry asking: *"What is my current balance?"*`;
    }

    sendSuccess(res, 200, 'Chatbot response', { reply, timestamp: new Date() });
  } catch {
    sendError(res, 500, 'Chatbot failed to respond');
  }
};

// ── Fraud Summary (for admin) ─────────────────────────────────────

const getFraudSummary = async (req, res) => {
  try {
    const suspicious = await Transaction.find({ isSuspicious: true })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    sendSuccess(res, 200, 'Fraud summary', { suspicious, count: suspicious.length });
  } catch { sendError(res, 500, 'Failed to get fraud summary'); }
};

module.exports = { getSpendingAnalysis, chatbot, getFraudSummary };
