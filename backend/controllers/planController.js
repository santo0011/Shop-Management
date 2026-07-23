const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');

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

// @desc    Create plan (Super Admin)
// @route   POST /api/plans
const createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update plan (Super Admin)
// @route   PUT /api/plans/:id
const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.json(plan);
  } catch (error) {
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
    plan.isActive = !plan.isActive;
    await plan.save();
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus,
};