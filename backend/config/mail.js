const nodemailer = require('nodemailer');

/**
 * Nodemailer transporter configured via environment variables.
 *
 * Required env vars:
 *   SMTP_HOST       — e.g. smtp.gmail.com
 *   SMTP_PORT       — 587 (TLS) or 465 (SSL)
 *   SMTP_SECURE     — false for 587, true for 465
 *   SMTP_EMAIL      — sender email address
 *   SMTP_PASSWORD   — app password or SMTP password
 *   SMTP_FROM_NAME  — display name shown in "from" header
 *
 * Supports connection pooling (nodemailer default: 5 connections)
 * for high-throughput email delivery.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
});

/**
 * Verify the SMTP connection on startup.
 * Logs success or a detailed warning (does NOT crash the server).
 */
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log(`[Mail] SMTP connection verified — ${process.env.SMTP_EMAIL}`);
  } catch (err) {
    console.warn('[Mail] SMTP verification failed:', err.message);
    console.warn('[Mail] Email features will be unavailable until the issue is resolved.');
  }
};

/**
 * Send an email with automatic retry on transient failures.
 *
 * @param {Object} options
 * @param {string} options.to       — recipient email
 * @param {string} options.subject  — email subject
 * @param {string} options.html     — HTML body
 * @param {number} [retries=2]      — number of retry attempts
 * @returns {Promise<boolean>}      — true if sent, false otherwise
 */
const sendMail = async ({ to, subject, html }, retries = 2) => {
  const from = {
    name: process.env.SMTP_FROM_NAME || 'Grocery POS',
    address: process.env.SMTP_EMAIL,
  };

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      await transporter.sendMail({ from, to, subject, html });
      console.log(`[Mail] Email sent to ${to} — ${subject}`);
      return true;
    } catch (err) {
      console.error(`[Mail] Attempt ${attempt}/${retries + 1} failed for ${to}: ${err.message}`);
      if (attempt > retries) {
        console.error(`[Mail] All attempts exhausted for ${to}`);
        return false;
      }
      // Wait before retrying (exponential back-off)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
};

module.exports = { transporter, verifyConnection, sendMail };