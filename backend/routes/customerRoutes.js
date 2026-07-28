const express = require('express');
const router = express.Router();
const {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  addLoyaltyPoints, redeemLoyaltyPoints,
  getCustomerStats, getDueCustomers, getTopCustomers,
  receivePayment, getCustomerPurchases, getCustomerPayments,
  getCustomerLedger, getCustomerDueSummary,
} = require('../controllers/customerController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/', protect, checkSubscription, getCustomers);
router.get('/stats', protect, checkSubscription, getCustomerStats);
router.get('/due', protect, checkSubscription, getDueCustomers);
router.get('/top', protect, checkSubscription, getTopCustomers);
router.get('/:id', protect, checkSubscription, getCustomer);
router.get('/:id/purchases', protect, checkSubscription, getCustomerPurchases);
router.get('/:id/payments', protect, checkSubscription, getCustomerPayments);
router.get('/:id/ledger', protect, checkSubscription, getCustomerLedger);
router.get('/:id/due-summary', protect, checkSubscription, getCustomerDueSummary);
router.post('/', protect, checkSubscription, createCustomer);
router.put('/:id', protect, checkSubscription, updateCustomer);
router.delete('/:id', protect, checkSubscription, deleteCustomer);
router.put('/:id/loyalty/add', protect, checkSubscription, addLoyaltyPoints);
router.put('/:id/loyalty/redeem', protect, checkSubscription, redeemLoyaltyPoints);
router.post('/:id/payment', protect, checkSubscription, receivePayment);

module.exports = router;