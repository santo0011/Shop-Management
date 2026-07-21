const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { getSupplierDetails } = require('../controllers/supplierDetailsController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getSuppliers);
router.get('/:id', protect, getSupplier);
router.get('/:id/details', protect, getSupplierDetails);
router.post('/', protect, createSupplier);
router.put('/:id', protect, updateSupplier);
router.delete('/:id', protect, deleteSupplier);

module.exports = router;