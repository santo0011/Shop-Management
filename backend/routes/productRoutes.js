const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, bulkDeleteProducts, adjustStock, searchProducts } = require('../controllers/productController');
const { getProductDetails } = require('../controllers/productDetailsController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/search', protect, checkSubscription, searchProducts);
router.get('/', protect, checkSubscription, getProducts);
router.post('/bulk-delete', protect, checkSubscription, bulkDeleteProducts);
router.get('/:id', protect, checkSubscription, getProduct);
router.get('/:id/details', protect, checkSubscription, getProductDetails);
router.post('/', protect, checkSubscription, createProduct);
router.put('/:id', protect, checkSubscription, updateProduct);
router.delete('/:id', protect, checkSubscription, deleteProduct);
router.put('/:id/adjust-stock', protect, checkSubscription, adjustStock);

module.exports = router;
