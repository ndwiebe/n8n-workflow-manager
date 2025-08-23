/**
 * Client Dashboard Controller
 * Simplified API endpoints for client-facing dashboard functionality
 * Transforms complex n8n data into business-friendly information
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { clientDashboardService } from '../services/clientDashboardService';
import { businessMetricsService } from '../services/businessMetricsService';
import { workflowControlService } from '../services/workflowControlService';
import { realtimeService } from '../services/realtimeService';

// Request/Response schemas
const DashboardQuerySchema = z.object({
  timeRange: z.enum(['today', 'week', 'month', 'quarter']).optional().default('month'),
  includeMetrics: z.boolean().optional().default(true),
  includeActivity: z.boolean().optional().default(true)
});

const WorkflowControlSchema = z.object({
  action: z.enum(['pause', 'resume', 'restart', 'test']),
  reason: z.string().optional(),
  scheduledTime: z.string().datetime().optional()
});

const MetricsReportSchema = z.object({
  format: z.enum(['json', 'pdf', 'excel']).optional().default('json'),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  includeCharts: z.boolean().optional().default(true),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('week')
});

export class ClientDashboardController {
  
  /**
   * GET /api/client/dashboard
   * Get simplified dashboard overview with workflow health and business metrics
   */
  async getDashboardOverview(req: Request, res: Response) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.status(401).json({ error: 'Client authentication required' });
      }

      const query = DashboardQuerySchema.parse(req.query);
      
      // Get dashboard data in parallel for performance
      const [
        overallHealth,
        workflowSummaries,
        businessMetrics,
        recentActivity
      ] = await Promise.all([
        clientDashboardService.getOverallHealth(clientId),
        clientDashboardService.getWorkflowSummaries(clientId),
        query.includeMetrics ? businessMetricsService.getClientMetrics(clientId, query.timeRange) : null,
        query.includeActivity ? clientDashboardService.getRecentActivity(clientId, 10) : null
      ]);

      const response = {
        success: true,
        data: {
          overallHealth: {
            status: overallHealth.status, // 'healthy' | 'warning' | 'critical'
            message: overallHealth.businessMessage,
            lastUpdated: overallHealth.lastUpdated
          },
          summary: {
            totalWorkflows: workflowSummaries.length,
            activeWorkflows: workflowSummaries.filter(w => w.isActive).length,
            healthyWorkflows: workflowSummaries.filter(w => w.healthStatus === 'healthy').length,
            executionsToday: workflowSummaries.reduce((sum, w) => sum + w.executionsToday, 0)
          },
          workflows: workflowSummaries.map(workflow => ({
            id: workflow.id,
            businessName: workflow.businessName,
            category: workflow.category,
            healthStatus: workflow.healthStatus,
            lastExecution: workflow.lastExecution ? {
              time: workflow.lastExecution.time,
              status: workflow.lastExecution.status,
              businessImpact: workflow.lastExecution.businessImpact
            } : null,
            quickActions: workflow.availableActions,
            metrics: {
              executionsToday: workflow.executionsToday,
              successRate: workflow.successRate,
              avgExecutionTime: workflow.avgExecutionTime
            }
          })),
          businessMetrics: businessMetrics ? {
            timeSavedThisMonth: businessMetrics.timeSaved,
            costSavings: businessMetrics.costSavings,
            errorsPrevented: businessMetrics.errorsPrevented,
            roiPercentage: businessMetrics.roiPercentage,
            trends: businessMetrics.trends
          } : null,
          recentActivity: recentActivity?.map(activity => ({
            id: activity.id,
            workflowName: activity.workflowBusinessName,
            action: activity.action,
            status: activity.status,
            businessImpact: activity.businessImpact,
            timestamp: activity.timestamp
          })) || []
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard overview',
        message: 'Please try refreshing the page. If the issue persists, contact support.'
      });
    }
  }

  /**
   * GET /api/client/workflows/:id
   * Get detailed information about a specific workflow
   */
  async getWorkflowDetails(req: Request, res: Response) {
    try {
      const clientId = req.user?.clientId;
      const workflowId = req.params.id;

      if (!clientId || !workflowId) {
        return res.status(400).json({ error: 'Client ID and workflow ID required' });
      }

      const workflowDetails = await clientDashboardService.getWorkflowDetails(clientId, workflowId);
      
      if (!workflowDetails) {
        return res.status(404).json({ error: 'Workflow not found or access denied' });
      }

      const response = {
        success: true,
        data: {
          id: workflowDetails.id,
          businessName: workflowDetails.businessName,
          businessDescription: workflowDetails.businessDescription,
          category: workflowDetails.category,
          healthStatus: workflowDetails.healthStatus,
          isActive: workflowDetails.isActive,
          configuration: {
            schedule: workflowDetails.schedule,
            notifications: workflowDetails.notifications,
            customSettings: workflowDetails.customSettings
          },
          performance: {
            totalExecutions: workflowDetails.totalExecutions,
            successRate: workflowDetails.successRate,
            avgExecutionTime: workflowDetails.avgExecutionTime,
            lastExecution: workflowDetails.lastExecution
          },
          businessImpact: {
            timeSavedPerExecution: workflowDetails.timeSavedPerExecution,
            costSavingsPerMonth: workflowDetails.costSavingsPerMonth,
            errorReductionRate: workflowDetails.errorReductionRate
          },
          availableActions: workflowDetails.availableActions,
          executionHistory: workflowDetails.recentExecutions.map(exec => ({
            id: exec.id,
            startTime: exec.startTime,
            endTime: exec.endTime,
            status: exec.status,
            businessImpact: exec.businessImpact,
            duration: exec.duration
          }))
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Workflow details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load workflow details'
      });
    }
  }

  /**
   * POST /api/client/workflows/:id/control
   * Control workflow operations (pause, resume, restart, test)
   */
  async controlWorkflow(req: Request, res: Response) {
    try {
      const clientId = req.user?.clientId;
      const workflowId = req.params.id;
      const controlData = WorkflowControlSchema.parse(req.body);

      if (!clientId || !workflowId) {
        return res.status(400).json({ error: 'Client ID and workflow ID required' });
      }

      // Verify client has access to this workflow
      const hasAccess = await clientDashboardService.verifyWorkflowAccess(clientId, workflowId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this workflow' });
      }

      const result = await workflowControlService.executeControl(
        workflowId,
        controlData.action,
        {
          clientId,
          reason: controlData.reason,
          scheduledTime: controlData.scheduledTime
        }
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          message: result.businessMessage
        });
      }

      // Emit real-time update to connected clients
      realtimeService.emitWorkflowUpdate(clientId, {
        workflowId,
        action: controlData.action,
        status: result.newStatus,
        businessImpact: result.businessImpact,
        timestamp: new Date()
      });

      const response = {
        success: true,
        data: {
          action: controlData.action,
          status: result.newStatus,
          businessImpact: result.businessImpact,
          estimatedRecoveryTime: result.estimatedRecoveryTime,
          nextSteps: result.nextSteps
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Workflow control error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to control workflow',
        message: 'The action could not be completed. Please try again or contact support.'
      });
    }
  }

  /**
   * GET /api/client/metrics/report
   * Generate business metrics report
   */
  async getMetricsReport(req: Request, res: Response) {
    try {
      const clientId = req.user?.clientId;
      const reportParams = MetricsReportSchema.parse(req.query);

      if (!clientId) {
        return res.status(401).json({ error: 'Client authentication required' });
      }

      const report = await businessMetricsService.generateReport(clientId, {
        dateRange: reportParams.dateRange,
        format: reportParams.format,
        includeCharts: reportParams.includeCharts,
        groupBy: reportParams.groupBy
      });

      if (reportParams.format === 'json') {
        res.json({
          success: true,
          data: report
        });
      } else {
        // For PDF/Excel, return file download
        res.setHeader('Content-Type', report.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
        res.send(report.buffer);
      }
    } catch (error) {
      console.error('Metrics report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate metrics report'
      });
    }
  }

  /**
   * GET /api/client/health
   * Simple health check endpoint for client dashboard
   */
  async getHealthStatus(req: Request, res: Response) {
    try {
      const clientId = req.user?.clientId;
      
      if (!clientId) {
        return res.status(401).json({ error: 'Client authentication required' });
      }

      const healthStatus = await clientDashboardService.getSystemHealth(clientId);

      res.json({
        success: true,
        data: {
          status: healthStatus.overall, // 'healthy' | 'degraded' | 'down'
          services: {
            dashboard: healthStatus.dashboard,
            workflows: healthStatus.workflows,
            n8nConnection: healthStatus.n8nConnection,
            database: healthStatus.database
          },
          lastChecked: healthStatus.lastChecked,
          message: healthStatus.businessMessage
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        status: 'unknown'
      });
    }
  }

  /**
   * POST /api/client/notifications/preferences
   * Update client notification preferences
   */
  async updateNotificationPreferences(req: Request, res: Response) {
    try {
      const clientId = req.user?.clientId;
      const preferences = req.body;

      if (!clientId) {
        return res.status(401).json({ error: 'Client authentication required' });
      }

      const updated = await clientDashboardService.updateNotificationPreferences(clientId, preferences);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Notification preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences'
      });
    }
  }

  /**
   * GET /api/client/workflows/:id/logs
   * Get simplified execution logs for troubleshooting
   */
  async getWorkflowLogs(req: Request, res: Response) {
    try {
      const clientId = req.user?.clientId;
      const workflowId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!clientId || !workflowId) {
        return res.status(400).json({ error: 'Client ID and workflow ID required' });
      }

      const hasAccess = await clientDashboardService.verifyWorkflowAccess(clientId, workflowId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this workflow' });
      }

      const logs = await clientDashboardService.getSimplifiedLogs(workflowId, limit);

      res.json({
        success: true,
        data: {
          workflowId,
          logs: logs.map(log => ({
            timestamp: log.timestamp,
            level: log.level, // 'info' | 'warning' | 'error' | 'success'
            businessMessage: log.businessMessage,
            technicalDetails: log.technicalDetails,
            suggestedAction: log.suggestedAction
          }))
        }
      });
    } catch (error) {
      console.error('Workflow logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve workflow logs'
      });
    }
  }
}

export const clientDashboardController = new ClientDashboardController();