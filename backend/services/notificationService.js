const Notification = require('../models/Notification');

const createNotification = async ({ user, type, title, message, relatedTo, shop }) => {
  try {
    const notification = await Notification.create({
      user,
      type,
      title,
      message,
      relatedTo,
      shop,
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

const notifySuperAdmins = async ({ type, title, message, relatedTo, shop }) => {
  try {
    const User = require('../models/User');
    const superAdmins = await User.find({ role: 'super_admin', isActive: true });
    
    const notifications = superAdmins.map(admin => ({
      user: admin._id,
      type,
      title,
      message,
      relatedTo,
      shop,
    }));

    await Notification.insertMany(notifications);
    return notifications;
  } catch (error) {
    console.error('Failed to notify super admins:', error.message);
    return [];
  }
};

const notifyShopAdmin = async ({ shopId, type, title, message, relatedTo }) => {
  try {
    const User = require('../models/User');
    const shopAdmin = await User.findOne({ shop: shopId, role: 'admin', isActive: true });
    
    if (!shopAdmin) return null;

    const notification = await Notification.create({
      user: shopAdmin._id,
      type,
      title,
      message,
      relatedTo,
      shop: shopId,
    });
    return notification;
  } catch (error) {
    console.error('Failed to notify shop admin:', error.message);
    return null;
  }
};

const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ user: userId, isRead: false });
  } catch (error) {
    console.error('Failed to get unread count:', error.message);
    return 0;
  }
};

const markAsRead = async (notificationId, userId) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error.message);
    return false;
  }
};

const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error.message);
    return false;
  }
};

module.exports = {
  createNotification,
  notifySuperAdmins,
  notifyShopAdmin,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};