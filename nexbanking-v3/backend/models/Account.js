const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accountNumber: {
      type: String,
      unique: true,
      default: () => {
        const num = Math.floor(1000000000 + Math.random() * 9000000000);
        return `NEX${num}`;
      },
    },
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'investment'],
      default: 'savings',
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    dailyTransferLimit: {
      type: Number,
      default: 10000,
    },
    totalDeposited: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
