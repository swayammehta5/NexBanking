const express = require('express');
const router  = express.Router();
const { getSpendingAnalysis, chatbot, getFraudSummary } = require('../controllers/aiController');
const { protect }   = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.get('/analysis',     protect, getSpendingAnalysis);
router.post('/chat',        protect, chatbot);
router.get('/fraud-summary', protect, adminOnly, getFraudSummary);

module.exports = router;
