const express = require('express');
const router = express.Router();
const { getDashboardStats, getSalesChart, getTopProducts, getRecentTransactions } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/auth');

router.get('/stats', protect, getDashboardStats);
router.get('/sales-chart', protect, getSalesChart);
router.get('/top-products', protect, getTopProducts);
router.get('/recent-transactions', protect, getRecentTransactions);

module.exports = router;