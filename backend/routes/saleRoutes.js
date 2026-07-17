const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, updateSalePayment, getTopSellingProducts, getRecentSales, getSalesStats, deleteSale, processReturn } = require('../controllers/saleController');
const { protect } = require('../middlewares/auth');

router.get('/top-selling', protect, getTopSellingProducts);
router.get('/recent', protect, getRecentSales);
router.get('/stats', protect, getSalesStats);
router.get('/', protect, getSales);
router.get('/:id', protect, getSale);
router.post('/', protect, createSale);
router.put('/:id/payment', protect, updateSalePayment);
router.post('/:id/return', protect, processReturn);
router.delete('/:id', protect, deleteSale);

module.exports = router;
