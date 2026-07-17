const express = require('express');
const router = express.Router();
const { getExpenses, getExpense, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getExpenses);
router.get('/:id', protect, getExpense);
router.post('/', protect, createExpense);
router.put('/:id', protect, updateExpense);
router.delete('/:id', protect, deleteExpense);

module.exports = router;