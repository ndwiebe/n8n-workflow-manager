/**
 * Service Detection Engine
 * Analyzes n8n workflows to detect required services and map them to business-friendly descriptions
 */

import { N8nWorkflow } from './n8nService';
import {
  ServiceDetectionResult,
  DetectedService,
  ServiceCategory,
  BusinessServiceMapping,
  ServiceUsageContext,
  WorkflowAnalysis,
  ServiceRecommendation,
  DetectionMetadata
} from '../types/smartCredentials';

interface ServiceDefinition {
  nodeTypes: string[]; // n8n node types that use this service
  displayName: string;
  businessDescription: string;
  category: ServiceCategory;
  icon: string;
  businessValue: string;
  setupComplexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: string;
  keywords: string[]; // Keywords for detection
  aliases: string[]; // Alternative names
  requiredCredentials: string[];
  commonActions: string[];
  apiEndpoints?: string[];
  webhookSupport?: boolean;
}

export class ServiceDetector {
  private serviceDefinitions: Map<string, ServiceDefinition> = new Map();
  private nodeTypeMapping: Map<string, string> = new Map(); // Maps n8n node types to service IDs

  constructor() {
    this.initializeServiceDefinitions();
    this.buildNodeTypeMapping();
  }

  /**
   * Analyze a workflow and detect required services
   */
  public async detectServices(workflow: N8nWorkflow): Promise<ServiceDetectionResult> {
    const startTime = Date.now();
    
    try {
      // Analyze workflow structure
      const workflowAnalysis = this.analyzeWorkflow(workflow);
      
      // Detect services from nodes
      const detectedServices = await this.detectServicesFromNodes(workflow);
      
      // Calculate overall confidence
      const detectionConfidence = this.calculateDetectionConfidence(detectedServices, workflowAnalysis);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(detectedServices, workflowAnalysis);
      
      const detectionMetadata: DetectionMetadata = {
        detectedAt: new Date(),
        detectionMethod: 'node_analysis',
        workflowAnalysis,
        recommendations
      };

      return {
        workflowId: workflow.id,
        detectedServices,
        detectionConfidence,
        detectionMetadata
      };
    } catch (error) {
      console.error('Service detection failed:', error);
      throw new Error(`Failed to detect services for workflow ${workflow.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect services from workflow nodes
   */
  private async detectServicesFromNodes(workflow: N8nWorkflow): Promise<DetectedService[]> {
    const detectedServices: Map<string, DetectedService> = new Map();
    
    if (!workflow.nodes) {
      return [];
    }

    for (const node of workflow.nodes) {
      const serviceId = this.getServiceIdFromNode(node);
      
      if (serviceId) {
        const serviceDefinition = this.serviceDefinitions.get(serviceId);
        if (!serviceDefinition) continue;

        // Determine service usage context
        const usageContext = this.analyzeNodeUsage(node, workflow);
        
        // Check if service is already detected
        const existing = detectedServices.get(serviceId);
        if (existing) {
          // Merge usage contexts
          existing.usageContext.actions = Array.from(new Set([
            ...existing.usageContext.actions,
            ...usageContext.actions
          ]));
          existing.confidence = Math.max(existing.confidence, 0.9);
        } else {
          const detectedService: DetectedService = {
            serviceId,
            serviceName: serviceDefinition.displayName,
            nodeType: node.type,
            confidence: 0.9, // High confidence for direct node matches
            required: this.isServiceRequired(node, workflow),
            usageContext,
            businessMapping: {
              displayName: serviceDefinition.displayName,
              businessDescription: serviceDefinition.businessDescription,
              category: serviceDefinition.category,
              icon: serviceDefinition.icon,
              businessValue: serviceDefinition.businessValue,
              setupComplexity: serviceDefinition.setupComplexity,
              estimatedSetupTime: serviceDefinition.estimatedSetupTime
            }
          };

          detectedServices.set(serviceId, detectedService);
        }
      }
    }

    return Array.from(detectedServices.values());
  }

  /**
   * Analyze workflow structure and complexity
   */
  private analyzeWorkflow(workflow: N8nWorkflow): WorkflowAnalysis {
    const nodes = workflow.nodes || [];
    const totalNodes = nodes.length;
    
    // Count different types of nodes
    const serviceNodes = nodes.filter(node => this.isServiceNode(node)).length;
    const triggerNodes = nodes.filter(node => this.isTriggerNode(node)).length;
    const actionNodes = nodes.filter(node => this.isActionNode(node)).length;
    
    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex' | 'enterprise' = 'simple';
    if (totalNodes > 20) complexity = 'enterprise';
    else if (totalNodes > 10) complexity = 'complex';
    else if (totalNodes > 5) complexity = 'moderate';
    
    // Estimate setup time based on service nodes and complexity
    const baseTime = serviceNodes * 3; // 3 minutes per service
    const complexityMultiplier = { simple: 1, moderate: 1.5, complex: 2, enterprise: 3 };
    const estimatedSetupTime = Math.round(baseTime * complexityMultiplier[complexity]);

    return {
      totalNodes,
      serviceNodes,
      triggerNodes,
      actionNodes,
      complexity,
      estimatedSetupTime
    };
  }

  /**
   * Get service ID from node type
   */
  private getServiceIdFromNode(node: any): string | null {
    const nodeType = node.type.toLowerCase();
    return this.nodeTypeMapping.get(nodeType) || null;
  }

  /**
   * Analyze how a node uses a service
   */
  private analyzeNodeUsage(node: any, workflow: N8nWorkflow): ServiceUsageContext {
    const parameters = node.parameters || {};
    const nodeType = node.type.toLowerCase();
    
    // Determine actions based on node type and parameters
    const actions = this.getNodeActions(nodeType, parameters);
    
    // Determine data flow
    const dataFlow = this.determineDataFlow(node, workflow);
    
    // Determine frequency
    const frequency = this.determineFrequency(node, workflow);
    
    // Determine criticality
    const criticality = this.determineCriticality(node, workflow);

    return {
      actions,
      dataFlow,
      frequency,
      criticality
    };
  }

  /**
   * Initialize service definitions with business-friendly descriptions
   */
  private initializeServiceDefinitions(): void {
    const services: ServiceDefinition[] = [
      // Communication
      {
        nodeTypes: ['n8n-nodes-base.slack', 'slack'],
        displayName: 'Slack',
        businessDescription: 'Team communication and collaboration platform',
        category: ServiceCategory.COMMUNICATION,
        icon: 'ChatIcon',
        businessValue: 'Automate team notifications, status updates, and project alerts',
        setupComplexity: 'simple',
        estimatedSetupTime: '2 minutes',
        keywords: ['slack', 'team', 'chat', 'communication'],
        aliases: ['slack'],
        requiredCredentials: ['slack_oauth'],
        commonActions: ['send message', 'create channel', 'invite user'],
        webhookSupport: true
      },
      {
        nodeTypes: ['n8n-nodes-base.microsoftTeams', 'microsoftteams'],
        displayName: 'Microsoft Teams',
        businessDescription: 'Microsoft collaboration and communication platform',
        category: ServiceCategory.COMMUNICATION,
        icon: 'GroupsIcon',
        businessValue: 'Integrate with Microsoft ecosystem for team communications',
        setupComplexity: 'moderate',
        estimatedSetupTime: '5 minutes',
        keywords: ['teams', 'microsoft', 'communication'],
        aliases: ['teams', 'ms teams'],
        requiredCredentials: ['microsoft_teams_oauth'],
        commonActions: ['send message', 'create meeting', 'post notification']
      },

      // Email Marketing
      {
        nodeTypes: ['n8n-nodes-base.mailchimp', 'mailchimp'],
        displayName: 'Mailchimp',
        businessDescription: 'Email marketing and automation platform',
        category: ServiceCategory.EMAIL_MARKETING,
        icon: 'EmailIcon',
        businessValue: 'Automate email campaigns, subscriber management, and marketing workflows',
        setupComplexity: 'simple',
        estimatedSetupTime: '3 minutes',
        keywords: ['mailchimp', 'email', 'marketing', 'newsletter'],
        aliases: ['mailchimp'],
        requiredCredentials: ['mailchimp_api'],
        commonActions: ['add subscriber', 'send campaign', 'update contact']
      },
      {
        nodeTypes: ['n8n-nodes-base.gmail', 'gmail'],
        displayName: 'Gmail',
        businessDescription: 'Google email service for business communication',
        category: ServiceCategory.EMAIL_MARKETING,
        icon: 'MailIcon',
        businessValue: 'Automate email sending, organize inbox, and manage business correspondence',
        setupComplexity: 'moderate',
        estimatedSetupTime: '4 minutes',
        keywords: ['gmail', 'email', 'google'],
        aliases: ['gmail', 'google mail'],
        requiredCredentials: ['gmail_oauth'],
        commonActions: ['send email', 'read email', 'search messages']
      },

      // CRM
      {
        nodeTypes: ['n8n-nodes-base.hubspot', 'hubspot'],
        displayName: 'HubSpot',
        businessDescription: 'Complete CRM and marketing automation platform',
        category: ServiceCategory.CRM,
        icon: 'ContactsIcon',
        businessValue: 'Sync customer data, automate sales processes, and track lead interactions',
        setupComplexity: 'moderate',
        estimatedSetupTime: '5 minutes',
        keywords: ['hubspot', 'crm', 'sales', 'marketing'],
        aliases: ['hubspot'],
        requiredCredentials: ['hubspot_api'],
        commonActions: ['create contact', 'update deal', 'track activity']
      },
      {
        nodeTypes: ['n8n-nodes-base.salesforce', 'salesforce'],
        displayName: 'Salesforce',
        businessDescription: 'Enterprise CRM and customer success platform',
        category: ServiceCategory.CRM,
        icon: 'BusinessIcon',
        businessValue: 'Integrate enterprise sales data, automate lead management, and sync customer records',
        setupComplexity: 'complex',
        estimatedSetupTime: '10 minutes',
        keywords: ['salesforce', 'crm', 'enterprise', 'sales'],
        aliases: ['salesforce', 'sfdc'],
        requiredCredentials: ['salesforce_oauth'],
        commonActions: ['create lead', 'update opportunity', 'sync data']
      },

      // E-commerce
      {
        nodeTypes: ['n8n-nodes-base.shopify', 'shopify'],
        displayName: 'Shopify',
        businessDescription: 'E-commerce platform for online stores',
        category: ServiceCategory.E_COMMERCE,
        icon: 'StoreIcon',
        businessValue: 'Automate order processing, inventory management, and customer communications',
        setupComplexity: 'moderate',
        estimatedSetupTime: '7 minutes',
        keywords: ['shopify', 'ecommerce', 'store', 'orders'],
        aliases: ['shopify'],
        requiredCredentials: ['shopify_api'],
        commonActions: ['create order', 'update inventory', 'process payment']
      },
      {
        nodeTypes: ['n8n-nodes-base.woocommerce', 'woocommerce'],
        displayName: 'WooCommerce',
        businessDescription: 'WordPress e-commerce plugin',
        category: ServiceCategory.E_COMMERCE,
        icon: 'ShoppingCartIcon',
        businessValue: 'Sync WordPress store data, automate order fulfillment, and manage products',
        setupComplexity: 'moderate',
        estimatedSetupTime: '6 minutes',
        keywords: ['woocommerce', 'wordpress', 'ecommerce'],
        aliases: ['woocommerce', 'woo'],
        requiredCredentials: ['woocommerce_api'],
        commonActions: ['create product', 'process order', 'update stock']
      },

      // File Storage
      {
        nodeTypes: ['n8n-nodes-base.googleDrive', 'googledrive'],
        displayName: 'Google Drive',
        businessDescription: 'Cloud file storage and collaboration',
        category: ServiceCategory.FILE_STORAGE,
        icon: 'CloudIcon',
        businessValue: 'Automate file organization, backup processes, and document workflows',
        setupComplexity: 'simple',
        estimatedSetupTime: '3 minutes',
        keywords: ['drive', 'google', 'files', 'storage'],
        aliases: ['google drive', 'gdrive'],
        requiredCredentials: ['google_drive_oauth'],
        commonActions: ['upload file', 'create folder', 'share document']
      },
      {
        nodeTypes: ['n8n-nodes-base.dropbox', 'dropbox'],
        displayName: 'Dropbox',
        businessDescription: 'Cloud file storage and synchronization',
        category: ServiceCategory.FILE_STORAGE,
        icon: 'FolderIcon',
        businessValue: 'Sync files across devices, backup important documents, and collaborate on projects',
        setupComplexity: 'simple',
        estimatedSetupTime: '3 minutes',
        keywords: ['dropbox', 'files', 'storage', 'sync'],
        aliases: ['dropbox'],
        requiredCredentials: ['dropbox_oauth'],
        commonActions: ['upload file', 'download file', 'sync folder']
      },

      // Accounting
      {
        nodeTypes: ['n8n-nodes-base.quickbooks', 'quickbooks'],
        displayName: 'QuickBooks',
        businessDescription: 'Accounting and bookkeeping software',
        category: ServiceCategory.ACCOUNTING,
        icon: 'AccountBalanceIcon',
        businessValue: 'Automate invoice processing, expense tracking, and financial reporting',
        setupComplexity: 'complex',
        estimatedSetupTime: '8 minutes',
        keywords: ['quickbooks', 'accounting', 'invoices', 'expenses'],
        aliases: ['quickbooks', 'qb'],
        requiredCredentials: ['quickbooks_oauth'],
        commonActions: ['create invoice', 'track expense', 'sync transactions']
      },

      // Project Management
      {
        nodeTypes: ['n8n-nodes-base.trello', 'trello'],
        displayName: 'Trello',
        businessDescription: 'Visual project management with boards and cards',
        category: ServiceCategory.PROJECT_MANAGEMENT,
        icon: 'DashboardIcon',
        businessValue: 'Automate task creation, project updates, and team collaboration',
        setupComplexity: 'simple',
        estimatedSetupTime: '3 minutes',
        keywords: ['trello', 'project', 'tasks', 'boards'],
        aliases: ['trello'],
        requiredCredentials: ['trello_oauth'],
        commonActions: ['create card', 'move task', 'add member']
      },
      {
        nodeTypes: ['n8n-nodes-base.asana', 'asana'],
        displayName: 'Asana',
        businessDescription: 'Team project and task management platform',
        category: ServiceCategory.PROJECT_MANAGEMENT,
        icon: 'AssignmentIcon',
        businessValue: 'Streamline project workflows, automate task assignments, and track progress',
        setupComplexity: 'moderate',
        estimatedSetupTime: '5 minutes',
        keywords: ['asana', 'project', 'tasks', 'team'],
        aliases: ['asana'],
        requiredCredentials: ['asana_oauth'],
        commonActions: ['create task', 'update project', 'assign work']
      },

      // Generic HTTP/API
      {
        nodeTypes: ['n8n-nodes-base.httpRequest', 'httprequest'],
        displayName: 'Custom API',
        businessDescription: 'Connect to any web service or API',
        category: ServiceCategory.API,
        icon: 'ApiIcon',
        businessValue: 'Integrate with custom systems, third-party services, and internal APIs',
        setupComplexity: 'complex',
        estimatedSetupTime: '10 minutes',
        keywords: ['http', 'api', 'rest', 'custom'],
        aliases: ['http', 'api', 'rest'],
        requiredCredentials: ['api_key', 'custom'],
        commonActions: ['make request', 'post data', 'get information']
      },

      // Webhooks
      {
        nodeTypes: ['n8n-nodes-base.webhook', 'webhook'],
        displayName: 'Webhook',
        businessDescription: 'Receive real-time data from external systems',
        category: ServiceCategory.API,
        icon: 'WebhookIcon',
        businessValue: 'Trigger automations instantly when events occur in other systems',
        setupComplexity: 'moderate',
        estimatedSetupTime: '5 minutes',
        keywords: ['webhook', 'trigger', 'real-time'],
        aliases: ['webhook'],
        requiredCredentials: [],
        commonActions: ['receive data', 'trigger workflow', 'process event']
      }
    ];

    // Store service definitions
    for (const service of services) {
      this.serviceDefinitions.set(service.displayName.toLowerCase().replace(/\s+/g, '_'), service);
    }
  }

  /**
   * Build mapping of n8n node types to service IDs
   */
  private buildNodeTypeMapping(): void {
    this.serviceDefinitions.forEach((definition, serviceId) => {
      for (const nodeType of definition.nodeTypes) {
        this.nodeTypeMapping.set(nodeType.toLowerCase(), serviceId);
      }
    });
  }

  /**
   * Check if a node represents a service connection
   */
  private isServiceNode(node: any): boolean {
    return this.nodeTypeMapping.has(node.type.toLowerCase());
  }

  /**
   * Check if a node is a trigger node
   */
  private isTriggerNode(node: any): boolean {
    const triggerTypes = ['trigger', 'webhook', 'cron', 'manual'];
    return triggerTypes.some(type => node.type.toLowerCase().includes(type));
  }

  /**
   * Check if a node is an action node
   */
  private isActionNode(node: any): boolean {
    return !this.isTriggerNode(node) && this.isServiceNode(node);
  }

  /**
   * Determine if a service is required based on node position and connections
   */
  private isServiceRequired(node: any, workflow: N8nWorkflow): boolean {
    // For now, assume all detected services are required
    // This can be enhanced with more sophisticated analysis
    return true;
  }

  /**
   * Get actions performed by a node
   */
  private getNodeActions(nodeType: string, parameters: any): string[] {
    const actions: string[] = [];
    
    // Extract actions from parameters
    if (parameters.operation) {
      actions.push(parameters.operation);
    }
    if (parameters.resource) {
      actions.push(`${parameters.operation || 'manage'} ${parameters.resource}`);
    }
    
    // Default actions based on node type
    if (actions.length === 0) {
      const serviceId = this.nodeTypeMapping.get(nodeType);
      if (serviceId) {
        const definition = this.serviceDefinitions.get(serviceId);
        if (definition) {
          actions.push(...definition.commonActions);
        }
      }
    }
    
    return actions.length > 0 ? actions : ['general integration'];
  }

  /**
   * Determine data flow direction for a node
   */
  private determineDataFlow(node: any, workflow: N8nWorkflow): 'input' | 'output' | 'bidirectional' {
    // This is a simplified implementation
    // In a real scenario, you'd analyze the node connections
    const nodeType = node.type.toLowerCase();
    
    if (nodeType.includes('trigger') || nodeType.includes('webhook')) {
      return 'input';
    }
    
    return 'bidirectional'; // Default assumption
  }

  /**
   * Determine frequency of service usage
   */
  private determineFrequency(node: any, workflow: N8nWorkflow): 'once' | 'periodic' | 'real_time' | 'batch' {
    const nodeType = node.type.toLowerCase();
    
    if (nodeType.includes('trigger') || nodeType.includes('webhook')) {
      return 'real_time';
    }
    
    if (nodeType.includes('cron') || nodeType.includes('schedule')) {
      return 'periodic';
    }
    
    return 'batch'; // Default assumption
  }

  /**
   * Determine criticality of a service in the workflow
   */
  private determineCriticality(node: any, workflow: N8nWorkflow): 'essential' | 'important' | 'optional' {
    const nodeType = node.type.toLowerCase();
    
    // Triggers are usually essential
    if (nodeType.includes('trigger') || nodeType.includes('webhook')) {
      return 'essential';
    }
    
    // For now, assume all other services are important
    return 'important';
  }

  /**
   * Calculate overall detection confidence
   */
  private calculateDetectionConfidence(
    detectedServices: DetectedService[],
    workflowAnalysis: WorkflowAnalysis
  ): number {
    if (detectedServices.length === 0) return 0;
    
    const avgConfidence = detectedServices.reduce((sum, service) => sum + service.confidence, 0) / detectedServices.length;
    const complexityFactor = workflowAnalysis.complexity === 'simple' ? 1 : 0.9;
    
    return Math.min(avgConfidence * complexityFactor, 1);
  }

  /**
   * Generate recommendations based on detected services and workflow analysis
   */
  private async generateRecommendations(
    detectedServices: DetectedService[],
    workflowAnalysis: WorkflowAnalysis
  ): Promise<ServiceRecommendation[]> {
    const recommendations: ServiceRecommendation[] = [];
    
    // Recommend security enhancements for complex workflows
    if (workflowAnalysis.complexity === 'complex' || workflowAnalysis.complexity === 'enterprise') {
      recommendations.push({
        type: 'security',
        title: 'Enable Enhanced Security',
        description: 'Consider enabling additional security features for this complex workflow',
        businessReason: 'Complex workflows with multiple services benefit from enhanced monitoring and security controls',
        priority: 'high',
        effort: 'moderate'
      });
    }
    
    // Recommend testing for critical services
    const criticalServices = detectedServices.filter(s => s.usageContext.criticality === 'essential');
    if (criticalServices.length > 0) {
      recommendations.push({
        type: 'optimization',
        title: 'Test Critical Connections',
        description: 'Ensure all critical service connections are thoroughly tested',
        businessReason: 'Critical services must be reliable to avoid workflow failures',
        priority: 'critical',
        effort: 'minimal'
      });
    }
    
    return recommendations;
  }

  /**
   * Get service definition by ID
   */
  public getServiceDefinition(serviceId: string): ServiceDefinition | undefined {
    return this.serviceDefinitions.get(serviceId);
  }

  /**
   * Get all supported services with their IDs
   */
  public getAllServices(): Array<ServiceDefinition & { serviceId: string; serviceName: string; supportedFeatures: string[] }> {
    const services: Array<ServiceDefinition & { serviceId: string; serviceName: string; supportedFeatures: string[] }> = [];
    this.serviceDefinitions.forEach((service, serviceId) => {
      services.push({
        ...service,
        serviceId,
        serviceName: service.displayName,
        supportedFeatures: service.commonActions
      });
    });
    return services;
  }

  /**
   * Search services by category
   */
  public getServicesByCategory(category: ServiceCategory): ServiceDefinition[] {
    const services: ServiceDefinition[] = [];
    this.serviceDefinitions.forEach(service => {
      if (service.category === category) {
        services.push(service);
      }
    });
    return services;
  }
}

// Export singleton instance
export const serviceDetector = new ServiceDetector();