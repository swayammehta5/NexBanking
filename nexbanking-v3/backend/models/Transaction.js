const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String, unique: true,
      default: () => `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
    },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'],
      required: true,
    },
    amount:        { type: Number, required: true, min: [0.01, 'Amount must be at least 0.01'] },
    balanceBefore: { type: Number, required: true },
    balanceAfter:  { type: Number, required: true },
    description:   { type: String, trim: true, maxlength: 200 },
    recipientAccountNumber: { type: String },
    senderAccountNumber:    { type: String },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed', 'suspicious'],
      default: 'completed',
    },
    // Fraud detection
    isSuspicious: { type: Boolean, default: false },
    fraudFlags:   [{ type: String }],
    metadata:     { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ accountId: 1, createdAt: -1 });

transactionSchema.index({ isSuspicious: 1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
