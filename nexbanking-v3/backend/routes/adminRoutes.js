const express = require('express');
const router  = express.Router();
const { getDashboardStats, getAllUsers, getUserDetail, setUserStatus, adminResetPassword, deleteUser, getAllTransactions, getActivityLogs } = require('../controllers/adminController');
const { protect }    = require('../middleware/authMiddleware');
const { adminOnly }  = require('../middleware/adminMiddleware');

router.use(protect, adminOnly);

router.get('/stats',                      getDashboardStats);
router.get('/users',                      getAllUsers);
router.get('/users/:id',                  getUserDetail);
router.patch('/users/:id/status',         setUserStatus);
router.patch('/users/:id/reset-password', adminResetPassword);
router.delete('/users/:id',              deleteUser);
router.get('/transactions',               getAllTransactions);
router.get('/logs',                       getActivityLogs);

module.exports = router;
