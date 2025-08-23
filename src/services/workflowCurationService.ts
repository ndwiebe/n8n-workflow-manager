/**
 * Workflow Curation Service
 * Converts n8n workflows into client-ready templates with business metadata
 */

import { n8nService, N8nWorkflow } from './n8nService';

// Utility function to sanitize sensitive data
const sanitizeData = {
  /**
   * Remove sensitive credential data from objects
   */
  removeSensitiveFields: (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = [
      'password', 'token', 'key', 'secret', 'api_key', 'apiKey',
      'credentials', 'auth', 'authorization', 'bearer', 'oauth',
      'client_secret', 'clientSecret', 'private_key', 'privateKey'
    ];
    
    const sanitized = { ...obj };
    
    // Recursively sanitize object
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Remove sensitive fields
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeData.removeSensitiveFields(sanitized[key]);
      }
    });
    
    return sanitized;
  },

  /**
   * Sanitize workflow data before sending to client
   */
  sanitizeWorkflow: (workflow: N8nWorkflow): N8nWorkflow => {
    const sanitized = { ...workflow };
    
    // Remove static data that may contain credentials
    if (sanitized.staticData) {
      sanitized.staticData = sanitizeData.removeSensitiveFields(sanitized.staticData);
    }
    
    // Sanitize node credentials
    if (sanitized.nodes) {
      sanitized.nodes = sanitized.nodes.map(node => ({
        ...node,
        credentials: node.credentials ? '[REDACTED]' : undefined,
        parameters: node.parameters ? sanitizeData.removeSensitiveFields(node.parameters) : node.parameters
      }));
    }
    
    return sanitized;
  }
};

export interface ClientWorkflowTemplate {
  id: string;
  name: string;
  businessName: string; // Client-friendly name
  description: string;
  businessDescription: string; // Business-focused description
  category: 'Finance' | 'Marketing' | 'Sales' | 'Operations' | 'HR' | 'Customer Service' | 'E-commerce';
  industry: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  setupTime: string; // "5 minutes", "30 minutes", "1 hour"
  monthlyValue: number; // Estimated monthly value in dollars
  timesSaved: string; // "5 hours per week"
  features: string[];
  requirements: ClientRequirement[];
  tags: string[];
  isClientReady: boolean;
  consultantOnly: boolean;
  originalWorkflowId: string;
  credentialsNeeded: CredentialRequirement[];
  setupSteps: SetupStep[];
  successMetrics: string[];
  icon: string;
  previewImages?: string[];
}

export interface ClientRequirement {
  type: 'service' | 'subscription' | 'technical';
  name: string;
  description: string;
  required: boolean;
  helpText?: string;
}

export interface CredentialRequirement {
  service: string;
  type: 'oauth' | 'api_key' | 'username_password';
  displayName: string;
  description: string;
  setupInstructions: string[];
  testable: boolean;
  required: boolean;
}

export interface SetupStep {
  step: number;
  title: string;
  description: string;
  action: 'configure_credential' | 'test_connection' | 'customize_settings' | 'review_and_activate';
  estimatedTime: string;
  helpText?: string;
  videoUrl?: string;
}

class WorkflowCurationService {
  private templateCache = new Map<string, ClientWorkflowTemplate>();
  private cacheTimestamps = new Map<string, number>();
  private workflowMetadata = new Map<string, any>(); // Store workflow visibility and metadata
  private readonly maxCacheSize = 100; // Maximum number of cached templates
  private readonly cacheExpiryMs = 30 * 60 * 1000; // 30 minutes cache expiry

  constructor() {
    // Load workflow metadata from localStorage on initialization
    this.loadMetadataFromStorage();
  }

  /**
   * Load workflow metadata from localStorage
   */
  private loadMetadataFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('n8n-workflow-metadata');
        if (stored) {
          const metadata = JSON.parse(stored);
          this.workflowMetadata = new Map(Object.entries(metadata));
          console.log(`📁 Loaded ${this.workflowMetadata.size} workflow metadata entries from localStorage`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load metadata from localStorage:', error);
      }
    }
  }

  /**
   * Get workflow metadata (visibility, business data, etc.)
   */
  public getWorkflowMetadata(workflowId: string): any {
    return this.workflowMetadata.get(workflowId) || {
      visibility: 'internal-only',
      businessName: '',
      category: '',
      description: '',
      difficulty: 'beginner',
      setupTimeMinutes: 30,
      monthlyValue: 500
    };
  }

  /**
   * Get workflow visibility setting
   */
  public getWorkflowVisibility(workflowId: string): 'client-ready' | 'internal-only' | 'consultant-demo' | 'none' {
    const metadata = this.getWorkflowMetadata(workflowId);
    // Default to 'internal-only' if no metadata exists to prevent accidental client exposure
    return metadata?.visibility || 'internal-only';
  }

  /**
   * Debug method to see all stored visibility metadata
   */
  public debugVisibilityStorage(): void {
    console.group('🔍 Debug: Workflow Visibility Storage');
    console.log('In-memory metadata entries:', this.workflowMetadata.size);
    
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('n8n-workflow-metadata');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('localStorage metadata:', parsed);
          Object.entries(parsed).forEach(([id, metadata]: [string, any]) => {
            console.log(`  ${id}: ${metadata.visibility} - ${metadata.workflowName || 'Unknown'}`);
          });
        } else {
          console.log('No data in localStorage');
        }
      } catch (error) {
        console.error('Error reading localStorage:', error);
      }
    }
    console.groupEnd();
  }

  /**
   * Clean up expired cache entries and enforce size limits
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    // Remove expired entries
    const entries = Array.from(this.cacheTimestamps.entries());
    for (const [key, timestamp] of entries) {
      if (now - timestamp > this.cacheExpiryMs) {
        this.templateCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
    
    // Enforce size limit by removing oldest entries
    if (this.templateCache.size > this.maxCacheSize) {
      const sortedEntries = Array.from(this.cacheTimestamps.entries())
        .sort(([, a], [, b]) => a - b); // Sort by timestamp, oldest first
      
      const entriesToRemove = sortedEntries.slice(0, this.templateCache.size - this.maxCacheSize);
      for (const [key] of entriesToRemove) {
        this.templateCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * Get template from cache with expiry check
   */
  private getCachedTemplate(templateId: string): ClientWorkflowTemplate | null {
    const timestamp = this.cacheTimestamps.get(templateId);
    if (!timestamp) return null;
    
    const now = Date.now();
    if (now - timestamp > this.cacheExpiryMs) {
      // Entry expired, remove it
      this.templateCache.delete(templateId);
      this.cacheTimestamps.delete(templateId);
      return null;
    }
    
    return this.templateCache.get(templateId) || null;
  }

  /**
   * Set template in cache with timestamp
   */
  private setCachedTemplate(templateId: string, template: ClientWorkflowTemplate): void {
    this.cleanupCache(); // Clean before adding
    this.templateCache.set(templateId, template);
    this.cacheTimestamps.set(templateId, Date.now());
  }

  /**
   * Invalidate cache for specific workflow
   */
  public invalidateCache(workflowId: string): void {
    const templateId = `template-${workflowId}`;
    this.templateCache.delete(templateId);
    this.cacheTimestamps.delete(templateId);
  }

  /**
   * Clear entire cache
   */
  public clearCache(): void {
    this.templateCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Test credential configuration
   */
  async testCredential(credential: CredentialRequirement, credentialData: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate input
      if (!credential || !credentialData) {
        return { success: false, error: 'Invalid credential data provided' };
      }

      // For different credential types, perform appropriate validation
      switch (credential.type) {
        case 'api_key':
          return await this.testApiKeyCredential(credential, credentialData);
        case 'oauth':
          return await this.testOAuthCredential(credential, credentialData);
        case 'username_password':
          return await this.testUsernamePasswordCredential(credential, credentialData);
        default:
          return { success: false, error: 'Unsupported credential type' };
      }
    } catch (error) {
      console.error('Credential test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during credential test' 
      };
    }
  }

  private async testApiKeyCredential(credential: CredentialRequirement, credentialData: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!credentialData.apiKey || credentialData.apiKey.trim() === '') {
      return { success: false, error: 'API key is required' };
    }

    // Perform basic validation - in production, this would make actual API calls
    const apiKey = credentialData.apiKey.trim();
    
    // Basic format validation
    if (apiKey.length < 10) {
      return { success: false, error: 'API key appears to be too short' };
    }

    // Simulate API test call with timeout
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate random success/failure for demo
          const success = Math.random() > 0.2; // 80% success rate
          if (success) {
            resolve(true);
          } else {
            reject(new Error('Authentication failed'));
          }
        }, 1000 + Math.random() * 2000); // 1-3 second delay
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'API key validation failed' 
      };
    }
  }

  private async testOAuthCredential(credential: CredentialRequirement, credentialData: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    // OAuth validation would typically involve token refresh or validation
    if (!credentialData.accessToken) {
      return { success: false, error: 'OAuth access token is required' };
    }

    // Simulate OAuth token validation
    await new Promise(resolve => setTimeout(resolve, 1500));
    return Math.random() > 0.1 ? { success: true } : { success: false, error: 'OAuth token expired' };
  }

  private async testUsernamePasswordCredential(credential: CredentialRequirement, credentialData: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!credentialData.username || !credentialData.password) {
      return { success: false, error: 'Username and password are required' };
    }

    if (credentialData.username.trim().length === 0) {
      return { success: false, error: 'Username cannot be empty' };
    }

    if (credentialData.password.length < 4) {
      return { success: false, error: 'Password appears to be too short' };
    }

    // Simulate login attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.15 ? { success: true } : { success: false, error: 'Invalid username or password' };
  }

  /**
   * Analyze n8n workflow and suggest business metadata
   */
  async analyzeWorkflow(workflowId: string): Promise<{
    suggestedTemplate: Partial<ClientWorkflowTemplate>;
    analysisResults: WorkflowAnalysis;
  }> {
    const workflow = await n8nService.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const analysis = this.performWorkflowAnalysis(workflow);
    const suggestedTemplate = this.generateTemplateFromAnalysis(workflow, analysis);

    return {
      suggestedTemplate,
      analysisResults: analysis
    };
  }

  /**
   * Generate template metadata from workflow analysis
   */
  private generateTemplateFromAnalysis(workflow: N8nWorkflow, analysis: WorkflowAnalysis): Partial<ClientWorkflowTemplate> {
    return {
      businessName: this.generateBusinessName(workflow),
      businessDescription: this.generateBusinessDescription(analysis),
      category: this.inferCategory(analysis),
      industry: this.inferIndustries(analysis),
      difficulty: this.inferDifficulty(analysis),
      setupTime: this.estimateSetupTime(analysis),
      monthlyValue: this.estimateMonthlyValue(analysis),
      timesSaved: this.estimateTimeSaved(analysis),
      features: this.extractFeatures(analysis),
      requirements: this.generateRequirements(analysis),
      tags: [...(workflow.tags || []), 'auto-generated'],
      consultantOnly: analysis.complexity === 'high',
      credentialsNeeded: this.extractCredentialRequirements(analysis),
      setupSteps: this.generateSetupSteps(analysis),
      successMetrics: this.generateSuccessMetrics(analysis),
      icon: this.selectIcon(analysis.category)
    };
  }

  /**
   * Convert n8n workflow to client template
   */
  async createClientTemplate(
    workflowId: string, 
    businessMetadata: Partial<ClientWorkflowTemplate>
  ): Promise<ClientWorkflowTemplate> {
    const workflow = await n8nService.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const analysis = this.performWorkflowAnalysis(workflow);
    const template: ClientWorkflowTemplate = {
      id: `template-${workflowId}`,
      name: workflow.name,
      businessName: businessMetadata.businessName || this.generateBusinessName(workflow),
      description: workflow.name,
      businessDescription: businessMetadata.businessDescription || this.generateBusinessDescription(analysis),
      category: businessMetadata.category || this.inferCategory(analysis),
      industry: businessMetadata.industry || this.inferIndustries(analysis),
      difficulty: businessMetadata.difficulty || this.inferDifficulty(analysis),
      setupTime: businessMetadata.setupTime || this.estimateSetupTime(analysis),
      monthlyValue: businessMetadata.monthlyValue || this.estimateMonthlyValue(analysis),
      timesSaved: businessMetadata.timesSaved || this.estimateTimeSaved(analysis),
      features: businessMetadata.features || this.extractFeatures(analysis),
      requirements: businessMetadata.requirements || this.generateRequirements(analysis),
      tags: [...(workflow.tags || []), 'client-template'],
      isClientReady: true,
      consultantOnly: businessMetadata.consultantOnly || false,
      originalWorkflowId: workflowId,
      credentialsNeeded: this.extractCredentialRequirements(analysis),
      setupSteps: this.generateSetupSteps(analysis),
      successMetrics: this.generateSuccessMetrics(analysis),
      icon: businessMetadata.icon || this.selectIcon(analysis.category),
      previewImages: businessMetadata.previewImages
    };

    this.setCachedTemplate(template.id, template);
    return template;
  }

  /**
   * Get all client-ready workflow templates
   */
  async getClientTemplates(filters?: {
    category?: string;
    industry?: string;
    difficulty?: string;
    maxSetupTime?: number;
  }): Promise<ClientWorkflowTemplate[]> {
    // Get all workflows and filter for client-ready ones using stored visibility metadata
    const workflows = await n8nService.getWorkflows();
    
    console.log(`🔍 Filtering ${workflows.length} workflows for client visibility`);
    
    const clientWorkflows = workflows.filter(w => {
      // Check stored visibility metadata first
      const metadata = this.getWorkflowMetadata(w.id);
      const storedVisibility = metadata?.visibility;
      
      if (storedVisibility) {
        console.log(`📋 Workflow ${w.id} (${w.name}) has stored visibility: ${storedVisibility}`);
        return storedVisibility === 'client-ready';
      }
      
      // Fallback to checking n8n tags if no stored visibility
      const hasClientTags = w.tags?.includes('client-template') || w.tags?.includes('client-ready');
      console.log(`🏷️ Workflow ${w.id} (${w.name}) has client tags: ${hasClientTags}, tags: ${JSON.stringify(w.tags)}`);
      return hasClientTags;
    });
    
    console.log(`✅ Found ${clientWorkflows.length} client-ready workflows out of ${workflows.length} total`);
    clientWorkflows.forEach(w => console.log(`   - ${w.name} (${w.id})`));

    const templates: ClientWorkflowTemplate[] = [];
    
    for (const workflow of clientWorkflows) {
      let template = this.getCachedTemplate(`template-${workflow.id}`);
      
      if (!template) {
        // Generate template on-demand for workflows marked as client-ready
        try {
          template = await this.createClientTemplate(workflow.id, {});
        } catch (error) {
          console.error(`Failed to create template for workflow ${workflow.id}:`, error);
          continue; // Skip this workflow if template creation fails
        }
      }
      
      // Apply filters
      if (this.matchesFilters(template, filters)) {
        templates.push(template);
      }
    }

    return templates.sort((a, b) => a.businessName.localeCompare(b.businessName));
  }

  /**
   * Mark workflow as client-ready or internal-only
   * Note: Since n8n API doesn't support PATCH operations for workflow metadata,
   * we store visibility settings in local database/localStorage
   */
  async setWorkflowVisibility(workflowId: string, visibility: 'client-ready' | 'internal-only' | 'consultant-demo'): Promise<void> {
    try {
      console.log(`🔄 Setting workflow ${workflowId} visibility to: ${visibility}`);
      
      // Verify workflow exists in n8n
      const workflow = await n8nService.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Store visibility in local metadata since n8n API doesn't support workflow metadata updates
      const existingMetadata = this.getWorkflowMetadata(workflowId);
      const updatedMetadata = {
        ...existingMetadata,
        visibility,
        lastUpdated: new Date().toISOString(),
        workflowName: workflow.name // Keep workflow name for reference
      };

      // Update in-memory storage
      this.workflowMetadata.set(workflowId, updatedMetadata);
      
      // Persist to localStorage for browser sessions
      if (typeof localStorage !== 'undefined') {
        try {
          const allMetadata = Object.fromEntries(this.workflowMetadata);
          localStorage.setItem('n8n-workflow-metadata', JSON.stringify(allMetadata));
          console.log(`💾 Persisted metadata to localStorage for workflow ${workflowId}`);
        } catch (storageError) {
          console.warn('⚠️ Could not persist to localStorage:', storageError);
        }
      }

      console.log(`✅ Successfully updated workflow ${workflowId} visibility to: ${visibility} (stored locally)`);
      
      // Invalidate cache for this workflow since metadata was updated
      this.invalidateCache(workflowId);
    } catch (error) {
      console.error(`❌ Failed to set workflow visibility:`, error);
      throw new Error(`Failed to update workflow visibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private performWorkflowAnalysis(workflow: N8nWorkflow): WorkflowAnalysis {
    // Sanitize workflow data before analysis to prevent credential exposure
    const sanitizedWorkflow = sanitizeData.sanitizeWorkflow(workflow);
    
    // Add null safety checks for workflow properties
    const nodes = sanitizedWorkflow.nodes || [];
    const connections = sanitizedWorkflow.connections || {};
    
    // Safely extract node information with validation
    const nodeTypes = nodes.map(node => node?.type || 'unknown').filter(type => type !== 'unknown');
    const integrations = this.extractIntegrations(nodes);
    const triggers = nodes.filter(node => {
      const nodeType = node?.type || '';
      return nodeType.includes('trigger') || nodeType.includes('webhook');
    });
    const actions = nodes.filter(node => {
      const nodeType = node?.type || '';
      return !nodeType.includes('trigger') && nodeType !== '';
    });

    return {
      nodeCount: nodes.length,
      nodeTypes,
      integrations,
      triggers: triggers.map(t => t?.type || 'unknown').filter(type => type !== 'unknown'),
      actions: actions.map(a => a?.type || 'unknown').filter(type => type !== 'unknown'),
      complexity: this.calculateComplexity(sanitizedWorkflow),
      category: this.inferCategoryFromNodes(nodeTypes),
      automationType: this.inferAutomationType(triggers, actions),
      estimatedSetupTime: this.calculateSetupTime(integrations.length, nodes.length),
      businessValue: this.estimateBusinessValue(nodeTypes, integrations)
    };
  }

  private generateBusinessName(workflow: N8nWorkflow): string {
    // Convert technical names to business-friendly names
    const nameMap: Record<string, string> = {
      'invoice': 'Invoice Processing',
      'email': 'Email Automation',
      'slack': 'Team Notifications',
      'crm': 'Customer Management',
      'webhook': 'Data Integration',
      'ai': 'AI-Powered',
      'automation': 'Business Automation'
    };

    let businessName = workflow.name;
    Object.entries(nameMap).forEach(([tech, business]) => {
      if (workflow.name.toLowerCase().includes(tech)) {
        businessName = business;
      }
    });

    return businessName;
  }

  private generateBusinessDescription(analysis: WorkflowAnalysis): string {
    const templates: Record<string, string> = {
      'Finance': 'Automate your financial processes to save time and reduce errors.',
      'Marketing': 'Streamline your marketing campaigns and lead generation.',
      'Sales': 'Boost your sales productivity with automated workflows.',
      'Operations': 'Optimize your business operations and team collaboration.',
      'Customer Service': 'Enhance customer satisfaction with automated support.',
      'E-commerce': 'Scale your online business with automated order processing.'
    };

    return templates[analysis.category] || 'Automate your business processes to increase efficiency and reduce manual work.';
  }

  private inferCategory(analysis: WorkflowAnalysis): ClientWorkflowTemplate['category'] {
    const categoryMap: Record<string, ClientWorkflowTemplate['category']> = {
      'invoice': 'Finance',
      'payment': 'Finance',
      'email': 'Marketing',
      'slack': 'Operations',
      'crm': 'Sales',
      'customer': 'Customer Service',
      'order': 'E-commerce',
      'shopify': 'E-commerce'
    };

    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (analysis.integrations.some(int => int.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'Operations';
  }

  private extractIntegrations(nodes: any[]): string[] {
    if (!Array.isArray(nodes)) {
      return [];
    }
    
    return nodes
      .filter(node => node && node.type) // Filter out null/undefined nodes
      .map(node => node.type)
      .filter(type => type && !type.includes('n8n-nodes-base'))
      .map(type => type.replace(/.*\./, ''))
      .filter((value, index, self) => value && self.indexOf(value) === index);
  }

  private calculateComplexity(workflow: N8nWorkflow): 'low' | 'medium' | 'high' {
    const nodeCount = (workflow.nodes || []).length;
    const connectionCount = workflow.connections ? Object.keys(workflow.connections).length : 0;
    const score = nodeCount + connectionCount;
    
    if (score < 5) return 'low';
    if (score < 15) return 'medium';
    return 'high';
  }

  private inferCategoryFromNodes(nodeTypes: string[]): string {
    // Analysis logic to determine category from node types
    return 'Operations'; // Default
  }

  private inferAutomationType(triggers: any[], actions: any[]): string {
    if (triggers.some(t => t.type.includes('webhook'))) return 'Event-driven';
    if (triggers.some(t => t.type.includes('schedule'))) return 'Scheduled';
    return 'Manual';
  }

  private calculateSetupTime(integrationCount: number, nodeCount: number): number {
    return Math.max(5, integrationCount * 10 + nodeCount * 2);
  }

  private estimateBusinessValue(nodeTypes: string[], integrations: string[]): number {
    return integrations.length * 100 + nodeTypes.length * 25;
  }

  private inferDifficulty(analysis: WorkflowAnalysis): 'beginner' | 'intermediate' | 'advanced' {
    if (analysis.integrations.length <= 2 && analysis.nodeCount <= 5) return 'beginner';
    if (analysis.integrations.length <= 5 && analysis.nodeCount <= 15) return 'intermediate';
    return 'advanced';
  }

  private estimateSetupTime(analysis: WorkflowAnalysis): string {
    const minutes = analysis.estimatedSetupTime;
    if (minutes <= 10) return '5-10 minutes';
    if (minutes <= 30) return '15-30 minutes';
    if (minutes <= 60) return '30-60 minutes';
    return '1+ hours';
  }

  private estimateMonthlyValue(analysis: WorkflowAnalysis): number {
    return Math.round(analysis.businessValue / 10) * 10;
  }

  private estimateTimeSaved(analysis: WorkflowAnalysis): string {
    const hours = Math.ceil(analysis.businessValue / 200);
    if (hours === 1) return '1 hour per week';
    if (hours < 8) return `${hours} hours per week`;
    if (hours < 32) return `${Math.ceil(hours / 4)} hours per day`;
    return `${Math.ceil(hours / 8)} days per week`;
  }

  private extractFeatures(analysis: WorkflowAnalysis): string[] {
    const features = [];
    if (analysis.integrations.length > 1) features.push('Multi-platform integration');
    if (analysis.triggers.some(t => t.includes('webhook'))) features.push('Real-time processing');
    if (analysis.triggers.some(t => t.includes('schedule'))) features.push('Automated scheduling');
    if (analysis.nodeCount > 10) features.push('Advanced workflow logic');
    return features;
  }

  private generateRequirements(analysis: WorkflowAnalysis): ClientRequirement[] {
    const requirements: ClientRequirement[] = [];
    
    analysis.integrations.forEach(integration => {
      requirements.push({
        type: 'service',
        name: integration,
        description: `Active ${integration} account`,
        required: true,
        helpText: `You'll need access to ${integration} with API permissions`
      });
    });

    return requirements;
  }

  private extractCredentialRequirements(analysis: WorkflowAnalysis): CredentialRequirement[] {
    return analysis.integrations.map(integration => ({
      service: integration,
      type: this.getCredentialType(integration),
      displayName: `${integration} Connection`,
      description: `Connect your ${integration} account`,
      setupInstructions: [`Log into your ${integration} account`, 'Navigate to API settings', 'Generate API key'],
      testable: true,
      required: true
    }));
  }

  private getCredentialType(integration: string): 'oauth' | 'api_key' | 'username_password' {
    const oauthServices = ['google', 'microsoft', 'shopify', 'slack'];
    return oauthServices.some(service => integration.toLowerCase().includes(service)) ? 'oauth' : 'api_key';
  }

  private generateSetupSteps(analysis: WorkflowAnalysis): SetupStep[] {
    const steps: SetupStep[] = [];
    let stepNum = 1;

    // Add credential setup steps
    analysis.integrations.forEach(integration => {
      steps.push({
        step: stepNum++,
        title: `Connect ${integration}`,
        description: `Securely connect your ${integration} account`,
        action: 'configure_credential',
        estimatedTime: '2-5 minutes'
      });
    });

    // Add testing step
    steps.push({
      step: stepNum++,
      title: 'Test Connections',
      description: 'Verify all integrations are working properly',
      action: 'test_connection',
      estimatedTime: '1-2 minutes'
    });

    // Add customization step
    steps.push({
      step: stepNum++,
      title: 'Customize Settings',
      description: 'Configure automation settings for your business',
      action: 'customize_settings',
      estimatedTime: '5-10 minutes'
    });

    // Add activation step
    steps.push({
      step: stepNum++,
      title: 'Review & Activate',
      description: 'Review setup and activate your automation',
      action: 'review_and_activate',
      estimatedTime: '2-3 minutes'
    });

    return steps;
  }

  private generateSuccessMetrics(analysis: WorkflowAnalysis): string[] {
    return [
      'Time saved per week',
      'Tasks automated',
      'Error reduction',
      'Process efficiency gain'
    ];
  }

  private selectIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'Finance': 'AttachMoney',
      'Marketing': 'Campaign',
      'Sales': 'TrendingUp',
      'Operations': 'Settings',
      'Customer Service': 'Support',
      'E-commerce': 'ShoppingCart'
    };
    return iconMap[category] || 'AutoMode';
  }

  private inferIndustries(analysis: WorkflowAnalysis): string[] {
    const industries = ['Small Business', 'Technology'];
    if (analysis.integrations.some(i => i.includes('shopify'))) industries.push('E-commerce');
    if (analysis.integrations.some(i => i.includes('crm'))) industries.push('Sales');
    return industries;
  }

  private matchesFilters(template: ClientWorkflowTemplate, filters?: any): boolean {
    if (!filters) return true;
    
    if (filters.category && template.category !== filters.category) return false;
    if (filters.industry && !template.industry.includes(filters.industry)) return false;
    if (filters.difficulty && template.difficulty !== filters.difficulty) return false;
    
    return true;
  }
}

interface WorkflowAnalysis {
  nodeCount: number;
  nodeTypes: string[];
  integrations: string[];
  triggers: string[];
  actions: string[];
  complexity: 'low' | 'medium' | 'high';
  category: string;
  automationType: string;
  estimatedSetupTime: number;
  businessValue: number;
}

export const workflowCurationService = new WorkflowCurationService();