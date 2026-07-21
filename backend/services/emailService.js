const { sendMail } = require('../config/mail');
const forgotPasswordTemplate = require('../templates/forgotPasswordTemplate');
const resetSuccessTemplate = require('../templates/resetSuccessTemplate');
const welcomeTemplate = require('../templates/welcomeTemplate');

/**
 * Send a password reset email.
 *
 * @param {Object} options
 * @param {string} options.email    — recipient email
 * @param {string} options.name     — recipient name
 * @param {string} options.token    — reset token (raw, not hashed)
 * @returns {Promise<boolean>}
 */
const sendForgotPasswordEmail = async ({ email, name, token }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password/${token}`;
  const html = forgotPasswordTemplate({ userName: name, resetLink, expiryMin: 15 });
  return sendMail({ to: email, subject: 'Reset Your Password — Grocery POS', html });
};

/**
 * Send a password reset success notification.
 *
 * @param {Object} options
 * @param {string} options.email    — recipient email
 * @param {string} options.name     — recipient name
 * @returns {Promise<boolean>}
 */
const sendResetSuccessEmail = async ({ email, name }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login`;
  const html = resetSuccessTemplate({ userName: name, loginUrl });
  return sendMail({ to: email, subject: 'Password Reset Successful — Grocery POS', html });
};

/**
 * Send a welcome email after account creation.
 *
 * @param {Object} options
 * @param {string} options.email     — recipient email
 * @param {string} options.name      — recipient name
 * @param {string} [options.shopName] — shop name (optional)
 * @returns {Promise<boolean>}
 */
const sendWelcomeEmail = async ({ email, name, shopName }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login`;
  const html = welcomeTemplate({ userName: name, loginUrl, shopName });
  return sendMail({ to: email, subject: 'Welcome to Grocery POS!', html });
};

module.exports = {
  sendForgotPasswordEmail,
  sendResetSuccessEmail,
  sendWelcomeEmail,
};