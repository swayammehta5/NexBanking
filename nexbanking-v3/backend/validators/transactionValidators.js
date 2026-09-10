const { body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const pinField = body('transactionPin')
  .exists()
  .withMessage('Transaction PIN is required')
  .isString()
  .matches(/^\d{4}$/)
  .withMessage('Transaction PIN must be exactly 4 digits');

const depositValidators = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  body('description').optional().trim().isLength({ max: 200 }),
  pinField,
  handleValidationErrors,
];

const withdrawValidators = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  body('description').optional().trim().isLength({ max: 200 }),
  pinField,
  handleValidationErrors,
];

const transferValidators = [
  body('amount')
    .isFloat({ min: 0.01, max: 100000 })
    .withMessage('Transfer amount must be between $0.01 and $100,000'),
  body('recipientAccountNumber')
    .trim()
    .notEmpty()
    .withMessage('Recipient account number is required'),
  body('description').optional().trim().isLength({ max: 200 }),
  pinField,
  handleValidationErrors,
];

module.exports = { depositValidators, withdrawValidators, transferValidators };
