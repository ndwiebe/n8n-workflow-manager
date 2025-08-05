import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, requireUser, AuthenticatedRequest } from '../middleware/auth';
import { templateLoader } from '../services/templateLoader';
import { provisioningService } from '../services/provisioningService';
import { secretsManager } from '../services/secretsManager';
import { businessMetricsService } from '../services/businessMetricsService';
import { N8nService } from '../services/n8nService';
import { logger } from '../utils/logger';

const router = Router();
const n8nService = new N8nService();

/**
 * GET /api/workflows/templates
 * Get all available workflow templates
 */
router.get('/templates', [
  query('category').optional().isString(),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('search').optional().isString(),
  query('smbFocused').optional().isBoolean(),
  query('industry').optional().isString(),
  query('maxComplexity').optional().isIn(['low', 'medium', 'high'])
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

    const { category, difficulty, search, smbFocused, industry, maxComplexity } = req.query;
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

    // Apply SMB-specific filters
    if (smbFocused === 'true') {
      templates = templates.filter(t => 
        // Filter for templates suitable for small/medium businesses
        t.description.toLowerCase().includes('small') ||
        t.description.toLowerCase().includes('smb') ||
        t.category === 'sales' ||
        t.category === 'marketing' ||
        t.category === 'support'
      );
    }

    if (industry) {
      templates = templates.filter(t => 
        t.description.toLowerCase().includes((industry as string).toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes((industry as string).toLowerCase()))
      );
    }

    if (maxComplexity) {
      const complexityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
      const maxLevel = complexityOrder[maxComplexity as keyof typeof complexityOrder];
      templates = templates.filter(t => {
        const templateComplexity = t.difficulty === 'beginner' ? 1 : 
                                   t.difficulty === 'intermediate' ? 2 : 3;
        return templateComplexity <= maxLevel;
      });
    }

    // Add business projections to templates
    const templatesWithBusinessData = templates.map(template => ({
      ...template,
      businessProjections: {
        estimatedMonthlySavings: template.category === 'sales' ? 1200 :
                                template.category === 'marketing' ? 800 :
                                template.category === 'support' ? 600 : 400,
        estimatedTimeToValue: template.difficulty === 'beginner' ? 3 :
                             template.difficulty === 'intermediate' ? 7 : 14,
        estimatedROI: template.difficulty === 'beginner' ? 250 :
                     template.difficulty === 'intermediate' ? 200 : 180,
        suitableForSMB: template.difficulty !== 'advanced'
      }
    }));

    res.json({
      success: true,
      data: {
        templates: templatesWithBusinessData,
        total: templatesWithBusinessData.length,
        filters: {
          category: category || null,
          difficulty: difficulty || null,
          search: search || null,
          smbFocused: smbFocused || null,
          industry: industry || null,
          maxComplexity: maxComplexity || null
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
 * Get a specific workflow template with business analysis
 */
router.get('/templates/:templateId', [
  param('templateId').isString().notEmpty()
], async (req, res) => {
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

    // Add detailed business analysis
    const businessAnalysis = {
      roiProjection: {
        timeToValue: template.difficulty === 'beginner' ? 3 : 
                    template.difficulty === 'intermediate' ? 7 : 14,
        monthlySavings: template.category === 'sales' ? 1200 :
                       template.category === 'marketing' ? 800 :
                       template.category === 'support' ? 600 : 400,
        annualROI: template.difficulty === 'beginner' ? 250 :
                  template.difficulty === 'intermediate' ? 200 : 180,
        paybackPeriod: template.difficulty === 'beginner' ? 2 :
                      template.difficulty === 'intermediate' ? 3 : 4
      },
      smbSuitability: {
        recommendedFor: template.difficulty !== 'advanced',
        employeeCountRange: { min: 5, max: template.difficulty === 'advanced' ? 100 : 50 },
        technicalSkillRequired: template.difficulty === 'beginner' ? 'none' :
                               template.difficulty === 'intermediate' ? 'basic' : 'intermediate',
        implementationTime: template.difficulty === 'beginner' ? '2-4 hours' :
                           template.difficulty === 'intermediate' ? '1-2 days' : '3-5 days'
      },
      businessImpact: {
        primaryBenefit: template.category === 'sales' ? 'Revenue Generation' :
                       template.category === 'marketing' ? 'Lead Generation' :
                       template.category === 'support' ? 'Customer Satisfaction' : 'Operational Efficiency',
        secondaryBenefits: ['Time Savings', 'Error Reduction', 'Consistency'],
        affectedDepartments: [template.category, 'operations'],
        measurableOutcomes: [
          'Reduced manual processing time',
          'Improved data accuracy',
          'Faster response times'
        ]
      }
    };

    res.json({
      success: true,
      data: {
        template,
        businessAnalysis
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
 * GET /api/workflows/live
 * Get live workflows from n8n with business metrics
 */
router.get('/live', authenticate, requireUser, [
  query('includeMetrics').optional().isBoolean(),
  query('category').optional().isString(),
  query('active').optional().isBoolean()
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

    const { includeMetrics, category, active } = req.query;
    
    // Get workflows from n8n with optional filtering
    const businessFilter: any = {};
    if (active !== undefined) businessFilter.active = active === 'true';
    if (category) businessFilter.tags = [`category:${category}`];
    
    const workflows = await n8nService.getWorkflows(businessFilter);
    
    let workflowsWithMetrics = workflows;
    
    // Add business metrics if requested
    if (includeMetrics === 'true') {
      const workflowsWithBusinessData = await Promise.all(
        workflows.map(async (workflow) => {
          try {
            const metrics = await businessMetricsService.getWorkflowBusinessMetrics(workflow.id);
            return {
              ...workflow,
              businessMetrics: {
                monthlySavings: metrics.roi.monthlySavings,
                roiPercentage: metrics.roi.roiPercentage,
                hoursPerMonth: metrics.timeSavings.totalMonthlySavings,
                uptime: metrics.performance.uptime,
                category: metrics.businessCategory,
                lastExecution: metrics.performance.lastExecution
              }
            };
          } catch (error) {
            logger.warn(`Failed to get metrics for workflow ${workflow.id}:`, error);
            return {
              ...workflow,
              businessMetrics: null
            };
          }
        })
      );
      
      workflowsWithMetrics = workflowsWithBusinessData;
    }

    res.json({
      success: true,
      data: {
        workflows: workflowsWithMetrics,
        total: workflowsWithMetrics.length,
        active: workflowsWithMetrics.filter(w => w.active).length,
        filters: {
          includeMetrics: includeMetrics === 'true',
          category: category || null,
          active: active || null
        }
      }
    });
  } catch (error) {
    logger.error('Get live workflows error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get live workflows'
    });
  }
});

/**
 * GET /api/workflows/live/:workflowId/stats
 * Get detailed statistics for a live workflow
 */
router.get('/live/:workflowId/stats', authenticate, requireUser, [
  param('workflowId').isString().notEmpty()
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

    const { workflowId } = req.params;
    
    // Get stats from n8n and business metrics
    const [stats, businessMetrics] = await Promise.all([
      n8nService.getWorkflowStats(workflowId),
      businessMetricsService.getWorkflowBusinessMetrics(workflowId)
    ]);

    const combinedStats = {
      performance: stats,
      business: {
        roi: businessMetrics.roi,
        timeSavings: businessMetrics.timeSavings,
        costs: businessMetrics.costs,
        impact: businessMetrics.impact,
        category: businessMetrics.businessCategory
      },
      trends: {
        executionsThisMonth: stats.executionsThisMonth,
        executionsToday: stats.executionsToday,
        uptimePercentage: stats.uptimePercentage,
        savingsThisMonth: businessMetrics.roi.monthlySavings,
        hoursThisMonth: businessMetrics.timeSavings.totalMonthlySavings
      }
    };

    res.json({
      success: true,
      data: {
        workflowId,
        stats: combinedStats,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get workflow stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow statistics'
    });
  }
});

/**
 * POST /api/workflows/live/:workflowId/execute
 * Execute a live workflow with business tracking
 */
router.post('/live/:workflowId/execute', authenticate, requireUser, [
  param('workflowId').isString().notEmpty(),
  body('data').optional().isObject(),
  body('businessContext').optional().isObject()
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

    const { workflowId } = req.params;
    const { data, businessContext } = req.body;
    const userId = req.user!.id;

    // Add user context to business tracking
    const enhancedBusinessContext = {
      ...businessContext,
      triggeredBy: userId,
      timestamp: new Date().toISOString()
    };

    const execution = await n8nService.executeWorkflow(
      workflowId, 
      data, 
      enhancedBusinessContext
    );

    res.json({
      success: true,
      message: 'Workflow executed successfully',
      data: {
        execution: {
          id: execution.id,
          status: execution.status,
          startedAt: execution.startedAt,
          workflowId: execution.workflowId
        },
        businessContext: enhancedBusinessContext
      }
    });
  } catch (error) {
    logger.error('Execute workflow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute workflow'
    });
  }
});

/**
 * POST /api/workflows/provision
 * Start workflow provisioning with business configuration
 */
router.post('/provision', authenticate, requireUser, [
  body('templateId').isString().notEmpty(),
  body('workflowId').isString().notEmpty(),
  body('configuration').isObject(),
  body('businessConfig').optional().isObject()
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

    const { templateId, workflowId, configuration, businessConfig } = req.body;
    const userId = req.user!.id;

    // Enhance configuration with business metadata
    const enhancedConfiguration = {
      ...configuration,
      businessMetadata: {
        ...businessConfig,
        userId,
        createdAt: new Date().toISOString(),
        expectedROI: businessConfig?.expectedMonthlySavings ? 
          (businessConfig.expectedMonthlySavings * 12 / 500) * 100 : 200 // Default 200% ROI
      }
    };

    // Start provisioning
    const result = await provisioningService.startProvisioning(
      userId,
      workflowId,
      templateId,
      enhancedConfiguration
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Provisioning started successfully with business configuration',
      data: {
        jobId: result.jobId,
        status: result.status,
        estimatedCompletionTime: result.estimatedCompletionTime,
        businessConfig: businessConfig || null,
        expectedROI: enhancedConfiguration.businessMetadata.expectedROI
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
 * Get provisioning job status with business progress
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

    // Add business progress indicators
    const businessProgress = {
      roiCalculationComplete: job.status !== 'pending',
      businessMetricsReady: ['ready', 'active'].includes(job.status),
      monitoringEnabled: job.status === 'active',
      estimatedTimeToValue: job.configuration?.businessMetadata?.expectedROI ? 
        (job.configuration.businessMetadata.expectedROI > 200 ? '1-2 weeks' : '3-4 weeks') : 
        'Unknown'
    };

    res.json({
      success: true,
      data: {
        job,
        businessProgress
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
 * Get all jobs for current user with business metrics
 */
router.get('/jobs', authenticate, requireUser, [
  query('status').optional().isIn(['pending', 'validating', 'provisioning', 'configuring', 'testing', 'ready', 'active', 'failed', 'scheduled']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('includeBusiness').optional().isBoolean()
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
    const { status, limit = 20, offset = 0, includeBusiness } = req.query;
    
    let jobs = provisioningService.getUserJobs(userId);
    
    // Filter by status if provided
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }

    // Apply pagination
    const total = jobs.length;
    let paginatedJobs = jobs.slice(Number(offset), Number(offset) + Number(limit));

    // Add business data if requested
    if (includeBusiness === 'true') {
      paginatedJobs = paginatedJobs.map(job => ({
        ...job,
        businessSummary: {
          expectedROI: job.configuration?.businessMetadata?.expectedROI || null,
          category: job.configuration?.businessMetadata?.category || 'operations',
          estimatedSavings: job.configuration?.businessMetadata?.expectedMonthlySavings || null,
          timeToValue: job.status === 'active' ? 'Immediate' :
                      job.status === 'ready' ? '1-2 days' :
                      job.status === 'failed' ? 'N/A' : 'In Progress'
        }
      }));
    }

    // Calculate summary statistics
    const summary = {
      total,
      active: jobs.filter(j => j.status === 'active').length,
      pending: jobs.filter(j => ['pending', 'validating', 'provisioning', 'configuring', 'testing'].includes(j.status)).length,
      failed: jobs.filter(j => j.status === 'failed').length,
      totalExpectedSavings: jobs
        .filter(j => j.configuration?.businessMetadata?.expectedMonthlySavings)
        .reduce((sum, j) => sum + (j.configuration?.businessMetadata?.expectedMonthlySavings || 0), 0)
    };

    res.json({
      success: true,
      data: {
        jobs: paginatedJobs,
        summary,
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
      message: 'Activation scheduled successfully',
      data: {
        scheduledFor: activationDate,
        businessNote: 'ROI tracking will begin once the workflow is activated'
      }
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
 * Validate workflow configuration with business requirements
 */
router.post('/validate-config', authenticate, requireUser, [
  body('templateId').isString().notEmpty(),
  body('configuration').isObject(),
  body('businessRequirements').optional().isObject()
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

    const { templateId, configuration, businessRequirements } = req.body;
    const validation = templateLoader.validateConfiguration(templateId, configuration);

    // Add business validation
    const businessValidation = {
      roiProjectionAvailable: !!businessRequirements?.expectedMonthlySavings,
      categoryDefined: !!businessRequirements?.category,
      departmentDefined: !!businessRequirements?.department,
      targetUsersDefined: !!businessRequirements?.targetUsers?.length
    };

    const allBusinessValid = Object.values(businessValidation).every(v => v);

    res.json({
      success: true,
      data: {
        technical: {
          valid: validation.valid,
          errors: validation.errors
        },
        business: {
          valid: allBusinessValid,
          checks: businessValidation,
          warnings: !allBusinessValid ? [
            'Business configuration incomplete. ROI tracking may be limited.'
          ] : []
        },
        overall: validation.valid && allBusinessValid
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