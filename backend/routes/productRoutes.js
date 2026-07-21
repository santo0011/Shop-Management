const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, bulkDeleteProducts, adjustStock, searchProducts } = require('../controllers/productController');
const { getProductDetails } = require('../controllers/productDetailsController');
const { protect } = require('../middlewares/auth');

router.get('/search', protect, searchProducts);
router.get('/', protect, getProducts);
router.post('/bulk-delete', protect, bulkDeleteProducts);
router.get('/:id', protect, getProduct);
router.get('/:id/details', protect, getProductDetails);
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.put('/:id/adjust-stock', protect, adjustStock);

module.exports = router;
