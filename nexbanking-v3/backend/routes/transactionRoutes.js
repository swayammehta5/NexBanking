const express = require('express');
const router = express.Router();
const { deposit } = require('../controllers/depositController');
const { withdraw } = require('../controllers/withdrawController');
const { transfer } = require('../controllers/transferController');
const { getTransactions, getRecentTransactions } = require('../controllers/transactionHistoryController');
const { protect } = require('../middleware/authMiddleware');
const { depositValidators, withdrawValidators, transferValidators } = require('../validators/transactionValidators');

router.get('/', protect, getTransactions);
router.get('/recent', protect, getRecentTransactions);
router.post('/deposit', protect, depositValidators, deposit);
router.post('/withdraw', protect, withdrawValidators, withdraw);
router.post('/transfer', protect, transferValidators, transfer);

module.exports = router;
