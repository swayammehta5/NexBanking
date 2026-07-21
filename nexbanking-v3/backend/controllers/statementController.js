const PDFDocument = require('pdfkit');
const Account     = require('../models/Account');
const Transaction = require('../models/Transaction');
const User        = require('../models/User');
const { sendError } = require('../utils/apiResponse');

/** GET /api/statement/pdf?startDate=&endDate= */
const downloadPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user    = await User.findById(req.user._id);
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');

    const filter = { accountId: account._id };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    const transactions = await Transaction.find(filter).sort({ createdAt: 1 }).lean();

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=NexBanking-Statement-${Date.now()}.pdf`);
    doc.pipe(res);

    // ── Header ────────────────────────────────────────────────────
    doc.fontSize(22).fillColor('#1e40af').text('NexBanking', { align: 'left' });
    doc.fontSize(10).fillColor('#64748b').text('Secure Digital Banking', { align: 'left' });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#1e40af').lineWidth(2).stroke();
    doc.moveDown(0.8);

    // ── Account Info ──────────────────────────────────────────────
    doc.fontSize(11).fillColor('#0f172a');
    doc.text(`Account Holder: ${user.firstName} ${user.lastName}`);
    doc.text(`Account Number: ${account.accountNumber}`);
    doc.text(`Account Type:   ${account.accountType.toUpperCase()}`);
    doc.text(`Statement Date: ${new Date().toDateString()}`);
    if (startDate || endDate) {
      doc.text(`Period: ${startDate || 'Inception'} — ${endDate || 'Present'}`);
    }
    doc.moveDown(0.8);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.moveDown(0.8);

    // ── Table Header ──────────────────────────────────────────────
    const cols = { date: 40, id: 110, type: 230, amount: 330, status: 430, balance: 490 };
    doc.fontSize(9).fillColor('#1e40af');
    doc.text('Date',      cols.date,   doc.y, { width: 65, continued: true });
    doc.text('Txn ID',    cols.id,     doc.y, { width: 110, continued: true });
    doc.text('Type',      cols.type,   doc.y, { width: 90,  continued: true });
    doc.text('Amount',    cols.amount, doc.y, { width: 90,  continued: true });
    doc.text('Status',    cols.status, doc.y, { width: 55,  continued: true });
    doc.text('Balance',   cols.balance, doc.y, { width: 65 });
    doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#94a3b8').stroke();
    doc.moveDown(0.4);

    // ── Rows ──────────────────────────────────────────────────────
    doc.fontSize(8).fillColor('#1e293b');
    let rowY = doc.y;
    transactions.forEach((txn, i) => {
      if (rowY > 720) { doc.addPage(); rowY = 40; }
      const isCredit = ['deposit', 'transfer_in'].includes(txn.type);
      const color    = isCredit ? '#16a34a' : '#dc2626';
      const sign     = isCredit ? '+' : '-';
      const fill     = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(40, rowY - 2, 515, 14).fill(fill).fillColor('#1e293b');

      doc.text(new Date(txn.createdAt).toLocaleDateString(), cols.date,   rowY, { width: 65, continued: true });
      doc.text(txn.transactionId.slice(-10),                 cols.id,     rowY, { width: 110, continued: true });
      doc.text(txn.type.replace('_', ' '),                   cols.type,   rowY, { width: 90,  continued: true });
      doc.fillColor(color)
         .text(`${sign}$${txn.amount.toFixed(2)}`,           cols.amount, rowY, { width: 90, continued: true });
      doc.fillColor('#64748b')
         .text(txn.status,                                   cols.status, rowY, { width: 55, continued: true });
      doc.fillColor('#0f172a')
         .text(`$${txn.balanceAfter.toFixed(2)}`,            cols.balance, rowY, { width: 65 });
      rowY += 15;
      doc.y = rowY;
    });

    if (transactions.length === 0) {
      doc.fontSize(10).fillColor('#94a3b8').text('No transactions found for the selected period.', { align: 'center' });
    }

    // ── Footer ────────────────────────────────────────────────────
    doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).strokeColor('#cbd5e1').stroke();
    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#64748b');
    doc.text(`Closing Balance: $${account.balance.toFixed(2)}`, { align: 'right' });
    doc.text('This is a system-generated statement. No signature required.', { align: 'center' });

    doc.end();
  } catch (err) {
    sendError(res, 500, 'Failed to generate PDF');
  }
};

/** GET /api/statement/csv?startDate=&endDate= */
const downloadCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) return sendError(res, 404, 'Account not found');

    const filter = { accountId: account._id };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    const transactions = await Transaction.find(filter).sort({ createdAt: 1 }).lean();

    const headers = ['Transaction ID', 'Date', 'Time', 'Type', 'Amount', 'Balance Before', 'Balance After', 'Description', 'Recipient', 'Sender', 'Status'];
    const rows = transactions.map(t => [
      t.transactionId,
      new Date(t.createdAt).toLocaleDateString(),
      new Date(t.createdAt).toLocaleTimeString(),
      t.type,
      t.amount.toFixed(2),
      t.balanceBefore.toFixed(2),
      t.balanceAfter.toFixed(2),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.recipientAccountNumber || '',
      t.senderAccountNumber    || '',
      t.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=NexBanking-Statement-${Date.now()}.csv`);
    res.send(csvContent);
  } catch {
    sendError(res, 500, 'Failed to generate CSV');
  }
};

module.exports = { downloadPDF, downloadCSV };
