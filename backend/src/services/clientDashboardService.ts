/**
 * Client Dashboard Service
 * Business logic for client-facing dashboard functionality
 * Transforms technical n8n data into business-friendly information
 */

import { Database } from '../database/connection';
import { n8nService } from './n8nService';
import { businessMetricsService } from './businessMetricsService';

export interface WorkflowHealthStatus {
  status: 'healthy' | 'warning' | 'critical' | 'inactive';
  businessMessage: string;
  lastUpdated: Date;
  details?: {
    lastExecution?: Date;
    successRate?: number;
    avgResponseTime?: number;
    recentErrors?: string[];
  };
}

export interface ClientWorkflowSummary {
  id: string;
  businessName: string;
  category: string;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'inactive';
  isActive: boolean;
  lastExecution?: {
    time: Date;
    status: 'success' | 'error' | 'running';
    businessImpact: string;
  };
  executionsToday: number;
  successRate: number;
  avgExecutionTime: number;
  availableActions: string[];
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  dashboard: 'healthy' | 'degraded' | 'down';
  workflows: 'healthy' | 'degraded' | 'down';
  n8nConnection: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
  businessMessage: string;
}

class ClientDashboardService {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  /**
   * Get overall health status for client's workflows
   */
  async getOverallHealth(clientId: string): Promise<WorkflowHealthStatus> {
    try {
      const workflows = await this.getClientWorkflows(clientId);
      const activeWorkflows = workflows.filter(w => w.isActive);
      
      if (activeWorkflows.length === 0) {
        return {
          status: 'inactive',
          businessMessage: 'No active workflows found. Consider activating some automations to start saving time.',
          lastUpdated: new Date()
        };
      }

      const healthCounts = {
        healthy: activeWorkflows.filter(w => w.healthStatus === 'healthy').length,
        warning: activeWorkflows.filter(w => w.healthStatus === 'warning').length,
        critical: activeWorkflows.filter(w => w.healthStatus === 'critical').length
      };

      const totalActive = activeWorkflows.length;
      const healthyPercentage = (healthCounts.healthy / totalActive) * 100;

      let overallStatus: 'healthy' | 'warning' | 'critical';
      let businessMessage: string;

      if (healthCounts.critical > 0) {
        overallStatus = 'critical';
        businessMessage = `${healthCounts.critical} workflow${healthCounts.critical > 1 ? 's' : ''} need immediate attention. Business operations may be affected.`;
      } else if (healthyPercentage < 70) {
        overallStatus = 'warning';
        businessMessage = `${healthCounts.warning} workflow${healthCounts.warning > 1 ? 's' : ''} need attention. Consider reviewing them to optimize performance.`;
      } else {
        overallStatus = 'healthy';
        businessMessage = `All systems running smoothly. Your automations are saving time and preventing errors.`;
      }

      return {
        status: overallStatus,
        businessMessage,
        lastUpdated: new Date(),
        details: {
          successRate: await this.calculateOverallSuccessRate(clientId),
          avgResponseTime: await this.calculateAvgResponseTime(clientId)
        }
      };
    } catch (error) {
      console.error('Error getting overall health:', error);
      return {
        status: 'critical',
        businessMessage: 'Unable to check system health. Please contact support if this persists.',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get simplified workflow summaries for dashboard
   */
  async getWorkflowSummaries(clientId: string): Promise<ClientWorkflowSummary[]> {
    try {
      const workflows = await this.getClientWorkflows(clientId);
      
      const summaries = await Promise.all(
        workflows.map(async (workflow) => {
          const healthStatus = await this.calculateWorkflowHealth(workflow);
          const executions = await this.getWorkflowExecutionStats(workflow.id);
          const lastExecution = await this.getLastExecution(workflow.id);

          return {
            id: workflow.id,
            businessName: workflow.businessName || workflow.name,
            category: workflow.category || 'General',
            healthStatus: healthStatus.status,
            isActive: workflow.active,
            lastExecution: lastExecution ? {
              time: lastExecution.startedAt,
              status: lastExecution.status as 'success' | 'error' | 'running',
              businessImpact: this.translateExecutionImpact(lastExecution, workflow)
            } : undefined,
            executionsToday: executions.today,
            successRate: executions.successRate,
            avgExecutionTime: executions.avgExecutionTime,
            availableActions: this.getAvailableActions(workflow, healthStatus.status)
          };
        })
      );

      return summaries;
    } catch (error) {
      console.error('Error getting workflow summaries:', error);
      return [];
    }
  }

  /**
   * Get detailed workflow information
   */
  async getWorkflowDetails(clientId: string, workflowId: string): Promise<any> {
    try {
      // Verify client has access to this workflow
      const hasAccess = await this.verifyWorkflowAccess(clientId, workflowId);
      if (!hasAccess) {
        return null;
      }

      const workflow = await this.getWorkflowById(workflowId);
      if (!workflow) {
        return null;
      }

      const [
        healthStatus,
        executionStats,
        businessMetrics,
        recentExecutions,
        configuration
      ] = await Promise.all([
        this.calculateWorkflowHealth(workflow),
        this.getWorkflowExecutionStats(workflowId),
        businessMetricsService.getWorkflowMetrics(workflowId),
        this.getRecentExecutions(workflowId, 20),
        this.getWorkflowConfiguration(workflowId)
      ]);

      return {
        id: workflow.id,
        businessName: workflow.businessName || workflow.name,
        businessDescription: workflow.businessDescription || 'Automated workflow',
        category: workflow.category || 'General',
        healthStatus: healthStatus.status,
        isActive: workflow.active,
        configuration: {
          schedule: configuration.schedule,
          notifications: configuration.notifications,
          customSettings: configuration.customSettings
        },
        performance: {
          totalExecutions: executionStats.total,
          successRate: executionStats.successRate,
          avgExecutionTime: executionStats.avgExecutionTime,
          lastExecution: executionStats.lastExecution
        },
        businessImpact: {
          timeSavedPerExecution: businessMetrics.timeSavedPerExecution,
          costSavingsPerMonth: businessMetrics.costSavingsPerMonth,
          errorReductionRate: businessMetrics.errorReductionRate
        },
        availableActions: this.getAvailableActions(workflow, healthStatus.status),
        recentExecutions: recentExecutions.map(exec => ({
          id: exec.id,
          startTime: exec.startedAt,
          endTime: exec.stoppedAt,
          status: exec.status,
          businessImpact: this.translateExecutionImpact(exec, workflow),
          duration: exec.stoppedAt ? 
            Math.round((new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000) : 
            null
        }))
      };
    } catch (error) {
      console.error('Error getting workflow details:', error);
      return null;
    }
  }

  /**
   * Get recent activity across all client workflows
   */
  async getRecentActivity(clientId: string, limit: number = 10): Promise<any[]> {
    try {
      const query = `
        SELECT 
          e.id,
          e.workflowId,
          w.businessName as workflowBusinessName,
          e.mode as action,
          e.status,
          e.startedAt as timestamp,
          w.category
        FROM workflow_executions e
        JOIN client_workflows cw ON e.workflowId = cw.n8nWorkflowId
        JOIN workflows w ON w.id = cw.n8nWorkflowId
        WHERE cw.clientId = ?
        ORDER BY e.startedAt DESC
        LIMIT ?
      `;

      const activities = await this.db.query(query, [clientId, limit]);

      return activities.map(activity => ({
        id: activity.id,
        workflowBusinessName: activity.workflowBusinessName,
        action: this.translateAction(activity.action),
        status: activity.status,
        businessImpact: this.calculateActivityImpact(activity),
        timestamp: activity.timestamp
      }));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Calculate workflow health based on recent executions and performance
   */
  private async calculateWorkflowHealth(workflow: any): Promise<WorkflowHealthStatus> {
    try {
      if (!workflow.active) {
        return {
          status: 'inactive',
          businessMessage: 'Workflow is paused',
          lastUpdated: new Date()
        };
      }

      const recentExecutions = await this.getRecentExecutions(workflow.id, 10);
      
      if (recentExecutions.length === 0) {
        return {
          status: 'warning',
          businessMessage: 'No recent activity - workflow may need attention',
          lastUpdated: new Date()
        };
      }

      const failureRate = recentExecutions.filter(e => e.status === 'error').length / recentExecutions.length;
      const lastExecution = recentExecutions[0];
      const timeSinceLastExecution = Date.now() - new Date(lastExecution.startedAt).getTime();
      const hoursInactive = timeSinceLastExecution / (1000 * 60 * 60);

      // Determine health status based on business rules
      if (failureRate > 0.5) {
        return {
          status: 'critical',
          businessMessage: 'Multiple recent failures detected - immediate attention required',
          lastUpdated: new Date()
        };
      } else if (failureRate > 0.2 || hoursInactive > 24) {
        return {
          status: 'warning',
          businessMessage: 'Some issues detected - monitoring recommended',
          lastUpdated: new Date()
        };
      } else {
        return {
          status: 'healthy',
          businessMessage: 'Running smoothly and delivering business value',
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.error('Error calculating workflow health:', error);
      return {
        status: 'critical',
        businessMessage: 'Unable to assess workflow health',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(clientId: string): Promise<SystemHealth> {
    try {
      const [
        dbHealth,
        n8nHealth,
        workflowHealth
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkN8nHealth(),
        this.checkWorkflowsHealth(clientId)
      ]);

      const overall = this.calculateOverallSystemHealth(dbHealth, n8nHealth, workflowHealth);

      return {
        overall,
        dashboard: 'healthy', // If we can respond, dashboard is healthy
        workflows: workflowHealth,
        n8nConnection: n8nHealth,
        database: dbHealth,
        lastChecked: new Date(),
        businessMessage: this.getSystemHealthMessage(overall)
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        overall: 'down',
        dashboard: 'down',
        workflows: 'down',
        n8nConnection: 'down',
        database: 'down',
        lastChecked: new Date(),
        businessMessage: 'System health check failed - please contact support'
      };
    }
  }

  /**
   * Verify client has access to workflow
   */
  async verifyWorkflowAccess(clientId: string, workflowId: string): Promise<boolean> {
    try {
      const query = `
        SELECT 1 FROM client_workflows 
        WHERE clientId = ? AND n8nWorkflowId = ?
      `;
      const result = await this.db.query(query, [clientId, workflowId]);
      return result.length > 0;
    } catch (error) {
      console.error('Error verifying workflow access:', error);
      return false;
    }
  }

  /**
   * Get simplified logs for client troubleshooting
   */
  async getSimplifiedLogs(workflowId: string, limit: number): Promise<any[]> {
    try {
      const executions = await this.getRecentExecutions(workflowId, limit);
      
      return executions.map(execution => ({
        timestamp: execution.startedAt,
        level: execution.status === 'success' ? 'success' : 
               execution.status === 'error' ? 'error' : 'info',
        businessMessage: this.translateExecutionToBusinessMessage(execution),
        technicalDetails: execution.status === 'error' ? execution.data?.error : null,
        suggestedAction: this.getSuggestedAction(execution)
      }));
    } catch (error) {
      console.error('Error getting simplified logs:', error);
      return [];
    }
  }

  /**
   * Update client notification preferences
   */
  async updateNotificationPreferences(clientId: string, preferences: any): Promise<any> {
    try {
      const query = `
        UPDATE clients 
        SET notificationPreferences = ?
        WHERE id = ?
      `;
      await this.db.query(query, [JSON.stringify(preferences), clientId]);
      return preferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getClientWorkflows(clientId: string): Promise<any[]> {
    const query = `
      SELECT w.*, cw.businessName, cw.businessDescription, cw.category
      FROM workflows w
      JOIN client_workflows cw ON w.id = cw.n8nWorkflowId
      WHERE cw.clientId = ?
    `;
    return await this.db.query(query, [clientId]);
  }

  private async getWorkflowById(workflowId: string): Promise<any> {
    const workflows = await n8nService.getWorkflows();
    return workflows.find(w => w.id === workflowId);
  }

  private async getWorkflowExecutionStats(workflowId: string): Promise<any> {
    const executions = await n8nService.getExecutions(workflowId, { limit: 100 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayExecutions = executions.filter(e => 
      new Date(e.startedAt) >= today
    );
    
    const successRate = executions.length > 0 ? 
      (executions.filter(e => e.status === 'success').length / executions.length) * 100 : 0;
    
    const avgExecutionTime = executions.length > 0 ?
      executions.reduce((sum, e) => {
        if (e.stoppedAt) {
          return sum + (new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime());
        }
        return sum;
      }, 0) / executions.filter(e => e.stoppedAt).length : 0;

    return {
      total: executions.length,
      today: todayExecutions.length,
      successRate: Math.round(successRate),
      avgExecutionTime: Math.round(avgExecutionTime / 1000), // in seconds
      lastExecution: executions[0]
    };
  }

  private async getLastExecution(workflowId: string): Promise<any> {
    const executions = await n8nService.getExecutions(workflowId, { limit: 1 });
    return executions[0] || null;
  }

  private async getRecentExecutions(workflowId: string, limit: number): Promise<any[]> {
    return await n8nService.getExecutions(workflowId, { limit });
  }

  private getAvailableActions(workflow: any, healthStatus: string): string[] {
    const actions = [];
    
    if (workflow.active) {
      actions.push('pause');
      if (healthStatus === 'critical' || healthStatus === 'warning') {
        actions.push('restart');
      }
    } else {
      actions.push('resume');
    }
    
    actions.push('test', 'configure', 'view-logs');
    return actions;
  }

  private translateExecutionImpact(execution: any, workflow: any): string {
    if (execution.status === 'success') {
      return `Successfully completed ${workflow.businessName || 'automation task'}`;
    } else if (execution.status === 'error') {
      return `Failed to complete ${workflow.businessName || 'automation task'}`;
    } else {
      return `Currently processing ${workflow.businessName || 'automation task'}`;
    }
  }

  private translateAction(action: string): string {
    const actionMap: Record<string, string> = {
      'manual': 'Manual execution',
      'trigger': 'Automated trigger',
      'webhook': 'External trigger',
      'retry': 'Retry attempt'
    };
    return actionMap[action] || action;
  }

  private calculateActivityImpact(activity: any): string {
    if (activity.status === 'success') {
      return 'Positive business impact';
    } else if (activity.status === 'error') {
      return 'Potential business impact';
    }
    return 'In progress';
  }

  private async calculateOverallSuccessRate(clientId: string): Promise<number> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
        FROM workflow_executions e
        JOIN client_workflows cw ON e.workflowId = cw.n8nWorkflowId
        WHERE cw.clientId = ?
        AND e.startedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;
      
      const result = await this.db.query(query, [clientId]);
      const { total, successful } = result[0];
      
      return total > 0 ? Math.round((successful / total) * 100) : 0;
    } catch (error) {
      console.error('Error calculating success rate:', error);
      return 0;
    }
  }

  private async calculateAvgResponseTime(clientId: string): Promise<number> {
    // Implementation for average response time calculation
    return 0; // Placeholder
  }

  private async checkDatabaseHealth(): Promise<'healthy' | 'degraded' | 'down'> {
    try {
      await this.db.query('SELECT 1');
      return 'healthy';
    } catch (error) {
      return 'down';
    }
  }

  private async checkN8nHealth(): Promise<'healthy' | 'degraded' | 'down'> {
    try {
      await n8nService.getWorkflows();
      return 'healthy';
    } catch (error) {
      return 'down';
    }
  }

  private async checkWorkflowsHealth(clientId: string): Promise<'healthy' | 'degraded' | 'down'> {
    try {
      const overallHealth = await this.getOverallHealth(clientId);
      return overallHealth.status === 'critical' ? 'degraded' : 'healthy';
    } catch (error) {
      return 'down';
    }
  }

  private calculateOverallSystemHealth(...healths: Array<'healthy' | 'degraded' | 'down'>): 'healthy' | 'degraded' | 'down' {
    if (healths.includes('down')) return 'down';
    if (healths.includes('degraded')) return 'degraded';
    return 'healthy';
  }

  private getSystemHealthMessage(status: 'healthy' | 'degraded' | 'down'): string {
    switch (status) {
      case 'healthy':
        return 'All systems operational - your automations are running smoothly';
      case 'degraded':
        return 'Some systems experiencing issues - functionality may be limited';
      case 'down':
        return 'System issues detected - please contact support';
      default:
        return 'System status unknown';
    }
  }

  private translateExecutionToBusinessMessage(execution: any): string {
    if (execution.status === 'success') {
      return 'Automation completed successfully, delivering expected business value';
    } else if (execution.status === 'error') {
      return 'Automation encountered an issue and needs attention';
    } else {
      return 'Automation is currently processing';
    }
  }

  private getSuggestedAction(execution: any): string {
    if (execution.status === 'error') {
      return 'Review error details and consider restarting the workflow';
    } else if (execution.status === 'success') {
      return 'No action needed - workflow is performing as expected';
    }
    return 'Monitor progress and wait for completion';
  }

  private async getWorkflowConfiguration(workflowId: string): Promise<any> {
    // Implementation for getting workflow configuration
    return {
      schedule: 'As needed',
      notifications: 'Email on failure',
      customSettings: {}
    };
  }
}

export const clientDashboardService = new ClientDashboardService();