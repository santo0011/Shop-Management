const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier, bulkDeleteSuppliers } = require('../controllers/supplierController');
const { getSupplierDetails, getSupplierDueSummary, getSupplierLedger, payToSupplier } = require('../controllers/supplierDetailsController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/', protect, checkSubscription, getSuppliers);
router.post('/bulk-delete', protect, checkSubscription, bulkDeleteSuppliers);
router.get('/:id', protect, checkSubscription, getSupplier);
router.get('/:id/details', protect, checkSubscription, getSupplierDetails);
router.get('/:id/due-summary', protect, checkSubscription, getSupplierDueSummary);
router.get('/:id/ledger', protect, checkSubscription, getSupplierLedger);
router.post('/:id/payment', protect, checkSubscription, payToSupplier);
router.post('/', protect, checkSubscription, createSupplier);
router.put('/:id', protect, checkSubscription, updateSupplier);
router.delete('/:id', protect, checkSubscription, deleteSupplier);

module.exports = router;