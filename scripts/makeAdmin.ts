// scripts/makeAdmin.ts
// Run this script to make a user an admin
// Usage: npx ts-node scripts/makeAdmin.ts <email>
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../src/models/User";

const makeAdmin = async (email: string) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log("User not found");
      process.exit(1);
    }

    user.isAdmin = true;
    await user.save();

    console.log(`User ${email} is now an admin`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

const email = process.argv[2];
if (!email) {
  console.log("Please provide an email address");
  console.log("Usage: npx ts-node scripts/makeAdmin.ts <email>");
  process.exit(1);
}

makeAdmin(email);
