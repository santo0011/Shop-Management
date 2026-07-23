const cron = require('cron');
const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');
const { notifySuperAdmins, notifyShopAdmin } = require('./notificationService');
const { logActivity } = require('./activityLogService');

// Run scheduler every day at midnight (00:00)
const startScheduler = () => {
  // Check every hour for expiry/activation
  const job = new cron.CronJob('0 * * * *', async () => {
    console.log('[Scheduler] Running subscription scheduler...');
    try {
      await expireSubscriptions();
      await activateQueuedSubscriptions();
      await generateNotifications();
      console.log('[Scheduler] Completed successfully');
    } catch (error) {
      console.error('[Scheduler] Error:', error.message);
    }
  });

  job.start();
  console.log('[Scheduler] Subscription scheduler started');
};

// Expire subscriptions that have ended
const expireSubscriptions = async () => {
  const now = new Date();
  
  // Expire active subscriptions past end date
  const expiredSubs = await Subscription.find({
    status: 'active',
    endDate: { $lte: now },
  });

  for (const sub of expiredSubs) {
    sub.status = 'expired';
    sub.timeline.push({
      event: 'expired',
      timestamp: now,
      details: 'Subscription expired automatically',
    });
    await sub.save();

    // Update shop status
    await Shop.findByIdAndUpdate(sub.shop, { subscriptionStatus: 'expired' });

    // Log activity
    await logActivity({
      user: sub.assignedBy || sub.shop,
      action: 'Subscription Expired',
      resource: 'Subscription',
      resourceId: sub._id,
      details: `Subscription for plan ${sub.plan} expired`,
    });
  }

  if (expiredSubs.length > 0) {
    console.log(`[Scheduler] Expired ${expiredSubs.length} subscriptions`);
  }
};

// Activate queued subscriptions when current active subscription expires
const activateQueuedSubscriptions = async () => {
  const now = new Date();
  
  // Find shops where current subscription has expired and there's a queued one
  const shopsWithExpiredActive = await Shop.find({
    subscriptionStatus: 'expired',
  });

  for (const shop of shopsWithExpiredActive) {
    const queuedSub = await Subscription.findOne({
      shop: shop._id,
      status: 'queued',
    }).sort({ startDate: 1 });

    if (queuedSub) {
      queuedSub.status = 'active';
      queuedSub.activatedAt = now;
      queuedSub.timeline.push({
        event: 'activated',
        timestamp: now,
        details: 'Queued subscription activated automatically after previous expired',
      });
      
      // Calculate new end date from now
      const plan = await require('../models/Plan').findById(queuedSub.plan);
      if (plan) {
        const durationMap = { monthly: 30, quarterly: 90, yearly: 365 };
        const days = durationMap[plan.duration] || 30;
        queuedSub.endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }
      
      await queuedSub.save();

      // Update shop
      shop.subscription = queuedSub._id;
      shop.subscriptionStatus = 'active';
      await shop.save();

      // Notify
      await notifyShopAdmin({
        shopId: shop._id,
        type: 'subscription_activated',
        title: 'New Subscription Activated',
        message: `Your queued subscription has been automatically activated.`,
        relatedTo: queuedSub._id,
      });

      await logActivity({
        user: queuedSub.assignedBy || shop.owner,
        action: 'Subscription Activated from Queue',
        resource: 'Subscription',
        resourceId: queuedSub._id,
        details: 'Queued subscription automatically activated',
      });
    }
  }
  
  // Also find queued subs where the active subscription has ended
  const queuedSubs = await Subscription.find({
    status: 'queued',
  }).populate('shop');

  for (const sub of queuedSubs) {
    if (!sub.shop) continue;
    
    // Check if there's no active subscription for this shop
    const activeSub = await Subscription.findOne({
      shop: sub.shop._id,
      status: 'active',
    });

    if (!activeSub) {
      sub.status = 'active';
      sub.activatedAt = now;
      sub.timeline.push({
        event: 'activated',
        timestamp: now,
        details: 'Queued subscription activated automatically',
      });
      
      const plan = await require('../models/Plan').findById(sub.plan);
      if (plan) {
        const durationMap = { monthly: 30, quarterly: 90, yearly: 365 };
        const days = durationMap[plan.duration] || 30;
        sub.endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }
      
      await sub.save();
      
      await Shop.findByIdAndUpdate(sub.shop._id, {
        subscription: sub._id,
        subscriptionStatus: 'active',
      });

      await notifyShopAdmin({
        shopId: sub.shop._id,
        type: 'subscription_activated',
        title: 'New Subscription Activated',
        message: 'Your queued subscription has been automatically activated.',
        relatedTo: sub._id,
      });
    }
  }
};

// Generate notifications for expiring subscriptions
const generateNotifications = async () => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  // Find subscriptions expiring today
  const expiringToday = await Subscription.find({
    status: 'active',
    endDate: {
      $gte: new Date(now.setHours(0, 0, 0, 0)),
      $lte: new Date(now.setHours(23, 59, 59, 999)),
    },
  }).populate('shop');

  for (const sub of expiringToday) {
    if (sub.shop) {
      await notifyShopAdmin({
        shopId: sub.shop._id,
        type: 'subscription_expiring_today',
        title: 'Subscription Expires Today',
        message: 'Your subscription expires today. Please renew to continue using the service.',
        relatedTo: sub._id,
      });
    }
  }

  // Find subscriptions expiring in 3 days
  const expiringIn3Days = await Subscription.find({
    status: 'active',
    endDate: {
      $gte: threeDaysFromNow,
      $lte: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
    },
  }).populate('shop');

  for (const sub of expiringIn3Days) {
    if (sub.shop) {
      await notifyShopAdmin({
        shopId: sub.shop._id,
        type: 'subscription_expiring_3days',
        title: 'Subscription Expiring in 3 Days',
        message: 'Your subscription will expire in 3 days. Please contact the Super Admin to renew.',
        relatedTo: sub._id,
      });

      // Also notify super admins
      await notifySuperAdmins({
        type: 'subscription_expiring_3days',
        title: 'Subscription Expiring Soon',
        message: `Subscription for ${sub.shop.name} will expire in 3 days.`,
        relatedTo: sub._id,
        shop: sub.shop._id,
      });
    }
  }
};

module.exports = { startScheduler };