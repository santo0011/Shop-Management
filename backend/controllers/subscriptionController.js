const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');
const Plan = require('../models/Plan');

// @desc    Subscribe to a plan
// @route   POST /api/subscription/subscribe
const subscribe = async (req, res) => {
  try {
    const { planId, paymentMethod, transactionId } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const shop = await Shop.findById(req.user.shop);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Calculate dates
    const now = new Date();
    let endDate;
    let daysCarriedForward = 0;

    // If renewing before expiry, carry forward remaining days
    if (shop.subscriptionStatus === 'active' && shop.subscription) {
      const currentSub = await Subscription.findById(shop.subscription);
      if (currentSub && currentSub.endDate > now) {
        const remainingDays = Math.ceil((currentSub.endDate - now) / (1000 * 60 * 60 * 24));
        daysCarriedForward = remainingDays;
      }
    }

    const durationMap = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };
    const totalDays = durationMap[plan.duration] + daysCarriedForward;
    endDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

    const discountAmount = (plan.price * plan.discount) / 100;
    const totalAmount = plan.price - discountAmount;

    const subscription = await Subscription.create({
      shop: shop._id,
      plan: plan._id,
      startDate: now,
      endDate,
      amount: plan.price,
      discount: discountAmount,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      transactionId,
      daysCarriedForward,
      status: 'active',
    });

    shop.subscription = subscription._id;
    shop.subscriptionStatus = 'active';
    await shop.save();

    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get subscription history for a shop
// @route   GET /api/subscription/history
const getSubscriptionHistory = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ shop: req.user.shop })
      .populate('plan', 'name nameBn duration price')
      .sort({ createdAt: -1 });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all subscriptions (Super Admin)
// @route   GET /api/subscription/all
const getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const subscriptions = await Subscription.find()
      .populate('shop', 'name phone email')
      .populate('plan', 'name duration price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Subscription.countDocuments();

    res.json({
      subscriptions,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current subscription status
// @route   GET /api/subscription/status
const getSubscriptionStatus = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shop)
      .populate({
        path: 'subscription',
        populate: { path: 'plan', select: 'name nameBn duration price features featuresBn' },
      });

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const now = new Date();
    const isExpired = shop.subscriptionStatus === 'expired' ||
      (shop.subscriptionStatus === 'active' && shop.subscription?.endDate < now) ||
      (shop.subscriptionStatus === 'trial' && shop.trialEndsAt < now);

    if (isExpired && shop.subscriptionStatus !== 'expired') {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    }

    const daysRemaining = shop.subscription
      ? Math.ceil((shop.subscription.endDate - now) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      subscriptionStatus: shop.subscriptionStatus,
      currentSubscription: shop.subscription,
      trialEndsAt: shop.trialEndsAt,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get subscription revenue analytics (Super Admin)
// @route   GET /api/subscription/revenue
const getSubscriptionRevenue = async (req, res) => {
  try {
    const totalRevenue = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const monthlyRevenue = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const planDistribution = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      {
        $lookup: {
          from: 'plans',
          localField: '_id',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: '$plan' },
      { $project: { planName: '$plan.name', count: 1, revenue: 1 } },
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue,
      planDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  subscribe,
  getSubscriptionHistory,
  getAllSubscriptions,
  getSubscriptionStatus,
  getSubscriptionRevenue,
};