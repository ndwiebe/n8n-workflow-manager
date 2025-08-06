/**
 * Business Metrics Data Models for Multi-Tenant SMB Analytics
 * 
 * This module provides comprehensive data models for tracking business metrics,
 * ROI calculations, and client configurations in a multi-tenant environment.
 */

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  maxWorkflows: number;
  features: OrganizationFeatures;
  encryptionKeyId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface OrganizationFeatures {
  advancedSecurity: boolean;
  businessMetrics: boolean;
  complianceReporting: boolean;
  auditLogging: boolean;
  ssoIntegration: boolean;
  customIntegrations: boolean;
  maxUsers: number;
  maxWorkflows: number;
  dataRetentionPeriod: number; // days
  apiRateLimit: number; // requests per minute
}

export interface ClientBusinessProfile {
  id: string;
  organizationId: string;
  businessType: string;
  industry: string;
  employeeCount: number;
  annualRevenue: number;
  businessGoals: string[];
  painPoints: string[];
  currentTools: Record<string, any>;
  maturityLevel: 'startup' | 'growth' | 'established' | 'enterprise';
  automationReadiness: number; // 1-10 scale
  techSavviness: number; // 1-10 scale
  budgetRange: {
    min: number;
    max: number;
    currency: string;
  };
  decisionMakers: string[];
  implementationTimeline: string;
  successMetrics: string[];
  complianceRequirements: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessMetric {
  id: string;
  organizationId: string;
  workflowId: string;
  userId: string;
  metricType: BusinessMetricType;
  metricValue: number;
  metricUnit: string;
  measurementPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  baselineValue?: number;
  targetValue?: number;
  actualValue?: number;
  trend: 'up' | 'down' | 'stable';
  confidenceLevel: number; // 0-100 percentage
  metadata: BusinessMetricMetadata;
  tags: string[];
  measuredAt: Date;
  createdAt: Date;
}

export type BusinessMetricType = 
  | 'roi' 
  | 'time_saved' 
  | 'cost_reduction' 
  | 'efficiency_gain'
  | 'error_reduction'
  | 'revenue_increase'
  | 'process_speed'
  | 'customer_satisfaction'
  | 'employee_productivity'
  | 'compliance_score';

export interface BusinessMetricMetadata {
  calculationMethod: string;
  dataSource: string;
  validationStatus: 'validated' | 'pending' | 'disputed';
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  businessContext: Record<string, any>;
  relatedMetrics: string[];
  seasonalityFactor?: number;
  externalFactors: string[];
}

export interface ROICalculation {
  id: string;
  organizationId: string;
  workflowId: string;
  userId: string;
  calculationType: 'simple' | 'detailed' | 'comparative';
  inputs: ROIInputs;
  results: ROIResults;
  assumptions: ROIAssumptions;
  sensitivityAnalysis?: SensitivityAnalysis;
  benchmarkComparison?: BenchmarkComparison;
  riskAssessment: RiskAssessment;
  validationData?: ValidationData;
  status: 'draft' | 'validated' | 'published' | 'archived';
  calculatedAt: Date;
  validatedAt?: Date;
  validatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ROIInputs {
  // Time-based inputs
  manualTimePerTask: number; // minutes
  taskFrequency: 'daily' | 'weekly' | 'monthly';
  tasksPerPeriod: number;
  automatedTimePerTask: number; // minutes
  
  // Cost inputs
  employeeHourlyRate: number;
  implementationHours: number;
  implementationRate: number;
  ongoingMaintenanceHours: number;
  softwareCosts: SoftwareCosts;
  trainingCosts: TrainingCosts;
  
  // Quality and risk inputs
  errorRate: {
    manual: number; // percentage
    automated: number; // percentage
  };
  reworkCost: number; // cost per error
  complianceRisk: number; // annual cost of non-compliance
  
  // Business context
  businessValue: {
    revenueImpact: number;
    customerSatisfactionImpact: number;
    competitiveAdvantage: number;
  };
  scalabilityFactor: number; // expected growth multiplier
}

export interface SoftwareCosts {
  n8nSubscription: number; // monthly
  thirdPartyIntegrations: number; // monthly
  infrastructureCosts: number; // monthly
  securityTools: number; // monthly
  monitoringTools: number; // monthly
}

export interface TrainingCosts {
  initialTraining: number; // one-time
  ongoingTraining: number; // monthly
  certificationCosts: number; // annual
  knowledgeTransfer: number; // one-time
}

export interface ROIResults {
  // Financial metrics
  monthlySavings: number;
  annualSavings: number;
  implementationCost: number;
  monthlyOperatingCost: number;
  netPresentValue: number;
  internalRateOfReturn: number; // percentage
  
  // Time metrics
  paybackPeriod: number; // months
  timeToValue: number; // days
  breakEvenMonth: number;
  
  // ROI metrics
  simpleROI: number; // percentage
  annualROI: number; // percentage
  threeYearROI: number;
  fiveYearROI: number;
  
  // Efficiency metrics
  hoursPerMonth: number;
  tasksPerMonth: number;
  errorReduction: number; // percentage
  productivityIncrease: number; // percentage
  
  // Quality metrics
  accuracyImprovement: number; // percentage
  consistencyScore: number; // 0-100
  complianceImprovement: number; // percentage
  
  // Strategic metrics
  scalabilityScore: number; // 0-100
  riskReduction: number; // percentage
  competitiveAdvantage: number; // 0-100
}

export interface ROIAssumptions {
  inflationRate: number; // annual percentage
  discountRate: number; // for NPV calculation
  growthRate: number; // business growth assumption
  technologyLifespan: number; // years
  employeeTurnoverRate: number; // annual percentage
  errorCostEscalation: number; // annual increase in error costs
  complianceRiskProbability: number; // percentage
  marketConditions: string[];
  businessStability: 'stable' | 'growing' | 'declining' | 'volatile';
}

export interface SensitivityAnalysis {
  variables: SensitivityVariable[];
  scenarios: {
    optimistic: ROIResults;
    pessimistic: ROIResults;
    mostLikely: ROIResults;
  };
  riskFactors: RiskFactor[];
}

export interface SensitivityVariable {
  name: string;
  baseValue: number;
  range: {
    min: number;
    max: number;
  };
  impact: 'high' | 'medium' | 'low';
  impactOnROI: number; // percentage change in ROI per unit change
}

export interface RiskFactor {
  factor: string;
  probability: number; // 0-1
  impact: number; // financial impact
  mitigation: string;
  residualRisk: number; // after mitigation
}

export interface BenchmarkComparison {
  industryAverages: {
    roiPercentage: number;
    paybackPeriod: number;
    adoptionRate: number;
  };
  competitorData?: {
    averageROI: number;
    implementationTime: number;
  };
  bestPractices: string[];
  improvementOpportunities: string[];
}

export interface RiskAssessment {
  overallRiskScore: number; // 0-100
  riskCategories: {
    technical: number;
    financial: number;
    operational: number;
    strategic: number;
  };
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  contingencyPlans: string[];
}

export interface ValidationData {
  actualResults: Partial<ROIResults>;
  validationPeriod: {
    start: Date;
    end: Date;
  };
  variance: {
    [key: string]: {
      predicted: number;
      actual: number;
      variance: number; // percentage
    };
  };
  lessonsLearned: string[];
  adjustmentRecommendations: string[];
}

export interface WorkflowBusinessImpact {
  workflowId: string;
  organizationId: string;
  impactCategories: {
    financial: FinancialImpact;
    operational: OperationalImpact;
    strategic: StrategicImpact;
    compliance: ComplianceImpact;
    customer: CustomerImpact;
  };
  stakeholderAnalysis: StakeholderAnalysis;
  riskProfile: WorkflowRiskProfile;
  measuredAt: Date;
}

export interface FinancialImpact {
  costSavings: number;
  revenueImpact: number;
  profitabilityIncrease: number;
  cashFlowImprovement: number;
  budgetEfficiency: number; // percentage
}

export interface OperationalImpact {
  processEfficiency: number; // percentage improvement
  resourceUtilization: number; // percentage
  cycleTimeReduction: number; // percentage
  throughputIncrease: number; // percentage
  qualityImprovement: number; // percentage
}

export interface StrategicImpact {
  competitiveAdvantage: number; // 0-100 score
  innovationCapability: number; // 0-100 score
  scalabilityPotential: number; // 0-100 score
  marketResponsiveness: number; // 0-100 score
  futureReadiness: number; // 0-100 score
}

export interface ComplianceImpact {
  complianceScore: number; // 0-100
  auditReadiness: number; // 0-100
  regulatoryRiskReduction: number; // percentage
  dataGovernanceImprovement: number; // percentage
  reportingAccuracy: number; // percentage
}

export interface CustomerImpact {
  customerSatisfactionScore: number; // 0-100
  serviceQualityImprovement: number; // percentage
  responseTimeImprovement: number; // percentage
  customerRetention: number; // percentage
  netPromoterScore: number; // -100 to 100
}

export interface StakeholderAnalysis {
  primaryBeneficiaries: string[];
  impactedDepartments: string[];
  changeManagementRequirements: string[];
  trainingNeeds: string[];
  communicationPlan: string[];
}

export interface WorkflowRiskProfile {
  technicalRisks: string[];
  businessRisks: string[];
  complianceRisks: string[];
  operationalRisks: string[];
  mitigationStrategies: Record<string, string[]>;
  riskScore: number; // 0-100
}

export interface BusinessDashboard {
  organizationId: string;
  summary: BusinessSummary;
  workflowMetrics: WorkflowMetric[];
  trends: BusinessTrend[];
  insights: BusinessInsight[];
  recommendations: BusinessRecommendation[];
  alerts: BusinessAlert[];
  complianceStatus: ComplianceStatus;
  generatedAt: Date;
}

export interface BusinessSummary {
  totalWorkflows: number;
  activeWorkflows: number;
  totalMonthlySavings: number;
  totalTimesSaved: number; // hours per month
  averageROI: number; // percentage
  averagePaybackPeriod: number; // months
  totalImplementationCost: number;
  totalMonthlyOperatingCost: number;
  overallEfficiencyGain: number; // percentage
  riskScore: number; // 0-100
}

export interface WorkflowMetric {
  workflowId: string;
  workflowName: string;
  category: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  businessMetrics: {
    monthlySavings: number;
    hoursPerMonth: number;
    roiPercentage: number;
    paybackPeriod: number;
    riskScore: number;
  };
  performanceMetrics: {
    uptime: number; // percentage
    executionCount: number;
    successRate: number; // percentage
    averageExecutionTime: number; // seconds
  };
  lastUpdated: Date;
}

export interface BusinessTrend {
  metricType: BusinessMetricType;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dataPoints: {
    date: Date;
    value: number;
    target?: number;
  }[];
  trendDirection: 'up' | 'down' | 'stable';
  changeRate: number; // percentage change
  forecast?: {
    nextPeriod: number;
    confidence: number; // 0-100
  };
}

export interface BusinessInsight {
  id: string;
  type: 'optimization' | 'risk' | 'opportunity' | 'trend';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  recommendedActions: string[];
  potentialValue: number;
  timeToImplement: string;
  relatedWorkflows: string[];
  dataSource: string[];
  validUntil?: Date;
}

export interface BusinessRecommendation {
  id: string;
  category: 'cost_optimization' | 'efficiency' | 'risk_mitigation' | 'growth' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expectedBenefit: {
    financial: number;
    timesSaved: number;
    riskReduction: number;
  };
  implementationEffort: 'low' | 'medium' | 'high';
  timeline: string;
  prerequisites: string[];
  successMetrics: string[];
  relatedInsights: string[];
}

export interface BusinessAlert {
  id: string;
  type: 'workflow_failure' | 'roi_drop' | 'security_risk' | 'compliance_issue' | 'opportunity';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  workflowId?: string;
  data: Record<string, any>;
  threshold?: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    currentValue: number;
  };
  actions: AlertAction[];
  acknowledged: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface AlertAction {
  type: 'view' | 'fix' | 'optimize' | 'investigate' | 'dismiss';
  label: string;
  url?: string;
  params?: Record<string, any>;
}

export interface ComplianceStatus {
  overallScore: number; // 0-100
  requirements: {
    [complianceType: string]: {
      status: 'compliant' | 'non_compliant' | 'under_review' | 'not_applicable';
      score: number;
      lastAssessment: Date;
      nextAssessment: Date;
      findings: string[];
      recommendations: string[];
    };
  };
  riskAreas: string[];
  improvementPlan: string[];
}

// Utility types for calculations and aggregations
export interface MetricAggregation {
  sum: number;
  average: number;
  min: number;
  max: number;
  count: number;
  median: number;
  standardDeviation: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface BusinessMetricsFilter {
  organizationId?: string;
  workflowIds?: string[];
  metricTypes?: BusinessMetricType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  impactLevel?: string[];
  validationStatus?: string[];
}

export interface BusinessMetricsQuery {
  filter: BusinessMetricsFilter;
  aggregation?: {
    groupBy: string[];
    functions: ('sum' | 'avg' | 'min' | 'max' | 'count')[];
  };
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  pagination?: {
    page: number;
    limit: number;
  };
}

// Export type utilities
export type BusinessMetricValue = Pick<BusinessMetric, 'metricValue' | 'metricUnit' | 'measuredAt'>;
export type ROISnapshot = Pick<ROICalculation, 'results' | 'calculatedAt'>;
export type WorkflowSummary = Pick<WorkflowMetric, 'workflowId' | 'workflowName' | 'category' | 'status' | 'businessMetrics'>;

// Constants for business metrics
export const METRIC_UNITS = {
  CURRENCY: ['USD', 'EUR', 'GBP', 'CAD'],
  TIME: ['minutes', 'hours', 'days', 'weeks', 'months'],
  PERCENTAGE: ['percent'],
  COUNT: ['count', 'items', 'transactions', 'events'],
  RATE: ['per_hour', 'per_day', 'per_week', 'per_month']
} as const;

export const BUSINESS_CATEGORIES = {
  SALES: 'sales',
  MARKETING: 'marketing',
  OPERATIONS: 'operations',
  FINANCE: 'finance',
  HR: 'hr',
  IT: 'it',
  CUSTOMER_SERVICE: 'customer_service',
  COMPLIANCE: 'compliance',
  INVENTORY: 'inventory',
  PROCUREMENT: 'procurement'
} as const;

export const INDUSTRY_TYPES = {
  TECHNOLOGY: 'technology',
  HEALTHCARE: 'healthcare',
  FINANCE: 'finance',
  RETAIL: 'retail',
  MANUFACTURING: 'manufacturing',
  EDUCATION: 'education',
  REAL_ESTATE: 'real_estate',
  CONSULTING: 'consulting',
  MEDIA: 'media',
  NON_PROFIT: 'non_profit'
} as const;