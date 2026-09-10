const express = require('express');
const router = express.Router();
const {
  getBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  toggleFavorite,
} = require('../controllers/beneficiaryController');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidators');

const createValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('accountNumber').trim().notEmpty().withMessage('Account number is required'),
  body('nickname').optional({ nullable: true }).trim().isLength({ max: 50 }),
  handleValidationErrors,
];

const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
  body('nickname').optional({ nullable: true }).trim().isLength({ max: 50 }),
  handleValidationErrors,
];

router.get('/', protect, getBeneficiaries);
router.post('/', protect, createValidators, addBeneficiary);
router.put('/:id', protect, updateValidators, updateBeneficiary);
router.delete('/:id', protect, deleteBeneficiary);
router.patch('/:id/favorite', protect, toggleFavorite);

module.exports = router;
