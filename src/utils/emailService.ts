import nodemailer from "nodemailer";
import crypto from "crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  throw new Error("ADMIN_EMAIL environment variable is required");
}
console.log("ADMIN_EMAIL from env:", ADMIN_EMAIL); // This will help debug

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendVerificationRequestToAdmin = async (
  userEmail: string,
  userName: string,
  userId: string,
  verificationToken: string
) => {
  const transporter = createTransporter();

  const approveUrl = `${process.env.BACKEND_URL}/api/users/admin-verify?token=${verificationToken}&action=approve`;
  const rejectUrl = `${process.env.BACKEND_URL}/api/users/admin-verify?token=${verificationToken}&action=reject`;
  const adminPanelUrl = `${process.env.FRONTEND_URL}/admin/pending-verifications`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: ADMIN_EMAIL,
    subject: `New User Registration Requires Verification - ${userName}`,
    html: `
      <div style="max-width: 700px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #333; margin: 0;">New User Registration Pending Verification</h2>
        </div>
        
        <div style="padding: 30px;">
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 25px;">
            <strong>⚠️ Action Required:</strong> A new user has registered and requires manual verification.
          </div>
          
          <h3>User Details:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">User ID:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${userId}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Registered:</td>
              <td style="padding: 8px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>

          <h3>Verification Actions:</h3>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approveUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 25px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 10px;">
              ✅ APPROVE USER
            </a>
            
            <a href="${rejectUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 25px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 10px;">
              ❌ REJECT USER
            </a>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 25px;">
            <p style="margin: 0;"><strong>Alternative:</strong> You can also manage all pending verifications through the admin panel:</p>
            <p style="margin: 10px 0 0 0;">
              <a href="${adminPanelUrl}" style="color: #007bff;">View Admin Panel</a>
            </p>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
          <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
          <p style="margin: 5px 0 0 0;">If you received this email in error, please contact your system administrator.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification request sent to admin successfully");
  } catch (error) {
    console.error("Error sending verification request to admin:", error);
    throw new Error("Failed to send verification request to admin");
  }
};

export const sendUserNotificationEmail = async (
  userEmail: string,
  userName: string,
  status: "approved" | "rejected",
  adminEmail?: string
) => {
  const transporter = createTransporter();

  const isApproved = status === "approved";

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: userEmail,
    subject: isApproved
      ? "✅ Account Approved - Welcome!"
      : "❌ Account Registration Update",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background-color: ${isApproved ? "#d4edda" : "#f8d7da"}; 
                    padding: 20px; border-radius: 8px 8px 0 0; 
                    border: 1px solid ${isApproved ? "#c3e6cb" : "#f1b0b7"};">
          <h2 style="color: ${isApproved ? "#155724" : "#721c24"}; margin: 0;">
            ${isApproved ? "Account Approved!" : "Account Registration Update"}
          </h2>
        </div>
        
        <div style="padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${userName},</p>
          
          ${
            isApproved
              ? `
            <p>Great news! Your account has been approved by our team and you can now log in to access all features.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Log In Now
              </a>
            </div>
            
            <p>Welcome to our platform! If you have any questions, feel free to contact our support team.</p>
          `
              : `
            <p>Thank you for your interest in our platform. After review, we are unable to approve your account registration at this time.</p>
            
            <p>If you believe this is an error or would like to discuss this decision, please contact our support team.</p>
          `
          }
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            ${adminEmail ? `Processed by: ${adminEmail}<br>` : ""}
            Date: ${new Date().toLocaleString()}<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`User notification email sent successfully: ${status}`);
  } catch (error) {
    console.error("Error sending user notification email:", error);
    throw new Error("Failed to send user notification email");
  }
};

export const sendPasswordResetEmail = async (
  userEmail: string,
  userName: string,
  resetToken: string
) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: userEmail,
    subject: "🔐 Password Reset Request",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; border: 1px solid #ddd;">
          <h2 style="color: #333; margin: 0;">Password Reset Request</h2>
        </div>
        
        <div style="padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${userName},</p>
          
          <p>We received a request to reset the password for your account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p>This link will expire in 1 hour for security reasons.</p>
          
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-top: 25px;">
            <strong>Security Note:</strong> For your security, never share this reset link with anyone.
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated email, please do not reply.<br>
            If you need assistance, please contact our support team.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully");
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const generatePasswordResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const sendContactFormToAdmin = async (
  userEmail: string,
  message: string,
  userName?: string
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: ADMIN_EMAIL,
    subject: `New Contact Form Message from ${userEmail}`,
    html: `
      <div style="max-width: 700px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #333; margin: 0;">New Contact Form Message</h2>
        </div>
        
        <div style="padding: 30px;">
          <div style="background-color: #e7f3ff; border: 1px solid #b6d7ff; border-radius: 5px; padding: 15px; margin-bottom: 25px;">
            <strong>📧 New Message:</strong> Someone has reached out through the contact form.
          </div>
          
          <h3>Contact Details:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">From:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${userEmail}</td>
            </tr>
            ${
              userName
                ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${userName}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: 8px; font-weight: bold;">Received:</td>
              <td style="padding: 8px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>

          <h3>Message:</h3>
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin-bottom: 25px;">
            <p style="margin: 0; white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.5;">${message}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 25px;">
            <p style="margin: 0;"><strong>Reply Instructions:</strong></p>
            <p style="margin: 10px 0 0 0;">You can reply directly to this email to respond to ${userEmail}</p>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
          <p style="margin: 0;">This message was sent through the contact form on your website.</p>
          <p style="margin: 5px 0 0 0;">Reply-To address: ${userEmail}</p>
        </div>
      </div>
    `,
    replyTo: userEmail, // Allow admin to reply directly
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Contact form message sent to admin successfully");
  } catch (error) {
    console.error("Error sending contact form message to admin:", error);
    throw new Error("Failed to send contact form message to admin");
  }
};

// Optional: Send confirmation email to user
export const sendContactFormConfirmation = async (
  userEmail: string,
  userName?: string
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: userEmail,
    subject: "✅ Message Received - We'll Get Back to You Soon",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px 8px 0 0; border: 1px solid #c3e6cb;">
          <h2 style="color: #155724; margin: 0;">Thank You for Contacting Us!</h2>
        </div>
        
        <div style="padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello${userName ? ` ${userName}` : ""},</p>
          
          <p>Thank you for reaching out to us! We've received your message and will get back to you as soon as possible.</p>
          
          <p>We typically respond within 24-48 hours during business days.</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 25px 0;">
            <p style="margin: 0;"><strong>What's Next?</strong></p>
            <p style="margin: 10px 0 0 0;">Our team will review your message and respond directly to this email address.</p>
          </div>
          
          <p>If you have any urgent questions, please don't hesitate to reach out to us directly.</p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated confirmation email.<br>
            Message sent on: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Contact form confirmation sent to user successfully");
  } catch (error) {
    console.error("Error sending contact form confirmation:", error);
    // Don't throw error here as it's not critical
  }
};
