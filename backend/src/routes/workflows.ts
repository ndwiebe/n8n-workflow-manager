import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, requireUser, AuthenticatedRequest } from '../middleware/auth';
import { templateLoader } from '../services/templateLoader';
import { provisioningService } from '../services/provisioningService';
import { secretsManager } from '../services/secretsManager';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/workflows/templates
 * Get all available workflow templates
 */
router.get('/templates', [
  query('category').optional().isString(),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('search').optional().isString()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { category, difficulty, search } = req.query;
    let templates = templateLoader.getAllTemplates();

    // Apply filters
    if (category) {
      templates = templates.filter(t => t.category.toLowerCase() === (category as string).toLowerCase());
    }

    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty);
    }

    if (search) {
      templates = templateLoader.searchTemplates(search as string);
    }

    res.json({
      success: true,
      data: {
        templates,
        total: templates.length,
        filters: {
          category: category || null,
          difficulty: difficulty || null,
          search: search || null
        }
      }
    });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow templates'
    });
  }
});

/**
 * GET /api/workflows/templates/:templateId
 * Get a specific workflow template
 */
router.get('/templates/:templateId', [
  param('templateId').isString().notEmpty()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { templateId } = req.params;
    const template = templateLoader.getTemplateById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        template
      }
    });
  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow template'
    });
  }
});

/**
 * POST /api/workflows/provision
 * Start workflow provisioning
 */
router.post('/provision', authenticate, requireUser, [
  body('templateId').isString().notEmpty(),
  body('workflowId').isString().notEmpty(),
  body('configuration').isObject()
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { templateId, workflowId, configuration } = req.body;
    const userId = req.user!.id;

    // Start provisioning
    const result = await provisioningService.startProvisioning(
      userId,
      workflowId,
      templateId,
      configuration
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Provisioning started successfully',
      data: {
        jobId: result.jobId,
        status: result.status,
        estimatedCompletionTime: result.estimatedCompletionTime
      }
    });
  } catch (error) {
    logger.error('Provision workflow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start workflow provisioning'
    });
  }
});

/**
 * GET /api/workflows/jobs/:jobId
 * Get provisioning job status
 */
router.get('/jobs/:jobId', authenticate, requireUser, [
  param('jobId').isUUID()
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

    const { jobId } = req.params;
    const userId = req.user!.id;
    const job = provisioningService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check ownership (admin can see all jobs)
    if (req.user!.role !== 'admin' && job.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        job
      }
    });
  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status'
    });
  }
});

/**
 * GET /api/workflows/jobs
 * Get all jobs for current user
 */
router.get('/jobs', authenticate, requireUser, [
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

    const userId = req.user!.id;
    const { status, limit = 20, offset = 0 } = req.query;
    
    let jobs = provisioningService.getUserJobs(userId);
    
    // Filter by status if provided
    if (status) {
      jobs = jobs.filter(job => job.status === status);
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
    logger.error('Get user jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user jobs'
    });
  }
});

/**
 * POST /api/workflows/jobs/:jobId/schedule
 * Schedule workflow activation
 */
router.post('/jobs/:jobId/schedule', authenticate, requireUser, [
  param('jobId').isUUID(),
  body('activationDate').isISO8601()
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { jobId } = req.params;
    const { activationDate } = req.body;
    const userId = req.user!.id;

    const success = await provisioningService.scheduleActivation(
      jobId,
      userId,
      new Date(activationDate)
    );

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to schedule activation'
      });
    }

    res.json({
      success: true,
      message: 'Activation scheduled successfully'
    });
  } catch (error) {
    logger.error('Schedule activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule activation'
    });
  }
});

/**
 * DELETE /api/workflows/jobs/:jobId
 * Cancel a provisioning job
 */
router.delete('/jobs/:jobId', authenticate, requireUser, [
  param('jobId').isUUID()
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { jobId } = req.params;
    const userId = req.user!.id;

    const success = await provisioningService.cancelJob(jobId, userId);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to cancel job'
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job'
    });
  }
});

/**
 * POST /api/workflows/validate-config
 * Validate workflow configuration
 */
router.post('/validate-config', authenticate, requireUser, [
  body('templateId').isString().notEmpty(),
  body('configuration').isObject()
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

    const { templateId, configuration } = req.body;
    const validation = templateLoader.validateConfiguration(templateId, configuration);

    res.json({
      success: true,
      data: {
        valid: validation.valid,
        errors: validation.errors
      }
    });
  } catch (error) {
    logger.error('Validate configuration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate configuration'
    });
  }
});

export default router;