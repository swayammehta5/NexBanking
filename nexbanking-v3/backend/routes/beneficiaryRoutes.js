const express = require('express');
const router  = express.Router();
const { getBeneficiaries, addBeneficiary, updateBeneficiary, deleteBeneficiary, toggleFavorite } = require('../controllers/beneficiaryController');
const { protect } = require('../middleware/authMiddleware');
const { body }    = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidators');

const validators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('accountNumber').trim().notEmpty().withMessage('Account number is required'),
  body('bankName').trim().notEmpty().withMessage('Bank name is required'),
  handleValidationErrors,
];

router.get('/',                     protect, getBeneficiaries);
router.post('/',                    protect, validators, addBeneficiary);
router.put('/:id',                  protect, updateBeneficiary);
router.delete('/:id',              protect, deleteBeneficiary);
router.patch('/:id/favorite',      protect, toggleFavorite);

module.exports = router;
