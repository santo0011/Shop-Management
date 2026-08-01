const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory, bulkDeleteCategories } = require('../controllers/categoryController');
const { getCategoryDetails } = require('../controllers/categoryDetailsController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/', protect, checkSubscription, getCategories);
router.post('/bulk-delete', protect, checkSubscription, bulkDeleteCategories);
router.get('/:id', protect, checkSubscription, getCategory);
router.get('/:id/details', protect, checkSubscription, getCategoryDetails);
router.post('/', protect, checkSubscription, createCategory);
router.put('/:id', protect, checkSubscription, updateCategory);
router.delete('/:id', protect, checkSubscription, deleteCategory);

module.exports = router;
