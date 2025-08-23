/**
 * Unified Workflow Service
 * Connects frontend to the new unified workflow API
 * Includes visibility filtering support
 */

import { workflowCurationService } from './workflowCurationService';
import { VisibilityService } from './visibilityService';

export interface UnifiedWorkflowData {
  id: string;
  type: 'template' | 'live';
  name: string;
  businessName: string;
  description: string;
  category: string;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'inactive';
  isActive: boolean;
  workflowId?: string; // Added for compatibility with WorkflowCatalog
  businessMetadata?: {
    businessName?: string;
    description?: string;
    category?: string;
    industry?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    setupTime?: string;
    monthlyValue?: number;
    timesSaved?: string;
    features?: string[];
  };
  configuration?: {
    status: 'template' | 'configuring' | 'scheduled' | 'active' | 'paused' | 'error';
    progress?: number;
    scheduledActivation?: Date;
    lastConfigured?: Date;
    configurationId?: string;
  };
  lastExecution?: {
    time: Date;
    status: 'success' | 'error' | 'running';
    businessImpact: string;
  };
  metrics: {
    executionsToday: number;
    successRate: number;
    avgExecutionTime: number;
  };
  businessMetrics: {
    timeSavedPerWeek: number;
    monthlySavings: number;
    roi: number;
    estimatedValue?: number;
  };
  quickActions: string[];
  template?: any;
  n8nWorkflow?: any;
  stats?: any;
}

export interface WorkflowAnalytics {
  summary: {
    totalWorkflows: number;
    templateWorkflows: number;
    liveWorkflows: number;
    activeWorkflows: number;
    healthyWorkflows: number;
    workflowsNeedingAttention: number;
  };
  businessMetrics: {
    totalMonthlySavings: number;
    totalTimeSavedPerWeek: number;
    averageROI: number;
    potentialSavings: number;
  };
  categories: Record<string, number>;
  healthDistribution: Record<string, number>;
}

class UnifiedWorkflowService {
  private baseUrl: string;

  constructor() {
    // Use relative URL to leverage React's proxy configuration
    this.baseUrl = process.env.REACT_APP_API_URL || '/api';
  }

  /**
   * Get current visibility settings from localStorage
   */
  private getVisibilitySettings(): string | undefined {
    try {
      if (typeof localStorage !== 'undefined') {
        const settings = localStorage.getItem('n8n-workflow-metadata');
        return settings || undefined;
      }
    } catch (error) {
      console.warn('Failed to get visibility settings from localStorage:', error);
    }
    return undefined;
  }

  /**
   * Add visibility parameters to URL search params
   */
  private addVisibilityParams(
    params: URLSearchParams, 
    options?: { 
      clientMode?: boolean; 
      adminMode?: boolean; 
      visibilityLevel?: string;
    }
  ): void {
    // Add visibility level if specified
    if (options?.visibilityLevel) {
      params.append('visibilityLevel', options.visibilityLevel);
    }

    // Add mode flags
    if (options?.clientMode) {
      params.append('clientMode', 'true');
    }
    if (options?.adminMode) {
      params.append('adminMode', 'true');
    }

    // Add visibility settings from localStorage
    const visibilitySettings = this.getVisibilitySettings();
    if (visibilitySettings) {
      params.append('visibilitySettings', visibilitySettings);
    }
  }

  /**
   * Get all unified workflows for a client
   */
  async getUnifiedWorkflows(
    clientId: string,
    options?: {
      category?: string;
      status?: string;
      includeInactive?: boolean;
      clientMode?: boolean;
      adminMode?: boolean;
      visibilityLevel?: string;
    }
  ): Promise<{ data: UnifiedWorkflowData[]; metadata: any }> {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.status) params.append('status', options.status);
    if (options?.includeInactive) params.append('includeInactive', 'true');

    // Add visibility filtering parameters
    this.addVisibilityParams(params, {
      clientMode: options?.clientMode,
      adminMode: options?.adminMode,
      visibilityLevel: options?.visibilityLevel
    });

    const response = await fetch(
      `${this.baseUrl}/unified-workflows/${clientId}?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Convert date strings back to Date objects
    result.data.forEach((workflow: UnifiedWorkflowData) => {
      if (workflow.configuration?.scheduledActivation) {
        workflow.configuration.scheduledActivation = new Date(workflow.configuration.scheduledActivation);
      }
      if (workflow.configuration?.lastConfigured) {
        workflow.configuration.lastConfigured = new Date(workflow.configuration.lastConfigured);
      }
      if (workflow.lastExecution?.time) {
        workflow.lastExecution.time = new Date(workflow.lastExecution.time);
      }
    });

    return result;
  }

  /**
   * Get specific unified workflow by ID
   */
  async getUnifiedWorkflow(clientId: string, workflowId: string): Promise<UnifiedWorkflowData> {
    const response = await fetch(
      `${this.baseUrl}/unified-workflows/${clientId}/${workflowId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow: ${response.statusText}`);
    }

    const result = await response.json();
    const workflow = result.data;

    // Convert date strings back to Date objects
    if (workflow.configuration?.scheduledActivation) {
      workflow.configuration.scheduledActivation = new Date(workflow.configuration.scheduledActivation);
    }
    if (workflow.configuration?.lastConfigured) {
      workflow.configuration.lastConfigured = new Date(workflow.configuration.lastConfigured);
    }
    if (workflow.lastExecution?.time) {
      workflow.lastExecution.time = new Date(workflow.lastExecution.time);
    }

    return workflow;
  }

  /**
   * Get all available workflow templates
   */
  async getWorkflowTemplates(filters?: {
    category?: string;
    priceRange?: string;
    supportLevel?: string;
    clientMode?: boolean;
    adminMode?: boolean;
    visibilityLevel?: string;
  }): Promise<{ data: UnifiedWorkflowData[]; metadata: any }> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priceRange) params.append('priceRange', filters.priceRange);
    if (filters?.supportLevel) params.append('supportLevel', filters.supportLevel);

    // Add visibility filtering parameters
    this.addVisibilityParams(params, {
      clientMode: filters?.clientMode,
      adminMode: filters?.adminMode,
      visibilityLevel: filters?.visibilityLevel
    });

    const response = await fetch(
      `${this.baseUrl}/unified-workflows/templates?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Deploy a template workflow for a client
   */
  async deployTemplate(
    clientId: string,
    templateId: string,
    businessConfig: {
      businessName: string;
      businessDescription?: string;
      category: string;
      expectedMonthlySavings: number;
      targetUsers: string[];
      department: string;
    }
  ): Promise<UnifiedWorkflowData> {
    const response = await fetch(
      `${this.baseUrl}/unified-workflows/${clientId}/deploy/${templateId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessConfig),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to deploy template: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Execute an action on a workflow
   */
  async executeWorkflowAction(
    clientId: string,
    workflowId: string,
    action: string,
    options?: any
  ): Promise<{ success: boolean; message: string; businessImpact: string }> {
    const response = await fetch(
      `${this.baseUrl}/unified-workflows/${clientId}/${workflowId}/action`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, options }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to execute action: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get workflow analytics for a client
   */
  async getWorkflowAnalytics(clientId: string): Promise<WorkflowAnalytics> {
    const response = await fetch(
      `${this.baseUrl}/unified-workflows/${clientId}/analytics`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }
}

export const unifiedWorkflowService = new UnifiedWorkflowService();