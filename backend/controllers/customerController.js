const Customer = require('../models/Customer');

const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = { shop: req.user.shop };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameBn: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ name: 1 }).skip(skip).limit(limit);
    const total = await Customer.countDocuments(query);

    res.json({ customers, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    req.body.shop = req.user.shop;
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addLoyaltyPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.loyaltyPoints += points;
    customer.totalLoyaltyEarned += points;
    await customer.save();

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const redeemLoyaltyPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (customer.loyaltyPoints < points) {
      return res.status(400).json({ message: 'Insufficient loyalty points' });
    }

    customer.loyaltyPoints -= points;
    customer.totalLoyaltyRedeemed += points;
    await customer.save();

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, addLoyaltyPoints, redeemLoyaltyPoints };