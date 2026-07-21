const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:          { type: String, required: true, trim: true, maxlength: 100 },
    accountNumber: { type: String, required: true, trim: true },
    bankName:      { type: String, required: true, trim: true, maxlength: 100 },
    ifscCode:      { type: String, trim: true, uppercase: true, maxlength: 20 },
    nickname:      { type: String, trim: true, maxlength: 50 },
    isFavorite:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate beneficiaries per user
beneficiarySchema.index({ userId: 1, accountNumber: 1 }, { unique: true });
beneficiarySchema.index({ userId: 1, isFavorite: -1 });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
