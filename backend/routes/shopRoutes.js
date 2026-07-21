const express = require('express');
const router = express.Router();
const { getShops, getShop, createShop, updateShop, toggleShopStatus, getMyShop, getShopStats, updateMyShopSettings, getShopBackup, restoreShopBackup, restoreDefaultCategories } = require('../controllers/shopController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/stats', protect, authorize('super_admin'), getShopStats);
router.get('/my', protect, getMyShop);
router.put('/settings', protect, updateMyShopSettings);
router.get('/backup', protect, getShopBackup);
router.post('/restore', protect, restoreShopBackup);
router.post('/seed-categories', protect, restoreDefaultCategories);
router.get('/', protect, authorize('super_admin'), getShops);
router.post('/', protect, authorize('super_admin'), createShop);
router.get('/:id', protect, getShop);
router.put('/:id', protect, updateShop);
router.put('/:id/toggle-status', protect, authorize('super_admin'), toggleShopStatus);

module.exports = router;