/**
 * n8n Integration Service
 * Connects to your Hetzner n8n instance
 */

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  connections: any;
  settings: any;
  staticData: any;
  tags: any[];
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook';
  startedAt: string;
  stoppedAt?: string;
  status: 'success' | 'error' | 'waiting' | 'running';
  data: any;
}

class N8nService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_N8N_URL || 'http://localhost:5678';
    this.apiKey = process.env.REACT_APP_N8N_API_KEY || '';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all workflows
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.makeRequest<{ data: N8nWorkflow[] }>('/workflows');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      return [];
    }
  }

  // Get active workflows
  async getActiveWorkflows(): Promise<N8nWorkflow[]> {
    const workflows = await this.getWorkflows();
    return workflows.filter(w => w.active);
  }

  // Get workflow by ID
  async getWorkflow(id: string): Promise<N8nWorkflow | null> {
    try {
      return await this.makeRequest<N8nWorkflow>(`/workflows/${id}`);
    } catch (error) {
      console.error(`Failed to fetch workflow ${id}:`, error);
      return null;
    }
  }

  // Activate/Deactivate workflow
  async setWorkflowActive(id: string, active: boolean): Promise<boolean> {
    try {
      await this.makeRequest(`/workflows/${id}/${active ? 'activate' : 'deactivate'}`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      console.error(`Failed to ${active ? 'activate' : 'deactivate'} workflow ${id}:`, error);
      return false;
    }
  }

  // Get workflow executions
  async getExecutions(workflowId?: string, limit: number = 20): Promise<N8nExecution[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (workflowId) {
        params.append('workflowId', workflowId);
      }

      const response = await this.makeRequest<{ data: N8nExecution[] }>(`/executions?${params}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch executions:', error);
      return [];
    }
  }

  // Get execution by ID
  async getExecution(id: string): Promise<N8nExecution | null> {
    try {
      return await this.makeRequest<N8nExecution>(`/executions/${id}`);
    } catch (error) {
      console.error(`Failed to fetch execution ${id}:`, error);
      return null;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/workflows?limit=1');
      return true;
    } catch (error) {
      console.error('n8n connection test failed:', error);
      return false;
    }
  }

  // Get system health/info
  async getHealthInfo(): Promise<any> {
    try {
      return await this.makeRequest('/health');
    } catch (error) {
      console.error('Failed to get health info:', error);
      return null;
    }
  }

  // Calculate business metrics from n8n data
  async getBusinessMetrics(): Promise<{
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successfulExecutions: number;
    errorRate: number;
    averageExecutionTime: number;
  }> {
    try {
      const [workflows, executions] = await Promise.all([
        this.getWorkflows(),
        this.getExecutions(undefined, 100) // Get last 100 executions
      ]);

      const activeWorkflows = workflows.filter(w => w.active);
      const successfulExecutions = executions.filter(e => e.status === 'success');
      const errorRate = executions.length > 0 ? 
        ((executions.length - successfulExecutions.length) / executions.length) * 100 : 0;

      // Calculate average execution time (rough estimate)
      const executionsWithTime = executions.filter(e => e.stoppedAt && e.startedAt);
      const averageExecutionTime = executionsWithTime.length > 0 ?
        executionsWithTime.reduce((acc, e) => {
          const duration = new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime();
          return acc + duration;
        }, 0) / executionsWithTime.length / 1000 : 0; // Convert to seconds

      return {
        totalWorkflows: workflows.length,
        activeWorkflows: activeWorkflows.length,
        totalExecutions: executions.length,
        successfulExecutions: successfulExecutions.length,
        errorRate: Math.round(errorRate * 100) / 100,
        averageExecutionTime: Math.round(averageExecutionTime * 100) / 100
      };
    } catch (error) {
      console.error('Failed to calculate business metrics:', error);
      return {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        errorRate: 0,
        averageExecutionTime: 0
      };
    }
  }
}

// Export singleton instance
export const n8nService = new N8nService();

// Utility functions
export const n8nUtils = {
  formatExecutionTime: (milliseconds: number): string => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${Math.round(milliseconds / 1000)}s`;
    return `${Math.round(milliseconds / 60000)}m`;
  },

  getStatusColor: (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'waiting': case 'running': return 'warning';
      default: return 'info';
    }
  },

  calculateROI: (activeWorkflows: number, hoursPerWeek: number = 8, hourlyRate: number = 25): {
    weeklySavings: number;
    monthlySavings: number;
    yearlySavings: number;
  } => {
    const totalHoursSaved = activeWorkflows * hoursPerWeek;
    const weeklySavings = totalHoursSaved * hourlyRate;
    const monthlySavings = weeklySavings * 4.33;
    const yearlySavings = monthlySavings * 12;

    return {
      weeklySavings: Math.round(weeklySavings),
      monthlySavings: Math.round(monthlySavings),
      yearlySavings: Math.round(yearlySavings)
    };
  }
};