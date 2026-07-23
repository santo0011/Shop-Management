const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Authoritative shop-status check runs BEFORE the individual
      // User.isActive check and BEFORE anything else. This must not be
      // gated behind req.user.isActive: toggleShopStatus (shopController.js)
      // bulk-sets isActive=false on every user of a deactivated shop, so by
      // the time this middleware next runs for them, req.user.isActive is
      // already false. If the isActive check ran first it would swallow
      // every shop-deactivation case behind a generic "Account is
      // deactivated" response, and the shop-specific code below would never
      // be reached — which is exactly why the frontend never saw a
      // distinguishable signal to act on. Checking Shop.isActive directly,
      // first, and independent of the mirror guarantees deactivation takes
      // effect immediately, on the very next request, for every user of
      // that shop, regardless of their own isActive flag's state.
      if (req.user.role !== 'super_admin' && req.user.shop) {
        const shop = await Shop.findById(req.user.shop).select('isActive');
        if (!shop || !shop.isActive) {
          return res.status(403).json({
            success: false,
            code: 'SHOP_DEACTIVATED',
            message: 'Your shop has been deactivated by the Super Admin.',
          });
        }
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Account is deactivated',
        });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired', expired: true });
      }
      return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized to access this resource` 
      });
    }
    next();
  };
};

const checkSubscription = async (req, res, next) => {
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  const shop = await Shop.findById(req.user.shop);
  
  if (!shop) {
    return res.status(404).json({ message: 'Shop not found' });
  }

  const now = new Date();
  const isExpired = shop.subscriptionStatus === 'expired' || 
    (shop.subscriptionStatus === 'active' && shop.subscription && await checkIfExpired(shop.subscription)) ||
    (shop.subscriptionStatus === 'trial' && shop.trialEndsAt < now);
  
  if (isExpired) {
    // Auto-update status if needed
    if (shop.subscriptionStatus !== 'expired') {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    }
    
    // Allow access only to limited endpoints
    const allowedPaths = [
      '/api/subscription',
      '/api/auth',
      '/api/shop',
      '/api/notifications',
    ];
    
    const isAllowed = allowedPaths.some(path => req.originalUrl.startsWith(path));
    
    // For GET requests to dashboard, allow subscription status info
    const isDashboardStatus = req.originalUrl.startsWith('/api/dashboard') && req.method === 'GET';
    
    if (!isAllowed && !isDashboardStatus) {
      return res.status(403).json({ 
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please contact the Super Admin to renew your subscription.',
        subscriptionExpired: true 
      });
    }
  }
  
  next();
};

// Helper to check if subscription is expired
const checkIfExpired = async (subscriptionId) => {
  try {
    const sub = await require('../models/Subscription').findById(subscriptionId);
    return sub && sub.endDate < new Date();
  } catch {
    return false;
  }
};

module.exports = { protect, authorize, checkSubscription };