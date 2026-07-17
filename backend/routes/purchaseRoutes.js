const express = require('express');
const router = express.Router();
const { getPurchases, getPurchase, createPurchase, updatePurchasePayment } = require('../controllers/purchaseController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getPurchases);
router.get('/:id', protect, getPurchase);
router.post('/', protect, createPurchase);
router.put('/:id/payment', protect, updatePurchasePayment);

module.exports = router;