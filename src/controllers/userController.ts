import {
  sendContactFormToAdmin,
  sendContactFormConfirmation,
} from "../utils/emailService";
import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcrypt";
import User, { IUser } from "../models/User";
import generateToken from "../utils/generateToken";
import {
  sendVerificationRequestToAdmin,
  sendUserNotificationEmail,
  generateVerificationToken,
  generatePasswordResetToken,
  sendPasswordResetEmail,
} from "../utils/emailService";

interface RegisterRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  company: string;
  timezone: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

interface UpdateProfileRequestBody {
  firstName: string;
  lastName: string;
  phone: string;
  timezone: string;
}

interface ForgotPasswordRequestBody {
  email: string;
}

interface ResetPasswordRequestBody {
  token: string;
  password: string;
}

export const registerUser: RequestHandler = async (
  req: Request<{}, {}, RegisterRequestBody>,
  res: Response
): Promise<void> => {
  const { firstName, lastName, email, password, phone, company, timezone } =
    req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !phone ||
    !company ||
    !timezone
  ) {
    res.status(400).json({
      message:
        "Please provide all required fields: firstName, lastName, email, password, phone, company, and timezone",
    });
    return;
  }

  try {
    const existingUser: IUser | null = await User.findOne({ email });

    if (existingUser) {
      res.status(400).json({ message: "User already exists with this email" });
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token for admin
    const verificationToken = generateVerificationToken();

    const newUser: IUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      company,
      timezone,
      verificationToken: verificationToken,
      verificationStatus: "pending",
    });

    await newUser.save();

    // Send verification request to admin
    try {
      await sendVerificationRequestToAdmin(
        email,
        `${firstName} ${lastName}`,
        newUser._id.toString(),
        verificationToken
      );
    } catch (emailError) {
      console.error("Admin notification email failed:", emailError);
      // Continue registration process even if email fails
    }

    res.status(201).json({
      message:
        "Registration successful! Your account is pending approval. You'll receive an email once it's been reviewed.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        company: newUser.company,
        timezone: newUser.timezone,
        verificationStatus: newUser.verificationStatus,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginUser: RequestHandler = async (
  req: Request<{}, {}, LoginRequestBody>,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Please provide email and password" });
    return;
  }

  try {
    const user: IUser | null = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Check verification status
    if (user.verificationStatus === "pending") {
      res.status(401).json({
        message:
          "Your account is pending approval. Please wait for admin verification.",
        verificationStatus: "pending",
      });
      return;
    }

    if (user.verificationStatus === "rejected") {
      res.status(401).json({
        message:
          "Your account registration has been rejected. Please contact support.",
        verificationStatus: "rejected",
      });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(401).json({
        message: "Your account has not been verified. Please contact support.",
        verificationStatus: "not_verified",
      });
      return;
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        company: user.company,
        timezone: user.timezone,
        verificationStatus: user.verificationStatus,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin endpoint to approve/reject users
export const adminVerifyUser: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token, action } = req.query;

  if (!token || !action) {
    res.status(400).json({ message: "Missing token or action parameter" });
    return;
  }

  if (action !== "approve" && action !== "reject") {
    res
      .status(400)
      .json({ message: 'Invalid action. Must be "approve" or "reject"' });
    return;
  }

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      res
        .status(404)
        .json({ message: "Invalid verification token or user not found" });
      return;
    }

    if (user.verificationStatus !== "pending") {
      res.status(400).json({
        message: `User has already been ${user.verificationStatus}`,
      });
      return;
    }

    const statusMap = { approve: "approved", reject: "rejected" } as const;
    user.verificationStatus = statusMap[action as "approve" | "reject"];
    user.isEmailVerified = action === "approve";
    user.verifiedBy = "joshua.levine42@gmail.com"; // Admin email
    user.verifiedAt = new Date();
    user.verificationToken = undefined; // Remove token after use

    await user.save();

    // Send notification email to user
    try {
      const mappedStatus = statusMap[action as "approve" | "reject"];
      await sendUserNotificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        mappedStatus,
        "joshua.levine42@gmail.com"
      );
    } catch (emailError) {
      console.error("User notification email failed:", emailError);
    }

    res.status(200).json({
      message: `User ${action}d successfully and notification sent to user.`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt,
        verifiedBy: user.verifiedBy,
      },
    });
  } catch (error) {
    console.error("Error in admin verification:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all pending users (for admin panel)
export const getPendingUsers: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pendingUsers = await User.find({
      verificationStatus: "pending",
    })
      .select("-password -verificationToken")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Pending users retrieved successfully",
      count: pendingUsers.length,
      users: pendingUsers,
    });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Manual admin verification (for admin panel)
export const manualVerifyUser: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId, action } = req.body;

  if (!userId || !action) {
    res.status(400).json({ message: "Missing userId or action" });
    return;
  }

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ message: "Invalid action" });
    return;
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.verificationStatus !== "pending") {
      res.status(400).json({
        message: `User has already been ${user.verificationStatus}`,
      });
      return;
    }

    const statusMap = { approve: "approved", reject: "rejected" } as const;
    user.verificationStatus = statusMap[action as "approve" | "reject"];
    user.isEmailVerified = action === "approve";
    user.verifiedBy = "joshua.levine42@gmail.com";
    user.verifiedAt = new Date();
    user.verificationToken = undefined;

    await user.save();

    // Send notification to user
    try {
      await sendUserNotificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        action as "approved" | "rejected",
        "joshua.levine42@gmail.com"
      );
    } catch (emailError) {
      console.error("User notification email failed:", emailError);
    }

    res.status(200).json({
      message: `User ${action}d successfully`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Error in manual verification:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const logoutUser: RequestHandler = (_req: Request, res: Response) => {
  // For JWT, logout is handled on the client by deleting the token.
  // Optionally, you can instruct the client to remove the token cookie.
  res.status(200).json({ message: "Logout successful" });
};

export const updateProfile: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { firstName, lastName, phone, timezone } = req.body;

  if (!req.user) {
    res.status(401).json({ message: "User not authenticated" });
    return;
  }

  try {
    const userId = req.user._id;

    // Build update object with only provided fields
    const updateFields: Partial<IUser> = {};
    if (firstName) updateFields.firstName = firstName.trim();
    if (lastName) updateFields.lastName = lastName.trim();
    if (phone) updateFields.phone = phone.trim();
    if (timezone) updateFields.timezone = timezone;

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      runValidators: true,
    }).select("-password -verificationToken");

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        company: updatedUser.company,
        timezone: updatedUser.timezone,
        verificationStatus: updatedUser.verificationStatus,
        isEmailVerified: updatedUser.isEmailVerified,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const checkAuth: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  // The protect middleware already validates the token and attaches user to req
  // If we reach this point, the user is authenticated
  if (!req.user) {
    res.status(401).json({ message: "User not authenticated" });
    return;
  }

  res.status(200).json({
    message: "User is authenticated",
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      phone: req.user.phone,
      company: req.user.company,
      timezone: req.user.timezone,
      verificationStatus: req.user.verificationStatus,
      isEmailVerified: req.user.isEmailVerified,
      createdAt: req.user.createdAt,
    },
  });
};

export const forgotPassword: RequestHandler = async (
  req: Request<{}, {}, ForgotPasswordRequestBody>,
  res: Response
): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: "Please provide email address" });
    return;
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(200).json({
        message:
          "If an account with that email esists, we've sent a password reset link.",
      });
      return;
    }
    if (user.verificationStatus !== "approved" || !user.isEmailVerified) {
      res.status(400).json({
        message: "Password reset is only available for verified accounts",
      });
      return;
    }
    const resetToken = generatePasswordResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    try {
      await sendPasswordResetEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        resetToken
      );
    } catch (emailError) {
      console.error("Password reset email failed: ", emailError);

      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.status(500).json({
        message: "Failed to send password reset email. Please try again.",
      });
      return;
    }
    res.status(200).json({
      message: "Password reset link has been sent to your email address.",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const resetPassword: RequestHandler = async (
  req: Request<{}, {}, ResetPasswordRequestBody>,
  res: Response
): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ message: "Please provide token and new password" });
    return;
  }

  if (password.length < 6) {
    res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });
    return;
  }

  try {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        message: "Invalid or expired password reset token",
      });
      return;
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user with new password and clear reset fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.status(200).json({
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add this to your userController.ts file

interface ContactFormRequestBody {
  email: string;
  message: string;
  name?: string;
}

export const submitContactForm: RequestHandler = async (
  req: Request<{}, {}, ContactFormRequestBody>,
  res: Response
): Promise<void> => {
  const { email, message, name } = req.body;

  if (!email || !message) {
    res.status(400).json({
      message: "Please provide both email and message",
    });
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      message: "Please provide a valid email address",
    });
    return;
  }

  if (message.trim().length < 10) {
    res.status(400).json({
      message: "Message must be at least 10 characters long",
    });
    return;
  }

  try {
    // Check if this is from a registered user
    let userName = name;
    if (!userName) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        userName = `${existingUser.firstName} ${existingUser.lastName}`;
      }
    }

    // Send message to admin
    await sendContactFormToAdmin(email, message.trim(), userName);

    // Send confirmation to user (optional)
    try {
      await sendContactFormConfirmation(email, userName);
    } catch (confirmationError) {
      console.error("Confirmation email failed:", confirmationError);
      // Continue even if confirmation fails
    }

    res.status(200).json({
      message: "Thank you for your message! We'll get back to you soon.",
      success: true,
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({
      message: "There was an error sending your message. Please try again.",
      success: false,
    });
  }
};
