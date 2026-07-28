const express = require('express');
const router = express.Router();
const { getShops, getShop, createShop, updateShop, toggleShopStatus, getMyShop, getShopStats, getShopDetailStats, getShopActivities, updateMyShopSettings, getShopBackup, restoreShopBackup, restoreDefaultCategories } = require('../controllers/shopController');
const { protect, authorize, checkSubscription } = require('../middlewares/auth');

router.get('/stats', protect, authorize('super_admin'), getShopStats);
router.get('/my', protect, checkSubscription, getMyShop);
router.put('/settings', protect, checkSubscription, updateMyShopSettings);
router.get('/backup', protect, checkSubscription, getShopBackup);
router.post('/restore', protect, checkSubscription, restoreShopBackup);
router.post('/seed-categories', protect, checkSubscription, restoreDefaultCategories);
router.get('/', protect, authorize('super_admin'), getShops);
router.post('/', protect, authorize('super_admin'), createShop);
router.get('/:id/stats', protect, authorize('super_admin'), getShopDetailStats);
router.get('/:id/activities', protect, authorize('super_admin'), getShopActivities);
router.get('/:id', protect, checkSubscription, getShop);
router.put('/:id', protect, checkSubscription, updateShop);
router.put('/:id/toggle-status', protect, authorize('super_admin'), toggleShopStatus);

module.exports = router;
