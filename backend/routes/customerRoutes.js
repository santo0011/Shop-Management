const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, addLoyaltyPoints, redeemLoyaltyPoints } = require('../controllers/customerController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomer);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, deleteCustomer);
router.put('/:id/loyalty/add', protect, addLoyaltyPoints);
router.put('/:id/loyalty/redeem', protect, redeemLoyaltyPoints);

module.exports = router;