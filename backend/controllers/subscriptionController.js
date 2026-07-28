const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');
const Plan = require('../models/Plan');
const { notifySuperAdmins, notifyShopAdmin } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');

// Helper to add timeline event
const addTimelineEvent = (subscription, event, details, userId) => {
  subscription.timeline.push({
    event,
    timestamp: new Date(),
    details,
    by: userId,
  });
};

// @desc    Assign subscription to a shop (Super Admin)
// @route   POST /api/subscription/assign
const assignSubscription = async (req, res) => {
  try {
    const { shopId, planId, startDate, notes } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const start = new Date(startDate);
    const durationMap = { monthly: 30, quarterly: 90, yearly: 365 };
    const totalDays = durationMap[plan.duration] || 30;
    const endDate = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);

    const discountAmount = (plan.price * plan.discount) / 100;
    const totalAmount = plan.price - discountAmount;

    // Check if shop has an active subscription
    const activeSubscription = await Subscription.findOne({
      shop: shopId,
      status: 'active',
    });

    let subscription;
    let isQueued = false;

    if (activeSubscription) {
      // Create as queued - don't replace active one
      subscription = await Subscription.create({
        shop: shopId,
        plan: plan._id,
        startDate: start,
        endDate,
        amount: plan.price,
        discount: discountAmount,
        totalAmount,
        notes: notes || '',
        assignedBy: req.user._id,
        status: 'queued',
      });

      addTimelineEvent(subscription, 'queued', `Queued for activation after current subscription expires`, req.user._id);
      addTimelineEvent(subscription, 'assigned', `Assigned by ${req.user.name || 'Super Admin'}`, req.user._id);
      await subscription.save();

      // Link subscriptions
      activeSubscription.nextSubscription = subscription._id;
      subscription.previousSubscription = activeSubscription._id;
      await activeSubscription.save();
      await subscription.save();

      isQueued = true;

      // Notify shop admin
      await notifyShopAdmin({
        shopId,
        type: 'subscription_assigned',
        title: 'New Subscription Queued',
        message: `A new subscription (${plan.name}) has been assigned. It will activate after your current subscription expires.`,
        relatedTo: subscription._id,
      });
    } else {
      // No active subscription - create as active directly
      subscription = await Subscription.create({
        shop: shopId,
        plan: plan._id,
        startDate: start,
        endDate,
        amount: plan.price,
        discount: discountAmount,
        totalAmount,
        notes: notes || '',
        assignedBy: req.user._id,
        status: 'active',
        activatedAt: new Date(),
      });

      addTimelineEvent(subscription, 'assigned', `Assigned by ${req.user.name || 'Super Admin'}`, req.user._id);
      addTimelineEvent(subscription, 'activated', 'Activated immediately', req.user._id);
      await subscription.save();

      // Update shop
      shop.subscription = subscription._id;
      shop.subscriptionStatus = 'active';
      await shop.save();

      // Notify shop admin
      await notifyShopAdmin({
        shopId,
        type: 'subscription_assigned',
        title: 'New Subscription Activated',
        message: `A new subscription (${plan.name}) has been assigned and activated.`,
        relatedTo: subscription._id,
      });
    }

    // Notify super admins
    await notifySuperAdmins({
      type: 'subscription_assigned',
      title: isQueued ? 'Subscription Queued' : 'Subscription Assigned',
      message: `${plan.name} plan ${isQueued ? 'queued' : 'assigned'} for ${shop.name}`,
      relatedTo: subscription._id,
      shop: shopId,
    });

    // Log activity
    await logActivity({
      user: req.user._id,
      action: isQueued ? 'Subscription Queued' : 'Subscription Assigned',
      resource: 'Subscription',
      resourceId: subscription._id,
      details: `${isQueued ? 'Queued' : 'Assigned'} ${plan.name} plan for ${shop.name}${isQueued ? ' (queued - active subscription exists)' : ''}`,
      req,
    });

    const populatedSub = await Subscription.findById(subscription._id)
      .populate('plan', 'name nameBn duration price features')
      .populate('shop', 'name phone email');

    res.status(201).json({
      success: true,
      subscription: populatedSub,
      isQueued,
      message: isQueued
        ? 'Subscription queued successfully. It will activate after the current subscription expires.'
        : 'Subscription assigned successfully.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get subscription history for a shop
// @route   GET /api/subscription/history
const getSubscriptionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, shopId } = req.query;

    let query = {};

    // Super admin can see all or filter by shop
    if (req.user.role === 'super_admin') {
      if (shopId) {
        query.shop = shopId;
      }
    } else {
      query.shop = req.user.shop;
    }

    if (status) {
      query.status = status;
    }

    const subscriptions = await Subscription.find(query)
      .populate('plan', 'name nameBn duration price features')
      .populate('shop', 'name phone email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Subscription.countDocuments(query);

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

// @desc    Get all subscriptions (Super Admin)
// @route   GET /api/subscription/all
const getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    let query = {};
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('shop', 'name phone email businessType')
      .populate('plan', 'name nameBn duration price')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Subscription.countDocuments(query);

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
    const hasNoSubscription = !shop.subscription;

    // Determine the effective subscription status based on actual conditions
    let effectiveStatus;
    
    if (shop.subscriptionStatus === 'active') {
      // Check if the subscription document's endDate has passed
      if (!hasNoSubscription && shop.subscription.endDate < now) {
        effectiveStatus = 'expired';
        shop.subscriptionStatus = 'expired';
        await shop.save();
      } else {
        effectiveStatus = 'active';
      }
    } else if (shop.subscriptionStatus === 'trial') {
      // "trial" WITHOUT a subscription document = NOT a real trial → inactive
      if (hasNoSubscription) {
        effectiveStatus = 'inactive';
        shop.subscriptionStatus = 'inactive';
        await shop.save();
      } else if (shop.trialEndsAt < now) {
        // Trial with subscription but end date passed
        effectiveStatus = 'expired';
        shop.subscriptionStatus = 'expired';
        await shop.save();
      } else {
        effectiveStatus = 'trial';
      }
    } else {
      // expired, inactive, queued, cancelled
      effectiveStatus = shop.subscriptionStatus || 'inactive';
    }

    // A shop is "locked" if effective status is NOT active and NOT trial (with subscription)
    const locked = effectiveStatus !== 'active' && 
      !(effectiveStatus === 'trial' && !hasNoSubscription);

    // Find queued subscription
    const queuedSubscription = await Subscription.findOne({
      shop: req.user.shop,
      status: 'queued',
    }).populate('plan', 'name nameBn duration price features featuresBn');

    const daysRemaining = shop.subscription && effectiveStatus === 'active'
      ? Math.ceil((shop.subscription.endDate - now) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      subscriptionStatus: effectiveStatus,
      currentSubscription: shop.subscription,
      queuedSubscription: queuedSubscription || null,
      trialEndsAt: shop.trialEndsAt,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired: locked,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get subscription revenue analytics (Super Admin)
// @route   GET /api/subscription/revenue
const getSubscriptionRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Total revenue (all time)
    const totalRevenue = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'expired', 'cancelled'] }, ...matchStage } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Monthly revenue
    const monthlyRevenue = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'expired', 'cancelled'] }, ...matchStage } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Yearly revenue
    const yearlyRevenue = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'expired', 'cancelled'] }, ...matchStage } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue by plan
    const revenueByPlan = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'expired', 'cancelled'] }, ...matchStage } },
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

    // Revenue by business type
    const revenueByBusinessType = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'expired', 'cancelled'] }, ...matchStage } },
      {
        $lookup: {
          from: 'shops',
          localField: 'shop',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: '$shop' },
      {
        $group: {
          _id: '$shop.businessType',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue,
      yearlyRevenue,
      revenueByPlan,
      revenueByBusinessType,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a subscription (Super Admin)
// @route   PUT /api/subscription/:id/cancel
const cancelSubscription = async (req, res) => {
  try {
    const { cancellationReason } = req.body;

    if (!cancellationReason) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }

    const subscription = await Subscription.findById(req.params.id)
      .populate('shop', 'name')
      .populate('plan', 'name');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({ message: 'Subscription is already cancelled' });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = cancellationReason;
    addTimelineEvent(subscription, 'cancelled', `Cancelled: ${cancellationReason}`, req.user._id);
    await subscription.save();

    // If this was the active subscription, update shop
    if (subscription.shop) {
      const shop = await Shop.findById(subscription.shop._id);
      if (shop && shop.subscription?.toString() === subscription._id.toString()) {
        // Check if there's a queued subscription to activate
        const queuedSub = await Subscription.findOne({
          shop: subscription.shop._id,
          status: 'queued',
        }).sort({ startDate: 1 });

        if (queuedSub) {
          // Activate the queued subscription
          queuedSub.status = 'active';
          queuedSub.activatedAt = new Date();
          addTimelineEvent(queuedSub, 'activated', 'Automatically activated after cancellation of previous subscription', req.user._id);
          
          const plan = await Plan.findById(queuedSub.plan);
          if (plan) {
            const durationMap = { monthly: 30, quarterly: 90, yearly: 365 };
            const days = durationMap[plan.duration] || 30;
            queuedSub.endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          }
          
          await queuedSub.save();

          shop.subscription = queuedSub._id;
          shop.subscriptionStatus = 'active';
          
          await notifyShopAdmin({
            shopId: subscription.shop._id,
            type: 'subscription_activated',
            title: 'Queued Subscription Activated',
            message: 'Your queued subscription has been automatically activated.',
            relatedTo: queuedSub._id,
          });
        } else {
          shop.subscriptionStatus = 'cancelled';
        }
        await shop.save();
      }
    }

    // Notifications
    await notifySuperAdmins({
      type: 'subscription_cancelled',
      title: 'Subscription Cancelled',
      message: `Subscription (${subscription.plan?.name}) for ${subscription.shop?.name} was cancelled. Reason: ${cancellationReason}`,
      relatedTo: subscription._id,
      shop: subscription.shop?._id,
    });

    await notifyShopAdmin({
      shopId: subscription.shop?._id,
      type: 'subscription_cancelled',
      title: 'Subscription Cancelled',
      message: `Your subscription has been cancelled. Reason: ${cancellationReason}`,
      relatedTo: subscription._id,
    });

    // Log activity
    await logActivity({
      user: req.user._id,
      action: 'Subscription Cancelled',
      resource: 'Subscription',
      resourceId: subscription._id,
      details: `Cancelled subscription for ${subscription.shop?.name}. Reason: ${cancellationReason}`,
      req,
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single subscription details with timeline
// @route   GET /api/subscription/:id
const getSubscriptionDetails = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('plan', 'name nameBn duration price features featuresBn')
      .populate('shop', 'name phone email businessType')
      .populate('assignedBy', 'name email')
      .populate('previousSubscription')
      .populate('nextSubscription');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get expiring subscriptions (Super Admin)
// @route   GET /api/subscription/expiring
const getExpiringSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { days } = req.query;

    const now = new Date();
    const daysToCheck = parseInt(days) || 3;
    const futureDate = new Date(now.getTime() + daysToCheck * 24 * 60 * 60 * 1000);

    const subscriptions = await Subscription.find({
      status: 'active',
      endDate: {
        $gte: now,
        $lte: futureDate,
      },
    })
      .populate('shop', 'name phone email businessType')
      .populate('plan', 'name nameBn duration price')
      .sort({ endDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Subscription.countDocuments({
      status: 'active',
      endDate: {
        $gte: now,
        $lte: futureDate,
      },
    });

    // Add remaining days
    const subscriptionsWithDays = subscriptions.map(sub => ({
      ...sub.toObject(),
      remainingDays: Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24)),
    }));

    res.json({
      subscriptions: subscriptionsWithDays,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get subscription dashboard counts (Super Admin)
// @route   GET /api/subscription/dashboard
const getSubscriptionDashboard = async (req, res) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeCount,
      queuedCount,
      expiredTodayCount,
      expiringIn3Days,
      totalRevenue,
      monthlyRevenue,
      totalSubscriptions,
      cancelledCount,
    ] = await Promise.all([
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'queued' }),
      Subscription.countDocuments({
        status: { $in: ['active', 'expired'] },
        endDate: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999)),
        },
      }),
      Subscription.countDocuments({
        status: 'active',
        endDate: {
          $gte: now,
          $lte: threeDaysFromNow,
        },
      }),
      Subscription.aggregate([
        { $match: { status: { $in: ['active', 'expired', 'cancelled'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Subscription.aggregate([
        { $match: { status: { $in: ['active', 'expired', 'cancelled'] }, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'cancelled' }),
    ]);

    res.json({
      activeSubscriptions: activeCount,
      queuedSubscriptions: queuedCount,
      expiredToday: expiredTodayCount,
      expiringIn3Days,
      totalSubscriptions,
      cancelledCount,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Subscribe to a plan (Admin self-service)
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
    const durationMap = { monthly: 30, quarterly: 90, yearly: 365 };
    const totalDays = durationMap[plan.duration] || 30;
    const endDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

    const discountAmount = (plan.price * plan.discount) / 100;
    const totalAmount = plan.price - discountAmount;

    // Check if shop has an active subscription
    const activeSubscription = await Subscription.findOne({
      shop: req.user.shop,
      status: 'active',
    });

    let subscription;

    if (activeSubscription) {
      // Create as queued
      subscription = await Subscription.create({
        shop: shop._id,
        plan: plan._id,
        startDate: now,
        endDate,
        amount: plan.price,
        discount: discountAmount,
        totalAmount,
        paymentMethod: paymentMethod || 'cash',
        transactionId,
        status: 'queued',
      });

      addTimelineEvent(subscription, 'queued', 'Queued for activation after current subscription expires', req.user._id);
      addTimelineEvent(subscription, 'assigned', `Self-subscribed by ${req.user.name || 'Admin'}`, req.user._id);
      await subscription.save();

      // Link subscriptions
      activeSubscription.nextSubscription = subscription._id;
      subscription.previousSubscription = activeSubscription._id;
      await activeSubscription.save();
      await subscription.save();
    } else {
      // No active subscription - create as active
      subscription = await Subscription.create({
        shop: shop._id,
        plan: plan._id,
        startDate: now,
        endDate,
        amount: plan.price,
        discount: discountAmount,
        totalAmount,
        paymentMethod: paymentMethod || 'cash',
        transactionId,
        status: 'active',
        activatedAt: now,
      });

      addTimelineEvent(subscription, 'assigned', `Self-subscribed by ${req.user.name || 'Admin'}`, req.user._id);
      addTimelineEvent(subscription, 'activated', 'Activated immediately', req.user._id);
      await subscription.save();

      shop.subscription = subscription._id;
      shop.subscriptionStatus = 'active';
      await shop.save();
    }

    // Notify super admins
    await notifySuperAdmins({
      type: 'subscription_assigned',
      title: activeSubscription ? 'Subscription Queued' : 'Subscription Assigned',
      message: `${plan.name} plan ${activeSubscription ? 'queued' : 'subscribed'} by ${shop.name}`,
      relatedTo: subscription._id,
      shop: shop._id,
    });

    // Log activity
    await logActivity({
      user: req.user._id,
      action: activeSubscription ? 'Subscription Queued' : 'Subscription Subscribed',
      resource: 'Subscription',
      resourceId: subscription._id,
      details: `${activeSubscription ? 'Queued' : 'Subscribed'} ${plan.name} plan`,
      req,
    });

    const populatedSub = await Subscription.findById(subscription._id)
      .populate('plan', 'name nameBn duration price features');

    res.status(201).json(populatedSub);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  assignSubscription,
  getSubscriptionHistory,
  getAllSubscriptions,
  getSubscriptionStatus,
  getSubscriptionRevenue,
  cancelSubscription,
  getSubscriptionDetails,
  getExpiringSubscriptions,
  getSubscriptionDashboard,
  subscribe,
};