const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getRevenueReports,
  getBusinessReports,
  getActivityLogs,
  getGlobalSettings,
  updateGlobalSettings,
  downloadBackup,
  restoreBackup,
} = require('../controllers/superAdminController');
const { protect, authorize } = require('../middlewares/auth');

// Dashboard
router.get('/dashboard', protect, authorize('super_admin'), getDashboardData);

// Reports
router.get('/revenue-reports', protect, authorize('super_admin'), getRevenueReports);
router.get('/business-reports', protect, authorize('super_admin'), getBusinessReports);

// Activity Logs
router.get('/activity-logs', protect, authorize('super_admin'), getActivityLogs);

// Global Settings
router.get('/settings', protect, authorize('super_admin'), getGlobalSettings);
router.put('/settings', protect, authorize('super_admin'), updateGlobalSettings);

// Backup & Restore
router.get('/backup', protect, authorize('super_admin'), downloadBackup);
router.post('/restore', protect, authorize('super_admin'), restoreBackup);

module.exports = router;