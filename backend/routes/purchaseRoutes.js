const express = require('express');
const router = express.Router();
const { getPurchases, getPurchase, createPurchase, updatePurchasePayment, updatePurchaseInvoiceImage, processPurchaseReturn } = require('../controllers/purchaseController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/', protect, checkSubscription, getPurchases);
router.get('/:id', protect, checkSubscription, getPurchase);
router.post('/', protect, checkSubscription, createPurchase);
router.put('/:id/payment', protect, checkSubscription, updatePurchasePayment);
router.put('/:id/invoice-image', protect, checkSubscription, updatePurchaseInvoiceImage);
router.post('/:id/return', protect, checkSubscription, processPurchaseReturn);

module.exports = router;