const Shop = require('../models/Shop');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const ActivityLog = require('../models/ActivityLog');
const GlobalSetting = require('../models/GlobalSetting');
const { logActivity } = require('../services/activityLogService');

// @desc    Get comprehensive dashboard data for Super Admin
// @route   GET /api/super-admin/dashboard
const getDashboardData = async (req, res) => {
  try {
    const superAdminIds = await User.find({ role: 'super_admin' }).distinct('_id').lean();
    const notSuperAdmin = { owner: { $nin: superAdminIds } };

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // === RUN ALL INDEPENDENT QUERIES IN PARALLEL ===
    const [
      totalShops,
      activeShops,
      expiredShops,
      trialShops,
      activeSubShopCount,
      revenueAgg,
      monthlyRevenue,
      expiringSoon,
      shopGrowth,
      planDistribution,
      recentActivities,
    ] = await Promise.all([
      Shop.countDocuments(notSuperAdmin),
      Shop.countDocuments({ ...notSuperAdmin, isActive: true }),
      Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'expired' }),
      Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'trial' }),
      Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'active' }),
      Subscription.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Subscription.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Subscription.countDocuments({
        endDate: { $gte: now, $lte: sevenDaysLater },
        status: 'active',
      }),
      Shop.aggregate([
        { $match: { owner: { $nin: superAdminIds } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Subscription.aggregate([
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
      ]),
      ActivityLog.find()
        .select('action user createdAt')
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    const activeVsExpired = [
      { name: 'Active', value: activeShops },
      { name: 'Expired', value: expiredShops },
      { name: 'Trial', value: trialShops },
      { name: 'Inactive', value: totalShops - activeShops - trialShops },
    ];

    res.json({
      totalShops, activeShops, expiredShops, trialShops,
      totalRevenue, monthlyRevenue, activeSubscriptions: activeSubShopCount,
      expiringSoon, shopGrowth, planDistribution, activeVsExpired,
      recentActivities,
    });
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get revenue reports
// @route   GET /api/super-admin/revenue-reports
const getRevenueReports = async (req, res) => {
  try {
    const { period = 'monthly', from, to } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    let format;
    switch (period) {
      case 'daily': format = '%Y-%m-%d'; break;
      case 'yearly': format = '%Y'; break;
      default: format = '%Y-%m';
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [revenue, totalRevenueAgg, currentMonthRevenue, payingShops] = await Promise.all([
      Subscription.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format, date: '$createdAt' } },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Subscription.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Subscription.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Shop.countDocuments({ subscriptionStatus: 'active' }),
    ]);

    res.json({
      revenue,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      monthlyRevenue: currentMonthRevenue[0]?.total || 0,
      payingShops,
      periodLabel: period,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get business reports
// @route   GET /api/super-admin/business-reports
const getBusinessReports = async (req, res) => {
  try {
    const [shops, totalRevenueAgg] = await Promise.all([
      Shop.find()
        .select('name businessType isActive subscriptionStatus createdAt owner')
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      Subscription.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalShops = shops.length;
    const activeShops = shops.filter(s => s.isActive).length;
    const trialShops = shops.filter(s => s.subscriptionStatus === 'trial').length;
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    res.json({ totalShops, activeShops, trialShops, totalRevenue, shops });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get activity logs (Super Admin)
// @route   GET /api/super-admin/activity-logs
const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .select('action user createdAt details resource')
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    res.json({ logs, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get global settings
// @route   GET /api/super-admin/settings
const getGlobalSettings = async (req, res) => {
  try {
    const settings = await GlobalSetting.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update global settings
// @route   PUT /api/super-admin/settings
const updateGlobalSettings = async (req, res) => {
  try {
    let settings = await GlobalSetting.findOne();
    if (!settings) {
      settings = new GlobalSetting();
    }
    Object.keys(req.body).forEach((key) => {
      if (key in settings.schema.paths) {
        settings[key] = req.body[key];
      }
    });
    await settings.save();

    await logActivity({
      user: req.user._id,
      action: 'Settings Changed',
      resource: 'GlobalSettings',
      details: 'Global platform settings updated',
      req,
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download backup
// @route   GET /api/super-admin/backup
const downloadBackup = async (req, res) => {
  try {
    const [shops, plans, subscriptions] = await Promise.all([
      Shop.find().lean(),
      Plan.find().lean(),
      Subscription.find().lean(),
    ]);

    const backup = { shops, plans, subscriptions, exportedAt: new Date() };

    await logActivity({
      user: req.user._id,
      action: 'Backup Downloaded',
      resource: 'Backup',
      details: 'Platform data backup downloaded',
      req,
    });

    res.json(backup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Restore backup
// @route   POST /api/super-admin/restore
const restoreBackup = async (req, res) => {
  try {
    const { shops, plans, subscriptions } = req.body;
    if (shops) await Shop.deleteMany({});
    if (plans) await Plan.deleteMany({});
    if (subscriptions) await Subscription.deleteMany({});
    if (shops?.length) await Shop.insertMany(shops);
    if (plans?.length) await Plan.insertMany(plans);
    if (subscriptions?.length) await Subscription.insertMany(subscriptions);

    await logActivity({
      user: req.user._id,
      action: 'Backup Restored',
      resource: 'Backup',
      details: `Restored ${shops?.length || 0} shops, ${plans?.length || 0} plans, ${subscriptions?.length || 0} subscriptions`,
      req,
    });

    res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardData,
  getRevenueReports,
  getBusinessReports,
  getActivityLogs,
  getGlobalSettings,
  updateGlobalSettings,
  downloadBackup,
  restoreBackup,
};