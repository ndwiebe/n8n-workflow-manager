import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, requireUser, AuthenticatedRequest } from '../middleware/auth';
import { businessMetricsService } from '../services/businessMetricsService';
import { N8nService } from '../services/n8nService';
import { 
  ROICalculationRequest, 
  BusinessDashboardResponse, 
  BusinessMetricsResponse,
  ROICalculationResponse
} from '../types/business';
import { logger } from '../utils/logger';

const router = Router();
const n8nService = new N8nService();

/**
 * GET /api/business/dashboard
 * Get business dashboard with metrics overview
 */
router.get('/dashboard', authenticate, requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const dashboardData = await businessMetricsService.getBusinessDashboard(userId);
    
    const response: BusinessDashboardResponse = {
      success: true,
      data: dashboardData
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Get business dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business dashboard'
    });
  }
});

/**
 * GET /api/business/metrics/:workflowId
 * Get detailed business metrics for a specific workflow
 */
router.get('/metrics/:workflowId', authenticate, requireUser, [
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
    const metrics = await businessMetricsService.getWorkflowBusinessMetrics(workflowId);
    
    const response: BusinessMetricsResponse = {
      success: true,
      data: {
        metrics,
        recommendations: [] // Could add specific recommendations later
      }
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Get workflow metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow metrics'
    });
  }
});

/**
 * POST /api/business/calculate-roi
 * Calculate ROI for a workflow based on user inputs
 */
router.post('/calculate-roi', authenticate, requireUser, [
  body('workflowId').isString().notEmpty(),
  body('manualTimePerTask').isNumeric().isFloat({ min: 1 }),
  body('taskFrequency').isIn(['daily', 'weekly', 'monthly']),
  body('tasksPerPeriod').isNumeric().isInt({ min: 1 }),
  body('employeeHourlyRate').isNumeric().isFloat({ min: 1 }),
  body('implementationTimeHours').optional().isNumeric().isFloat({ min: 0 }),
  body('implementationHourlyRate').optional().isNumeric().isFloat({ min: 0 })
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

    const roiRequest: ROICalculationRequest = req.body;
    const calculation = await businessMetricsService.calculateWorkflowROI(roiRequest);
    
    // Generate insights based on calculation
    const insights = [];
    
    if (calculation.results.paybackPeriod <= 3) {
      insights.push({
        type: 'positive' as const,
        message: `Excellent ROI! This automation pays for itself in ${calculation.results.paybackPeriod.toFixed(1)} months.`,
        value: calculation.results.paybackPeriod
      });
    } else if (calculation.results.paybackPeriod <= 12) {
      insights.push({
        type: 'info' as const,
        message: `Good ROI. Payback period is ${calculation.results.paybackPeriod.toFixed(1)} months.`,
        value: calculation.results.paybackPeriod
      });
    } else {
      insights.push({
        type: 'warning' as const,
        message: `Long payback period of ${calculation.results.paybackPeriod.toFixed(1)} months. Consider optimizing the workflow.`,
        value: calculation.results.paybackPeriod
      });
    }
    
    if (calculation.results.annualROI > 200) {
      insights.push({
        type: 'positive' as const,
        message: `Outstanding ${calculation.results.annualROI.toFixed(0)}% annual ROI!`,
        value: calculation.results.annualROI
      });
    }
    
    if (calculation.results.hoursPerMonth > 40) {
      insights.push({
        type: 'positive' as const,
        message: `This automation saves ${calculation.results.hoursPerMonth.toFixed(1)} hours per month - equivalent to a part-time employee!`,
        value: calculation.results.hoursPerMonth
      });
    }

    const response: ROICalculationResponse = {
      success: true,
      data: {
        calculation,
        insights
      }
    };
    
    res.json(response);
  } catch (error) {
    logger.error('ROI calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate ROI'
    });
  }
});

/**
 * GET /api/business/alerts
 * Get business alerts and recommendations
 */
router.get('/alerts', authenticate, requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const alerts = await businessMetricsService.generateBusinessAlerts(userId);
    
    res.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    });
  } catch (error) {
    logger.error('Get business alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business alerts'
    });
  }
});

/**
 * POST /api/business/deploy-workflow
 * Deploy a workflow with business configuration and monitoring
 */
router.post('/deploy-workflow', authenticate, requireUser, [
  body('workflowId').isString().notEmpty(),
  body('category').isString().notEmpty(),
  body('expectedMonthlySavings').isNumeric().isFloat({ min: 0 }),
  body('targetUsers').isArray(),
  body('department').isString().notEmpty(),
  body('alertsEnabled').optional().isBoolean(),
  body('costThreshold').optional().isNumeric().isFloat({ min: 0 }),
  body('performanceThreshold').optional().isNumeric().isFloat({ min: 0, max: 100 })
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

    const {
      workflowId,
      category,
      expectedMonthlySavings,
      targetUsers,
      department,
      alertsEnabled,
      costThreshold,
      performanceThreshold
    } = req.body;

    const deployment = await n8nService.deployWorkflowForBusiness(workflowId, {
      category,
      expectedMonthlySavings,
      targetUsers,
      department,
      alertsEnabled,
      costThreshold,
      performanceThreshold
    });

    res.status(201).json({
      success: true,
      message: 'Workflow deployed successfully for business use',
      data: {
        deployment
      }
    });
  } catch (error) {
    logger.error('Deploy workflow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deploy workflow'
    });
  }
});

/**
 * GET /api/business/analytics
 * Get business analytics and trends
 */
router.get('/analytics', authenticate, requireUser, [
  query('timeframe').optional().isIn(['day', 'week', 'month', 'quarter'])
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

    const timeframe = req.query.timeframe as 'day' | 'week' | 'month' | 'quarter' || 'month';
    const analytics = await n8nService.getBusinessAnalytics(timeframe);

    res.json({
      success: true,
      data: {
        analytics,
        timeframe,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get business analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business analytics'
    });
  }
});

/**
 * GET /api/business/performance/:workflowId
 * Monitor workflow performance and get business health status
 */
router.get('/performance/:workflowId', authenticate, requireUser, [
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
    const performance = await n8nService.monitorWorkflowPerformance(workflowId);
    
    // Get additional business metrics
    const businessMetrics = await businessMetricsService.getWorkflowBusinessMetrics(workflowId);

    res.json({
      success: true,
      data: {
        performance,
        businessImpact: {
          monthlySavings: businessMetrics.roi.monthlySavings,
          hoursPerMonth: businessMetrics.timeSavings.totalMonthlySavings,
          uptime: businessMetrics.performance.uptime,
          roiPercentage: businessMetrics.roi.roiPercentage
        },
        recommendations: performance.issues.length > 0 ? [
          {
            type: 'optimization',
            title: 'Performance Issues Detected',
            description: `${performance.issues.length} issues found that may impact business value`,
            priority: performance.status === 'critical' ? 'high' : 'medium'
          }
        ] : []
      }
    });
  } catch (error) {
    logger.error('Get workflow performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow performance'
    });
  }
});

/**
 * GET /api/business/savings-report
 * Generate a comprehensive savings report
 */
router.get('/savings-report', authenticate, requireUser, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('department').optional().isString(),
  query('category').optional().isString()
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

    const { startDate, endDate, department, category } = req.query;
    const userId = req.user!.id;
    
    // Get dashboard data as base for report
    const dashboardData = await businessMetricsService.getBusinessDashboard(userId);
    
    // Apply filters if provided
    let filteredWorkflows = dashboardData.workflows;
    
    if (department) {
      // This would need to be implemented based on workflow tags or metadata
      filteredWorkflows = filteredWorkflows.filter(w => 
        w.category.toLowerCase().includes((department as string).toLowerCase())
      );
    }
    
    if (category) {
      filteredWorkflows = filteredWorkflows.filter(w => 
        w.category === category
      );
    }

    // Calculate totals
    const totalSavings = filteredWorkflows.reduce((sum, w) => sum + w.monthlySavings, 0);
    const totalHours = filteredWorkflows.reduce((sum, w) => sum + w.hoursPerMonth, 0);
    const averageROI = filteredWorkflows.length > 0 
      ? filteredWorkflows.reduce((sum, w) => sum + w.roiPercentage, 0) / filteredWorkflows.length 
      : 0;

    const report = {
      summary: {
        totalMonthlySavings: totalSavings,
        totalHoursSaved: totalHours,
        averageROI: averageROI,
        workflowsAnalyzed: filteredWorkflows.length,
        reportPeriod: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Current',
        }
      },
      workflows: filteredWorkflows.map(w => ({
        name: w.name,
        category: w.category,
        monthlySavings: w.monthlySavings,
        hoursPerMonth: w.hoursPerMonth,
        roiPercentage: w.roiPercentage,
        status: w.status,
        uptime: w.uptime
      })),
      projections: {
        quarterlyProjection: totalSavings * 3,
        annualProjection: totalSavings * 12,
        threeYearProjection: totalSavings * 36
      },
      insights: [
        ...(totalSavings > 5000 ? [{
          type: 'positive',
          message: `Outstanding! You're saving over $${totalSavings.toFixed(0)} per month.`
        }] : []),
        ...(averageROI > 200 ? [{
          type: 'positive',
          message: `Excellent ROI of ${averageROI.toFixed(0)}% across all workflows.`
        }] : []),
        ...(totalHours > 80 ? [{
          type: 'positive',
          message: `You're saving ${totalHours.toFixed(0)} hours per month - that's like having 2+ additional part-time employees!`
        }] : [])
      ]
    };

    res.json({
      success: true,
      data: report,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Generate savings report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate savings report'
    });
  }
});

/**
 * POST /api/business/workflow/:workflowId/roi
 * Save calculated ROI for a workflow
 */
router.post('/workflow/:workflowId/roi', authenticate, requireUser, [
  param('workflowId').isString().notEmpty(),
  body('calculation').isObject()
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
    const { calculation } = req.body;
    
    // Get updated metrics with the ROI calculation
    const metrics = await businessMetricsService.getWorkflowBusinessMetrics(workflowId, calculation);
    
    res.json({
      success: true,
      message: 'ROI calculation saved successfully',
      data: {
        metrics
      }
    });
  } catch (error) {
    logger.error('Save workflow ROI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save ROI calculation'
    });
  }
});

/**
 * GET /api/business/templates/smb
 * Get SMB-focused workflow templates with business projections
 */
router.get('/templates/smb', authenticate, requireUser, [
  query('industry').optional().isString(),
  query('employeeCount').optional().isNumeric(),
  query('category').optional().isString()
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

    const { industry, employeeCount, category } = req.query;
    
    // This would normally come from a dedicated SMB template service
    // For now, we'll return mock data that represents SMB-focused templates
    const smbTemplates = [
      {
        id: 'smb_customer_onboarding',
        name: 'Customer Onboarding Automation',
        description: 'Automate new customer welcome emails, document collection, and account setup',
        category: 'sales',
        smbFocused: true,
        industryFit: ['professional-services', 'saas', 'consulting'],
        companySizeRange: { min: 5, max: 50 },
        projectedROI: {
          timeToValue: 3,
          monthlySavings: 800,
          implementationTime: 4,
          complexity: 'medium'
        },
        requirements: {
          employeesAffected: 3,
          technicalSkillRequired: 'basic',
          integrations: ['Email', 'CRM', 'Document Storage'],
          estimatedSetupCost: 500,
          monthlyOperatingCost: 50
        },
        useCases: [
          {
            title: 'Professional Services Firm',
            description: 'Automate client onboarding documents and contracts',
            industry: 'professional-services',
            savingsExample: 1200
          }
        ]
      },
      {
        id: 'smb_invoice_processing',
        name: 'Invoice Processing & Follow-up',
        description: 'Automatically process invoices, send reminders, and track payments',
        category: 'finance',
        smbFocused: true,
        industryFit: ['retail', 'professional-services', 'manufacturing'],
        companySizeRange: { min: 10, max: 100 },
        projectedROI: {
          timeToValue: 7,
          monthlySavings: 1500,
          implementationTime: 6,
          complexity: 'medium'
        },
        requirements: {
          employeesAffected: 2,
          technicalSkillRequired: 'basic',
          integrations: ['Accounting Software', 'Email', 'Payment Gateway'],
          estimatedSetupCost: 750,
          monthlyOperatingCost: 75
        },
        useCases: [
          {
            title: 'Small Retailer',
            description: 'Automate invoice generation and payment reminders',
            industry: 'retail',
            savingsExample: 2000
          }
        ]
      },
      {
        id: 'smb_lead_nurturing',
        name: 'Lead Nurturing Campaign',
        description: 'Automatically nurture leads with personalized email sequences',
        category: 'marketing',
        smbFocused: true,
        industryFit: ['saas', 'consulting', 'professional-services'],
        companySizeRange: { min: 3, max: 30 },
        projectedROI: {
          timeToValue: 14,
          monthlySavings: 1200,
          implementationTime: 8,
          complexity: 'high'
        },
        requirements: {
          employeesAffected: 4,
          technicalSkillRequired: 'intermediate',
          integrations: ['Email Marketing', 'CRM', 'Analytics'],
          estimatedSetupCost: 1000,
          monthlyOperatingCost: 100
        },
        useCases: [
          {
            title: 'SaaS Startup',
            description: 'Nurture trial users to paid conversions',
            industry: 'saas',
            savingsExample: 1800
          }
        ]
      }
    ];

    // Apply filters
    let filteredTemplates = smbTemplates;
    
    if (industry) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.industryFit.includes(industry as string)
      );
    }
    
    if (employeeCount) {
      const count = Number(employeeCount);
      filteredTemplates = filteredTemplates.filter(t => 
        count >= t.companySizeRange.min && count <= t.companySizeRange.max
      );
    }
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.category === category
      );
    }

    res.json({
      success: true,
      data: {
        templates: filteredTemplates,
        total: filteredTemplates.length,
        filters: {
          industry: industry || null,
          employeeCount: employeeCount || null,
          category: category || null
        }
      }
    });
  } catch (error) {
    logger.error('Get SMB templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SMB templates'
    });
  }
});

export default router;