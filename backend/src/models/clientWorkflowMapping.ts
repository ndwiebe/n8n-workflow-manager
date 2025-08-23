/**
 * Client Workflow Mapping Data Models
 * Maps n8n workflows to client business contexts and configurations
 */

export interface ClientWorkflowMapping {
  id: string;
  clientId: string;
  organizationId: string;
  n8nWorkflowId: string;
  businessName: string;
  businessDescription?: string;
  category: string;
  templateId?: string;
  deployedAt: Date;
  isActive: boolean;
  businessConfig: {
    expectedMonthlySavings: number;
    targetUsers: string[];
    department: string;
  };
  metadata?: {
    deploymentVersion: string;
    configurationHash: string;
    lastHealthCheck?: Date;
    lastModified?: Date;
    modifiedBy?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ClientWorkflowConfiguration {
  id: string;
  mappingId: string;
  status: 'template' | 'configuring' | 'scheduled' | 'active' | 'paused' | 'error';
  progress?: number; // 0-100 for configuration progress
  scheduledActivation?: Date;
  lastConfigured?: Date;
  configurationData?: {
    credentials: Record<string, string>; // credential IDs
    parameters: Record<string, any>;
    webhookUrls?: string[];
    environmentVariables?: Record<string, string>;
  };
  errorDetails?: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    lastOccurred: Date;
    retryCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  monthlyPrice: number;
  estimatedSetupTime: string;
  features: string[];
  externalTools: string[];
  requiredCredentials: TemplateCredential[];
  templateData: {
    n8nWorkflowJson: any;
    configurationSchema: any;
    setupInstructions: string[];
    prerequisites: string[];
  };
  businessMetrics: {
    estimatedTimeSavedPerWeek: number;
    estimatedMonthlySavings: number;
    expectedROI: number;
  };
  tags: string[];
  isActive: boolean;
  supportLevel: 'community' | 'supported' | 'enterprise';
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateCredential {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description: string;
  setupInstructions?: string;
  validationRules?: {
    pattern?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  };
}

// Database operations interface
export interface ClientWorkflowMappingRepository {
  // Basic CRUD operations
  create(mapping: Omit<ClientWorkflowMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientWorkflowMapping>;
  findById(id: string): Promise<ClientWorkflowMapping | null>;
  findByClientId(clientId: string): Promise<ClientWorkflowMapping[]>;
  findByN8nWorkflowId(n8nWorkflowId: string): Promise<ClientWorkflowMapping | null>;
  findByTemplateId(templateId: string): Promise<ClientWorkflowMapping[]>;
  update(id: string, updates: Partial<ClientWorkflowMapping>): Promise<ClientWorkflowMapping>;
  delete(id: string): Promise<void>;
  
  // Business queries
  findActiveByClient(clientId: string): Promise<ClientWorkflowMapping[]>;
  findByClientAndTemplate(clientId: string, templateId: string): Promise<ClientWorkflowMapping | null>;
  findByClientAndN8nWorkflow(clientId: string, n8nWorkflowId: string): Promise<ClientWorkflowMapping | null>;
  findByOrganization(organizationId: string): Promise<ClientWorkflowMapping[]>;
  findByCategory(category: string, clientId?: string): Promise<ClientWorkflowMapping[]>;
  findByDepartment(department: string, clientId?: string): Promise<ClientWorkflowMapping[]>;
  
  // Analytics queries
  countByStatus(status: string): Promise<number>;
  getTotalSavings(clientId?: string, organizationId?: string): Promise<number>;
  getDeploymentStats(timeframe?: 'day' | 'week' | 'month'): Promise<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageSetupTime: number;
  }>;
}

export interface ClientWorkflowConfigurationRepository {
  create(config: Omit<ClientWorkflowConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientWorkflowConfiguration>;
  findById(id: string): Promise<ClientWorkflowConfiguration | null>;
  findByMappingId(mappingId: string): Promise<ClientWorkflowConfiguration | null>;
  update(id: string, updates: Partial<ClientWorkflowConfiguration>): Promise<ClientWorkflowConfiguration>;
  delete(id: string): Promise<void>;
  
  // Status-based queries
  findByStatus(status: ClientWorkflowConfiguration['status']): Promise<ClientWorkflowConfiguration[]>;
  findScheduledActivations(beforeDate?: Date): Promise<ClientWorkflowConfiguration[]>;
  findErroredConfigurations(): Promise<ClientWorkflowConfiguration[]>;
  
  // Progress tracking
  updateProgress(id: string, progress: number): Promise<void>;
  updateStatus(id: string, status: ClientWorkflowConfiguration['status']): Promise<void>;
  recordError(id: string, error: { type: string; message: string; stackTrace?: string }): Promise<void>;
}

export interface WorkflowTemplateRepository {
  // Basic CRUD
  findAll(): Promise<WorkflowTemplate[]>;
  findById(id: string): Promise<WorkflowTemplate | null>;
  findByCategory(category: string): Promise<WorkflowTemplate[]>;
  findActive(): Promise<WorkflowTemplate[]>;
  
  // Search and filtering
  search(query: string): Promise<WorkflowTemplate[]>;
  findByTags(tags: string[]): Promise<WorkflowTemplate[]>;
  findByPriceRange(minPrice: number, maxPrice: number): Promise<WorkflowTemplate[]>;
  findBySupportLevel(supportLevel: WorkflowTemplate['supportLevel']): Promise<WorkflowTemplate[]>;
  
  // Business queries
  getPopular(limit?: number): Promise<WorkflowTemplate[]>;
  getRecommended(clientId: string): Promise<WorkflowTemplate[]>;
  findByBusinessNeeds(industry: string, businessSize: string): Promise<WorkflowTemplate[]>;
}

// Filter and query types
export interface WorkflowMappingFilter {
  clientId?: string;
  organizationId?: string;
  category?: string;
  department?: string;
  isActive?: boolean;
  templateId?: string;
  deployedAfter?: Date;
  deployedBefore?: Date;
}

export interface WorkflowMappingQuery {
  filter: WorkflowMappingFilter;
  sorting?: {
    field: keyof ClientWorkflowMapping;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
  include?: ('configuration' | 'template' | 'metrics')[];
}

// Aggregated data types
export interface ClientWorkflowSummary {
  clientId: string;
  organizationId: string;
  totalWorkflows: number;
  activeWorkflows: number;
  totalMonthlySavings: number;
  averageROI: number;
  workflowsByCategory: Record<string, number>;
  workflowsByDepartment: Record<string, number>;
  lastDeployment?: Date;
  healthScore: number; // 0-100 based on workflow performance
}

export interface WorkflowDeploymentMetrics {
  templateId: string;
  templateName: string;
  totalDeployments: number;
  successfulDeployments: number;
  averageSetupTime: number; // in minutes
  averageTimeToActive: number; // in hours
  customerSatisfaction: number; // 0-100
  mostCommonIssues: string[];
  successRate: number; // percentage
}

// Export constants
export const WORKFLOW_CATEGORIES = {
  SALES: 'sales',
  MARKETING: 'marketing',
  CUSTOMER_SERVICE: 'customer-service',
  FINANCE: 'finance',
  HR: 'hr',
  OPERATIONS: 'operations',
  IT: 'it',
  COMPLIANCE: 'compliance',
  PRODUCTIVITY: 'productivity',
  COMMUNICATION: 'communication',
  DATA: 'data'
} as const;

export const WORKFLOW_DEPARTMENTS = {
  SALES: 'sales',
  MARKETING: 'marketing',
  CUSTOMER_SUCCESS: 'customer-success',
  FINANCE: 'finance',
  ACCOUNTING: 'accounting',
  HR: 'hr',
  OPERATIONS: 'operations',
  IT: 'it',
  LEGAL: 'legal',
  EXECUTIVE: 'executive',
  GENERAL: 'general'
} as const;

export const CONFIGURATION_STATUS = {
  TEMPLATE: 'template',
  CONFIGURING: 'configuring',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error'
} as const;