import express from "express";
import {
  checkAuth,
  loginUser,
  registerUser,
  adminVerifyUser,
  getPendingUsers,
  manualVerifyUser,
  logoutUser,
  updateProfile,
  forgotPassword,
  resetPassword,
  submitContactForm, // Add this import
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// Contact form route (public)
router.post("/contact", submitContactForm);

// Password reset routes (public)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Admin verification routes (called from email links)
router.get("/admin-verify", adminVerifyUser);

// Admin panel routes
router.get("/pending-users", protect, getPendingUsers);
router.post("/manual-verify", protect, manualVerifyUser);

// Protected routes
router.get("/test", (_req, res) => {
  res.json({ message: "User route working" });
});
router.get("/check-auth", protect, checkAuth);
router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

router.put("/profile", protect, updateProfile);

export default router;
