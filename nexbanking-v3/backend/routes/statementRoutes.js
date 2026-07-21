const express = require('express');
const router  = express.Router();
const { downloadPDF, downloadCSV } = require('../controllers/statementController');
const { protect } = require('../middleware/authMiddleware');

router.get('/pdf', protect, downloadPDF);
router.get('/csv', protect, downloadCSV);

module.exports = router;
