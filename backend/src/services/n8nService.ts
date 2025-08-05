import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  settings?: any;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  mode: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startedAt: string;
  finishedAt?: string;
  data?: any;
  executionTime?: number;
}

export interface N8nCredential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
}

export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecution?: string;
  executionsThisMonth: number;
  executionsToday: number;
  uptimePercentage: number;
}

export interface BusinessWorkflowDeployment {
  workflowId: string;
  deploymentId: string;
  status: 'deploying' | 'active' | 'inactive' | 'failed';
  businessConfig: {
    category: string;
    expectedMonthlySavings: number;
    targetUsers: string[];
    department: string;
  };
  monitoring: {
    alertsEnabled: boolean;
    costThreshold: number;
    performanceThreshold: number;
  };
  deployedAt: string;
}

export class N8nService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.apiKey = process.env.N8N_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('N8N_API_KEY not configured. n8n integration will not work.');
    }

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('n8n API request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('n8n API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('n8n API response:', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('n8n API response error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if n8n is available and API key is valid
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/workflows?limit=1');
      return response.status === 200;
    } catch (error) {
      logger.error('n8n health check failed:', error);
      return false;
    }
  }

  /**
   * Get all workflows with optional business filtering
   */
  async getWorkflows(businessFilter?: {
    category?: string;
    active?: boolean;
    tags?: string[];
  }): Promise<N8nWorkflow[]> {
    try {
      const response = await this.client.get('/workflows');
      let workflows = response.data.data || [];

      // Apply business filters
      if (businessFilter) {
        if (businessFilter.active !== undefined) {
          workflows = workflows.filter((w: N8nWorkflow) => w.active === businessFilter.active);
        }
        
        if (businessFilter.tags && businessFilter.tags.length > 0) {
          workflows = workflows.filter((w: N8nWorkflow) => 
            w.tags && businessFilter.tags!.some(tag => w.tags!.includes(tag))
          );
        }
      }

      return workflows;
    } catch (error) {
      logger.error('Failed to fetch workflows:', error);
      throw new Error('Failed to fetch workflows from n8n');
    }
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(id: string): Promise<N8nWorkflow | null> {
    try {
      const response = await this.client.get(`/workflows/${id}`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Failed to fetch workflow ${id}:`, error);
      throw new Error(`Failed to fetch workflow ${id}`);
    }
  }

  /**
   * Create a new workflow with business configuration
   */
  async createWorkflow(workflowData: Partial<N8nWorkflow>, businessTags?: string[]): Promise<N8nWorkflow> {
    try {
      // Add business tags to workflow
      if (businessTags && businessTags.length > 0) {
        workflowData.tags = [...(workflowData.tags || []), ...businessTags];
      }

      const response = await this.client.post('/workflows', workflowData);
      logger.info('Workflow created successfully:', { 
        id: response.data.data.id,
        name: response.data.data.name,
        businessTags 
      });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create workflow:', error);
      throw new Error('Failed to create workflow in n8n');
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(id: string, workflowData: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const response = await this.client.put(`/workflows/${id}`, workflowData);
      logger.info('Workflow updated successfully:', { id });
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update workflow ${id}:`, error);
      throw new Error(`Failed to update workflow ${id}`);
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.client.delete(`/workflows/${id}`);
      logger.info('Workflow deleted successfully:', { id });
    } catch (error) {
      logger.error(`Failed to delete workflow ${id}:`, error);
      throw new Error(`Failed to delete workflow ${id}`);
    }
  }

  /**
   * Activate a workflow with business monitoring
   */
  async activateWorkflow(id: string, businessConfig?: {
    alertsEnabled?: boolean;
    costThreshold?: number;
    performanceThreshold?: number;
  }): Promise<void> {
    try {
      await this.client.post(`/workflows/${id}/activate`);
      
      // Log business configuration if provided
      if (businessConfig) {
        logger.info('Workflow activated with business monitoring:', { 
          id, 
          businessConfig 
        });
      }
      
      logger.info('Workflow activated successfully:', { id });
    } catch (error) {
      logger.error(`Failed to activate workflow ${id}:`, error);
      throw new Error(`Failed to activate workflow ${id}`);
    }
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(id: string): Promise<void> {
    try {
      await this.client.post(`/workflows/${id}/deactivate`);
      logger.info('Workflow deactivated successfully:', { id });
    } catch (error) {
      logger.error(`Failed to deactivate workflow ${id}:`, error);
      throw new Error(`Failed to deactivate workflow ${id}`);
    }
  }

  /**
   * Execute a workflow manually with business tracking
   */
  async executeWorkflow(id: string, data?: any, businessContext?: {
    triggeredBy?: string;
    department?: string;
    costCenter?: string;
  }): Promise<N8nExecution> {
    try {
      const response = await this.client.post(`/workflows/${id}/execute`, { data });
      
      // Log business context if provided
      if (businessContext) {
        logger.info('Workflow executed with business context:', { 
          id, 
          executionId: response.data.data.id,
          businessContext 
        });
      }
      
      logger.info('Workflow executed successfully:', { id, executionId: response.data.data.id });
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to execute workflow ${id}:`, error);
      throw new Error(`Failed to execute workflow ${id}`);
    }
  }

  /**
   * Get workflow executions with business filtering
   */
  async getExecutions(
    workflowId?: string, 
    limit = 20,
    businessFilter?: {
      startDate?: string;
      endDate?: string;
      status?: 'success' | 'error' | 'running' | 'waiting';
    }
  ): Promise<N8nExecution[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(workflowId && { workflowId }),
      });
      
      const response = await this.client.get(`/executions?${params}`);
      let executions = response.data.data || [];

      // Apply business filters
      if (businessFilter) {
        if (businessFilter.status) {
          executions = executions.filter((e: N8nExecution) => e.status === businessFilter.status);
        }
        
        if (businessFilter.startDate) {
          const startDate = new Date(businessFilter.startDate);
          executions = executions.filter((e: N8nExecution) => 
            new Date(e.startedAt) >= startDate
          );
        }
        
        if (businessFilter.endDate) {
          const endDate = new Date(businessFilter.endDate);
          executions = executions.filter((e: N8nExecution) => 
            new Date(e.startedAt) <= endDate
          );
        }
      }

      return executions;
    } catch (error) {
      logger.error('Failed to fetch executions:', error);
      throw new Error('Failed to fetch executions from n8n');
    }
  }

  /**
   * Get a specific execution
   */
  async getExecution(id: string): Promise<N8nExecution | null> {
    try {
      const response = await this.client.get(`/executions/${id}`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Failed to fetch execution ${id}:`, error);
      throw new Error(`Failed to fetch execution ${id}`);
    }
  }

  /**
   * Get all credentials
   */
  async getCredentials(): Promise<N8nCredential[]> {
    try {
      const response = await this.client.get('/credentials');
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to fetch credentials:', error);
      throw new Error('Failed to fetch credentials from n8n');
    }
  }

  /**
   * Create a new credential
   */
  async createCredential(credentialData: Partial<N8nCredential>): Promise<N8nCredential> {
    try {
      const response = await this.client.post('/credentials', credentialData);
      logger.info('Credential created successfully:', { id: response.data.data.id });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create credential:', error);
      throw new Error('Failed to create credential in n8n');
    }
  }

  /**
   * Update a credential
   */
  async updateCredential(id: string, credentialData: Partial<N8nCredential>): Promise<N8nCredential> {
    try {
      const response = await this.client.put(`/credentials/${id}`, credentialData);
      logger.info('Credential updated successfully:', { id });
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update credential ${id}:`, error);
      throw new Error(`Failed to update credential ${id}`);
    }
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<void> {
    try {
      await this.client.delete(`/credentials/${id}`);
      logger.info('Credential deleted successfully:', { id });
    } catch (error) {
      logger.error(`Failed to delete credential ${id}:`, error);
      throw new Error(`Failed to delete credential ${id}`);
    }
  }

  /**
   * Test a credential
   */
  async testCredential(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.client.post(`/credentials/${id}/test`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to test credential ${id}:`, error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Credential test failed' 
      };
    }
  }

  /**
   * Get comprehensive workflow statistics with business metrics
   */
  async getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
    try {
      const executions = await this.getExecutions(workflowId, 100);
      
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const stats: WorkflowStats = {
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'success').length,
        failedExecutions: executions.filter(e => e.status === 'error').length,
        averageExecutionTime: 0,
        lastExecution: executions[0]?.startedAt,
        executionsThisMonth: executions.filter(e => new Date(e.startedAt) >= thisMonth).length,
        executionsToday: executions.filter(e => new Date(e.startedAt) >= today).length,
        uptimePercentage: 0
      };

      // Calculate average execution time
      const completedExecutions = executions.filter(e => e.finishedAt);
      if (completedExecutions.length > 0) {
        const totalTime = completedExecutions.reduce((sum, execution) => {
          const start = new Date(execution.startedAt).getTime();
          const end = new Date(execution.finishedAt!).getTime();
          return sum + (end - start);
        }, 0);
        stats.averageExecutionTime = totalTime / completedExecutions.length;
      }

      // Calculate uptime percentage
      if (stats.totalExecutions > 0) {
        stats.uptimePercentage = (stats.successfulExecutions / stats.totalExecutions) * 100;
      } else {
        stats.uptimePercentage = 100; // No executions means no failures
      }

      return stats;
    } catch (error) {
      logger.error(`Failed to get workflow stats for ${workflowId}:`, error);
      throw new Error(`Failed to get workflow statistics`);
    }
  }

  /**
   * Deploy workflow with business configuration
   */
  async deployWorkflowForBusiness(
    workflowId: string,
    businessConfig: {
      category: string;
      expectedMonthlySavings: number;
      targetUsers: string[];
      department: string;
      alertsEnabled?: boolean;
      costThreshold?: number;
      performanceThreshold?: number;
    }
  ): Promise<BusinessWorkflowDeployment> {
    try {
      // Activate the workflow
      await this.activateWorkflow(workflowId, {
        alertsEnabled: businessConfig.alertsEnabled || true,
        costThreshold: businessConfig.costThreshold || businessConfig.expectedMonthlySavings * 1.2,
        performanceThreshold: businessConfig.performanceThreshold || 95
      });

      // Add business tags
      const workflow = await this.getWorkflow(workflowId);
      if (workflow) {
        const businessTags = [
          `category:${businessConfig.category}`,
          `department:${businessConfig.department}`,
          'smb-deployed'
        ];

        await this.updateWorkflow(workflowId, {
          ...workflow,
          tags: [...(workflow.tags || []), ...businessTags]
        });
      }

      const deployment: BusinessWorkflowDeployment = {
        workflowId,
        deploymentId: `deploy_${workflowId}_${Date.now()}`,
        status: 'active',
        businessConfig: {
          category: businessConfig.category,
          expectedMonthlySavings: businessConfig.expectedMonthlySavings,
          targetUsers: businessConfig.targetUsers,
          department: businessConfig.department
        },
        monitoring: {
          alertsEnabled: businessConfig.alertsEnabled || true,
          costThreshold: businessConfig.costThreshold || businessConfig.expectedMonthlySavings * 1.2,
          performanceThreshold: businessConfig.performanceThreshold || 95
        },
        deployedAt: new Date().toISOString()
      };

      logger.info('Business workflow deployment completed:', {
        workflowId,
        deploymentId: deployment.deploymentId,
        businessConfig
      });

      return deployment;
    } catch (error) {
      logger.error(`Failed to deploy workflow ${workflowId} for business:`, error);
      throw new Error(`Failed to deploy workflow for business use`);
    }
  }

  /**
   * Monitor workflow performance for business alerts
   */
  async monitorWorkflowPerformance(workflowId: string): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: Array<{
      type: 'performance' | 'cost' | 'reliability';
      severity: 'low' | 'medium' | 'high';
      message: string;
      value?: number;
      threshold?: number;
    }>;
  }> {
    try {
      const stats = await this.getWorkflowStats(workflowId);
      const issues = [];
      let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check reliability
      if (stats.uptimePercentage < 80) {
        issues.push({
          type: 'reliability',
          severity: 'high',
          message: `Low uptime: ${stats.uptimePercentage.toFixed(1)}%`,
          value: stats.uptimePercentage,
          threshold: 95
        });
        overallStatus = 'critical';
      } else if (stats.uptimePercentage < 95) {
        issues.push({
          type: 'reliability',
          severity: 'medium',
          message: `Uptime below target: ${stats.uptimePercentage.toFixed(1)}%`,
          value: stats.uptimePercentage,
          threshold: 95
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }

      // Check performance
      if (stats.averageExecutionTime > 300000) { // 5 minutes
        issues.push({
          type: 'performance',
          severity: 'medium',
          message: `Slow execution time: ${(stats.averageExecutionTime / 1000).toFixed(1)}s`,
          value: stats.averageExecutionTime,
          threshold: 60000
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }

      // Check for no recent executions (possible issue)
      if (stats.lastExecution) {
        const lastExec = new Date(stats.lastExecution);
        const daysSinceLastExecution = (Date.now() - lastExec.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastExecution > 7) {
          issues.push({
            type: 'reliability',
            severity: 'medium',
            message: `No executions in ${Math.round(daysSinceLastExecution)} days`,
            value: daysSinceLastExecution,
            threshold: 1
          });
          if (overallStatus === 'healthy') overallStatus = 'warning';
        }
      }

      return {
        status: overallStatus,
        issues
      };
    } catch (error) {
      logger.error(`Failed to monitor workflow ${workflowId}:`, error);
      return {
        status: 'critical',
        issues: [{
          type: 'reliability',
          severity: 'high',
          message: 'Unable to retrieve workflow monitoring data'
        }]
      };
    }
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(workflowJson: any): Promise<N8nWorkflow> {
    try {
      // Remove ID if present to create new workflow
      const { id, ...workflowData } = workflowJson;
      
      const response = await this.client.post('/workflows', workflowData);
      logger.info('Workflow imported successfully:', { id: response.data.data.id });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to import workflow:', error);
      throw new Error('Failed to import workflow to n8n');
    }
  }

  /**
   * Export workflow to JSON
   */
  async exportWorkflow(id: string): Promise<any> {
    try {
      const workflow = await this.getWorkflow(id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      // Return workflow data without sensitive information
      const { id: workflowId, ...exportData } = workflow;
      return exportData;
    } catch (error) {
      logger.error(`Failed to export workflow ${id}:`, error);
      throw new Error(`Failed to export workflow ${id}`);
    }
  }

  /**
   * Get business-focused workflow analytics
   */
  async getBusinessAnalytics(timeframe: 'day' | 'week' | 'month' | 'quarter' = 'month'): Promise<{
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successRate: number;
    costSavings: number;
    timeSaved: number; // hours
    departmentBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  }> {
    try {
      const workflows = await this.getWorkflows();
      const activeWorkflows = workflows.filter(w => w.active);
      
      // Get executions for the timeframe
      const startDate = this.getStartDateForTimeframe(timeframe);
      const executions = await Promise.all(
        workflows.map(w => this.getExecutions(w.id, 1000, { 
          startDate: startDate.toISOString() 
        }))
      );
      
      const allExecutions = executions.flat();
      const successfulExecutions = allExecutions.filter(e => e.status === 'success');
      
      // Analyze workflow tags for business insights
      const departmentBreakdown: Record<string, number> = {};
      const categoryBreakdown: Record<string, number> = {};
      
      workflows.forEach(workflow => {
        if (workflow.tags) {
          workflow.tags.forEach(tag => {
            if (tag.startsWith('department:')) {
              const dept = tag.replace('department:', '');
              departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
            } else if (tag.startsWith('category:')) {
              const cat = tag.replace('category:', '');
              categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
            }
          });
        }
      });
      
      return {
        totalWorkflows: workflows.length,
        activeWorkflows: activeWorkflows.length,
        totalExecutions: allExecutions.length,
        successRate: allExecutions.length > 0 ? (successfulExecutions.length / allExecutions.length) * 100 : 0,
        costSavings: successfulExecutions.length * 5, // Estimate $5 savings per successful execution
        timeSaved: successfulExecutions.length * 0.25, // Estimate 15 minutes saved per execution
        departmentBreakdown,
        categoryBreakdown
      };
    } catch (error) {
      logger.error('Failed to get business analytics:', error);
      throw new Error('Failed to retrieve business analytics');
    }
  }

  private getStartDateForTimeframe(timeframe: 'day' | 'week' | 'month' | 'quarter'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return weekStart;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return quarterStart;
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
}