const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
      
      if (!req.user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
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
  
  const Shop = require('../models/Shop');
  const shop = await Shop.findById(req.user.shop);
  
  if (!shop) {
    return res.status(404).json({ message: 'Shop not found' });
  }

  const subscriptionEnd = shop.subscriptionStatus === 'trial' ? shop.trialEndsAt : null;
  
  if (shop.subscriptionStatus === 'expired' || 
      (shop.subscriptionStatus === 'trial' && shop.trialEndsAt < new Date())) {
    // Allow access only to limited pages
    const allowedPaths = [
      '/api/subscription',
      '/api/auth/profile',
      '/api/auth/update-password',
      '/api/shop'
    ];
    
    const isAllowed = allowedPaths.some(path => req.originalUrl.startsWith(path));
    if (!isAllowed && req.method !== 'GET') {
      return res.status(403).json({ 
        message: 'Your subscription has expired. Please renew to continue.',
        subscriptionExpired: true 
      });
    }
  }
  
  next();
};

module.exports = { protect, authorize, checkSubscription };