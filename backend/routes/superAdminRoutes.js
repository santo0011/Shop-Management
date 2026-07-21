const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/superAdminController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/dashboard', protect, authorize('super_admin'), getDashboardData);

module.exports = router;