/**
 * Unified Workflow API Routes
 * Provides endpoints for accessing both template and live n8n workflows
 * with integrated business metrics and client-specific data
 */

import { Router, Request, Response } from 'express';
import { workflowIntegrationService } from '../services/workflowIntegrationService';
import { logger } from '../utils/logger';
import { VisibilityService } from '../services/visibilityService';
import {
  validateClientWorkflows,
  validateWorkflowAction,
  validateDeployTemplate,
  validateGetWorkflow,
  validateTemplateFilters,
  validateBusinessConfig,
  validateInputSize,
  validateRateLimit,
  sanitizeObject,
  validations,
  handleValidationErrors
} from '../utils/validation';

const router = Router();

interface UnifiedWorkflowRequest extends Request {
  params: {
    clientId: string;
    workflowId?: string;
  };
  query: {
    category?: string;
    status?: string;
    includeInactive?: string;
    visibilityLevel?: string;
    clientMode?: string;
    adminMode?: string;
    visibilitySettings?: string;
  };
}

/**
 * GET /api/unified-workflows/templates
 * Get all available workflow templates
 */
router.get('/templates', validateTemplateFilters, async (req: Request, res: Response) => {
  try {
    const { category, priceRange, supportLevel, visibilityLevel, clientMode, adminMode, visibilitySettings } = req.query;

    logger.info('Getting workflow templates:', { 
      filters: { category, priceRange, supportLevel, visibilityLevel, clientMode, adminMode } 
    });

    // Get templates directly from template repository
    const { workflowTemplateRepository } = await import('../database/inMemoryStore');
    let templates = await workflowTemplateRepository.findActive();

    // Apply visibility filtering if provided
    if (visibilityLevel && visibilityLevel !== 'all') {
      const visibilityFilter = VisibilityService.createVisibilityFilter({
        visibilityLevel: visibilityLevel as string,
        clientMode,
        adminMode,
        visibilitySettings: visibilitySettings as string
      });

      if (visibilityFilter) {
        logger.info('Applying visibility filtering to templates:', {
          originalCount: templates.length,
          visibilityLevel,
          clientMode: visibilityFilter.clientMode,
          adminMode: visibilityFilter.adminMode
        });

        templates = VisibilityService.filterWorkflowsByVisibility(
          templates, 
          visibilityFilter, 
          visibilityFilter.settings
        );

        logger.info('Template visibility filtering completed:', {
          filteredCount: templates.length
        });
      }
    }

    // Apply filters
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    if (priceRange) {
      const [min, max] = (priceRange as string).split('-').map(Number);
      templates = templates.filter(t => {
        return t.monthlyPrice >= min && t.monthlyPrice <= max;
      });
    }

    if (supportLevel) {
      templates = templates.filter(t => t.supportLevel === supportLevel);
    }

    // Convert to unified format for consistency
    const unifiedTemplates = templates.map(template => ({
      id: template.id,
      type: 'template' as const,
      name: template.name,
      businessName: template.name,
      description: template.description,
      category: template.category,
      healthStatus: 'inactive' as const,
      isActive: false,
      configuration: {
        status: 'template' as const
      },
      metrics: {
        executionsToday: 0,
        successRate: 0,
        avgExecutionTime: 0
      },
      businessMetrics: {
        timeSavedPerWeek: 0,
        monthlySavings: 0,
        roi: 0,
        estimatedValue: template.businessMetrics.estimatedMonthlySavings
      },
      quickActions: ['configure'],
      template
    }));

    res.json({
      success: true,
      data: unifiedTemplates,
      metadata: {
        total: unifiedTemplates.length,
        categories: [...new Set(unifiedTemplates.map(t => t.category))],
        priceRange: {
          min: Math.min(...templates.map(t => t.monthlyPrice)),
          max: Math.max(...templates.map(t => t.monthlyPrice))
        },
        supportLevels: [...new Set(templates.map(t => t.supportLevel))]
      }
    });
  } catch (error) {
    logger.error('Failed to get workflow templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve templates',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/unified-workflows/:clientId
 * Get all unified workflows for a client (templates + live workflows)
 */
router.get('/:clientId', validateClientWorkflows, async (req: UnifiedWorkflowRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { category, status, includeInactive, visibilityLevel, clientMode, adminMode, visibilitySettings } = req.query;

    logger.info('Getting unified workflows for client:', { 
      clientId, 
      filters: { category, status, includeInactive, visibilityLevel, clientMode, adminMode } 
    });

    // Create visibility filter if visibility parameters are provided
    const visibilityFilter = VisibilityService.createVisibilityFilter({
      visibilityLevel,
      clientMode,
      adminMode,
      visibilitySettings
    });

    const workflows = await workflowIntegrationService.getUnifiedWorkflows(clientId, visibilityFilter);
    
    // Apply filters
    let filteredWorkflows = workflows;
    
    if (category) {
      filteredWorkflows = filteredWorkflows.filter(w => w.category === category);
    }
    
    if (status) {
      filteredWorkflows = filteredWorkflows.filter(w => w.configuration?.status === status);
    }
    
    if (includeInactive !== 'true') {
      filteredWorkflows = filteredWorkflows.filter(w => w.isActive || w.type === 'template');
    }

    res.json({
      success: true,
      data: filteredWorkflows,
      metadata: {
        total: filteredWorkflows.length,
        templates: filteredWorkflows.filter(w => w.type === 'template').length,
        liveWorkflows: filteredWorkflows.filter(w => w.type === 'live').length,
        active: filteredWorkflows.filter(w => w.isActive).length
      }
    });
  } catch (error) {
    logger.error('Failed to get unified workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflows',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/unified-workflows/:clientId/analytics
 * Get workflow analytics and summary for a client
 */
router.get('/:clientId/analytics', async (req: UnifiedWorkflowRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    logger.info('Getting workflow analytics for client:', { clientId });

    // Get real workflow data for calculations
    let workflows: any[] = [];
    try {
      workflows = await workflowIntegrationService.getUnifiedWorkflows(clientId);
    } catch (error) {
      logger.warn('Failed to get workflows for analytics, using empty data:', error);
    }

    // Calculate real analytics based on actual data
    const totalWorkflows = workflows.length;
    const templateWorkflows = workflows.filter(w => w.type === 'template').length;
    const liveWorkflows = workflows.filter(w => w.type === 'live').length;
    const activeWorkflows = workflows.filter(w => w.isActive).length;
    const healthyWorkflows = workflows.filter(w => w.healthStatus === 'healthy').length;
    const workflowsNeedingAttention = workflows.filter(w => 
      w.healthStatus === 'warning' || w.healthStatus === 'critical'
    ).length;

    // Calculate business metrics from actual workflow data
    const activeWorkflowMetrics = workflows.filter(w => w.isActive);
    const totalMonthlySavings = activeWorkflowMetrics.reduce((sum, w) => 
      sum + (w.businessMetrics?.monthlySavings || 0), 0
    );
    const totalTimeSavedPerWeek = activeWorkflowMetrics.reduce((sum, w) => 
      sum + (w.businessMetrics?.timeSavedPerWeek || 0), 0
    );
    const averageROI = activeWorkflowMetrics.length > 0 ? 
      activeWorkflowMetrics.reduce((sum, w) => sum + (w.businessMetrics?.roi || 0), 0) / activeWorkflowMetrics.length : 0;
    
    // Calculate potential savings from templates and inactive workflows
    const inactiveWorkflows = workflows.filter(w => !w.isActive);
    const potentialSavings = inactiveWorkflows.reduce((sum, w) => 
      sum + (w.businessMetrics?.estimatedValue || w.businessMetrics?.monthlySavings || 0), 0
    );

    // Calculate category distribution
    const categories = workflows.reduce((acc, w) => {
      const category = w.category || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate health distribution
    const healthDistribution = workflows.reduce((acc, w) => {
      const status = w.healthStatus || 'inactive';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const analytics = {
      summary: {
        totalWorkflows,
        templateWorkflows,
        liveWorkflows,
        activeWorkflows,
        healthyWorkflows,
        workflowsNeedingAttention
      },
      businessMetrics: {
        totalMonthlySavings: Math.round(totalMonthlySavings),
        totalTimeSavedPerWeek: Math.round(totalTimeSavedPerWeek * 10) / 10, // Round to 1 decimal
        averageROI: Math.round(averageROI),
        potentialSavings: Math.round(potentialSavings)
      },
      categories,
      healthDistribution
    };

    res.json({
      success: true,
      data: analytics,
      metadata: {
        calculatedAt: new Date().toISOString(),
        dataSource: 'real-time',
        workflowCount: workflows.length
      }
    });
    
    return;
  } catch (error) {
    logger.error('Failed to get workflow analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/unified-workflows/:clientId/:workflowId
 * Get specific unified workflow by ID
 */
router.get('/:clientId/:workflowId', validateGetWorkflow, async (req: UnifiedWorkflowRequest, res: Response) => {
  try {
    const { clientId, workflowId } = req.params;

    logger.info('Getting unified workflow:', { clientId, workflowId });

    const workflow = await workflowIntegrationService.getUnifiedWorkflow(clientId, workflowId!);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
        message: `Workflow ${workflowId} not found for client ${clientId}`
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    logger.error('Failed to get unified workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflow',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/unified-workflows/:clientId/deploy/:templateId
 * Deploy a template workflow for a client
 */
router.post('/:clientId/deploy/:templateId', validateDeployTemplate, async (req: Request, res: Response) => {
  try {
    // Rate limiting check
    if (!validateRateLimit(req)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests from this client'
      });
    }

    // Input size validation
    const sizeCheck = validateInputSize(req);
    if (!sizeCheck.valid) {
      return res.status(413).json({
        success: false,
        error: 'Payload too large',
        message: sizeCheck.error
      });
    }

    const { clientId, templateId } = req.params;
    const businessConfig = req.body;

    // Additional business config validation
    const businessValidation = validateBusinessConfig(businessConfig);
    if (!businessValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business configuration',
        message: businessValidation.errors.join(', ')
      });
    }

    // Sanitize business config
    const allowedFields = ['businessName', 'businessDescription', 'category', 'expectedMonthlySavings', 'targetUsers', 'department'];
    const sanitizedConfig = sanitizeObject(businessConfig, allowedFields);

    logger.info('Deploying template workflow:', { clientId, templateId, businessConfig });

    const deployedWorkflow = await workflowIntegrationService.deployTemplateWorkflow(
      clientId,
      templateId,
      sanitizedConfig
    );

    res.status(201).json({
      success: true,
      data: deployedWorkflow,
      message: 'Template workflow deployed successfully'
    });
  } catch (error) {
    logger.error('Failed to deploy template workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy workflow',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/unified-workflows/:clientId/:workflowId/action
 * Execute an action on a workflow (pause, resume, restart, test)
 */
router.post('/:clientId/:workflowId/action', validateWorkflowAction, async (req: Request, res: Response) => {
  try {
    // Rate limiting check
    if (!validateRateLimit(req)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests from this client'
      });
    }

    // Input size validation
    const sizeCheck = validateInputSize(req);
    if (!sizeCheck.valid) {
      return res.status(413).json({
        success: false,
        error: 'Payload too large',
        message: sizeCheck.error
      });
    }

    const { clientId, workflowId } = req.params;
    const { action, options } = req.body;

    // Sanitize options if provided
    const sanitizedOptions = options ? sanitizeObject(options, ['timeout', 'retries', 'priority']) : undefined;

    logger.info('Executing workflow action:', { clientId, workflowId, action, options });

    const result = await workflowIntegrationService.executeWorkflowAction(
      clientId,
      workflowId,
      action,
      sanitizedOptions
    );

    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed to execute workflow action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute action',
      message: 'Internal server error'
    });
  }
});


export default router;