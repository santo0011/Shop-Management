const express = require('express');
const router = express.Router();
const { getPlans, getAllPlans, createPlan, updatePlan, deletePlan, togglePlanStatus } = require('../controllers/planController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', getPlans);
router.get('/all', protect, authorize('super_admin'), getAllPlans);
router.post('/', protect, authorize('super_admin'), createPlan);
router.put('/:id', protect, authorize('super_admin'), updatePlan);
router.delete('/:id', protect, authorize('super_admin'), deletePlan);
router.put('/:id/toggle-status', protect, authorize('super_admin'), togglePlanStatus);

module.exports = router;