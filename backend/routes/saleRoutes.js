const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, updateSale, updateSalePayment, getTopSellingProducts, getTopSellingCategories, getProductSoldCounts, getRecentSales, getSalesStats, deleteSale, processReturn } = require('../controllers/saleController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/top-selling', protect, checkSubscription, getTopSellingProducts);
router.get('/top-categories', protect, checkSubscription, getTopSellingCategories);
router.get('/product-sold-counts', protect, checkSubscription, getProductSoldCounts);
router.get('/recent', protect, checkSubscription, getRecentSales);
router.get('/stats', protect, checkSubscription, getSalesStats);
router.get('/', protect, checkSubscription, getSales);
router.get('/:id', protect, checkSubscription, getSale);
router.post('/', protect, checkSubscription, createSale);
router.put('/:id', protect, checkSubscription, updateSale);
router.put('/:id/payment', protect, checkSubscription, updateSalePayment);
router.post('/:id/return', protect, checkSubscription, processReturn);
router.delete('/:id', protect, checkSubscription, deleteSale);

module.exports = router;
