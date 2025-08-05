import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { securityService } from '../services/securityService';
import { auditService } from '../services/auditService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    name: string;
    role: 'admin' | 'manager' | 'user' | 'viewer';
    permissions: string[];
    subscriptionTier: 'starter' | 'professional' | 'enterprise';
  };
  organization?: {
    id: string;
    name: string;
    domain?: string;
    subscriptionTier: string;
    features: Record<string, any>;
  };
  sessionId?: string;
}

export interface JWTPayload {
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  permissions: string[];
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  sessionId: string;
  iat: number;
  exp: number;
}

export interface UserRecord {
  id: string;
  organizationId: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  permissions: Record<string, any>;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  subscriptionTier: string;
  organizationName: string;
  organizationFeatures: Record<string, any>;
}

// Enhanced mock data with multi-tenant structure
const organizations = new Map([
  ['org1', {
    id: 'org1',
    name: 'Demo Company',
    domain: 'demo.example.com',
    subscriptionTier: 'professional',
    features: { 
      advancedSecurity: true, 
      businessMetrics: true, 
      complianceReporting: true,
      maxUsers: 20,
      maxWorkflows: 50
    }
  }],
  ['org2', {
    id: 'org2',
    name: 'Enterprise Corp',
    domain: 'enterprise.corp.com',
    subscriptionTier: 'enterprise',
    features: { 
      advancedSecurity: true, 
      businessMetrics: true, 
      complianceReporting: true,
      auditLogging: true,
      ssoIntegration: true,
      maxUsers: 100,
      maxWorkflows: 200
    }
  }]
]);

const users = new Map([
  ['user1', {
    id: 'user1',
    organizationId: 'org1',
    email: 'demo@example.com',
    name: 'Demo User',
    role: 'user' as const,
    password: bcrypt.hashSync('demo123', 10),
    permissions: {
      workflows: ['read', 'create', 'update'],
      analytics: ['read'],
      settings: []
    },
    emailVerified: true,
    mfaEnabled: false,
    lastLogin: new Date(),
    loginAttempts: 0,
    createdAt: new Date('2024-01-01'),
    subscriptionTier: 'professional',
    organizationName: 'Demo Company',
    organizationFeatures: organizations.get('org1')?.features || {}
  }],
  ['admin1', {
    id: 'admin1',
    organizationId: 'org1',
    email: 'admin@demo.example.com',
    name: 'Demo Admin',
    role: 'admin' as const,
    password: bcrypt.hashSync('admin123', 10),
    permissions: {
      workflows: ['read', 'create', 'update', 'delete'],
      analytics: ['read', 'export'],
      settings: ['read', 'update'],
      users: ['read', 'create', 'update', 'delete'],
      security: ['read', 'update']
    },
    emailVerified: true,
    mfaEnabled: true,
    mfaSecret: 'JBSWY3DPEHPK3PXP',
    lastLogin: new Date(),
    loginAttempts: 0,
    createdAt: new Date('2024-01-01'),
    subscriptionTier: 'professional',
    organizationName: 'Demo Company',
    organizationFeatures: organizations.get('org1')?.features || {}
  }],
  ['enterprise1', {
    id: 'enterprise1',
    organizationId: 'org2',
    email: 'admin@enterprise.corp.com',
    name: 'Enterprise Administrator',
    role: 'admin' as const,
    password: bcrypt.hashSync('enterprise123', 10),
    permissions: {
      workflows: ['read', 'create', 'update', 'delete'],
      analytics: ['read', 'export'],
      settings: ['read', 'update'],
      users: ['read', 'create', 'update', 'delete'],
      security: ['read', 'update'],
      compliance: ['read', 'export'],
      audit: ['read', 'export']
    },
    emailVerified: true,
    mfaEnabled: true,
    mfaSecret: 'JBSWY3DPEHPK3PXP',
    lastLogin: new Date(),
    loginAttempts: 0,
    createdAt: new Date('2024-01-01'),
    subscriptionTier: 'enterprise',
    organizationName: 'Enterprise Corp',
    organizationFeatures: organizations.get('org2')?.features || {}
  }]
]);

// Rate limiting configurations
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'unknown');
  },
  onLimitReached: async (req) => {
    const email = req.body?.email;
    if (email) {
      const user = Array.from(users.values()).find(u => u.email === email);
      if (user) {
        await auditService.logAuditEvent({
          organizationId: user.organizationId,
          userId: user.id,
          action: 'rate_limit_exceeded',
          resourceType: 'authentication',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          businessContext: {
            email: email,
            attempts: 5
          },
          complianceRelevant: true
        });
      }
    }
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => {
    return (req.user?.organizationId || req.ip) + ':api';
  }
});

export class AuthService {
  private jwtSecret: string;
  private jwtExpiration: string;
  private refreshTokenExpiration: string;
  private activeSessions: Map<string, any> = new Map();

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
    this.refreshTokenExpiration = process.env.REFRESH_TOKEN_EXPIRATION || '7d';
  }

  /**
   * Generate JWT token with organization context
   */
  public generateToken(user: UserRecord, sessionId: string): { accessToken: string; refreshToken: string } {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: this.flattenPermissions(user.permissions),
      subscriptionTier: user.subscriptionTier as 'starter' | 'professional' | 'enterprise',
      sessionId
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiration });
    const refreshToken = jwt.sign({ userId: user.id, sessionId }, this.jwtSecret, { 
      expiresIn: this.refreshTokenExpiration 
    });

    // Store session information
    this.activeSessions.set(sessionId, {
      userId: user.id,
      organizationId: user.organizationId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: null,
      userAgent: null
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token and return payload
   */
  public verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Check if session is still active
      const session = this.activeSessions.get(decoded.sessionId);
      if (!session) {
        logger.warn('Session not found for token:', decoded.sessionId);
        return null;
      }

      // Update session activity
      session.lastActivity = new Date();
      
      return decoded;
    } catch (error) {
      logger.warn('Invalid JWT token:', error);
      return null;
    }
  }

  /**
   * Authenticate user with email and password (multi-tenant aware)
   */
  public async authenticateUser(
    email: string, 
    password: string,
    mfaToken?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    user?: UserRecord;
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string;
    requiresMFA?: boolean;
    message: string;
  }> {
    try {
      // Find user by email across all organizations
      const user = Array.from(users.values()).find(u => u.email === email);
      
      if (!user) {
        await this.logFailedLoginAttempt(email, 'user_not_found', ipAddress, userAgent);
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.logFailedLoginAttempt(email, 'account_locked', ipAddress, userAgent, user.organizationId);
        return {
          success: false,
          message: 'Account temporarily locked due to too many failed attempts'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        await this.incrementLoginAttempts(user);
        await this.logFailedLoginAttempt(email, 'invalid_password', ipAddress, userAgent, user.organizationId);
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaToken) {
          return {
            success: false,
            requiresMFA: true,
            message: 'MFA token required'
          };
        }

        const isMFAValid = securityService.verifyMFAToken(user.mfaSecret!, mfaToken);
        if (!isMFAValid) {
          await this.logFailedLoginAttempt(email, 'invalid_mfa', ipAddress, userAgent, user.organizationId);
          return {
            success: false,
            message: 'Invalid MFA token'
          };
        }
      }

      // Reset login attempts on successful authentication
      user.loginAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLogin = new Date();

      // Generate session ID and tokens
      const sessionId = this.generateSessionId();
      const tokens = this.generateToken(user, sessionId);

      // Log successful login
      await auditService.logAuditEvent({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'login_success',
        resourceType: 'authentication',
        ipAddress,
        userAgent,
        businessContext: {
          email: user.email,
          mfaUsed: user.mfaEnabled,
          subscriptionTier: user.subscriptionTier
        },
        complianceRelevant: true
      });

      // Update session info
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.ipAddress = ipAddress;
        session.userAgent = userAgent;
      }

      logger.info(`User authenticated successfully: ${email} (Organization: ${user.organizationName})`);

      return {
        success: true,
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId,
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
   * Check user permissions for resource and action
   */
  public checkPermission(
    user: AuthenticatedRequest['user'],
    resource: string,
    action: string
  ): boolean {
    if (!user) return false;

    // System admins have all permissions
    if (user.role === 'admin' && user.permissions.includes('*')) {
      return true;
    }

    // Check specific permission
    const permissionKey = `${resource}:${action}`;
    if (user.permissions.includes(permissionKey)) {
      return true;
    }

    // Check wildcard permissions
    const resourceWildcard = `${resource}:*`;
    if (user.permissions.includes(resourceWildcard)) {
      return true;
    }

    // Role-based default permissions
    return this.checkRolePermission(user.role, resource, action);
  }

  /**
   * Check subscription tier access to features
   */
  public checkSubscriptionAccess(
    subscriptionTier: string,
    feature: string
  ): boolean {
    const tierFeatures = {
      starter: ['basic_workflows', 'basic_analytics'],
      professional: [
        'basic_workflows', 'basic_analytics', 'advanced_workflows',
        'business_metrics', 'compliance_reporting', 'advanced_security'
      ],
      enterprise: [
        'basic_workflows', 'basic_analytics', 'advanced_workflows',
        'business_metrics', 'compliance_reporting', 'advanced_security',
        'audit_logging', 'sso_integration', 'custom_integrations'
      ]
    };

    return tierFeatures[subscriptionTier as keyof typeof tierFeatures]?.includes(feature) || false;
  }

  /**
   * Refresh access token
   */
  public async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    message: string;
  }> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
      const user = users.get(decoded.userId);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const session = this.activeSessions.get(decoded.sessionId);
      if (!session) {
        return { success: false, message: 'Session expired' };
      }

      // Generate new access token
      const newTokens = this.generateToken(user, decoded.sessionId);
      
      return {
        success: true,
        accessToken: newTokens.accessToken,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      logger.warn('Token refresh failed:', error);
      return { success: false, message: 'Invalid refresh token' };
    }
  }

  /**
   * Logout user and invalidate session
   */
  public async logout(sessionId: string, userId: string): Promise<void> {
    try {
      // Remove active session
      this.activeSessions.delete(sessionId);
      
      const user = users.get(userId);
      if (user) {
        // Log logout event
        await auditService.logAuditEvent({
          organizationId: user.organizationId,
          userId: user.id,
          action: 'logout',
          resourceType: 'authentication',
          complianceRelevant: true
        });
      }
    } catch (error) {
      logger.error('Logout error:', error);
    }
  }

  /**
   * Get user by ID with organization context
   */
  public getUserById(userId: string): UserRecord | null {
    return users.get(userId) || null;
  }

  /**
   * Private helper methods
   */
  private flattenPermissions(permissions: Record<string, string[]>): string[] {
    const flattened: string[] = [];
    
    for (const [resource, actions] of Object.entries(permissions)) {
      for (const action of actions) {
        flattened.push(`${resource}:${action}`);
      }
    }
    
    return flattened;
  }

  private checkRolePermission(
    role: string,
    resource: string,
    action: string
  ): boolean {
    const rolePermissions = {
      viewer: {
        workflows: ['read'],
        analytics: ['read'],
        settings: []
      },
      user: {
        workflows: ['read', 'create', 'update'],
        analytics: ['read'],
        settings: ['read']
      },
      manager: {
        workflows: ['read', 'create', 'update', 'delete'],
        analytics: ['read', 'export'],
        settings: ['read', 'update'],
        users: ['read']
      },
      admin: {
        workflows: ['read', 'create', 'update', 'delete'],
        analytics: ['read', 'export'],
        settings: ['read', 'update'],
        users: ['read', 'create', 'update', 'delete'],
        security: ['read', 'update']
      }
    };

    const permissions = rolePermissions[role as keyof typeof rolePermissions];
    return permissions?.[resource as keyof typeof permissions]?.includes(action) || false;
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async incrementLoginAttempts(user: UserRecord): Promise<void> {
    user.loginAttempts += 1;
    
    // Lock account after 5 failed attempts
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      await securityService.logSecurityEvent({
        organizationId: user.organizationId,
        eventType: 'account_locked',
        severity: 'medium',
        userId: user.id,
        eventData: {
          email: user.email,
          attemptCount: user.loginAttempts
        }
      });
    }
  }

  private async logFailedLoginAttempt(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
    organizationId?: string
  ): Promise<void> {
    await auditService.logAuditEvent({
      organizationId: organizationId || 'unknown',
      action: 'login_failed',
      resourceType: 'authentication',
      ipAddress,
      userAgent,
      businessContext: {
        email,
        reason,
        timestamp: new Date().toISOString()
      },
      complianceRelevant: true
    });
  }
}

// Export singleton instance
export const authService = new AuthService();

/**
 * Middleware to authenticate JWT tokens with multi-tenant support
 */
export const authenticate = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get full user record
    const user = authService.getUserById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get organization information
    const organization = organizations.get(user.organizationId);
    if (!organization) {
      res.status(401).json({
        success: false,
        message: 'Organization not found'
      });
      return;
    }

    // Attach user and organization info to request
    req.user = {
      id: decoded.userId,
      organizationId: decoded.organizationId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      permissions: decoded.permissions,
      subscriptionTier: decoded.subscriptionTier
    };

    req.organization = organization;
    req.sessionId = decoded.sessionId;

    // Log API access for audit trail
    await auditService.logAuditEvent({
      organizationId: decoded.organizationId,
      userId: decoded.userId,
      action: 'api_access',
      resourceType: 'api_endpoint',
      businessContext: {
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

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
 * Middleware to check specific permissions
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const hasPermission = authService.checkPermission(req.user, resource, action);
    
    if (!hasPermission) {
      // Log permission denied
      auditService.logAuditEvent({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: 'permission_denied',
        resourceType: 'access_control',
        businessContext: {
          requestedResource: resource,
          requestedAction: action,
          userRole: req.user.role,
          userPermissions: req.user.permissions
        },
        complianceRelevant: true
      });

      res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${resource}:${action}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check subscription tier access
 */
export const requireSubscription = (feature: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const hasAccess = authService.checkSubscriptionAccess(req.user.subscriptionTier, feature);
    
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Feature not available in ${req.user.subscriptionTier} subscription. Required feature: ${feature}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for tenant isolation - ensures users can only access their organization's data
 */
export const enforceTenantIsolation = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // Add organization filter to query parameters
  req.query.organizationId = req.user.organizationId;
  
  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  next();
};

// Legacy middleware for backward compatibility
export const requireAdmin = requirePermission('system', 'admin');
export const requireUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }
  next();
};