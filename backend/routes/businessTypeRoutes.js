const express = require('express');
const router = express.Router();
const { getBusinessTypes, getBusinessType } = require('../controllers/businessTypeController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', protect, authorize('super_admin'), getBusinessTypes);
router.get('/:key', protect, authorize('super_admin'), getBusinessType);

module.exports = router;