const User = require('../models/User');

const seedSuperAdmin = async () => {
  try {
    // Check if a Super Admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('✓ Super Admin already exists:');
      console.log(`  Email: ${existingSuperAdmin.email}`);
      return;
    }

    // Create default Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'santobiswas0011@gmail.com',
      phone: '01700000000',
      password: '123456',
      role: 'super_admin',
      language: 'en',
      theme: 'light',
    });

    console.log('✓ Default Super Admin account created successfully!');
    console.log('  Email: santobiswas0011@gmail.com');
    console.log('  Password: 123456');
    console.log('  ⚠ This account is for initial setup and development only.');

    // Also create a demo shop admin account for testing
    const existingAdmin = await User.findOne({ email: 'admin@shop.com' });
    if (!existingAdmin) {
      const Shop = require('../models/Shop');

      // Create the shop owner (admin) user first so the shop's owner is a
      // real shop-owner account, never the super_admin.
      const shopAdmin = await User.create({
        name: 'Shop Admin',
        email: 'admin@shop.com',
        phone: '01700000001',
        password: 'admin123',
        role: 'admin',
        language: 'bn',
        theme: 'light',
      });

      const demoShop = await Shop.create({
        name: 'Demo Grocery Shop',
        owner: shopAdmin._id,
        phone: '01700000001',
        email: 'admin@shop.com',
        address: '123 Demo Street, Dhaka',
        subscriptionStatus: 'active',
      });

      shopAdmin.shop = demoShop._id;
      await shopAdmin.save();

      console.log('✓ Demo shop admin created:');
      console.log('  Email: admin@shop.com');
      console.log('  Password: admin123');
    }
  } catch (error) {
    console.error('Failed to seed Super Admin:', error.message);
  }
};

module.exports = seedSuperAdmin;
