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
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  mode: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startedAt: string;
  finishedAt?: string;
  data?: any;
}

export interface N8nCredential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
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
   * Get all workflows
   */
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.client.get('/workflows');
      return response.data.data || [];
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
   * Create a new workflow
   */
  async createWorkflow(workflowData: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const response = await this.client.post('/workflows', workflowData);
      logger.info('Workflow created successfully:', { id: response.data.data.id });
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
   * Activate a workflow
   */
  async activateWorkflow(id: string): Promise<void> {
    try {
      await this.client.post(`/workflows/${id}/activate`);
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
   * Execute a workflow manually
   */
  async executeWorkflow(id: string, data?: any): Promise<N8nExecution> {
    try {
      const response = await this.client.post(`/workflows/${id}/execute`, { data });
      logger.info('Workflow executed successfully:', { id, executionId: response.data.data.id });
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to execute workflow ${id}:`, error);
      throw new Error(`Failed to execute workflow ${id}`);
    }
  }

  /**
   * Get workflow executions
   */
  async getExecutions(workflowId?: string, limit = 20): Promise<N8nExecution[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(workflowId && { workflowId }),
      });
      
      const response = await this.client.get(`/executions?${params}`);
      return response.data.data || [];
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
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecution?: string;
  }> {
    try {
      const executions = await this.getExecutions(workflowId, 100);
      
      const stats = {
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'success').length,
        failedExecutions: executions.filter(e => e.status === 'error').length,
        averageExecutionTime: 0,
        lastExecution: executions[0]?.startedAt,
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

      return stats;
    } catch (error) {
      logger.error(`Failed to get workflow stats for ${workflowId}:`, error);
      throw new Error(`Failed to get workflow statistics`);
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
}