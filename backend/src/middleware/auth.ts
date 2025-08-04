import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

// Mock user database (in production, this would be a real database)
const users = new Map([
  ['user1', {
    id: 'user1',
    email: 'demo@example.com',
    name: 'Demo User',
    role: 'user' as const,
    password: bcrypt.hashSync('demo123', 10), // demo123
    company: 'Demo Company',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  }],
  ['admin1', {
    id: 'admin1',
    email: 'admin@n8nmanager.com',
    name: 'System Administrator',
    role: 'admin' as const,
    password: bcrypt.hashSync('admin123', 10), // admin123
    company: 'n8n Workflow Manager',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  }]
]);

export class AuthService {
  private jwtSecret: string;
  private jwtExpiration: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
  }

  /**
   * Generate JWT token
   */
  public generateToken(user: { id: string; email: string; name: string; role: 'user' | 'admin' }): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiration });
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      logger.warn('Invalid JWT token:', error);
      return null;
    }
  }

  /**
   * Authenticate user with email and password
   */
  public async authenticateUser(email: string, password: string): Promise<{
    success: boolean;
    user?: { id: string; email: string; name: string; role: 'user' | 'admin' };
    token?: string;
    message: string;
  }> {
    try {
      // Find user by email
      const user = Array.from(users.values()).find(u => u.email === email);
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Update last login
      user.lastLogin = new Date();

      // Generate token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });

      logger.info(`User authenticated successfully: ${email}`);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token,
        message: 'Authentication successful'
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }

  /**
   * Get user by ID
   */
  public getUserById(userId: string): { id: string; email: string; name: string; role: 'user' | 'admin' } | null {
    const user = users.get(userId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  next();
};

/**
 * Middleware to require user role (user or admin)
 */
export const requireUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (!['user', 'admin'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: 'User access required'
    });
    return;
  }

  next();
};