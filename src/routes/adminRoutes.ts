// src/routes/adminRoutes.ts
import express from "express";
import {
  getRepresentatives,
  getAllUsers,
  getPendingUsersAdmin,
  manualVerifyUserWithRep,
  assignRepresentative,
  seedRepresentatives,
} from "../controllers/adminController";
import { protect } from "../middleware/authMiddleware";
import { requireAdmin } from "../middleware/adminMiddleware";

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(protect);
router.use(requireAdmin);

// Representatives management
router.get("/representatives", getRepresentatives);
router.post("/seed-representatives", seedRepresentatives);

// User management
router.get("/users", getAllUsers);
router.get("/pending-users", getPendingUsersAdmin);
router.post("/verify-user", manualVerifyUserWithRep);
router.post("/assign-representative", assignRepresentative);

export default router;