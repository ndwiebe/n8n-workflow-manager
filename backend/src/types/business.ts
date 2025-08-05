export interface BusinessMetrics {
  workflowId: string;
  workflowName: string;
  businessCategory: 'sales' | 'marketing' | 'support' | 'hr' | 'finance' | 'operations' | 'inventory' | 'custom';
  
  // ROI Metrics
  roi: {
    timeToValue: number; // days until first ROI
    monthlySavings: number; // USD per month
    implementationCost: number; // one-time setup cost
    monthlyOperatingCost: number; // recurring costs
    roiPercentage: number; // calculated ROI percentage
    paybackPeriod: number; // months to break even
  };
  
  // Time Savings
  timeSavings: {
    manualTimePerTask: number; // minutes
    automatedTimePerTask: number; // minutes
    taskFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    tasksPerPeriod: number;
    totalMonthlySavings: number; // hours saved per month
    hourlyRate: number; // USD per hour
  };
  
  // Performance Metrics
  performance: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number; // milliseconds
    uptime: number; // percentage
    lastExecution?: string; // ISO date
  };
  
  // Cost Analysis
  costs: {
    monthlyN8nCost: number; // n8n subscription cost
    monthlyIntegrationCosts: number; // third-party API costs
    monthlyMaintenanceCost: number; // support/maintenance
    totalMonthlyCost: number;
  };
  
  // Business Impact
  impact: {
    employeesAffected: number;
    departmentsAffected: string[];
    processesAutomated: number;
    errorReduction: number; // percentage
    customerSatisfactionImprovement?: number; // percentage
    revenueImpact?: number; // USD per month
  };

  // Tracking
  createdAt: string;
  updatedAt: string;
  userId?: string;
  clientId?: string;
}

export interface SMBProfile {
  id: string;
  businessName: string;
  industry: string;
  employeeCount: number;
  annualRevenue?: number;
  mainChallenges: string[];
  currentTools: string[];
  automationGoals: string[];
  techSavviness: 'low' | 'medium' | 'high';
  budget: {
    monthly: number;
    oneTime: number;
  };
  priority: 'cost_savings' | 'time_savings' | 'growth' | 'compliance' | 'efficiency';
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowROICalculation {
  workflowId: string;
  
  // Input Parameters
  inputs: {
    manualTimePerTask: number; // minutes
    taskFrequency: 'daily' | 'weekly' | 'monthly';
    tasksPerPeriod: number;
    employeeHourlyRate: number;
    implementationTimeHours: number;
    implementationHourlyRate: number;
    
    // Operating Costs
    monthlyN8nCost: number;
    monthlyThirdPartyCosts: number;
    monthlyMaintenanceCost: number;
  };
  
  // Calculated Results
  results: {
    // Time Savings
    hoursPerTask: number;
    tasksPerMonth: number;
    hoursPerMonth: number;
    monthlySavings: number;
    
    // Costs
    implementationCost: number;
    monthlyOperatingCost: number;
    
    // ROI Metrics
    monthlyNetSavings: number;
    paybackPeriod: number; // months
    annualROI: number; // percentage
    threeYearROI: number; // total value over 3 years
    
    // Time to Value
    timeToValue: number; // days
    breakEvenMonth: number;
  };
  
  calculatedAt: string;
}

export interface BusinessDashboardData {
  summary: {
    totalWorkflows: number;
    activeWorkflows: number;
    totalMonthlySavings: number;
    totalMonthlyROI: number;
    averagePaybackPeriod: number;
    totalHoursSavedPerMonth: number;
  };
  
  workflows: Array<{
    id: string;
    name: string;
    category: BusinessMetrics['businessCategory'];
    status: 'active' | 'inactive' | 'error';
    monthlySavings: number;
    roiPercentage: number;
    hoursPerMonth: number;
    uptime: number;
  }>;
  
  trends: {
    savingsOverTime: Array<{
      month: string;
      totalSavings: number;
      timesSaved: number;
    }>;
    
    roiByCategory: Array<{
      category: BusinessMetrics['businessCategory'];
      workflows: number;
      totalROI: number;
      avgROI: number;
    }>;
  };
  
  recommendations: Array<{
    type: 'optimization' | 'new_workflow' | 'cost_reduction';
    title: string;
    description: string;
    potentialSavings: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface BusinessWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: BusinessMetrics['businessCategory'];
  
  // SMB Focus
  smbFocused: boolean;
  industryFit: string[];
  companySizeRange: {
    min: number;
    max: number;
  };
  
  // ROI Projections
  projectedROI: {
    timeToValue: number; // days
    monthlySavings: number; // USD
    implementationTime: number; // hours
    complexity: 'low' | 'medium' | 'high';
  };
  
  // Business Requirements
  requirements: {
    employeesAffected: number;
    technicalSkillRequired: 'none' | 'basic' | 'intermediate' | 'advanced';
    integrations: string[];
    estimatedSetupCost: number;
    monthlyOperatingCost: number;
  };
  
  // Use Cases
  useCases: Array<{
    title: string;
    description: string;
    industry: string;
    savingsExample: number;
  }>;
  
  // Template Data
  workflowTemplate: any; // n8n workflow JSON
  configurationSchema: any; // JSON schema for configuration
  
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMetricsAggregation {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  
  metrics: {
    totalSavings: number;
    totalHoursSaved: number;
    totalExecutions: number;
    successRate: number;
    averageROI: number;
    totalWorkflows: number;
    activeWorkflows: number;
  };
  
  breakdown: {
    byCategory: Record<BusinessMetrics['businessCategory'], {
      workflows: number;
      savings: number;
      hoursSaved: number;
      executions: number;
    }>;
    
    byWorkflow: Array<{
      workflowId: string;
      name: string;
      savings: number;
      hoursSaved: number;
      executions: number;
      successRate: number;
    }>;
  };
}

export interface BusinessAlert {
  id: string;
  type: 'workflow_failure' | 'cost_spike' | 'roi_drop' | 'opportunity' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  workflowId?: string;
  
  data: {
    currentValue?: number;
    expectedValue?: number;
    threshold?: number;
    impact?: 'cost' | 'time' | 'revenue' | 'quality';
  };
  
  actions: Array<{
    type: 'view' | 'fix' | 'optimize' | 'acknowledge';
    label: string;
    url?: string;
  }>;
  
  createdAt: string;
  resolvedAt?: string;
  userId?: string;
}

// SMB User Types
export interface SMBUser {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'employee' | 'admin';
  
  // Business Context
  businessRole: string; // "Sales Manager", "HR Director", etc.
  department: string;
  automationExperience: 'none' | 'basic' | 'intermediate' | 'expert';
  
  // SMB Profile
  smbProfile?: SMBProfile;
  
  // Preferences
  preferences: {
    dashboardView: 'executive' | 'operational' | 'technical';
    notifications: {
      email: boolean;
      sms: boolean;
      dashboard: boolean;
    };
    reportingFrequency: 'daily' | 'weekly' | 'monthly';
  };
  
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// Response Types for API
export interface BusinessMetricsResponse {
  success: boolean;
  data: {
    metrics: BusinessMetrics;
    recommendations?: Array<{
      type: string;
      title: string;
      description: string;
      impact: number;
    }>;
  };
  message?: string;
}

export interface BusinessDashboardResponse {
  success: boolean;
  data: BusinessDashboardData;
  message?: string;
}

export interface ROICalculationRequest {
  workflowId: string;
  manualTimePerTask: number; // minutes
  taskFrequency: 'daily' | 'weekly' | 'monthly';
  tasksPerPeriod: number;
  employeeHourlyRate: number;
  implementationTimeHours?: number;
  implementationHourlyRate?: number;
}

export interface ROICalculationResponse {
  success: boolean;
  data: {
    calculation: WorkflowROICalculation;
    insights: Array<{
      type: 'positive' | 'warning' | 'info';
      message: string;
      value?: number;
    }>;
  };
  message?: string;
}