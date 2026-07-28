const express = require('express');
const router = express.Router();
const { getDashboardStats, getSalesChart, getTopProducts, getProfitExpense, getPaymentDistribution, getSalesByCategory, getRecentTransactions } = require('../controllers/dashboardController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/stats', protect, checkSubscription, getDashboardStats);
router.get('/sales-chart', protect, checkSubscription, getSalesChart);
router.get('/top-products', protect, checkSubscription, getTopProducts);
router.get('/recent-transactions', protect, checkSubscription, getRecentTransactions);
router.get('/profit-expense', protect, checkSubscription, getProfitExpense);
router.get('/payment-distribution', protect, checkSubscription, getPaymentDistribution);
router.get('/sales-by-category', protect, checkSubscription, getSalesByCategory);

module.exports = router;