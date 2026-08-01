const express = require('express');
const router = express.Router();
const {
  assignSubscription,
  getSubscriptionHistory,
  getAllSubscriptions,
  getSubscriptionStatus,
  getSubscriptionRevenue,
  cancelSubscription,
  getSubscriptionDetails,
  getExpiringSubscriptions,
  getSubscriptionDashboard,
  subscribe,
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middlewares/auth');

// Admin routes (must be before /:id to avoid route conflict)
router.post('/subscribe', protect, authorize('super_admin'), subscribe);
router.get('/status', protect, getSubscriptionStatus);
router.get('/history', protect, getSubscriptionHistory);

// Super Admin routes
router.post('/assign', protect, authorize('super_admin'), assignSubscription);
router.get('/all', protect, authorize('super_admin'), getAllSubscriptions);
router.get('/revenue', protect, authorize('super_admin'), getSubscriptionRevenue);
router.get('/expiring', protect, authorize('super_admin'), getExpiringSubscriptions);
router.get('/dashboard', protect, authorize('super_admin'), getSubscriptionDashboard);
router.put('/:id/cancel', protect, authorize('super_admin'), cancelSubscription);

// Dynamic route (must be last)
router.get('/:id', protect, getSubscriptionDetails);

module.exports = router;