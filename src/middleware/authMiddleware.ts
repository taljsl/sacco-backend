import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

interface JwtPayload {
  id: string;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      const user = await User.findById(decoded.id)
        .select("-password")
        .populate("assignedRepresentative", "name phone email");
      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }
};
