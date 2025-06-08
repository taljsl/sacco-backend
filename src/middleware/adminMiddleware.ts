// src/middleware/adminMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};