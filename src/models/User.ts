import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  company: string;
  timezone: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  verificationStatus: "pending" | "approved" | "rejected";
  verificationToken?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  assignedRepresentative?: Types.ObjectId;
  isAdmin: boolean
}

const UserSchema: Schema = new Schema<IUser>({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
  },
  timezone: {
    type: String,
    required: true,
    enum: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Anchorage",
      "Pacific/Honolulu",
      "UTC",
    ],
    default: "America/New_York",
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  verificationToken: {
    type: String,
  },
  verifiedBy: {
    type: String,
  },
  verifiedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  assignedRepresentative: {
    type: Schema.Types.ObjectId,
    ref: 'Representative'
  },
  isAdmin: {
    type: Boolean,
    default: false,
  }
});

export default mongoose.model<IUser>("User", UserSchema);
