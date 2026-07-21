const express = require('express');
const router = express.Router();
const { getDashboardStats, getSalesChart, getTopProducts, getProfitExpense, getPaymentDistribution, getSalesByCategory, getRecentTransactions } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/auth');

router.get('/stats', protect, getDashboardStats);
router.get('/sales-chart', protect, getSalesChart);
router.get('/top-products', protect, getTopProducts);
router.get('/recent-transactions', protect, getRecentTransactions);
router.get('/profit-expense', protect, getProfitExpense);
router.get('/payment-distribution', protect, getPaymentDistribution);
router.get('/sales-by-category', protect, getSalesByCategory);

module.exports = router;