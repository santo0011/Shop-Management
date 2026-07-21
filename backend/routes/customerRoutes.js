const express = require('express');
const router = express.Router();
const {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  addLoyaltyPoints, redeemLoyaltyPoints,
  getCustomerStats, getDueCustomers, getTopCustomers,
  receivePayment, getCustomerPurchases, getCustomerPayments,
  getCustomerLedger, getCustomerDueSummary,
} = require('../controllers/customerController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getCustomers);
router.get('/stats', protect, getCustomerStats);
router.get('/due', protect, getDueCustomers);
router.get('/top', protect, getTopCustomers);
router.get('/:id', protect, getCustomer);
router.get('/:id/purchases', protect, getCustomerPurchases);
router.get('/:id/payments', protect, getCustomerPayments);
router.get('/:id/ledger', protect, getCustomerLedger);
router.get('/:id/due-summary', protect, getCustomerDueSummary);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, deleteCustomer);
router.put('/:id/loyalty/add', protect, addLoyaltyPoints);
router.put('/:id/loyalty/redeem', protect, redeemLoyaltyPoints);
router.post('/:id/payment', protect, receivePayment);

module.exports = router;