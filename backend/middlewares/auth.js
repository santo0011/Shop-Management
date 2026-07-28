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

/**
 * Subscription Protection Middleware
 * 
 * Business Rules:
 * - Super Admin is NEVER restricted
 * - active OR (trial with a subscription document) → Full Access
 * - expired, inactive, queued, cancelled, or trial WITHOUT subscription → Lock Software
 * - If no subscription document exists at all → Lock Software
 * 
 * Locked users can only access:
 * - /api/subscription/*
 * - /api/auth/*
 * - /api/shops/* (profile/settings)
 * - /api/notifications/*
 */
const checkSubscription = async (req, res, next) => {
  // Super Admin is NEVER restricted
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  const shop = await Shop.findById(req.user.shop);
  
  if (!shop) {
    return res.status(404).json({ message: 'Shop not found' });
  }

  const now = new Date();
  const status = shop.subscriptionStatus;

  // Determine effective subscription status
  let effectiveStatus = status;

  // Case 1: No subscription document exists at all → treat as INACTIVE
  // (a shop with no subscription assigned by Super Admin is NOT active)
  const hasNoSubscription = !shop.subscription;

  // Case 2: "trial" status but no subscription was ever assigned → NOT a real trial
  // The Shop model defaults to 'trial' with a 14-day trialEndsAt, but if no subscription
  // document was created, the shop should not get trial access.
  if (status === 'trial' && hasNoSubscription) {
    effectiveStatus = 'inactive';
    shop.subscriptionStatus = 'inactive';
    await shop.save();
  }

  // Case 3: "trial" status with subscription reference but end date passed → expired
  if (status === 'trial' && !hasNoSubscription && shop.trialEndsAt < now) {
    effectiveStatus = 'expired';
    shop.subscriptionStatus = 'expired';
    await shop.save();
  }

  // Case 4: "active" status but subscription end date passed → expired
  if (status === 'active' && !hasNoSubscription) {
    const Subscription = require('../models/Subscription');
    const sub = await Subscription.findById(shop.subscription);
    if (sub && sub.endDate < now) {
      effectiveStatus = 'expired';
      shop.subscriptionStatus = 'expired';
      await shop.save();
    }
  }

  // active and trial (with actual subscription) = Full Access
  if (effectiveStatus === 'active' || (effectiveStatus === 'trial' && !hasNoSubscription)) {
    return next();
  }

  // All other states = Lock Software
  // Only allow: /api/subscription, /api/auth, /api/shops, /api/notifications
  const allowedPaths = [
    '/api/subscription',
    '/api/auth',
    '/api/shops',
    '/api/notifications',
  ];
  
  const isAllowed = allowedPaths.some(path => req.originalUrl.startsWith(path));
  
  if (!isAllowed) {
    return res.status(403).json({ 
      success: false,
      code: 'SUBSCRIPTION_EXPIRED',
      message: 'Your subscription is inactive. Please contact the Super Admin to activate your subscription.',
      subscriptionExpired: true 
    });
  }
  
  next();
};

module.exports = { protect, authorize, checkSubscription };