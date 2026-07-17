require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Shop = require('./models/Shop');
const Plan = require('./models/Plan');

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Shop.deleteMany({});
    await Plan.deleteMany({});

    // Create Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@gsms.com',
      phone: '01700000000',
      password: 'admin123',
      role: 'super_admin',
      language: 'bn',
      theme: 'light',
    });
    console.log('Super Admin created:', superAdmin.email);

    // Create Plans
    const plans = await Plan.create([
      {
        name: 'Starter',
        nameBn: 'স্টার্টার',
        duration: 'monthly',
        price: 499,
        features: ['Up to 100 Products', 'Basic Reports', 'Single User', 'Email Support'],
        featuresBn: ['১০০টি পণ্য পর্যন্ত', 'বেসিক রিপোর্ট', 'একক ব্যবহারকারী', 'ইমেইল সাপোর্ট'],
        maxUsers: 1,
        maxProducts: 100,
        isPopular: false,
      },
      {
        name: 'Business',
        nameBn: 'বিজনেস',
        duration: 'monthly',
        price: 999,
        features: ['Up to 1000 Products', 'Advanced Reports', 'Up to 3 Users', 'Priority Support', 'POS Billing'],
        featuresBn: ['১০০০টি পণ্য পর্যন্ত', 'অ্যাডভান্সড রিপোর্ট', '৩ জন ব্যবহারকারী', 'প্রাইওরিটি সাপোর্ট', 'পিওএস বিলিং'],
        maxUsers: 3,
        maxProducts: 1000,
        isPopular: true,
      },
      {
        name: 'Enterprise',
        nameBn: 'এন্টারপ্রাইজ',
        duration: 'yearly',
        price: 9999,
        features: ['Unlimited Products', 'All Reports', 'Unlimited Users', '24/7 Support', 'POS Billing', 'Custom Features'],
        featuresBn: ['আনলিমিটেড পণ্য', 'সব রিপোর্ট', 'আনলিমিটেড ব্যবহারকারী', '২৪/৭ সাপোর্ট', 'পিওএস বিলিং', 'কাস্টম ফিচার'],
        maxUsers: 100,
        maxProducts: 999999,
        isPopular: false,
      },
      {
        name: 'Quarterly Business',
        nameBn: 'ত্রৈমাসিক বিজনেস',
        duration: 'quarterly',
        price: 2499,
        features: ['Up to 1000 Products', 'Advanced Reports', 'Up to 3 Users', 'Priority Support', 'POS Billing'],
        featuresBn: ['১০০০টি পণ্য পর্যন্ত', 'অ্যাডভান্সড রিপোর্ট', '৩ জন ব্যবহারকারী', 'প্রাইওরিটি সাপোর্ট', 'পিওএস বিলিং'],
        maxUsers: 3,
        maxProducts: 1000,
        isPopular: false,
      },
    ]);
    console.log(`${plans.length} plans created`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📧 Super Admin Login:');
    console.log('   Email: superadmin@gsms.com');
    console.log('   Password: admin123');
    console.log('\n📧 Shop Owner Registration:');
    console.log('   Use the Register page to create a new shop owner account.\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();