const express = require('express');
const router = express.Router();
const { getReportsAnalytics, getStockReport, getCustomerDueReport, getSupplierDueReport, getTaxReport } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

router.get('/analytics', protect, getReportsAnalytics);
router.get('/stock', protect, getStockReport);
router.get('/customer-due', protect, getCustomerDueReport);
router.get('/supplier-due', protect, getSupplierDueReport);
router.get('/tax', protect, getTaxReport);

module.exports = router;