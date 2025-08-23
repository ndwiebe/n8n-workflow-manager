/**
 * Workflow Analysis Service
 * Analyzes n8n workflows to detect interaction requirements and generate metadata
 */

export interface WorkflowInteractionMetadata {
  workflowId: string;
  interactionType: 'form' | 'chat' | 'monitor' | 'hybrid' | 'none';
  capabilities: {
    hasFormInput: boolean;
    hasWebhook: boolean;
    hasChatInterface: boolean;
    hasRealTimeData: boolean;
    hasAIProcessing: boolean;
    requiresUserInput: boolean;
  };
  formSchema?: FormFieldSchema[];
  chatConfiguration?: ChatInterfaceConfig;
  monitoringConfiguration?: MonitoringConfig;
  webhookUrl?: string;
  executionMode: 'webhook' | 'manual' | 'scheduled' | 'mixed';
}

export interface FormFieldSchema {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface ChatInterfaceConfig {
  supportsContext: boolean;
  messageTypes: ('text' | 'image' | 'file' | 'voice')[];
  suggestedActions: string[];
  responseFormat: 'text' | 'json' | 'structured';
}

export interface MonitoringConfig {
  updateFrequency: 'realtime' | 'periodic' | 'manual';
  dataTypes: ('metrics' | 'analytics' | 'alerts' | 'progress')[];
  visualizations: ('chart' | 'table' | 'card' | 'list')[];
  alertThresholds?: Record<string, number>;
}

export class WorkflowAnalysisService {
  /**
   * Analyze a workflow and determine its interaction requirements
   */
  async analyzeWorkflow(workflow: any): Promise<WorkflowInteractionMetadata> {
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};

    // Detect capabilities by analyzing nodes
    const capabilities = this.detectWorkflowCapabilities(nodes);
    
    // Determine primary interaction type
    const interactionType = this.determineInteractionType(capabilities);
    
    // Generate specific configurations
    const formSchema = capabilities.hasFormInput ? this.generateFormSchema(nodes) : undefined;
    const chatConfiguration = capabilities.hasChatInterface ? this.generateChatConfig(nodes) : undefined;
    const monitoringConfiguration = capabilities.hasRealTimeData ? this.generateMonitoringConfig(nodes) : undefined;
    
    // Extract webhook URL if present
    const webhookUrl = this.extractWebhookUrl(nodes);
    
    // Determine execution mode
    const executionMode = this.determineExecutionMode(nodes);

    return {
      workflowId: workflow.id,
      interactionType,
      capabilities,
      formSchema,
      chatConfiguration,
      monitoringConfiguration,
      webhookUrl,
      executionMode
    };
  }

  /**
   * Detect workflow capabilities by analyzing node types and configurations
   */
  private detectWorkflowCapabilities(nodes: any[]): WorkflowInteractionMetadata['capabilities'] {
    const capabilities = {
      hasFormInput: false,
      hasWebhook: false,
      hasChatInterface: false,
      hasRealTimeData: false,
      hasAIProcessing: false,
      requiresUserInput: false
    };

    for (const node of nodes) {
      const nodeType = node.type;
      const parameters = node.parameters || {};

      // Detect webhooks and form inputs
      if (nodeType === 'n8n-nodes-base.webhook') {
        capabilities.hasWebhook = true;
        capabilities.hasFormInput = parameters.httpMethod === 'POST';
        capabilities.requiresUserInput = true;
      }

      // Detect chat interfaces (simple pattern matching for now)
      if (nodeType.includes('openai') || 
          nodeType.includes('langchain') || 
          node.name?.toLowerCase().includes('chat') ||
          node.name?.toLowerCase().includes('assistant')) {
        capabilities.hasChatInterface = true;
        capabilities.hasAIProcessing = true;
        capabilities.requiresUserInput = true;
      }

      // Detect real-time data processing
      if (nodeType === 'n8n-nodes-base.httpRequest' || 
          nodeType === 'n8n-nodes-base.manualTrigger' ||
          node.name?.toLowerCase().includes('analytics') ||
          node.name?.toLowerCase().includes('dashboard') ||
          node.name?.toLowerCase().includes('monitor')) {
        capabilities.hasRealTimeData = true;
      }

      // Detect AI processing nodes
      if (nodeType.includes('openai') || 
          nodeType.includes('langchain') ||
          node.name?.toLowerCase().includes('ai') ||
          node.name?.toLowerCase().includes('analysis')) {
        capabilities.hasAIProcessing = true;
      }

      // Detect manual triggers (require user input)
      if (nodeType === 'n8n-nodes-base.manualTrigger') {
        capabilities.requiresUserInput = true;
      }
    }

    return capabilities;
  }

  /**
   * Determine the primary interaction type based on capabilities
   */
  private determineInteractionType(capabilities: WorkflowInteractionMetadata['capabilities']): WorkflowInteractionMetadata['interactionType'] {
    const capabilityCount = Object.values(capabilities).filter(Boolean).length;

    // Hybrid: Multiple significant capabilities
    if (capabilityCount >= 3 && capabilities.hasFormInput && capabilities.hasAIProcessing) {
      return 'hybrid';
    }

    // Form-based: Has webhook with form input
    if (capabilities.hasFormInput && capabilities.hasWebhook && !capabilities.hasChatInterface) {
      return 'form';
    }

    // Chat-based: Has AI/chat capabilities
    if (capabilities.hasChatInterface || (capabilities.hasAIProcessing && capabilities.requiresUserInput)) {
      return 'chat';
    }

    // Monitor-based: Real-time data without direct user input
    if (capabilities.hasRealTimeData && !capabilities.requiresUserInput) {
      return 'monitor';
    }

    return 'none';
  }

  /**
   * Generate form schema from webhook parameters and workflow structure
   */
  private generateFormSchema(nodes: any[]): FormFieldSchema[] {
    const webhookNode = nodes.find(node => node.type === 'n8n-nodes-base.webhook');
    if (!webhookNode) return [];

    // Analyze subsequent nodes to infer form fields
    const setNodes = nodes.filter(node => node.type === 'n8n-nodes-base.set');
    const formFields: FormFieldSchema[] = [];

    // Extract fields from Set nodes that process webhook data
    for (const setNode of setNodes) {
      const assignments = setNode.parameters?.assignments?.assignments || [];
      
      for (const assignment of assignments) {
        if (assignment.value?.includes('$json.body.')) {
          const fieldName = this.extractFieldName(assignment.value);
          if (fieldName && !formFields.find(f => f.name === fieldName)) {
            formFields.push({
              name: fieldName,
              label: this.formatLabel(fieldName),
              type: this.inferFieldType(fieldName, assignment),
              required: !assignment.value.includes('||'),
              placeholder: `Enter ${this.formatLabel(fieldName).toLowerCase()}`
            });
          }
        }
      }
    }

    // Add default fields if none detected
    if (formFields.length === 0) {
      return [
        {
          name: 'message',
          label: 'Message',
          type: 'textarea',
          required: true,
          placeholder: 'Enter your message'
        }
      ];
    }

    return formFields;
  }

  /**
   * Generate chat interface configuration
   */
  private generateChatConfig(nodes: any[]): ChatInterfaceConfig {
    const hasAINode = nodes.some(node => 
      node.type.includes('openai') || 
      node.type.includes('langchain') ||
      node.name?.toLowerCase().includes('ai')
    );

    return {
      supportsContext: true,
      messageTypes: ['text'],
      suggestedActions: hasAINode 
        ? ['Ask a question', 'Get help', 'View examples']
        : ['Send message', 'Get info', 'Contact support'],
      responseFormat: 'json'
    };
  }

  /**
   * Generate monitoring configuration
   */
  private generateMonitoringConfig(nodes: any[]): MonitoringConfig {
    const hasHttpRequest = nodes.some(node => node.type === 'n8n-nodes-base.httpRequest');
    const hasAnalytics = nodes.some(node => 
      node.name?.toLowerCase().includes('analytics') ||
      node.name?.toLowerCase().includes('dashboard') ||
      node.name?.toLowerCase().includes('metrics')
    );

    return {
      updateFrequency: hasHttpRequest ? 'periodic' : 'manual',
      dataTypes: hasAnalytics 
        ? ['metrics', 'analytics', 'alerts']
        : ['progress'],
      visualizations: hasAnalytics 
        ? ['chart', 'card', 'table']
        : ['card', 'list'],
      alertThresholds: hasAnalytics ? {
        'conversion_rate': 50,
        'bounce_rate': 60,
        'response_time': 5000
      } : undefined
    };
  }

  /**
   * Extract webhook URL from webhook node
   */
  private extractWebhookUrl(nodes: any[]): string | undefined {
    const webhookNode = nodes.find(node => node.type === 'n8n-nodes-base.webhook');
    if (!webhookNode) return undefined;

    const path = webhookNode.parameters?.path;
    if (!path) return undefined;

    // Return relative URL that will be resolved by the frontend
    return `/api/n8n/webhook/${path}`;
  }

  /**
   * Determine workflow execution mode
   */
  private determineExecutionMode(nodes: any[]): WorkflowInteractionMetadata['executionMode'] {
    const triggerTypes = nodes
      .filter(node => node.type.includes('trigger') || node.type.includes('Trigger'))
      .map(node => node.type);

    const hasWebhook = triggerTypes.some(type => type === 'n8n-nodes-base.webhook');
    const hasManual = triggerTypes.some(type => type === 'n8n-nodes-base.manualTrigger');
    const hasScheduled = triggerTypes.some(type => type.includes('cron') || type.includes('schedule'));

    if ([hasWebhook, hasManual, hasScheduled].filter(Boolean).length > 1) {
      return 'mixed';
    }

    if (hasWebhook) return 'webhook';
    if (hasManual) return 'manual';
    if (hasScheduled) return 'scheduled';

    return 'manual';
  }

  /**
   * Helper methods for field extraction and formatting
   */
  private extractFieldName(expression: string): string | null {
    const match = expression.match(/\$json\.body\.(\w+)/);
    return match ? match[1] : null;
  }

  private formatLabel(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private inferFieldType(fieldName: string, assignment: any): FormFieldSchema['type'] {
    const name = fieldName.toLowerCase();
    const type = assignment.type?.toLowerCase();

    if (name.includes('email')) return 'email';
    if (name.includes('rating') || name.includes('score') || type === 'number') return 'number';
    if (name.includes('message') || name.includes('comment') || name.includes('description')) return 'textarea';
    if (name.includes('category') || name.includes('type') || name.includes('status')) return 'select';
    
    return 'text';
  }

  /**
   * Batch analyze multiple workflows
   */
  async analyzeWorkflows(workflows: any[]): Promise<WorkflowInteractionMetadata[]> {
    const analyses = await Promise.all(
      workflows.map(workflow => this.analyzeWorkflow(workflow))
    );

    return analyses;
  }

  /**
   * Get interaction summary statistics
   */
  getInteractionStats(analyses: WorkflowInteractionMetadata[]) {
    const stats = {
      total: analyses.length,
      byType: {
        form: 0,
        chat: 0,
        monitor: 0,
        hybrid: 0,
        none: 0
      },
      capabilities: {
        hasFormInput: 0,
        hasWebhook: 0,
        hasChatInterface: 0,
        hasRealTimeData: 0,
        hasAIProcessing: 0,
        requiresUserInput: 0
      }
    };

    for (const analysis of analyses) {
      stats.byType[analysis.interactionType]++;
      
      for (const [capability, hasIt] of Object.entries(analysis.capabilities)) {
        if (hasIt) {
          stats.capabilities[capability as keyof typeof stats.capabilities]++;
        }
      }
    }

    return stats;
  }
}

export const workflowAnalysisService = new WorkflowAnalysisService();