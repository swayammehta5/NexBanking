const express = require('express');
const router = express.Router();
const { getAccount, getAccountStats } = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAccount);
router.get('/stats', protect, getAccountStats);

module.exports = router;
