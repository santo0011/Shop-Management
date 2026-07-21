const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory, bulkDeleteCategories } = require('../controllers/categoryController');
const { getCategoryDetails } = require('../controllers/categoryDetailsController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getCategories);
router.post('/bulk-delete', protect, bulkDeleteCategories);
router.get('/:id', protect, getCategory);
router.get('/:id/details', protect, getCategoryDetails);
router.post('/', protect, createCategory);
router.put('/:id', protect, updateCategory);
router.delete('/:id', protect, deleteCategory);

module.exports = router;
