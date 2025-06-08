// src/controllers/adminController.ts
import { Request, Response, RequestHandler } from "express";
import User, { IUser } from "../models/User";
import Representative, { IRepresentative } from "../models/Representative";
import { sendUserNotificationEmail } from "../utils/emailService";

interface ManualVerifyWithRepRequestBody {
  userId: string;
  action: "approve" | "reject";
  representativeId?: string;
}

// Get all representatives
export const getRepresentatives: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const representatives = await Representative.find({ isActive: true })
      .sort({ name: 1 });

    res.status(200).json({
      message: "Representatives retrieved successfully",
      representatives,
    });
  } catch (error) {
    console.error("Error fetching representatives:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users with their representatives
export const getAllUsers: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find()
      .populate('assignedRepresentative', 'name phone email')
      .select("-password -verificationToken -passwordResetToken")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Users retrieved successfully",
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get pending users for verification
export const getPendingUsersAdmin: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pendingUsers = await User.find({
      verificationStatus: "pending",
    })
      .select("-password -verificationToken")
      .sort({ createdAt: -1 });

    const representatives = await Representative.find({ isActive: true })
      .sort({ name: 1 });

    res.status(200).json({
      message: "Pending users and representatives retrieved successfully",
      users: pendingUsers,
      representatives,
    });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Manual verification with representative assignment
export const manualVerifyUserWithRep: RequestHandler = async (
  req: Request<{}, {}, ManualVerifyWithRepRequestBody>,
  res: Response
): Promise<void> => {
  const { userId, action, representativeId } = req.body;

  if (!userId || !action) {
    res.status(400).json({ message: "Missing userId or action" });
    return;
  }

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ message: "Invalid action" });
    return;
  }

  if (action === "approve" && !representativeId) {
    res.status(400).json({ message: "Representative must be assigned when approving user" });
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

    // Verify representative exists if approving
    let representative = null;
    if (action === "approve" && representativeId) {
      representative = await Representative.findById(representativeId);
      if (!representative) {
        res.status(400).json({ message: "Invalid representative" });
        return;
      }
    }

    const statusMap = { approve: "approved", reject: "rejected" } as const;
    user.verificationStatus = statusMap[action];
    user.isEmailVerified = action === "approve";
    user.verifiedBy = req.user?.email || "admin";
    user.verifiedAt = new Date();
    user.verificationToken = undefined;
    
    // Assign representative if approving
    if (action === "approve" && representativeId) {
      user.assignedRepresentative = representativeId as any;
    }

    await user.save();

    // Populate representative for response
    await user.populate('assignedRepresentative', 'name phone email');

    // Send notification to user
    try {
      await sendUserNotificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        action as "approved" | "rejected",
        req.user?.email,
        representative ? {
          name: representative.name,
          phone: representative.phone,
          email: representative.email
        } : undefined
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
        company: user.company,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt,
        assignedRepresentative: user.assignedRepresentative,
      },
    });
  } catch (error) {
    console.error("Error in manual verification:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Assign or change representative for existing user
export const assignRepresentative: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId, representativeId } = req.body;

  if (!userId || !representativeId) {
    res.status(400).json({ message: "Missing userId or representativeId" });
    return;
  }

  try {
    const user = await User.findById(userId);
    const representative = await Representative.findById(representativeId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!representative) {
      res.status(404).json({ message: "Representative not found" });
      return;
    }

    user.assignedRepresentative = representativeId as any;
    await user.save();
    await user.populate('assignedRepresentative', 'name phone email');

    res.status(200).json({
      message: "Representative assigned successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        assignedRepresentative: user.assignedRepresentative,
      },
    });
  } catch (error) {
    console.error("Error assigning representative:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create initial representatives (run once)
export const seedRepresentatives: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check if representatives already exist
    const existingReps = await Representative.countDocuments();
    if (existingReps > 0) {
      res.status(400).json({ message: "Representatives already exist" });
      return;
    }

    const representatives = [
      {
        name: "Josh Levine",
        phone: "516-555-1234",
        email: "Josh@FakeSacco.com",
      },
      {
        name: "Guido Van Rossum",
        phone: "516-555-5678",
        email: "Guido@FakeSacco.com",
      },
      {
        name: "Linus Torvalds",
        phone: "516-555-9012",
        email: "Linus@FakeSacco.com",
      },
      {
        name: "Mickey Mouse",
        phone: "516-555-3456",
        email: "Mickey@FakeSacco.com",
      },
      {
        name: "Anders Hejlsberg",
        phone: "516-555-7890",
        email: "Anders@FakeSacco.com",
      },
    ];

    const createdReps = await Representative.insertMany(representatives);

    res.status(201).json({
      message: "Representatives created successfully",
      representatives: createdReps,
    });
  } catch (error) {
    console.error("Error seeding representatives:", error);
    res.status(500).json({ message: "Server error" });
  }
};