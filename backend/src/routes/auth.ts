import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authService, AuthenticatedRequest, authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    
    // Authenticate user
    const result = await authService.authenticateUser(email, password);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    // Return success response
    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Generate new token
    const newToken = authService.generateToken(req.user);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 */
router.post('/logout', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success and let the client handle token removal
    
    logger.info(`User logged out: ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * GET /api/auth/validate
 * Validate JWT token (for frontend to check if token is still valid)
 */
router.get('/validate', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Token validation failed'
    });
  }
});

export default router;