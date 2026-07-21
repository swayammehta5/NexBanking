const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: {
      type: String,
      enum: [
        'login', 'logout', 'transfer', 'deposit', 'withdrawal',
        'profile_update', 'password_change', 'beneficiary_added',
        'beneficiary_deleted', 'admin_freeze', 'admin_unfreeze',
        'admin_deactivate', 'admin_password_reset',
      ],
      required: true,
    },
    description: { type: String, maxlength: 300 },
    ip:          { type: String },
    userAgent:   { type: String },
    metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
