import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { templateLoader } from '../services/templateLoader';
import { provisioningService } from '../services/provisioningService';
import { secretsManager } from '../services/secretsManager';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/admin/dashboard
 * Get admin dashboard data
 */
router.get('/dashboard', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const templateStats = templateLoader.getTemplateStats();
    const provisioningStats = provisioningService.getProvisioningStats();
    const secretsStats = secretsManager.getSecretsStats();

    // Mock system stats
    const systemStats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: {
        usage: Math.random() * 100,
        cores: require('os').cpus().length
      },
      version: process.version,
      platform: process.platform
    };

    res.json({
      success: true,
      data: {
        templates: templateStats,
        provisioning: provisioningStats,
        secrets: secretsStats,
        system: systemStats,
        summary: {
          totalTemplates: templateStats.total,
          totalJobs: provisioningStats.totalJobs,
          totalSecrets: secretsStats.total,
          successRate: provisioningStats.successRate
        }
      }
    });
  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin dashboard data'
    });
  }
});

/**
 * GET /api/admin/system/info
 * Get system information
 */
router.get('/system/info', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const systemInfo = {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: {
        cores: require('os').cpus().length,
        model: require('os').cpus()[0]?.model || 'Unknown'
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        system: systemInfo
      }
    });
  } catch (error) {
    logger.error('Get system info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system information'
    });
  }
});

/**
 * GET /api/admin/logs
 * Get application logs (admin only)
 */
router.get('/logs', authenticate, requireAdmin, [
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('offset').optional().isInt({ min: 0 })
], (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { level = 'info', limit = 100, offset = 0 } = req.query;

    // Mock log data (in production, this would read from actual log files)
    const mockLogs = Array.from({ length: 500 }, (_, i) => ({
      timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
      level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
      message: `Log entry ${i + 1}`,
      service: 'n8n-workflow-manager',
      requestId: `req-${Math.random().toString(36).substr(2, 9)}`
    }));

    let filteredLogs = mockLogs;
    
    // Filter by level
    if (level !== 'info') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    // Apply pagination
    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get application logs'
    });
  }
});

/**
 * POST /api/admin/templates/reload
 * Reload workflow templates
 */
router.post('/templates/reload', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    templateLoader.reloadTemplates();
    const stats = templateLoader.getTemplateStats();

    logger.info(`Templates reloaded by admin ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Templates reloaded successfully',
      data: {
        stats
      }
    });
  } catch (error) {
    logger.error('Reload templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reload templates'
    });
  }
});

/**
 * POST /api/admin/system/maintenance
 * Toggle maintenance mode
 */
router.post('/system/maintenance', authenticate, requireAdmin, [
  body('enabled').isBoolean(),
  body('message').optional().isString()
], (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { enabled, message } = req.body;

    // In production, this would update a global maintenance flag
    logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by admin ${req.user?.email}`);

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        maintenanceMode: enabled,
        message: message || (enabled ? 'System is under maintenance' : 'System is operational')
      }
    });
  } catch (error) {
    logger.error('Toggle maintenance mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle maintenance mode'
    });
  }
});

/**
 * GET /api/admin/jobs
 * Get all provisioning jobs (admin only)
 */
router.get('/jobs', authenticate, requireAdmin, [
  query('status').optional().isIn(['pending', 'validating', 'provisioning', 'configuring', 'testing', 'ready', 'active', 'failed', 'scheduled']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, limit = 50, offset = 0 } = req.query;
    
    let jobs = provisioningService.getJobsByStatus(status as any);
    
    // If no status filter, get all jobs
    if (!status) {
      const stats = provisioningService.getProvisioningStats();
      jobs = Object.values(stats.byStatus).flat() as any;
    }

    // Apply pagination
    const total = jobs.length;
    const paginatedJobs = jobs.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: {
        jobs: paginatedJobs,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Get admin jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provisioning jobs'
    });
  }
});

/**
 * POST /api/admin/cleanup
 * Clean up old jobs and data
 */
router.post('/cleanup', authenticate, requireAdmin, [
  body('olderThanDays').optional().isInt({ min: 1, max: 365 }),
  body('types').optional().isArray()
], (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { olderThanDays = 30, types = ['jobs'] } = req.body;
    const results: any = {};

    // Cleanup jobs if requested
    if (types.includes('jobs')) {
      results.cleanedJobs = provisioningService.cleanupOldJobs(olderThanDays);
    }

    // Log cleanup action
    logger.info(`Cleanup performed by admin ${req.user?.email}`, { 
      olderThanDays, 
      types, 
      results 
    });

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: {
        results,
        olderThanDays,
        types
      }
    });
  } catch (error) {
    logger.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform cleanup'
    });
  }
});

/**
 * GET /api/admin/health
 * Get system health check
 */
router.get('/health', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        templateLoader: {
          status: 'healthy',
          templatesLoaded: templateLoader.getTemplateStats().total
        },
        provisioningService: {
          status: 'healthy',
          totalJobs: provisioningService.getProvisioningStats().totalJobs
        },
        secretsManager: {
          status: 'healthy',
          totalSecrets: secretsManager.getSecretsStats().total
        }
      }
    };

    res.json({
      success: true,
      data: {
        health
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
});

export default router;