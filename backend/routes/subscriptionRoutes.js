const express = require('express');
const router = express.Router();
const { subscribe, getSubscriptionHistory, getAllSubscriptions, getSubscriptionStatus, getSubscriptionRevenue } = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middlewares/auth');

router.post('/subscribe', protect, subscribe);
router.get('/history', protect, getSubscriptionHistory);
router.get('/all', protect, authorize('super_admin'), getAllSubscriptions);
router.get('/status', protect, getSubscriptionStatus);
router.get('/revenue', protect, authorize('super_admin'), getSubscriptionRevenue);

module.exports = router;