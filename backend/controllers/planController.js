const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const PlanHistory = require('../models/PlanHistory');

// Helper to record plan history
const recordHistory = async ({ planId, action, changedBy, previousValues, newValues, notes }) => {
  try {
    await PlanHistory.create({
      plan: planId,
      action,
      changedBy,
      previousValues,
      newValues,
      notes,
    });
  } catch (error) {
    console.error('Failed to record plan history:', error.message);
  }
};

// @desc    Get all plans
// @route   GET /api/plans
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all plans (Super Admin - includes inactive)
// @route   GET /api/plans/all
const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get plan history (Super Admin)
// @route   GET /api/plans/:id/history
const getPlanHistory = async (req, res) => {
  try {
    const history = await PlanHistory.find({ plan: req.params.id })
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create plan (Super Admin)
// @route   POST /api/plans
const createPlan = async (req, res) => {
  try {
    // Check for duplicate plan name
    const existing = await Plan.findOne({ name: req.body.name });
    if (existing) {
      return res.status(400).json({
        message: 'Plan name already exists',
        messageBn: 'প্ল্যানের নাম ইতিমধ্যে বিদ্যমান',
      });
    }

    const plan = await Plan.create(req.body);

    // Record creation history
    await recordHistory({
      planId: plan._id,
      action: 'created',
      changedBy: req.user._id,
      newValues: {
        name: plan.name,
        nameBn: plan.nameBn,
        price: plan.price,
        duration: plan.duration,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
        isPopular: plan.isPopular,
        isActive: plan.isActive,
        features: plan.features,
        description: plan.description,
      },
      notes: 'Plan created',
    });

    res.status(201).json(plan);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update plan (Super Admin)
// @route   PUT /api/plans/:id
const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check for duplicate plan name (exclude current plan)
    if (req.body.name && req.body.name !== plan.name) {
      const existing = await Plan.findOne({ name: req.body.name, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({
          message: 'Plan name already exists',
          messageBn: 'প্ল্যানের নাম ইতিমধ্যে বিদ্যমান',
        });
      }
    }

    // Capture previous values before update
    const previousValues = {
      name: plan.name,
      nameBn: plan.nameBn,
      price: plan.price,
      duration: plan.duration,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      features: plan.features,
      description: plan.description,
    };

    Object.assign(plan, req.body);
    await plan.save();

    // Build changed fields for new values
    const changedFields = {};
    Object.keys(req.body).forEach((key) => {
      if (JSON.stringify(req.body[key]) !== JSON.stringify(previousValues[key])) {
        changedFields[key] = plan[key];
      }
    });

    // Only record history if something actually changed
    if (Object.keys(changedFields).length > 0) {
      await recordHistory({
        planId: plan._id,
        action: 'updated',
        changedBy: req.user._id,
        previousValues,
        newValues: changedFields,
        notes: 'Plan updated',
      });
    }

    res.json(plan);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete plan (Super Admin)
// @route   DELETE /api/plans/:id
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if plan is referenced by any subscription
    const subscriptionCount = await Subscription.countDocuments({ plan: req.params.id });
    if (subscriptionCount > 0) {
      return res.status(400).json({
        message: 'This plan cannot be deleted because it has already been assigned to one or more businesses. Please create a new plan or deactivate this one instead.',
        messageBn: 'এই প্ল্যানটি ডিলিট করা যাবে না, কারণ এটি ইতোমধ্যে এক বা একাধিক ব্যবসায় ব্যবহৃত হয়েছে। প্রয়োজনে নতুন প্ল্যান তৈরি করুন অথবা এই প্ল্যানটি নিষ্ক্রিয় (Inactive) করুন।',
      });
    }

    await Plan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle plan active status
// @route   PUT /api/plans/:id/toggle-status
const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const previousActive = plan.isActive;
    plan.isActive = !plan.isActive;
    await plan.save();

    // Record status change history
    await recordHistory({
      planId: plan._id,
      action: plan.isActive ? 'activated' : 'deactivated',
      changedBy: req.user._id,
      previousValues: { isActive: previousActive },
      newValues: { isActive: plan.isActive },
      notes: plan.isActive ? 'Plan activated' : 'Plan deactivated',
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPlans,
  getAllPlans,
  getPlanHistory,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus,
};