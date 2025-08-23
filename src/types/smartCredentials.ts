/**
 * Smart Credential Assistant Types
 * Phase 1: Service Detection and Business-Friendly Credential Management
 */

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
  TESTING = 'testing',
  EXPIRED = 'expired'
}

export interface ServiceConnectionCard {
  serviceId: string;
  displayName: string;
  businessDescription: string;
  icon: string; // Material-UI icon name or URL
  category: ServiceCategory;
  status: ConnectionStatus;
  required: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  setupComplexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: string; // "2 minutes", "5 minutes", etc.
  businessValue: string; // Business-friendly explanation of value
  connectionDetails?: ServiceConnectionDetails;
  lastTested?: Date;
  connectedAt?: Date;
  metadata?: Record<string, any>;
}

export enum ServiceCategory {
  COMMUNICATION = 'communication',
  CRM = 'crm',
  EMAIL_MARKETING = 'email_marketing',
  E_COMMERCE = 'e_commerce',
  PAYMENTS = 'payments',
  ACCOUNTING = 'accounting',
  PROJECT_MANAGEMENT = 'project_management',
  FILE_STORAGE = 'file_storage',
  ANALYTICS = 'analytics',
  SOCIAL_MEDIA = 'social_media',
  HR = 'hr',
  SCHEDULING = 'scheduling',
  DATABASE = 'database',
  API = 'api',
  OTHER = 'other'
}

export interface ServiceConnectionDetails {
  connectionType: 'oauth' | 'api_key' | 'username_password' | 'webhook' | 'custom';
  authenticationStatus: 'pending' | 'authenticated' | 'expired' | 'error';
  connectionFields: ConnectionField[];
  testEndpoint?: string;
  webhookUrl?: string;
  scopes?: string[];
  expiresAt?: Date;
  lastError?: string;
}

export interface ConnectionField {
  fieldId: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'url' | 'select' | 'textarea' | 'file';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  validation?: ValidationRule[];
  options?: SelectOption[];
  sensitive: boolean; // If true, field will be encrypted
  businessDescription?: string; // Business-friendly explanation
}

export interface ValidationRule {
  type: 'required' | 'email' | 'url' | 'min_length' | 'max_length' | 'pattern';
  value?: any;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SmartCredentialConfig {
  workflowId: string;
  workflowName: string;
  detectedServices: ServiceConnectionCard[];
  setupProgress: SetupProgress;
  businessContext: BusinessContext;
  securitySettings: SecuritySettings;
}

export interface SetupProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  servicesConfigured: number;
  servicesTotal: number;
  estimatedTimeRemaining: string;
  blockers: ProgressBlocker[];
}

export interface ProgressBlocker {
  type: 'missing_credential' | 'connection_failed' | 'permission_needed' | 'subscription_required';
  serviceId: string;
  message: string;
  resolution: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface BusinessContext {
  industry: string;
  useCase: string;
  businessGoals: string[];
  complianceRequirements: string[];
  expectedROI: string;
  criticalServices: string[]; // Service IDs that are business-critical
}

export interface SecuritySettings {
  encryptionEnabled: boolean;
  keyRotationEnabled: boolean;
  auditLoggingEnabled: boolean;
  accessRestrictions: AccessRestriction[];
  dataRetentionPolicy: DataRetentionPolicy;
}

export interface AccessRestriction {
  type: 'ip_whitelist' | 'time_based' | 'role_based' | 'location_based';
  rules: string[];
  enabled: boolean;
}

export interface DataRetentionPolicy {
  credentialRetentionDays: number;
  logRetentionDays: number;
  autoCleanupEnabled: boolean;
  complianceMode: 'gdpr' | 'ccpa' | 'sox' | 'hipaa' | 'none';
}

// Service Detection Types
export interface ServiceDetectionResult {
  workflowId: string;
  detectedServices: DetectedService[];
  detectionConfidence: number; // 0-1 score
  detectionMetadata: DetectionMetadata;
}

export interface DetectedService {
  serviceId: string;
  serviceName: string;
  nodeType: string; // n8n node type that uses this service
  confidence: number; // 0-1 score for detection confidence
  required: boolean;
  usageContext: ServiceUsageContext;
  businessMapping: BusinessServiceMapping;
}

export interface ServiceUsageContext {
  actions: string[]; // What the service is used for in the workflow
  dataFlow: 'input' | 'output' | 'bidirectional';
  frequency: 'once' | 'periodic' | 'real_time' | 'batch';
  criticality: 'essential' | 'important' | 'optional';
}

export interface BusinessServiceMapping {
  displayName: string;
  businessDescription: string;
  category: ServiceCategory;
  icon: string;
  businessValue: string;
  setupComplexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: string;
}

export interface DetectionMetadata {
  detectedAt: Date;
  detectionMethod: 'node_analysis' | 'credential_analysis' | 'template_mapping' | 'manual';
  workflowAnalysis: WorkflowAnalysis;
  recommendations: ServiceRecommendation[];
}

export interface WorkflowAnalysis {
  totalNodes: number;
  serviceNodes: number;
  triggerNodes: number;
  actionNodes: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  estimatedSetupTime: number; // minutes
}

export interface ServiceRecommendation {
  type: 'alternative_service' | 'additional_service' | 'optimization' | 'security';
  serviceId?: string;
  title: string;
  description: string;
  businessReason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'minimal' | 'moderate' | 'significant';
}

// Event Types for Smart Credential System
export interface SmartCredentialEvent {
  type: SmartCredentialEventType;
  timestamp: Date;
  workflowId: string;
  serviceId?: string;
  data: Record<string, any>;
  userId: string;
}

export enum SmartCredentialEventType {
  SERVICE_DETECTED = 'service_detected',
  CONNECTION_STARTED = 'connection_started',
  CONNECTION_SUCCESS = 'connection_success',
  CONNECTION_FAILED = 'connection_failed',
  CREDENTIAL_TESTED = 'credential_tested',
  SETUP_COMPLETED = 'setup_completed',
  CONFIGURATION_CHANGED = 'configuration_changed',
  SECURITY_ALERT = 'security_alert',
  RECOMMENDATION_GENERATED = 'recommendation_generated'
}

// API Response Types
export interface SmartCredentialResponse<T> {
  success: boolean;
  data?: T;
  error?: SmartCredentialError;
  metadata?: ResponseMetadata;
}

export interface SmartCredentialError {
  code: string;
  message: string;
  details?: Record<string, any>;
  userMessage?: string; // Business-friendly error message
  resolution?: string; // Suggested resolution
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  processingTime: number; // milliseconds
  version: string;
  cacheHit?: boolean;
}

// Configuration Export/Import Types
export interface SmartCredentialExport {
  version: string;
  exportedAt: Date;
  workflowId: string;
  workflowName: string;
  services: ServiceConnectionCard[];
  businessContext: BusinessContext;
  securitySettings: SecuritySettings;
  metadata: Record<string, any>;
}

export interface SmartCredentialImport {
  data: SmartCredentialExport;
  options: ImportOptions;
}

export interface ImportOptions {
  mergeExisting: boolean;
  overwriteCredentials: boolean;
  validateConnections: boolean;
  preserveMetadata: boolean;
  skipSecuritySettings: boolean;
}

// Phase 2: OAuth Excellence System Types

export interface OAuthProvider {
  providerId: string;
  displayName: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  clientId: string;
  clientSecret?: string; // Only stored on backend
  scopes: OAuthScope[];
  redirectUri: string;
  responseType: 'code' | 'token';
  grantType: 'authorization_code' | 'implicit' | 'client_credentials';
  pkce: boolean; // Proof Key for Code Exchange
  metadata: {
    icon: string;
    category: ServiceCategory;
    businessDescription: string;
    setupComplexity: 'simple' | 'moderate' | 'complex';
    estimatedSetupTime: string;
    supportedFeatures: string[];
  };
}

export interface OAuthScope {
  scope: string;
  displayName: string;
  description: string;
  businessPurpose: string;
  required: boolean;
  sensitive: boolean;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer' | 'Basic';
  expiresIn?: number;
  expiresAt?: Date;
  scope: string[];
  providerId: string;
  userId?: string;
  metadata: {
    grantedAt: Date;
    lastRefreshed?: Date;
    refreshCount: number;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface OAuthFlowState {
  state: string;
  providerId: string;
  workflowId: string;
  serviceId: string;
  redirectUri: string;
  scopes: string[];
  codeVerifier?: string; // For PKCE
  createdAt: Date;
  expiresAt: Date;
  userId: string;
  metadata: Record<string, any>;
}

export interface OAuthConnectionResult {
  success: boolean;
  token?: OAuthToken;
  error?: {
    code: string;
    message: string;
    userMessage: string;
    retryable: boolean;
  };
  providerInfo: {
    providerId: string;
    displayName: string;
    userInfo?: {
      id: string;
      email?: string;
      name?: string;
      avatar?: string;
    };
  };
  connectionDetails: {
    scopes: string[];
    permissions: string[];
    connectedAt: Date;
    expiresAt?: Date;
  };
}

export interface OAuthConnectionTest {
  providerId: string;
  testType: 'basic' | 'permissions' | 'business_context';
  tests: OAuthTest[];
}

export interface OAuthTest {
  testId: string;
  name: string;
  description: string;
  businessPurpose: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiredScopes: string[];
  expectedResult: 'success' | 'data_returned' | 'permission_granted';
  businessImpact: 'critical' | 'important' | 'optional';
}

export interface OAuthTestResult {
  testId: string;
  passed: boolean;
  result?: any;
  error?: string;
  businessMessage: string;
  recommendations?: string[];
  executionTime: number;
}

export interface OAuthProviderConfig {
  // Gmail/Google Workspace
  gmail: OAuthProvider;
  googleWorkspace: OAuthProvider;
  googleDrive: OAuthProvider;
  googleSheets: OAuthProvider;
  googleCalendar: OAuthProvider;
  
  // Microsoft/Office 365
  office365: OAuthProvider;
  microsoftTeams: OAuthProvider;
  onedrive: OAuthProvider;
  outlook: OAuthProvider;
  
  // Communication
  slack: OAuthProvider;
  discord: OAuthProvider;
  telegram: OAuthProvider;
  
  // Social Media
  facebook: OAuthProvider;
  twitter: OAuthProvider;
  linkedin: OAuthProvider;
  instagram: OAuthProvider;
  
  // E-commerce
  shopify: OAuthProvider;
  amazon: OAuthProvider;
  ebay: OAuthProvider;
  
  // CRM
  salesforce: OAuthProvider;
  hubspot: OAuthProvider;
  pipedrive: OAuthProvider;
  
  // Project Management
  asana: OAuthProvider;
  trello: OAuthProvider;
  notion: OAuthProvider;
  
  // Other Services
  github: OAuthProvider;
  dropbox: OAuthProvider;
  zoom: OAuthProvider;
}

// Extended Service Connection Card for OAuth
export interface OAuthServiceConnectionCard extends ServiceConnectionCard {
  oauthConfig?: {
    providerId: keyof OAuthProviderConfig;
    requiredScopes: string[];
    optionalScopes: string[];
    connectionTests: OAuthConnectionTest[];
    businessPermissions: BusinessPermission[];
  };
  oauthStatus?: {
    isAuthorized: boolean;
    authorizedScopes: string[];
    missingScopes: string[];
    tokenExpiresAt?: Date;
    lastTokenRefresh?: Date;
    userInfo?: {
      id: string;
      email?: string;
      name?: string;
      avatar?: string;
    };
  };
}

export interface BusinessPermission {
  permission: string;
  displayName: string;
  description: string;
  businessPurpose: string;
  required: boolean;
  granted: boolean;
  canRequest: boolean;
}

// OAuth Events
export enum OAuthEventType {
  AUTHORIZATION_STARTED = 'oauth_authorization_started',
  AUTHORIZATION_SUCCESS = 'oauth_authorization_success',
  AUTHORIZATION_FAILED = 'oauth_authorization_failed',
  TOKEN_REFRESHED = 'oauth_token_refreshed',
  TOKEN_EXPIRED = 'oauth_token_expired',
  PERMISSIONS_CHANGED = 'oauth_permissions_changed',
  CONNECTION_TESTED = 'oauth_connection_tested',
  PROVIDER_CONFIGURED = 'oauth_provider_configured'
}

export interface OAuthEvent extends Omit<SmartCredentialEvent, 'type'> {
  type: OAuthEventType;
  oauthData: {
    providerId: string;
    scopes?: string[];
    tokenInfo?: Partial<OAuthToken>;
    testResults?: OAuthTestResult[];
    error?: string;
  };
}

// OAuth Flow Management
export interface OAuthFlowConfig {
  popupWindow: {
    width: number;
    height: number;
    centerOnScreen: boolean;
    features: string[];
  };
  timeout: {
    authorizationTimeout: number; // milliseconds
    tokenExchangeTimeout: number;
    testTimeout: number;
  };
  security: {
    validateState: boolean;
    validateNonce: boolean;
    requirePKCE: boolean;
    allowedOrigins: string[];
  };
  ui: {
    showProgress: boolean;
    autoCloseOnSuccess: boolean;
    redirectOnError: boolean;
    customMessages: Record<string, string>;
  };
}

// Phase 3: Guided Setup Assistant Types

export interface SetupStep {
  stepId: string;
  title: string;
  description: string;
  businessReason: string;
  estimatedTime: string;
  type: 'navigation' | 'form' | 'screenshot' | 'verification' | 'oauth' | 'test';
  required: boolean;
  order: number;
  dependencies: string[]; // Step IDs that must be completed first
  instruction: SetupInstruction;
  validation?: StepValidation;
  automation?: StepAutomation;
  helpResources: HelpResource[];
}

export interface SetupInstruction {
  type: 'text' | 'screenshot' | 'video' | 'interactive';
  content: string;
  screenshots?: ScreenshotGuide[];
  interactiveElements?: InteractiveElement[];
  codeSnippets?: CodeSnippet[];
  businessContext: string;
  commonMistakes: string[];
  troubleshooting: TroubleshootingTip[];
}

export interface ScreenshotGuide {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  annotations: ScreenshotAnnotation[];
  alternativeText: string; // For accessibility
  mobileImageUrl?: string; // Mobile-specific screenshot
  order: number;
}

export interface ScreenshotAnnotation {
  id: string;
  type: 'highlight' | 'arrow' | 'text' | 'click' | 'type';
  x: number; // Percentage position
  y: number; // Percentage position
  width?: number;
  height?: number;
  text?: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface InteractiveElement {
  type: 'button' | 'input' | 'link' | 'test' | 'copy';
  label: string;
  action: string;
  data?: Record<string, any>;
  businessReason: string;
  successMessage: string;
  errorMessage: string;
}

export interface CodeSnippet {
  language: string;
  code: string;
  title: string;
  description: string;
  copyable: boolean;
}

export interface TroubleshootingTip {
  problem: string;
  solution: string;
  businessImpact: string;
  prevention: string;
  escalationTrigger: boolean;
}

export interface StepValidation {
  type: 'api_test' | 'form_validation' | 'screenshot_match' | 'user_confirmation';
  validationConfig: Record<string, any>;
  errorHandling: ValidationErrorHandling;
  autoRetry: boolean;
  maxRetries: number;
}

export interface ValidationErrorHandling {
  showUserFriendlyMessage: boolean;
  suggestFixes: boolean;
  allowSkip: boolean;
  escalateOnFailure: boolean;
  customErrorMessages: Record<string, string>;
}

export interface StepAutomation {
  canAutomate: boolean;
  automationType: 'form_fill' | 'api_call' | 'browser_automation' | 'webhook_test';
  automationConfig: Record<string, any>;
  fallbackToManual: boolean;
  confidenceThreshold: number; // 0-1, automation confidence
}

export interface HelpResource {
  type: 'documentation' | 'video' | 'support_chat' | 'consultant' | 'community';
  title: string;
  description: string;
  url?: string;
  available: boolean;
  estimated_response_time?: string;
  cost?: 'free' | 'premium' | 'enterprise';
}

export interface GuidedSetupSession {
  sessionId: string;
  workflowId: string;
  serviceId: string;
  userId: string;
  startedAt: Date;
  currentStepId: string;
  completedSteps: string[];
  stepProgress: Record<string, StepProgress>;
  sessionData: Record<string, any>; // User inputs and progress data
  escalated: boolean;
  escalationReason?: string;
  consultantAssigned?: string;
  estimatedCompletion: Date;
  actualCompletion?: Date;
  businessImpact: SessionBusinessImpact;
}

export interface StepProgress {
  stepId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  lastError?: string;
  userData: Record<string, any>;
  validationResults?: ValidationResult[];
  timeSpent: number; // milliseconds
}

export interface ValidationResult {
  validationType: string;
  passed: boolean;
  details?: string;
  timestamp: Date;
  businessMessage: string;
  technicalDetails?: Record<string, any>;
}

export interface SessionBusinessImpact {
  expectedTimeSaving: string;
  expectedCostSaving: string;
  businessGoalsAchieved: string[];
  automationValue: string;
  riskMitigation: string[];
}

// Smart Error Handling Types

export interface SmartErrorAnalysis {
  errorId: string;
  errorType: 'authentication' | 'permission' | 'network' | 'configuration' | 'service_down' | 'rate_limit' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userFriendlyMessage: string;
  technicalDetails: string;
  businessImpact: string;
  suggestedFixes: ErrorSuggestion[];
  autoRecoveryOptions: AutoRecoveryOption[];
  escalationRequired: boolean;
  contextualHelp: ContextualHelp;
  timestamp: Date;
  serviceId: string;
  workflowId: string;
  userId: string;
}

export interface ErrorSuggestion {
  suggestionId: string;
  title: string;
  description: string;
  businessReason: string;
  difficulty: 'easy' | 'moderate' | 'difficult';
  estimatedTime: string;
  successProbability: number; // 0-1
  steps: ErrorFixStep[];
  preventsFutureErrors: boolean;
}

export interface ErrorFixStep {
  stepId: string;
  instruction: string;
  type: 'user_action' | 'system_action' | 'verification';
  automated: boolean;
  verification?: string;
  screenshots?: string[];
}

export interface AutoRecoveryOption {
  optionId: string;
  type: 'retry' | 'alternative_method' | 'fallback_service' | 'config_adjustment';
  description: string;
  businessImpact: string;
  automated: boolean;
  confidenceLevel: number; // 0-1
  estimatedSuccessRate: number; // 0-1
  executionConfig: Record<string, any>;
}

export interface ContextualHelp {
  quickTips: string[];
  relatedIssues: RelatedIssue[];
  expertConsultation: ExpertConsultationInfo;
  communityResources: CommunityResource[];
  documentationLinks: DocumentationLink[];
}

export interface RelatedIssue {
  issueId: string;
  title: string;
  description: string;
  resolution: string;
  similarity: number; // 0-1
  helpfulVotes: number;
}

export interface ExpertConsultationInfo {
  available: boolean;
  estimatedWaitTime: string;
  cost: string;
  expertise: string[];
  bookingUrl?: string;
}

export interface CommunityResource {
  type: 'forum' | 'discord' | 'slack' | 'documentation';
  title: string;
  url: string;
  activeUsers: number;
  averageResponseTime: string;
}

export interface DocumentationLink {
  title: string;
  url: string;
  relevanceScore: number; // 0-1
  lastUpdated: Date;
  officialSource: boolean;
}

// Auto-Healing System Types

export interface ConnectionHealth {
  serviceId: string;
  workflowId: string;
  status: 'healthy' | 'degraded' | 'failing' | 'down';
  lastHealthCheck: Date;
  responseTime: number; // milliseconds
  errorRate: number; // 0-1
  availability: number; // 0-1, last 24h
  healthMetrics: HealthMetric[];
  autoHealingAttempts: AutoHealingAttempt[];
  monitoringConfig: MonitoringConfig;
}

export interface HealthMetric {
  metricType: 'response_time' | 'error_rate' | 'throughput' | 'availability' | 'rate_limit';
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'degrading';
  timestamp: Date;
}

export interface AutoHealingAttempt {
  attemptId: string;
  triggeredAt: Date;
  completedAt?: Date;
  healingAction: HealingAction;
  result: 'success' | 'partial' | 'failed' | 'in_progress';
  businessImpact: string;
  detailsLog: string[];
  nextAttemptAt?: Date;
}

export interface HealingAction {
  actionType: 'retry_connection' | 'refresh_token' | 'reset_credentials' | 'switch_endpoint' | 'rate_limit_backoff' | 'restart_service';
  description: string;
  automated: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPossible: boolean;
  businessApprovalRequired: boolean;
  estimatedDowntime: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  checkInterval: number; // seconds
  alertThresholds: AlertThreshold[];
  autoHealingEnabled: boolean;
  escalationPolicy: EscalationPolicy;
  businessHours: BusinessHours;
}

export interface AlertThreshold {
  metric: string;
  warningLevel: number;
  criticalLevel: number;
  consecutiveFailures: number;
  alertingEnabled: boolean;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  maxAutoHealing: number;
  requiresBusinessApproval: string[]; // Action types requiring approval
  emergencyContact: ContactInfo;
}

export interface EscalationLevel {
  level: number;
  triggerAfter: number; // minutes
  actions: string[];
  contacts: ContactInfo[];
  automated: boolean;
}

export interface ContactInfo {
  type: 'email' | 'sms' | 'slack' | 'phone';
  contact: string;
  name: string;
  role: string;
  availability: BusinessHours;
}

export interface BusinessHours {
  timezone: string;
  schedule: DaySchedule[];
  holidays: Date[];
  emergencyOverride: boolean;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  available: boolean;
}

// Consultant Escalation System Types

export interface ConsultantEscalation {
  escalationId: string;
  workflowId: string;
  serviceId: string;
  userId: string;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'setup_assistance' | 'technical_issue' | 'integration_complexity' | 'business_consultation';
  description: string;
  businessImpact: string;
  detectedIssues: DetectedIssue[];
  setupSession?: GuidedSetupSession;
  assignedConsultant?: ConsultantInfo;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';
  resolution?: EscalationResolution;
  followUpRequired: boolean;
  clientSatisfaction?: ClientFeedback;
}

export interface DetectedIssue {
  issueType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  automationFailed: boolean;
  userStuck: boolean;
  businessBlocker: boolean;
  timeSpentOnIssue: number; // minutes
}

export interface ConsultantInfo {
  consultantId: string;
  name: string;
  expertise: string[];
  languages: string[];
  timezone: string;
  availability: BusinessHours;
  rating: number; // 1-5
  specializations: ConsultantSpecialization[];
  contactMethods: ContactMethod[];
}

export interface ConsultantSpecialization {
  serviceType: string;
  expertiseLevel: 'basic' | 'intermediate' | 'expert' | 'specialist';
  certifications: string[];
  experienceYears: number;
  successRate: number; // 0-1
}

export interface ContactMethod {
  type: 'video_call' | 'screen_share' | 'chat' | 'phone' | 'email';
  available: boolean;
  responseTime: string;
  businessHoursOnly: boolean;
}

export interface EscalationResolution {
  resolvedAt: Date;
  resolutionType: 'guided_setup' | 'custom_solution' | 'alternative_approach' | 'business_consultation';
  timeToResolve: number; // minutes
  stepsPerformed: ResolutionStep[];
  businessOutcome: string;
  preventionMeasures: string[];
  followUpActions: string[];
  knowledgeBaseUpdated: boolean;
}

export interface ResolutionStep {
  stepId: string;
  description: string;
  performedBy: 'consultant' | 'user' | 'automated';
  timestamp: Date;
  result: 'success' | 'failed' | 'partial';
  notes?: string;
}

export interface ClientFeedback {
  rating: number; // 1-5
  comments: string;
  wouldRecommend: boolean;
  issueResolved: boolean;
  consultantRating: number; // 1-5
  improvementSuggestions: string[];
  followUpNeeded: boolean;
}

// Service-specific Setup Guide Types

export interface ServiceSetupGuide {
  serviceId: string;
  serviceName: string;
  version: string;
  lastUpdated: Date;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: Prerequisite[];
  setupSteps: SetupStep[];
  commonIssues: CommonIssue[];
  businessBenefits: BusinessBenefit[];
  integrationPoints: IntegrationPoint[];
  testingProcedure: TestingProcedure;
  maintenanceInfo: MaintenanceInfo;
}

export interface Prerequisite {
  type: 'account' | 'subscription' | 'permission' | 'technical' | 'business';
  title: string;
  description: string;
  checkable: boolean;
  checkEndpoint?: string;
  businessReason: string;
  alternativeOptions: string[];
}

export interface CommonIssue {
  issueId: string;
  title: string;
  description: string;
  frequency: 'rare' | 'occasional' | 'common' | 'frequent';
  businessImpact: string;
  resolution: IssueResolution;
  prevention: string[];
}

export interface IssueResolution {
  steps: string[];
  estimatedTime: string;
  difficulty: 'easy' | 'moderate' | 'difficult';
  requiresSupport: boolean;
  screenshots?: string[];
  businessImplications: string;
}

export interface BusinessBenefit {
  category: 'time_saving' | 'cost_reduction' | 'error_prevention' | 'scalability' | 'compliance';
  description: string;
  quantifiedBenefit: string;
  realizationTimeframe: string;
  measurementMethod: string;
}

export interface IntegrationPoint {
  integrationType: 'data_sync' | 'trigger' | 'action' | 'webhook' | 'real_time';
  description: string;
  technicalRequirements: string[];
  businessValue: string;
  testingRequired: boolean;
}

export interface TestingProcedure {
  testSteps: TestStep[];
  successCriteria: string[];
  failureScenarios: FailureScenario[];
  automatedTests: AutomatedTest[];
  businessValidation: BusinessValidation[];
}

export interface TestStep {
  stepId: string;
  description: string;
  expectedResult: string;
  businessImportance: string;
  automatable: boolean;
  validationMethod: string;
}

export interface FailureScenario {
  scenario: string;
  likelihood: 'low' | 'medium' | 'high';
  businessImpact: string;
  detectionMethod: string;
  recoveryProcedure: string[];
}

export interface AutomatedTest {
  testId: string;
  testType: 'connection' | 'permission' | 'data_flow' | 'error_handling';
  description: string;
  automationLevel: 'full' | 'partial' | 'manual';
  frequency: 'once' | 'periodic' | 'continuous';
}

export interface BusinessValidation {
  validationType: 'roi_calculation' | 'process_improvement' | 'error_reduction' | 'compliance_check';
  description: string;
  measurementPeriod: string;
  expectedOutcome: string;
  validationMethod: string;
}

export interface MaintenanceInfo {
  maintenanceSchedule: MaintenanceSchedule[];
  monitoringRequirements: MonitoringRequirement[];
  updateProcedure: UpdateProcedure;
  businessContinuity: BusinessContinuityPlan;
}

export interface MaintenanceSchedule {
  taskType: 'credential_refresh' | 'connection_test' | 'security_review' | 'performance_check';
  frequency: string;
  estimatedTime: string;
  businessImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  automatable: boolean;
}

export interface MonitoringRequirement {
  metric: string;
  threshold: number;
  alerting: boolean;
  businessRelevance: string;
  actionRequired: string;
}

export interface UpdateProcedure {
  updateTypes: UpdateType[];
  testingRequired: boolean;
  rollbackPossible: boolean;
  businessApprovalRequired: boolean;
  downtime: string;
}

export interface UpdateType {
  type: 'security_patch' | 'feature_update' | 'api_version' | 'credential_rotation';
  frequency: string;
  businessImpact: string;
  automatable: boolean;
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface BusinessContinuityPlan {
  backupOptions: BackupOption[];
  failoverProcedure: FailoverProcedure;
  recoveryTime: string;
  businessImpactAssessment: string;
  communicationPlan: CommunicationPlan;
}

export interface BackupOption {
  optionType: 'alternative_service' | 'manual_process' | 'offline_backup' | 'redundant_connection';
  description: string;
  activationTime: string;
  businessLimitations: string[];
  cost: 'none' | 'low' | 'medium' | 'high';
}

export interface FailoverProcedure {
  automated: boolean;
  steps: string[];
  estimatedTime: string;
  businessImpact: string;
  recoverySteps: string[];
}

export interface CommunicationPlan {
  stakeholders: Stakeholder[];
  communicationMethods: string[];
  updateFrequency: string;
  escalationCriteria: string[];
}

export interface Stakeholder {
  role: string;
  contactInfo: ContactInfo;
  notificationLevel: 'critical' | 'important' | 'informational';
  businessImpact: string;
}

// Phase 4: Security & Trust Features Types

export interface SecurityIndicators {
  trustScore: number; // 0-100 security trust score
  encryptionStatus: EncryptionIndicator;
  complianceStatus: ComplianceIndicator;
  permissionHealth: PermissionHealthIndicator;
  lastSecurityScan: Date;
  securityBadges: SecurityBadge[];
  recommendations: SecurityRecommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EncryptionIndicator {
  status: 'encrypted' | 'partially_encrypted' | 'not_encrypted';
  algorithm: string;
  keyStrength: 'weak' | 'good' | 'strong' | 'enterprise';
  keyLastRotated: Date;
  dataProtectionLevel: 'basic' | 'standard' | 'enhanced' | 'enterprise';
  businessDescription: string;
}

export interface ComplianceIndicator {
  overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant' | 'under_review';
  frameworks: ComplianceFramework[];
  lastAudit: Date;
  nextAudit: Date;
  criticalIssues: number;
  businessImpact: string;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  severity: 'critical' | 'high' | 'medium' | 'low';
  lastChecked: Date;
  remediation?: string;
}

export interface ComplianceFramework {
  name: 'GDPR' | 'SOC2' | 'HIPAA' | 'SOX' | 'ISO27001' | 'CCPA';
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  score: number; // 0-100
  lastAssessment: Date;
  requirements: ComplianceRequirement[];
  businessRelevance: string;
}

export interface PermissionHealthIndicator {
  status: 'healthy' | 'attention_needed' | 'critical' | 'misconfigured';
  excessivePermissions: number;
  missingPermissions: number;
  lastPermissionReview: Date;
  privilegeEscalationRisk: 'low' | 'medium' | 'high' | 'critical';
  businessImpact: string;
}

export interface SecurityBadge {
  badgeId: string;
  type: 'encryption' | 'compliance' | 'permissions' | 'monitoring' | 'backup' | 'access_control';
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'enterprise';
  name: string;
  description: string;
  earnedAt: Date;
  businessValue: string;
  criteria: BadgeCriteria[];
}

export interface BadgeCriteria {
  criterion: string;
  met: boolean;
  businessReason: string;
  improvement?: string;
}

export interface SecurityRecommendation {
  id: string;
  type: 'security_enhancement' | 'compliance_improvement' | 'permission_optimization' | 'encryption_upgrade';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  businessImpact: string;
  estimatedImplementationTime: string;
  riskMitigation: string;
  steps: RecommendationStep[];
  deferrable: boolean;
  cost: 'none' | 'low' | 'medium' | 'high';
}

export interface RecommendationStep {
  stepId: string;
  action: string;
  businessReason: string;
  automated: boolean;
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CredentialHealth {
  credentialId: string;
  serviceId: string;
  healthScore: number; // 0-100
  status: 'healthy' | 'warning' | 'critical' | 'expired' | 'compromised';
  lastHealthCheck: Date;
  expirationDate?: Date;
  daysUntilExpiration?: number;
  connectionQuality: ConnectionQuality;
  securityMetrics: SecurityMetric[];
  alerts: HealthAlert[];
  autoRenewal: AutoRenewalConfig;
}

export interface ConnectionQuality {
  responseTime: number; // milliseconds
  availability: number; // 0-1 (99.9% = 0.999)
  errorRate: number; // 0-1
  lastSuccessfulConnection: Date;
  consecutiveFailures: number;
  qualityTrend: 'improving' | 'stable' | 'degrading';
  businessImpact: string;
}

export interface SecurityMetric {
  metricType: 'authentication_strength' | 'permission_scope' | 'data_access' | 'encryption_level' | 'audit_compliance';
  value: number;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
  businessMeaning: string;
  improvement?: string;
  lastUpdated: Date;
}

export interface HealthAlert {
  alertId: string;
  type: 'expiration_warning' | 'connection_failure' | 'security_issue' | 'permission_change' | 'compliance_violation';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  businessImpact: string;
  actionRequired: boolean;
  suggestedActions: string[];
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalated: boolean;
}

export interface AutoRenewalConfig {
  enabled: boolean;
  renewalMethod: 'automatic' | 'assisted' | 'manual';
  warningDays: number;
  businessApprovalRequired: boolean;
  backupCredentials: boolean;
  testAfterRenewal: boolean;
}

export interface PermissionScope {
  scopeId: string;
  name: string;
  displayName: string;
  description: string;
  businessPurpose: string;
  granted: boolean;
  required: boolean;
  sensitive: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  businessJustification: string;
  grantedAt?: Date;
  lastUsed?: Date;
  usageFrequency: 'never' | 'rarely' | 'occasionally' | 'regularly' | 'frequently';
  dataAccess: DataAccessLevel[];
  businessImplications: string;
}

export interface DataAccessLevel {
  dataType: 'personal_info' | 'financial_data' | 'business_data' | 'system_data' | 'public_data';
  accessLevel: 'read' | 'write' | 'delete' | 'admin' | 'full_control';
  businessNecessity: 'essential' | 'important' | 'optional' | 'unnecessary';
  complianceImpact: string;
  riskAssessment: string;
}

export interface PermissionManagement {
  serviceId: string;
  totalPermissions: number;
  grantedPermissions: number;
  requiredPermissions: number;
  excessivePermissions: PermissionScope[];
  missingPermissions: PermissionScope[];
  permissionMatrix: PermissionMatrix;
  lastReview: Date;
  nextReview: Date;
  reviewRequired: boolean;
  businessOwner: string;
  approvalWorkflow: ApprovalWorkflow;
}

export interface PermissionMatrix {
  matrixId: string;
  serviceId: string;
  businessFunctions: BusinessFunction[];
  permissionMappings: PermissionMapping[];
  riskAssessment: MatrixRiskAssessment;
  lastUpdated: Date;
}

export interface BusinessFunction {
  functionId: string;
  name: string;
  description: string;
  businessCriticality: 'low' | 'medium' | 'high' | 'critical';
  requiredPermissions: string[];
  dataRequirements: DataRequirement[];
  complianceRequirements: string[];
}

export interface DataRequirement {
  dataType: string;
  accessType: 'read' | 'write' | 'delete' | 'admin';
  businessJustification: string;
  complianceClassification: string;
  retentionRequirement: string;
}

export interface PermissionMapping {
  mappingId: string;
  businessFunction: string;
  technicalPermission: string;
  justification: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alternatives: Alternative[];
  reviewRequired: boolean;
}

export interface Alternative {
  alternativeId: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  businessImpact: string;
  implementationEffort: 'minimal' | 'moderate' | 'significant';
}

export interface MatrixRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  businessAcceptanceRequired: boolean;
  lastAssessment: Date;
}

export interface RiskFactor {
  factorId: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  businessConsequence: string;
  mitigation?: string;
}

export interface MitigationStrategy {
  strategyId: string;
  description: string;
  implementationCost: 'low' | 'medium' | 'high';
  effectiveness: 'low' | 'medium' | 'high';
  businessTradeoff: string;
  timeline: string;
}

export interface ApprovalWorkflow {
  workflowId: string;
  enabled: boolean;
  approvers: WorkflowApprover[];
  stages: ApprovalStage[];
  autoApprovalRules: AutoApprovalRule[];
  escalationPolicy: WorkflowEscalation;
  auditTrail: ApprovalAudit[];
}

export interface WorkflowApprover {
  approverId: string;
  name: string;
  role: string;
  email: string;
  businessUnit: string;
  approvalAuthority: 'low' | 'medium' | 'high' | 'unlimited';
  backupApprover?: string;
}

export interface ApprovalStage {
  stageId: string;
  name: string;
  description: string;
  requiredApprovers: number;
  businessJustificationRequired: boolean;
  riskAssessmentRequired: boolean;
  timeoutDays: number;
  autoApprovalConditions?: string[];
}

export interface AutoApprovalRule {
  ruleId: string;
  description: string;
  conditions: RuleCondition[];
  maxRiskLevel: 'low' | 'medium' | 'high';
  businessConstraints: string[];
  auditRequired: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';
  value: any;
  businessLogic: string;
}

export interface WorkflowEscalation {
  enabled: boolean;
  escalationTriggers: EscalationTrigger[];
  escalationPath: EscalationLevel[];
  businessImpactThresholds: BusinessImpactThreshold[];
}

export interface EscalationTrigger {
  trigger: 'timeout' | 'rejection' | 'high_risk' | 'compliance_violation' | 'business_impact';
  threshold: any;
  businessReason: string;
  action: 'escalate' | 'deny' | 'require_justification';
}

export interface BusinessImpactThreshold {
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  escalationRequired: boolean;
  approvalLevel: 'manager' | 'director' | 'vp' | 'ciso' | 'ceo';
}

export interface ApprovalAudit {
  auditId: string;
  timestamp: Date;
  action: 'request_submitted' | 'approved' | 'rejected' | 'escalated' | 'auto_approved';
  approverId?: string;
  justification: string;
  businessImpact: string;
  riskAssessment?: string;
  complianceNotes?: string;
}

export interface SecurityAuditLog {
  logId: string;
  timestamp: Date;
  organizationId: string;
  userId?: string;
  serviceId?: string;
  workflowId?: string;
  eventType: SecurityAuditEventType;
  eventCategory: 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'compliance' | 'incident';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  businessContext: string;
  technicalDetails: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: GeoLocation;
  riskScore: number;
  complianceRelevant: boolean;
  retentionPeriod: number; // days
  evidenceFiles?: string[];
  businessImpact: string;
  followUpRequired: boolean;
  investigationStatus?: 'open' | 'investigating' | 'resolved' | 'closed';
}

export enum SecurityAuditEventType {
  // Authentication Events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  LOGIN_FAILED = 'login_failed',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  PASSWORD_CHANGED = 'password_changed',
  ACCOUNT_LOCKED = 'account_locked',

  // Authorization Events
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',

  // Data Access Events
  CREDENTIAL_ACCESSED = 'credential_accessed',
  CREDENTIAL_CREATED = 'credential_created',
  CREDENTIAL_UPDATED = 'credential_updated',
  CREDENTIAL_DELETED = 'credential_deleted',
  DATA_EXPORTED = 'data_exported',
  SENSITIVE_DATA_ACCESSED = 'sensitive_data_accessed',

  // Configuration Events
  SECURITY_SETTINGS_CHANGED = 'security_settings_changed',
  ENCRYPTION_KEY_ROTATED = 'encryption_key_rotated',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',

  // Compliance Events
  COMPLIANCE_SCAN_COMPLETED = 'compliance_scan_completed',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  AUDIT_REPORT_GENERATED = 'audit_report_generated',
  RETENTION_POLICY_EXECUTED = 'retention_policy_executed',

  // Incident Events
  SECURITY_INCIDENT_DETECTED = 'security_incident_detected',
  ANOMALY_DETECTED = 'anomaly_detected',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_ALERT_TRIGGERED = 'security_alert_triggered',
  INCIDENT_RESOLVED = 'incident_resolved'
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  isp?: string;
  riskScore: number; // 0-100 based on location risk
}

export interface TrustScore {
  overall: number; // 0-100 composite trust score
  components: TrustScoreComponent[];
  lastCalculated: Date;
  trend: 'improving' | 'stable' | 'declining';
  benchmarkComparison: BenchmarkComparison;
  businessImpact: TrustScoreBusinessImpact;
  recommendations: TrustScoreRecommendation[];
  historicalData: TrustScoreHistory[];
}

export interface TrustScoreComponent {
  component: 'security' | 'compliance' | 'permissions' | 'monitoring' | 'encryption' | 'access_control';
  score: number; // 0-100
  weight: number; // 0-1, importance weight in overall score
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: ScoreFactor[];
  businessMeaning: string;
  improvementPotential: number; // 0-100
}

export interface ScoreFactor {
  factor: string;
  contribution: number; // positive or negative impact
  businessDescription: string;
  actionable: boolean;
  improvementAction?: string;
}

export interface BenchmarkComparison {
  industryAverage: number;
  peerComparison: 'above_average' | 'average' | 'below_average';
  bestPracticeGap: number; // points from industry best practice
  competitivePosition: 'leader' | 'follower' | 'laggard';
  improvementOpportunity: string;
}

export interface TrustScoreBusinessImpact {
  riskExposure: 'low' | 'medium' | 'high' | 'critical';
  insurancePremiumImpact: string;
  clientTrustLevel: 'high' | 'medium' | 'low';
  competitiveAdvantage: string;
  regulatoryStanding: 'compliant' | 'at_risk' | 'non_compliant';
  businessContinuityRisk: 'low' | 'medium' | 'high';
}

export interface TrustScoreRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'quick_win' | 'strategic' | 'foundational' | 'advanced';
  title: string;
  description: string;
  businessValue: string;
  implementationEffort: 'minimal' | 'moderate' | 'significant';
  scoreImpact: number; // expected score improvement
  timeline: string;
  businessROI: string;
}

export interface TrustScoreHistory {
  date: Date;
  score: number;
  changeReason: string;
  businessEvent?: string;
  securityEvent?: string;
  complianceEvent?: string;
}

export interface EnterpriseSecuritySettings {
  organizationId: string;
  encryptionSettings: EncryptionSettings;
  authenticationSettings: AuthenticationSettings;
  auditSettings: AuditSettings;
  complianceSettings: ComplianceSettings;
  monitoringSettings: MonitoringSettings;
  incidentResponseSettings: IncidentResponseSettings;
  dataRetentionSettings: DataRetentionSettings;
  accessControlSettings: AccessControlSettings;
  businessSettings: BusinessSecuritySettings;
}

export interface EncryptionSettings {
  mandatoryEncryption: boolean;
  encryptionAlgorithm: string;
  keyRotationPolicy: KeyRotationPolicy;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  hsm: HSMSettings;
  businessJustification: string;
}

export interface KeyRotationPolicy {
  enabled: boolean;
  rotationInterval: number; // days
  gracePeriod: number; // days
  automaticRotation: boolean;
  businessApprovalRequired: boolean;
  notificationDays: number;
}

export interface HSMSettings {
  enabled: boolean;
  provider: 'aws_kms' | 'azure_key_vault' | 'google_kms' | 'hashicorp_vault' | 'local';
  businessGrade: 'standard' | 'premium' | 'enterprise';
  complianceCertifications: string[];
}

export interface AuthenticationSettings {
  mfaRequired: boolean;
  mfaMethods: MFAMethod[];
  passwordPolicy: PasswordPolicy;
  sessionSettings: SessionSettings;
  ssoSettings: SSOSettings;
  businessUserExperience: string;
}

export interface MFAMethod {
  method: 'totp' | 'sms' | 'email' | 'hardware_token' | 'biometric';
  enabled: boolean;
  businessFriendly: boolean;
  fallbackOptions: string[];
  businessImpact: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  historyCount: number; // prevent reuse
  businessComplexity: 'simple' | 'moderate' | 'complex';
}

export interface SessionSettings {
  maxIdleTime: number; // minutes
  maxSessionDuration: number; // hours
  extendSessionEnabled: boolean;
  businessProductivity: string;
  securityTradeoff: string;
}

export interface SSOSettings {
  enabled: boolean;
  provider: 'azure_ad' | 'google_workspace' | 'okta' | 'auth0' | 'custom';
  businessDomains: string[];
  fallbackAuthentication: boolean;
  businessBenefit: string;
}

export interface AuditSettings {
  comprehensiveLogging: boolean;
  logRetention: number; // days
  logExportEnabled: boolean;
  realtimeAlerting: boolean;
  complianceReporting: boolean;
  businessDashboard: boolean;
  costOfCompliance: string;
}

export interface ComplianceSettings {
  activeFrameworks: string[];
  automatedAssessments: boolean;
  assessmentFrequency: number; // days
  complianceOfficer: string;
  businessCriticality: 'low' | 'medium' | 'high' | 'critical';
  regulatoryRequirements: RegulatoryRequirement[];
}

export interface RegulatoryRequirement {
  regulation: string;
  applicability: 'applicable' | 'not_applicable' | 'under_review';
  businessJustification: string;
  complianceDeadline?: Date;
  implementationStatus: 'not_started' | 'in_progress' | 'completed' | 'ongoing';
}

export interface MonitoringSettings {
  continuousMonitoring: boolean;
  anomalyDetection: boolean;
  threatIntelligence: boolean;
  businessHoursOnly: boolean;
  alertingChannels: AlertingChannel[];
  monitoringScope: MonitoringScope;
}

export interface AlertingChannel {
  channel: 'email' | 'sms' | 'slack' | 'teams' | 'webhook';
  enabled: boolean;
  businessPriority: 'low' | 'medium' | 'high' | 'critical';
  recipients: string[];
  businessHoursOnly: boolean;
}

export interface MonitoringScope {
  credentialAccess: boolean;
  dataAccess: boolean;
  systemChanges: boolean;
  userBehavior: boolean;
  networkActivity: boolean;
  businessContext: string;
}

export interface IncidentResponseSettings {
  automaticResponse: boolean;
  escalationMatrix: IncidentEscalationMatrix;
  businessContinuity: BusinessContinuitySettings;
  communicationPlan: IncidentCommunicationPlan;
  forensicsEnabled: boolean;
}

export interface IncidentEscalationMatrix {
  levels: IncidentEscalationLevel[];
  businessImpactThresholds: IncidentBusinessImpact[];
  autoEscalationEnabled: boolean;
  escalationTimeouts: number[]; // minutes for each level
}

export interface IncidentEscalationLevel {
  level: number;
  name: string;
  description: string;
  contacts: IncidentContact[];
  authorities: string[];
  businessApprovalRequired: boolean;
}

export interface IncidentContact {
  name: string;
  role: string;
  contactMethods: string[];
  businessUnit: string;
  availability: BusinessHours;
  alternateContact?: string;
}

export interface IncidentBusinessImpact {
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  businessConsequences: string[];
  stakeholders: string[];
  communicationRequirements: string[];
}

export interface BusinessContinuitySettings {
  backupSystems: boolean;
  failoverProcedures: boolean;
  manualFallbacks: boolean;
  businessProcessMaintenance: string;
  recoveryTimeObjective: number; // hours
  recoveryPointObjective: number; // hours
}

export interface IncidentCommunicationPlan {
  internalCommunication: CommunicationProtocol;
  externalCommunication: CommunicationProtocol;
  customerCommunication: CommunicationProtocol;
  mediaCommunication: CommunicationProtocol;
  regulatoryCommunication: CommunicationProtocol;
}

export interface CommunicationProtocol {
  enabled: boolean;
  triggerCriteria: string[];
  messageTemplates: MessageTemplate[];
  approvalRequired: boolean;
  approver: string;
  timeline: string;
}

export interface MessageTemplate {
  templateId: string;
  name: string;
  purpose: string;
  audience: string;
  messageTemplate: string;
  businessTone: 'formal' | 'professional' | 'casual' | 'technical';
}

export interface DataRetentionSettings {
  credentialRetention: number; // days
  auditLogRetention: number; // days
  businessDataRetention: number; // days
  automaticDeletion: boolean;
  complianceOverrides: ComplianceOverride[];
  businessJustification: string;
}

export interface ComplianceOverride {
  regulation: string;
  minimumRetention: number; // days
  maximumRetention?: number; // days
  deletionProhibited: boolean;
  businessReason: string;
}

export interface AccessControlSettings {
  principleOfLeastPrivilege: boolean;
  roleBasedAccess: boolean;
  attributeBasedAccess: boolean;
  accessReviews: AccessReviewSettings;
  privilegedAccess: PrivilegedAccessSettings;
  businessFlexibility: string;
}

export interface AccessReviewSettings {
  enabled: boolean;
  reviewFrequency: number; // days
  autoReviewEnabled: boolean;
  businessOwnerApproval: boolean;
  accessCertification: boolean;
  businessImpactAssessment: boolean;
}

export interface PrivilegedAccessSettings {
  justInTimeAccess: boolean;
  approvalWorkflow: boolean;
  sessionMonitoring: boolean;
  privilegedCredentialVault: boolean;
  businessJustificationRequired: boolean;
  maximumSessionDuration: number; // hours
}

export interface BusinessSecuritySettings {
  riskTolerance: 'very_low' | 'low' | 'medium' | 'high';
  businessCriticality: 'low' | 'medium' | 'high' | 'critical';
  industryRequirements: IndustryRequirement[];
  businessContinuityPriority: 'cost_optimization' | 'balanced' | 'security_first';
  stakeholderNotifications: StakeholderNotification[];
  securityInvestmentBudget: 'minimal' | 'standard' | 'enhanced' | 'enterprise';
}

export interface IndustryRequirement {
  industry: string;
  requirements: string[];
  businessImpact: string;
  complianceDeadlines: Date[];
  implementationCost: 'low' | 'medium' | 'high';
}

export interface StakeholderNotification {
  stakeholder: 'ceo' | 'cto' | 'ciso' | 'compliance_officer' | 'business_owner' | 'it_manager';
  notificationTypes: string[];
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  businessContext: string;
  communicationMethod: string[];
}