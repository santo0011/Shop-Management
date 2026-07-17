const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, updateSalePayment } = require('../controllers/saleController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getSales);
router.get('/:id', protect, getSale);
router.post('/', protect, createSale);
router.put('/:id/payment', protect, updateSalePayment);

module.exports = router;