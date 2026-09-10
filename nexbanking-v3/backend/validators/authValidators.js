const { body, validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, 'Validation failed', errors.array());
  }
  next();
};

const registerValidators = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('transactionPin')
    .exists({ values: 'falsy' }).withMessage('Transaction PIN is required')
    .isString().withMessage('Transaction PIN must be exactly 4 digits')
    .matches(/^\d{4}$/).withMessage('Transaction PIN must be exactly 4 digits'),
  body('confirmTransactionPin')
    .exists({ values: 'falsy' }).withMessage('Transaction PIN confirmation is required')
    .isString().withMessage('Transaction PIN confirmation must be exactly 4 digits')
    .custom((value, { req }) => value === req.body.transactionPin)
    .withMessage('Transaction PIN and confirmation do not match'),
  handleValidationErrors,
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

module.exports = { registerValidators, loginValidators, handleValidationErrors };
