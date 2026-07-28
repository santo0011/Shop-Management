const express = require('express');
const router = express.Router();
const { getReportsAnalytics, getStockReport, getCustomerDueReport, getSupplierDueReport, getGstReport, getGstReportDetails } = require('../controllers/reportController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/analytics', protect, checkSubscription, getReportsAnalytics);
router.get('/stock', protect, checkSubscription, getStockReport);
router.get('/customer-due', protect, checkSubscription, getCustomerDueReport);
router.get('/supplier-due', protect, checkSubscription, getSupplierDueReport);
router.get('/gst/details', protect, checkSubscription, getGstReportDetails);
router.get('/gst', protect, checkSubscription, getGstReport);

module.exports = router;