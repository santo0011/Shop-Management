const crypto = require('crypto');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');
const { sendForgotPasswordEmail, sendResetSuccessEmail } = require('../services/emailService');

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
    }

    user.lastLogin = new Date();
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    let shop = null;
    if (user.shop) {
      shop = await Shop.findById(user.shop);
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      language: user.language,
      theme: user.theme,
      shop: user.shop,
      shopName: shop?.name || '',
      shopLogo: shop?.logo || '',
      shopStatus: shop?.isActive ? 'active' : 'inactive',
      subscriptionStatus: shop?.subscriptionStatus || 'trial',
      token,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('shop', 'name logo address phone subscriptionStatus');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.language = req.body.language || user.language;
    user.theme = req.body.theme || user.theme;
    
    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      language: updatedUser.language,
      theme: updatedUser.theme,
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.refreshToken = null;
    await user.save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot password — send reset email
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Always return the same message to prevent email enumeration
    const genericMsg = 'If an account with that email exists, a password reset link has been sent.';

    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpire');
    if (!user) {
      console.log(`[Auth] Forgot password requested for non-existent email: ${email}`);
      return res.json({ message: genericMsg });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Send email
    const sent = await sendForgotPasswordEmail({
      email: user.email,
      name: user.name,
      token: resetToken,
    });

    if (sent) {
      console.log(`[Auth] Password reset email sent to ${email}`);
    } else {
      console.error(`[Auth] Failed to send password reset email to ${email}`);
      // Clear the token if email failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ message: 'Unable to send email. Please try again later.' });
    }

    res.json({ message: genericMsg });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error.message);
    res.status(500).json({ message: 'Unable to process request. Please try again later.' });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming token to match stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire +password');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    // Send confirmation email
    await sendResetSuccessEmail({ email: user.email, name: user.name });

    console.log(`[Auth] Password reset successful for ${user.email}`);

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error.message);
    res.status(500).json({ message: 'Unable to reset password. Please try again.' });
  }
};

module.exports = {
  login,
  refreshToken,
  getProfile,
  updateProfile,
  updatePassword,
  logout,
  forgotPassword,
  resetPassword,
};
