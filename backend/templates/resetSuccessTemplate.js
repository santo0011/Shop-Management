/**
 * HTML template for the "Password Reset Successful" email.
 *
 * @param {Object} options
 * @param {string} options.userName  — recipient's name
 * @param {string} options.loginUrl  — URL to the login page
 * @returns {string}                 — HTML string
 */
const resetSuccessTemplate = ({ userName, loginUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset Successful</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#00D9A6 0%,#6C63FF 100%);padding:32px 24px;text-align:center;">
              <div style="width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="font-size:24px;font-weight:800;color:#fff;">GS</span>
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Password Updated!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;text-align:center;">
              <div style="width:64px;height:64px;border-radius:50%;background:rgba(0,217,166,0.12);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D9A6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1a1a2e;">Hi ${userName},</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#5a5a7a;">
                Your password has been successfully reset. You can now log in to your account using your new password.
              </p>

              <!-- Login Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#6C63FF 0%,#00D9A6 100%);border-radius:12px;padding:0;">
                    <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
                      Log In Now
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e8e8f0;margin:0 0 20px;" />

              <p style="margin:0;font-size:13px;color:#9a9ab0;line-height:1.5;">
                If you didn't make this change, please contact our support team immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 24px;background-color:#f8f9fc;text-align:center;border-top:1px solid #e8e8f0;">
              <p style="margin:0 0 4px;font-size:12px;color:#9a9ab0;">&copy; ${new Date().getFullYear()} Grocery POS. All rights reserved.</p>
              <p style="margin:0;font-size:11px;color:#b0b0c8;">This is an automated message. Please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

module.exports = resetSuccessTemplate;