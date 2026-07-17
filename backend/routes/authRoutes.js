const express = require('express');
const router = express.Router();
const { login, refreshToken, getProfile, updateProfile, updatePassword, logout } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/update-password', protect, updatePassword);
router.post('/logout', protect, logout);

module.exports = router;
