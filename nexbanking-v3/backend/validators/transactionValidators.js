const { body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const depositValidators = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  handleValidationErrors,
];

const withdrawValidators = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }),
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
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  handleValidationErrors,
];

module.exports = { depositValidators, withdrawValidators, transferValidators };
