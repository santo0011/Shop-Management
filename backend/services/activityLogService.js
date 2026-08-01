const ActivityLog = require('../models/ActivityLog');

// Helper to log activity
const logActivity = async ({ user, action, resource, resourceId, details, req }) => {
  try {
    await ActivityLog.create({
      user,
      action,
      resource,
      resourceId,
      details,
      ip: req?.ip || req?.connection?.remoteAddress || 'N/A',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};

module.exports = { logActivity };