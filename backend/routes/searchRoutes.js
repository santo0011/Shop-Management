const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');
const { protect, checkSubscription } = require('../middlewares/auth');

router.get('/', protect, checkSubscription, globalSearch);

module.exports = router;
