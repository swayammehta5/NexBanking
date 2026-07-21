const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * notificationService.js
 * Central service for creating notifications. Import this anywhere.
 */

const TEMPLATES = {
  credit: (amount, balance) => ({
    title: '💰 Money Credited',
    message: `$${amount.toFixed(2)} has been credited to your account. New balance: $${balance.toFixed(2)}`,
  }),
  debit: (amount, balance) => ({
    title: '💸 Money Debited',
    message: `$${amount.toFixed(2)} has been debited from your account. New balance: $${balance.toFixed(2)}`,
  }),
  transfer: (amount, to) => ({
    title: '↗️ Transfer Sent',
    message: `$${amount.toFixed(2)} transferred to account ${to}.`,
  }),
  transfer_received: (amount, from) => ({
    title: '↙️ Transfer Received',
    message: `$${amount.toFixed(2)} received from account ${from}.`,
  }),
  beneficiary_added: (name) => ({
    title: '👤 Beneficiary Added',
    message: `${name} has been added to your beneficiaries.`,
  }),
  password_changed: () => ({
    title: '🔐 Password Changed',
    message: 'Your account password was changed. If this was not you, contact support immediately.',
  }),
  new_login: (ip) => ({
    title: '🔔 New Login Detected',
    message: `A new login was detected from IP ${ip}. If this was not you, secure your account.`,
  }),
  fraud_alert: (amount, reason) => ({
    title: '🚨 Suspicious Transaction Detected',
    message: `A transaction of $${amount.toFixed(2)} was flagged: ${reason}`,
  }),
};

/**
 * Create a notification for a user.
 * @param {string} userId
 * @param {string} type  - matches Notification model enum
 * @param {Object} templateArgs - spread into the template function
 * @param {Object} metadata - optional extra data
 */
const createNotification = async (userId, type, templateArgs = [], metadata = {}) => {
  try {
    const template = TEMPLATES[type];
    if (!template) return;
    const { title, message } = template(...templateArgs);
    await Notification.create({ userId, type, title, message, metadata });
  } catch (err) {
    logger.error(`Failed to create notification: ${err.message}`);
  }
};

module.exports = { createNotification };
