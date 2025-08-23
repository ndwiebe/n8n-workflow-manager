/**
 * Smart Credential Service
 * Orchestrates service detection, connection management, and business-friendly credential workflows
 */

import { serviceDetector, ServiceDetector } from './serviceDetector';
import { n8nService } from './n8nService';
import {
  SmartCredentialConfig,
  ServiceConnectionCard,
  ConnectionStatus,
  ServiceCategory,
  SetupProgress,
  BusinessContext,
  SecuritySettings,
  SmartCredentialResponse,
  SmartCredentialError,
  ServiceDetectionResult,
  SmartCredentialEvent,
  SmartCredentialEventType,
  ProgressBlocker,
  ServiceRecommendation,
  ConnectionField,
  ServiceConnectionDetails
} from '../types/smartCredentials';
import { ClientWorkflowTemplate } from './workflowCurationService';

export class SmartCredentialService {
  private credentialConfigs: Map<string, SmartCredentialConfig> = new Map();
  private eventListeners: Map<SmartCredentialEventType, Array<(event: SmartCredentialEvent) => void>> = new Map();
  private serviceConnections: Map<string, Map<string, ServiceConnectionCard>> = new Map(); // workflowId -> serviceId -> connection

  constructor(private detector: ServiceDetector = serviceDetector) {
    this.initializeEventListeners();
  }

  /**
   * Detect services for a workflow and create smart credential configuration
   */
  public async detectAndConfigureServices(
    workflowTemplate: ClientWorkflowTemplate,
    businessContext?: Partial<BusinessContext>
  ): Promise<SmartCredentialResponse<SmartCredentialConfig>> {
    try {
      // Get the actual workflow from n8n
      const workflow = await n8nService.getWorkflow(workflowTemplate.originalWorkflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowTemplate.originalWorkflowId}`);
      }

      // Detect services using the service detector
      const detectionResult = await this.detector.detectServices(workflow);

      // Convert detected services to service connection cards
      const serviceCards = await this.convertDetectedServicesToCards(
        detectionResult,
        workflowTemplate
      );

      // Create business context
      const fullBusinessContext = this.createBusinessContext(
        workflowTemplate,
        businessContext
      );

      // Calculate setup progress
      const setupProgress = this.calculateSetupProgress(serviceCards);

      // Create security settings
      const securitySettings = this.createDefaultSecuritySettings();

      // Create smart credential configuration
      const config: SmartCredentialConfig = {
        workflowId: workflowTemplate.id,
        workflowName: workflowTemplate.businessName,
        detectedServices: serviceCards,
        setupProgress,
        businessContext: fullBusinessContext,
        securitySettings
      };

      // Store configuration
      this.credentialConfigs.set(workflowTemplate.id, config);
      this.serviceConnections.set(workflowTemplate.id, new Map(
        serviceCards.map(card => [card.serviceId, card])
      ));

      // Emit event
      await this.emitEvent({
        type: SmartCredentialEventType.SERVICE_DETECTED,
        timestamp: new Date(),
        workflowId: workflowTemplate.id,
        data: { servicesDetected: serviceCards.length, detectionResult },
        userId: 'system' // In real implementation, get from auth context
      });

      return {
        success: true,
        data: config,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          processingTime: 0,
          version: '1.0'
        }
      };

    } catch (error) {
      const errorResponse: SmartCredentialError = {
        code: 'SERVICE_DETECTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        userMessage: 'We encountered an issue detecting the services needed for this workflow. Please try again.',
        resolution: 'Check your workflow configuration and ensure n8n is accessible.'
      };

      return {
        success: false,
        error: errorResponse
      };
    }
  }

  /**
   * Get smart credential configuration for a workflow
   */
  public getConfiguration(workflowId: string): SmartCredentialConfig | null {
    return this.credentialConfigs.get(workflowId) || null;
  }

  /**
   * Update service connection status
   */
  public async updateServiceConnection(
    workflowId: string,
    serviceId: string,
    status: ConnectionStatus,
    connectionDetails?: Partial<ServiceConnectionDetails>
  ): Promise<SmartCredentialResponse<ServiceConnectionCard>> {
    try {
      const workflowConnections = this.serviceConnections.get(workflowId);
      if (!workflowConnections) {
        throw new Error(`No connections found for workflow: ${workflowId}`);
      }

      const connection = workflowConnections.get(serviceId);
      if (!connection) {
        throw new Error(`Service not found: ${serviceId}`);
      }

      // Update connection status
      const updatedConnectionDetails: ServiceConnectionDetails | undefined = connectionDetails && connection.connectionDetails ? {
        ...connection.connectionDetails,
        ...connectionDetails
      } : connection.connectionDetails;

      const updatedConnection: ServiceConnectionCard = {
        ...connection,
        status,
        connectionDetails: updatedConnectionDetails,
        lastTested: status === ConnectionStatus.TESTING ? new Date() : connection.lastTested,
        connectedAt: status === ConnectionStatus.CONNECTED ? new Date() : connection.connectedAt
      };

      // Update in storage
      workflowConnections.set(serviceId, updatedConnection);
      
      // Update configuration
      const config = this.credentialConfigs.get(workflowId);
      if (config) {
        const serviceIndex = config.detectedServices.findIndex(s => s.serviceId === serviceId);
        if (serviceIndex !== -1) {
          config.detectedServices[serviceIndex] = updatedConnection;
          config.setupProgress = this.calculateSetupProgress(config.detectedServices);
        }
      }

      // Emit appropriate event
      const eventType = status === ConnectionStatus.CONNECTED 
        ? SmartCredentialEventType.CONNECTION_SUCCESS
        : status === ConnectionStatus.FAILED
        ? SmartCredentialEventType.CONNECTION_FAILED
        : SmartCredentialEventType.CONNECTION_STARTED;

      await this.emitEvent({
        type: eventType,
        timestamp: new Date(),
        workflowId,
        serviceId,
        data: { status, connectionDetails },
        userId: 'system'
      });

      return {
        success: true,
        data: updatedConnection
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Failed to update service connection status.'
        }
      };
    }
  }

  /**
   * Test a service connection
   */
  public async testServiceConnection(
    workflowId: string,
    serviceId: string,
    credentials: Record<string, any>
  ): Promise<SmartCredentialResponse<boolean>> {
    try {
      // Update status to testing
      await this.updateServiceConnection(workflowId, serviceId, ConnectionStatus.TESTING);

      // Simulate connection test (in real implementation, this would use actual service APIs)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For demo purposes, randomly succeed or fail
      const testSuccess = Math.random() > 0.2; // 80% success rate

      const newStatus = testSuccess ? ConnectionStatus.CONNECTED : ConnectionStatus.FAILED;
      const connectionDetails = {
        authenticationStatus: testSuccess ? 'authenticated' as const : 'error' as const,
        lastError: testSuccess ? undefined : 'Invalid credentials provided'
      };

      // Update final status
      await this.updateServiceConnection(workflowId, serviceId, newStatus, connectionDetails);

      await this.emitEvent({
        type: SmartCredentialEventType.CREDENTIAL_TESTED,
        timestamp: new Date(),
        workflowId,
        serviceId,
        data: { success: testSuccess, credentials: '[REDACTED]' },
        userId: 'system'
      });

      return {
        success: true,
        data: testSuccess
      };

    } catch (error) {
      await this.updateServiceConnection(workflowId, serviceId, ConnectionStatus.FAILED);
      
      return {
        success: false,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Failed to test the service connection. Please check your credentials.'
        }
      };
    }
  }

  /**
   * Get connection fields for a service
   */
  public getServiceConnectionFields(serviceId: string): ConnectionField[] {
    const serviceDefinition = this.detector.getServiceDefinition(serviceId);
    if (!serviceDefinition) {
      return [];
    }

    // Generate connection fields based on service type
    const fields: ConnectionField[] = [];

    // Add common fields based on credential types
    if (serviceDefinition.requiredCredentials.includes('api_key')) {
      fields.push({
        fieldId: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your API key',
        helpText: `Get your API key from the ${serviceDefinition.displayName} settings page`,
        sensitive: true,
        businessDescription: 'Secure token that allows our system to access your account'
      });
    }

    if (serviceDefinition.requiredCredentials.includes('oauth')) {
      fields.push({
        fieldId: 'oauthToken',
        label: 'OAuth Authorization',
        type: 'text',
        required: true,
        helpText: 'Click Connect to authorize access to your account',
        sensitive: true,
        businessDescription: 'Secure authorization that lets us access your account safely'
      });
    }

    // Add service-specific fields
    switch (serviceDefinition.displayName.toLowerCase()) {
      case 'gmail':
        fields.push({
          fieldId: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'your.email@gmail.com',
          helpText: 'The Gmail address you want to use for this automation',
          sensitive: false,
          businessDescription: 'Your Gmail address for sending and receiving emails'
        });
        break;

      case 'slack':
        fields.push({
          fieldId: 'workspace',
          label: 'Workspace URL',
          type: 'url',
          required: true,
          placeholder: 'https://yourworkspace.slack.com',
          helpText: 'Your Slack workspace URL',
          sensitive: false,
          businessDescription: 'Your Slack workspace where notifications will be sent'
        });
        break;

      case 'custom api':
        fields.push(
          {
            fieldId: 'baseUrl',
            label: 'API Base URL',
            type: 'url',
            required: true,
            placeholder: 'https://api.example.com',
            helpText: 'The base URL for your API',
            sensitive: false,
            businessDescription: 'The web address where your system can be reached'
          },
          {
            fieldId: 'authHeaders',
            label: 'Authentication Headers',
            type: 'textarea',
            required: false,
            placeholder: 'Authorization: Bearer token\nX-API-Key: key',
            helpText: 'Any additional headers needed for authentication',
            sensitive: true,
            businessDescription: 'Additional security information needed to access your system'
          }
        );
        break;
    }

    return fields;
  }

  /**
   * Get setup recommendations for a workflow
   */
  public async getSetupRecommendations(workflowId: string): Promise<ServiceRecommendation[]> {
    const config = this.credentialConfigs.get(workflowId);
    if (!config) return [];

    const recommendations: ServiceRecommendation[] = [];

    // Check for critical services that aren't connected
    const criticalDisconnected = config.detectedServices.filter(
      s => s.priority === 'critical' && s.status !== ConnectionStatus.CONNECTED
    );

    if (criticalDisconnected.length > 0) {
      recommendations.push({
        type: 'security',
        title: 'Connect Critical Services First',
        description: `${criticalDisconnected.length} critical service${criticalDisconnected.length > 1 ? 's' : ''} need${criticalDisconnected.length === 1 ? 's' : ''} to be connected`,
        businessReason: 'Critical services are essential for your workflow to function properly',
        priority: 'critical',
        effort: 'minimal'
      });
    }

    // Check for expired connections
    const expiredConnections = config.detectedServices.filter(
      s => s.status === ConnectionStatus.EXPIRED
    );

    if (expiredConnections.length > 0) {
      recommendations.push({
        type: 'security',
        title: 'Renew Expired Connections',
        description: `${expiredConnections.length} connection${expiredConnections.length > 1 ? 's have' : ' has'} expired`,
        businessReason: 'Expired connections will prevent your automations from working',
        priority: 'high',
        effort: 'minimal'
      });
    }

    return recommendations;
  }

  /**
   * Convert detected services to service connection cards
   */
  private async convertDetectedServicesToCards(
    detectionResult: ServiceDetectionResult,
    workflowTemplate: ClientWorkflowTemplate
  ): Promise<ServiceConnectionCard[]> {
    const cards: ServiceConnectionCard[] = [];

    for (const detectedService of detectionResult.detectedServices) {
      const connectionDetails: ServiceConnectionDetails = {
        connectionType: this.getConnectionTypeForService(detectedService.serviceId),
        authenticationStatus: 'pending',
        connectionFields: this.getServiceConnectionFields(detectedService.serviceId)
      };

      const card: ServiceConnectionCard = {
        serviceId: detectedService.serviceId,
        displayName: detectedService.businessMapping.displayName,
        businessDescription: detectedService.businessMapping.businessDescription,
        icon: detectedService.businessMapping.icon,
        category: detectedService.businessMapping.category,
        status: ConnectionStatus.DISCONNECTED,
        required: detectedService.required,
        priority: detectedService.usageContext.criticality === 'essential' ? 'critical' : 'high',
        setupComplexity: detectedService.businessMapping.setupComplexity,
        estimatedSetupTime: detectedService.businessMapping.estimatedSetupTime,
        businessValue: detectedService.businessMapping.businessValue,
        connectionDetails,
        metadata: {
          nodeType: detectedService.nodeType,
          confidence: detectedService.confidence,
          usageContext: detectedService.usageContext
        }
      };

      cards.push(card);
    }

    return cards;
  }

  /**
   * Get connection type for a service
   */
  private getConnectionTypeForService(serviceId: string): 'oauth' | 'api_key' | 'username_password' | 'webhook' | 'custom' {
    const serviceDefinition = this.detector.getServiceDefinition(serviceId);
    if (!serviceDefinition) return 'custom';

    if (serviceDefinition.requiredCredentials.includes('oauth')) return 'oauth';
    if (serviceDefinition.requiredCredentials.includes('api_key')) return 'api_key';
    if (serviceId === 'webhook') return 'webhook';
    
    return 'api_key'; // Default
  }

  /**
   * Create business context from workflow template
   */
  private createBusinessContext(
    template: ClientWorkflowTemplate,
    partial?: Partial<BusinessContext>
  ): BusinessContext {
    return {
      industry: template.industry?.[0] || 'General Business',
      useCase: template.businessDescription,
      businessGoals: template.features || [],
      complianceRequirements: [],
      expectedROI: `$${template.monthlyValue}/month`,
      criticalServices: [],
      ...partial
    };
  }

  /**
   * Calculate setup progress
   */
  private calculateSetupProgress(services: ServiceConnectionCard[]): SetupProgress {
    const totalServices = services.length;
    const connectedServices = services.filter(s => s.status === ConnectionStatus.CONNECTED).length;
    const requiredServices = services.filter(s => s.required).length;
    const connectedRequiredServices = services.filter(s => s.required && s.status === ConnectionStatus.CONNECTED).length;

    const blockers: ProgressBlocker[] = [];

    // Check for missing critical connections
    services
      .filter(s => s.priority === 'critical' && s.status !== ConnectionStatus.CONNECTED)
      .forEach(service => {
        blockers.push({
          type: 'missing_credential',
          serviceId: service.serviceId,
          message: `${service.displayName} connection required`,
          resolution: `Connect your ${service.displayName} account to continue`,
          priority: 'critical'
        });
      });

    // Check for failed connections
    services
      .filter(s => s.status === ConnectionStatus.FAILED)
      .forEach(service => {
        blockers.push({
          type: 'connection_failed',
          serviceId: service.serviceId,
          message: `${service.displayName} connection failed`,
          resolution: `Check your credentials and try connecting again`,
          priority: service.priority
        });
      });

    // Estimate time remaining
    const remainingServices = totalServices - connectedServices;
    const avgSetupTime = services.reduce((sum, s) => {
      const timeStr = s.estimatedSetupTime;
      const minutes = parseInt(timeStr.match(/\d+/)?.[0] || '5');
      return sum + minutes;
    }, 0) / totalServices;
    
    const estimatedTimeRemaining = `${Math.ceil(remainingServices * avgSetupTime)} minutes`;

    return {
      totalSteps: 6, // Based on setup wizard steps
      completedSteps: connectedRequiredServices === requiredServices ? 2 : 1,
      currentStep: 2, // Credentials step
      servicesConfigured: connectedServices,
      servicesTotal: totalServices,
      estimatedTimeRemaining,
      blockers
    };
  }

  /**
   * Create default security settings
   */
  private createDefaultSecuritySettings(): SecuritySettings {
    return {
      encryptionEnabled: true,
      keyRotationEnabled: true,
      auditLoggingEnabled: true,
      accessRestrictions: [],
      dataRetentionPolicy: {
        credentialRetentionDays: 365,
        logRetentionDays: 90,
        autoCleanupEnabled: true,
        complianceMode: 'gdpr'
      }
    };
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Set up default event listeners
    Object.values(SmartCredentialEventType).forEach(eventType => {
      this.eventListeners.set(eventType, []);
    });
  }

  /**
   * Emit an event
   */
  private async emitEvent(event: SmartCredentialEvent): Promise<void> {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe to events
   */
  public addEventListener(
    eventType: SmartCredentialEventType,
    listener: (event: SmartCredentialEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Unsubscribe from events
   */
  public removeEventListener(
    eventType: SmartCredentialEventType,
    listener: (event: SmartCredentialEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  /**
   * Get all service categories
   */
  public getServiceCategories(): ServiceCategory[] {
    return Object.values(ServiceCategory);
  }

  /**
   * Get services by category
   */
  public getServicesByCategory(category: ServiceCategory) {
    return this.detector.getServicesByCategory(category);
  }

  /**
   * Reset configuration for a workflow
   */
  public resetConfiguration(workflowId: string): void {
    this.credentialConfigs.delete(workflowId);
    this.serviceConnections.delete(workflowId);
  }

  /**
   * Get service cards for business-friendly display
   */
  public async getServiceCards(): Promise<ServiceConnectionCard[]> {
    const services = this.detector.getAllServices();
    
    return services.map(service => ({
      serviceId: service.serviceId,
      displayName: service.displayName,
      businessDescription: service.businessDescription,
      icon: service.icon,
      category: service.category as ServiceCategory,
      status: ConnectionStatus.DISCONNECTED,
      required: false,
      priority: 'medium' as const,
      setupComplexity: service.setupComplexity as 'simple' | 'moderate' | 'complex',
      estimatedSetupTime: service.estimatedSetupTime,
      businessValue: service.businessValue,
      connectionDetails: undefined,
      lastTested: undefined,
      connectedAt: undefined,
      metadata: {}
    }));
  }

  /**
   * Generate OAuth URL for a service
   */
  public async generateOAuthUrl(serviceId: string, workflowId: string, userId: string): Promise<string> {
    // Generate state parameter for security
    const state = `${workflowId}_${userId}_${Date.now()}`;
    
    // Service-specific OAuth URLs (in production these would come from env vars)
    const oauthUrls: { [key: string]: string } = {
      gmail: `https://accounts.google.com/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent('http://localhost:3002/api/oauth/callback')}&scope=${encodeURIComponent('email https://www.googleapis.com/auth/gmail.readonly')}&response_type=code&state=${state}`,
      slack: `https://slack.com/oauth/v2/authorize?client_id=YOUR_CLIENT_ID&scope=channels:read,chat:write&redirect_uri=${encodeURIComponent('http://localhost:3002/api/oauth/callback')}&state=${state}`,
      office365: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=${encodeURIComponent('http://localhost:3002/api/oauth/callback')}&scope=${encodeURIComponent('User.Read Mail.Read')}&state=${state}`
    };

    return oauthUrls[serviceId] || `http://localhost:3002/api/oauth/callback?error=unsupported_service&state=${state}`;
  }

  /**
   * Handle OAuth callback for Smart Credential Assistant
   */
  public async handleOAuthCallback(code: string, state: string): Promise<{
    success: boolean;
    serviceId: string;
    businessImpact: string;
    nextSteps: string[];
  }> {
    // Parse state to extract service and workflow info
    const [workflowId, userId] = state.split('_');
    
    // Mock successful OAuth processing
    return {
      success: true,
      serviceId: 'gmail', // Would be determined from state in real implementation
      businessImpact: 'Your Gmail integration is now active and ready to automate email workflows',
      nextSteps: [
        'Configure email templates and automation rules',
        'Test the integration with a sample workflow',
        'Monitor performance and optimize settings'
      ]
    };
  }

  /**
   * Get required fields for a service
   */
  private getRequiredFieldsForService(serviceId: string): ConnectionField[] {
    const commonFields: { [key: string]: ConnectionField[] } = {
      gmail: [
        {
          fieldId: 'scopes',
          label: 'Email Permissions',
          businessDescription: 'Access level for your Gmail account',
          type: 'select',
          required: true,
          sensitive: false,
          options: [
            { value: 'read', label: 'Read emails only', description: 'Process incoming emails' },
            { value: 'send', label: 'Send emails', description: 'Automate email responses' }
          ]
        }
      ],
      slack: [
        {
          fieldId: 'workspace',
          label: 'Slack Workspace',
          businessDescription: 'Your team\'s Slack workspace URL',
          type: 'text',
          required: true,
          sensitive: false,
          placeholder: 'your-team.slack.com'
        }
      ],
      office365: [
        {
          fieldId: 'tenant',
          label: 'Organization Domain',
          businessDescription: 'Your company\'s Microsoft 365 domain',
          type: 'text',
          required: true,
          sensitive: false,
          placeholder: 'company.onmicrosoft.com'
        }
      ]
    };

    return commonFields[serviceId] || [];
  }
}

// Export singleton instance
export const smartCredentialService = new SmartCredentialService();