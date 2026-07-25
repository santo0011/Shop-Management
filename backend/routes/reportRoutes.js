const express = require('express');
const router = express.Router();
const { getReportsAnalytics, getStockReport, getCustomerDueReport, getSupplierDueReport, getGstReport, getGstReportDetails } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

router.get('/analytics', protect, getReportsAnalytics);
router.get('/stock', protect, getStockReport);
router.get('/customer-due', protect, getCustomerDueReport);
router.get('/supplier-due', protect, getSupplierDueReport);
router.get('/gst/details', protect, getGstReportDetails);
router.get('/gst', protect, getGstReport);

module.exports = router;