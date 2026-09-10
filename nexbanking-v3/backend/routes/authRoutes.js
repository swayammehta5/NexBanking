const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  setTransactionPin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { registerValidators, loginValidators } = require('../validators/authValidators');

router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/transaction-pin', protect, setTransactionPin);

module.exports = router;
