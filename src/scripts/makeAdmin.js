"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/makeAdmin.ts
// Run this script to make a user an admin
// Usage: npx ts-node scripts/makeAdmin.ts <email>
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../src/models/User"));
const makeAdmin = async (email) => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log("User not found");
            process.exit(1);
        }
        user.isAdmin = true;
        await user.save();
        console.log(`User ${email} is now an admin`);
        process.exit(0);
    }
    catch (error) {
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
