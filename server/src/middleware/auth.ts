import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Security } from '../utils/security';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (req: ExpressRequest, res: ExpressResponse, next: any) => {
  const request = req as any;
  const response = res as any;
  const authHeader = request.headers['authorization'];
  
  if (!authHeader) {
    return response.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const payload = Security.verifyToken(token);
    
    if (!payload) {
         return response.status(401).json({ error: 'Invalid or Expired Token' });
    }

    // Optional: Fetch full user from DB if needed, or just use payload for speed
    // For critical actions, fetching ensures role/active status is fresh
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ 
        where: { id: payload.id },
        relations: ['branch']
    });

    if (!user || !user.isActive) {
        return response.status(403).json({ error: 'Account is disabled or not found' });
    }

    request.user = user;
    next();
  } catch (error) {
    response.status(401).json({ error: 'Authentication failed' });
  }
};

export const isAdmin = (req: ExpressRequest, res: ExpressResponse, next: any) => {
  const request = req as any;
  const response = res as any;
  if (!request.user || request.user.role !== 'ADMIN') {
    return response.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

export const authorize = (roles: string[]) => {
  return (req: ExpressRequest, res: ExpressResponse, next: any) => {
    const request = req as any;
    const response = res as any;
    if (!request.user) return response.status(401).json({ error: 'Unauthorized' });
    
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
};