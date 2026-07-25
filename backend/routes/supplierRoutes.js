const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier, bulkDeleteSuppliers } = require('../controllers/supplierController');
const { getSupplierDetails, getSupplierDueSummary, getSupplierLedger, payToSupplier } = require('../controllers/supplierDetailsController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getSuppliers);
router.post('/bulk-delete', protect, bulkDeleteSuppliers);
router.get('/:id', protect, getSupplier);
router.get('/:id/details', protect, getSupplierDetails);
router.get('/:id/due-summary', protect, getSupplierDueSummary);
router.get('/:id/ledger', protect, getSupplierLedger);
router.post('/:id/payment', protect, payToSupplier);
router.post('/', protect, createSupplier);
router.put('/:id', protect, updateSupplier);
router.delete('/:id', protect, deleteSupplier);

module.exports = router;