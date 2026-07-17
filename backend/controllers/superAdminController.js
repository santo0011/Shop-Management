const Shop = require('../models/Shop');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

// @desc    Get comprehensive dashboard data for Super Admin
// @route   GET /api/super-admin/dashboard
const getDashboardData = async (req, res) => {
  try {
    const superAdminIds = await User.find({ role: 'super_admin' }).distinct('_id');
    const notSuperAdmin = { owner: { $nin: superAdminIds } };

    // === STAT CARDS ===
    const totalShops = await Shop.countDocuments(notSuperAdmin);
    const activeShops = await Shop.countDocuments({ ...notSuperAdmin, isActive: true });
    const expiredShops = await Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'expired' });
    const trialShops = await Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'trial' });
    const activeSubscriptions = await Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'active' });

    // Total and Monthly Revenue
    const revenueAgg = await Subscription.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const monthlyRevenue = await Subscription.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Average revenue per shop
    const avgRevenuePerShop = totalShops > 0 ? (totalRevenue / totalShops) : 0;

    // Total subscriptions
    const totalSubscriptions = await Subscription.countDocuments();

    // Expiring soon (subscriptions ending within 7 days)
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = await Subscription.countDocuments({
      endDate: { $gte: now, $lte: sevenDaysLater },
      status: 'active',
    });

    // Total admin users (excluding super_admin)
    const totalAdminUsers = await User.countDocuments({ role: { $ne: 'super_admin' } });

    // === CHARTS ===

    // Shop growth (monthly)
    const shopGrowth = await Shop.aggregate([
      { $match: { owner: { $nin: superAdminIds } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Subscription growth (monthly)
    const subscriptionGrowth = await Subscription.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Plan distribution
    const planDistribution = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      {
        $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      { $project: { planName: '$plan.name', count: 1, revenue: 1 } },
    ]);

    // Active vs Expired shops data
    const activeVsExpired = [
      { name: 'Active', value: activeShops },
      { name: 'Expired', value: expiredShops },
      { name: 'Trial', value: trialShops },
    ];

    // Monthly new shop registrations (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyNewShops = await Shop.aggregate([
      { $match: { owner: { $nin: superAdminIds }, createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // === RECENT ACTIVITIES ===

    // Recently created shops (last 10)
    const recentShops = await Shop.find(notSuperAdmin)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Recently expired subscriptions (last 10)
    const recentExpiredSubs = await Subscription.find({ status: { $in: ['expired', 'active'] }, endDate: { $lte: now } })
      .populate('shop', 'name')
      .populate('plan', 'name')
      .sort({ endDate: -1 })
      .limit(10)
      .lean();

    // Recent payments (last 10 subscriptions)
    const recentPayments = await Subscription.find()
      .populate('shop', 'name')
      .populate('plan', 'name duration')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Recent login activities (last 10)
    const recentLogins = await User.find({ role: { $ne: 'super_admin' }, lastLogin: { $ne: null } })
      .sort({ lastLogin: -1 })
      .limit(10)
      .select('name email lastLogin role shop')
      .lean();

    // === QUICK STATISTICS ===

    // Most popular plan
    const popularPlanAgg = await Subscription.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      {
        $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' },
      },
      { $unwind: '$plan' },
      { $project: { planName: '$plan.name', count: 1, _id: 0 } },
    ]);
    const mostPopularPlan = popularPlanAgg[0]?.planName || 'N/A';

    // Top revenue month
    const topRevenueMonthAgg = [...monthlyRevenue].sort((a, b) => b.total - a.total);
    const topRevenueMonth = topRevenueMonthAgg[0]?._id || 'N/A';

    // Total trial users
    const totalTrialUsers = trialShops;

    res.json({
      // Stat cards
      totalShops,
      activeShops,
      expiredShops,
      trialShops,
      totalRevenue,
      monthlyRevenue,
      totalSubscriptions,
      activeSubscriptions,
      expiringSoon,
      totalAdminUsers,

      // Charts
      shopGrowth,
      subscriptionGrowth,
      planDistribution,
      activeVsExpired,
      monthlyNewShops,

      // Recent activities
      recentShops,
      recentExpiredSubs,
      recentPayments,
      recentLogins,

      // Quick stats
      mostPopularPlan,
      topRevenueMonth,
      avgRevenuePerShop,
      totalTrialUsers,
    });
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardData };