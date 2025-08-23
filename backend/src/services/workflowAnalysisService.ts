import { N8nService } from './n8nService';
import { logger } from '../utils/logger';

export interface WorkflowInteractionCapability {
  type: 'form' | 'chat' | 'manual';
  confidence: number;
  reason: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    relevance: 'primary' | 'secondary';
  }>;
}

export interface WorkflowAnalysisResult {
  workflowId: string;
  workflowName: string;
  interactions: WorkflowInteractionCapability[];
  primaryInteractionType: 'form' | 'chat' | 'manual' | 'hybrid';
  complexity: 'low' | 'medium' | 'high';
  businessCategory: string;
  formCapability?: {
    fields: Array<{
      name: string;
      type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
      required: boolean;
      description?: string;
    }>;
    webhookUrl?: string;
  };
  chatCapability?: {
    aiProvider: string;
    conversationFlow: string[];
    contextAware: boolean;
  };
  monitoringCapability?: {
    realTimeUpdates: boolean;
    statusTracking: boolean;
    progressSteps: string[];
  };
}

class WorkflowAnalysisService {
  private n8nService: N8nService;

  constructor() {
    this.n8nService = new N8nService();
  }

  /**
   * Analyze workflow to determine interaction capabilities
   */
  async analyzeWorkflowInteractions(workflowId: string): Promise<WorkflowAnalysisResult | null> {
    try {
      // Get workflow definition from n8n
      const workflow = await this.n8nService.getWorkflow(workflowId);
      
      if (!workflow) {
        logger.warn(`Workflow ${workflowId} not found for analysis`);
        return this.generateFallbackAnalysis(workflowId);
      }

      const analysis = this.performWorkflowAnalysis(workflow);
      
      logger.info(`Analyzed workflow ${workflowId}: ${analysis.primaryInteractionType} interaction type`);
      
      return analysis;
    } catch (error) {
      logger.error(`Failed to analyze workflow ${workflowId}:`, error);
      // Return fallback analysis instead of null
      return this.generateFallbackAnalysis(workflowId);
    }
  }

  /**
   * Perform detailed analysis of workflow nodes and structure
   */
  private performWorkflowAnalysis(workflow: any): WorkflowAnalysisResult {
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};

    // Analyze nodes for interaction patterns
    const capabilities: WorkflowInteractionCapability[] = [];
    
    // Check for form interaction capability
    const formCapability = this.analyzeFormCapability(nodes, connections);
    if (formCapability.confidence > 0.3) {
      capabilities.push(formCapability);
    }

    // Check for chat interaction capability  
    const chatCapability = this.analyzeChatCapability(nodes, connections);
    if (chatCapability.confidence > 0.3) {
      capabilities.push(chatCapability);
    }

    // Check for manual interaction capability
    const manualCapability = this.analyzeManualCapability(nodes, connections);
    if (manualCapability.confidence > 0.3) {
      capabilities.push(manualCapability);
    }

    // Determine primary interaction type
    const primaryType = this.determinePrimaryInteractionType(capabilities);
    
    // Analyze complexity
    const complexity = this.analyzeComplexity(nodes, connections);
    
    // Determine business category
    const businessCategory = this.determineBusinessCategory(workflow);

    const result: WorkflowAnalysisResult = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      interactions: capabilities,
      primaryInteractionType: primaryType,
      complexity,
      businessCategory
    };

    // Add specific capability details
    if (capabilities.find(c => c.type === 'form')) {
      result.formCapability = this.buildFormCapability(nodes, connections);
    }

    if (capabilities.find(c => c.type === 'chat')) {
      result.chatCapability = this.buildChatCapability(nodes, connections);
    }

    // Always add monitoring capability for real-time updates
    result.monitoringCapability = this.buildMonitoringCapability(nodes, connections);

    return result;
  }

  /**
   * Analyze workflow for form interaction patterns
   */
  private analyzeFormCapability(nodes: any[], connections: any): WorkflowInteractionCapability {
    const formNodes = nodes.filter(node => 
      node.type === 'n8n-nodes-base.webhook' ||
      node.type === 'n8n-nodes-base.form' ||
      node.type === 'n8n-nodes-base.wait' ||
      (node.type === 'n8n-nodes-base.http' && node.parameters?.method === 'POST')
    );

    const dataProcessingNodes = nodes.filter(node =>
      node.type === 'n8n-nodes-base.set' ||
      node.type === 'n8n-nodes-base.function' ||
      node.type === 'n8n-nodes-base.if'
    );

    let confidence = 0;
    let reason = '';

    if (formNodes.length > 0) {
      confidence += 0.4;
      reason += 'Has webhook/form trigger nodes. ';
    }

    if (dataProcessingNodes.length > 0) {
      confidence += 0.3;
      reason += 'Has data processing nodes. ';
    }

    // Check for structured data flow
    if (this.hasStructuredDataFlow(nodes, connections)) {
      confidence += 0.2;
      reason += 'Has structured data flow. ';
    }

    return {
      type: 'form',
      confidence: Math.min(confidence, 1.0),
      reason: reason.trim() || 'No clear form interaction patterns',
      nodes: [...formNodes, ...dataProcessingNodes].map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        relevance: formNodes.includes(node) ? 'primary' : 'secondary'
      }))
    };
  }

  /**
   * Analyze workflow for chat/AI interaction patterns
   */
  private analyzeChatCapability(nodes: any[], connections: any): WorkflowInteractionCapability {
    const aiNodes = nodes.filter(node =>
      node.type?.includes('openAi') ||
      node.type?.includes('langchain') ||
      node.type === 'n8n-nodes-base.openAi' ||
      node.type === '@n8n/n8n-nodes-langchain.openAi' ||
      node.type?.includes('anthropic') ||
      node.type?.includes('claude')
    );

    const conversationNodes = nodes.filter(node =>
      node.type === 'n8n-nodes-base.slack' ||
      node.type === 'n8n-nodes-base.telegram' ||
      node.type === 'n8n-nodes-base.discord' ||
      node.type === 'n8n-nodes-base.webhook'
    );

    let confidence = 0;
    let reason = '';

    if (aiNodes.length > 0) {
      confidence += 0.5;
      reason += `Has ${aiNodes.length} AI/LLM nodes. `;
    }

    if (conversationNodes.length > 0) {
      confidence += 0.3;
      reason += 'Has conversation/messaging nodes. ';
    }

    // Check for iterative processing (conversations)
    if (this.hasIterativeProcessing(nodes, connections)) {
      confidence += 0.2;
      reason += 'Has iterative/loop processing. ';
    }

    return {
      type: 'chat',
      confidence: Math.min(confidence, 1.0),
      reason: reason.trim() || 'No clear chat interaction patterns',
      nodes: [...aiNodes, ...conversationNodes].map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        relevance: aiNodes.includes(node) ? 'primary' : 'secondary'
      }))
    };
  }

  /**
   * Analyze workflow for manual interaction patterns
   */
  private analyzeManualCapability(nodes: any[], connections: any): WorkflowInteractionCapability {
    const triggerNodes = nodes.filter(node =>
      node.type === 'n8n-nodes-base.manualTrigger' ||
      node.type === 'n8n-nodes-base.cron' ||
      node.type === 'n8n-nodes-base.interval'
    );

    const actionNodes = nodes.filter(node =>
      node.type === 'n8n-nodes-base.gmail' ||
      node.type === 'n8n-nodes-base.slack' ||
      node.type === 'n8n-nodes-base.googleSheets' ||
      node.type === 'n8n-nodes-base.notion' ||
      node.type === 'n8n-nodes-base.airtable'
    );

    let confidence = 0;
    let reason = '';

    if (triggerNodes.length > 0) {
      confidence += 0.3;
      reason += 'Has manual/scheduled triggers. ';
    }

    if (actionNodes.length > 0) {
      confidence += 0.4;
      reason += 'Has business application nodes. ';
    }

    // Check for sequential processing
    if (this.hasSequentialProcessing(nodes, connections)) {
      confidence += 0.3;
      reason += 'Has sequential processing flow. ';
    }

    return {
      type: 'manual',
      confidence: Math.min(confidence, 1.0),
      reason: reason.trim() || 'No clear manual interaction patterns',
      nodes: [...triggerNodes, ...actionNodes].map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        relevance: triggerNodes.includes(node) ? 'primary' : 'secondary'
      }))
    };
  }

  /**
   * Determine the primary interaction type based on capabilities
   */
  private determinePrimaryInteractionType(capabilities: WorkflowInteractionCapability[]): 'form' | 'chat' | 'manual' | 'hybrid' {
    if (capabilities.length === 0) {
      return 'manual';
    }

    if (capabilities.length > 1) {
      return 'hybrid';
    }

    const primary = capabilities.sort((a, b) => b.confidence - a.confidence)[0];
    return primary ? primary.type : 'manual';
  }

  /**
   * Analyze workflow complexity
   */
  private analyzeComplexity(nodes: any[], connections: any): 'low' | 'medium' | 'high' {
    const nodeCount = nodes.length;
    const connectionCount = Object.keys(connections).length;
    
    // Count conditional and loop nodes
    const complexNodes = nodes.filter(node =>
      node.type === 'n8n-nodes-base.if' ||
      node.type === 'n8n-nodes-base.switch' ||
      node.type === 'n8n-nodes-base.merge' ||
      node.type?.includes('loop')
    ).length;

    if (nodeCount <= 5 && connectionCount <= 3 && complexNodes === 0) {
      return 'low';
    } else if (nodeCount <= 15 && connectionCount <= 10 && complexNodes <= 2) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Determine business category from workflow structure
   */
  private determineBusinessCategory(workflow: any): string {
    const name = workflow.name?.toLowerCase() || '';
    const nodes = workflow.nodes || [];

    // Check workflow name for category hints
    if (name.includes('customer') || name.includes('support') || name.includes('feedback')) {
      return 'customer-service';
    } else if (name.includes('sales') || name.includes('lead') || name.includes('crm')) {
      return 'sales';
    } else if (name.includes('marketing') || name.includes('campaign') || name.includes('email')) {
      return 'marketing';
    } else if (name.includes('hr') || name.includes('employee') || name.includes('onboard')) {
      return 'human-resources';
    } else if (name.includes('finance') || name.includes('invoice') || name.includes('payment')) {
      return 'finance';
    }

    // Check nodes for category hints
    const hasGmail = nodes.some((n: any) => n.type === 'n8n-nodes-base.gmail');
    const hasSlack = nodes.some((n: any) => n.type === 'n8n-nodes-base.slack');
    const hasSheets = nodes.some((n: any) => n.type === 'n8n-nodes-base.googleSheets');
    const hasAI = nodes.some((n: any) => n.type?.includes('openAi') || n.type?.includes('langchain'));

    if (hasAI && hasSlack) {
      return 'customer-service';
    } else if (hasGmail && hasSheets) {
      return 'sales';
    } else if (hasAI) {
      return 'automation';
    }

    return 'operations';
  }

  /**
   * Build form capability details
   */
  private buildFormCapability(nodes: any[], connections: any): any {
    const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    
    // Extract potential form fields from workflow
    const fields = this.extractFormFields(nodes);
    
    return {
      fields,
      webhookUrl: webhookNode?.parameters?.path || '/webhook',
    };
  }

  /**
   * Build chat capability details
   */
  private buildChatCapability(nodes: any[], connections: any): any {
    const aiNodes = nodes.filter(n => 
      n.type?.includes('openAi') || 
      n.type?.includes('langchain') ||
      n.type?.includes('anthropic')
    );

    const provider = aiNodes.length > 0 ? 
      (aiNodes[0].type.includes('openAi') ? 'openai' : 
       aiNodes[0].type.includes('anthropic') ? 'anthropic' : 'langchain') : 
      'unknown';

    return {
      aiProvider: provider,
      conversationFlow: ['greeting', 'data-collection', 'processing', 'response'],
      contextAware: aiNodes.some(n => n.parameters?.messages || n.parameters?.conversation)
    };
  }

  /**
   * Build monitoring capability details
   */
  private buildMonitoringCapability(nodes: any[], connections: any): any {
    return {
      realTimeUpdates: true,
      statusTracking: true,
      progressSteps: this.extractProgressSteps(nodes)
    };
  }

  /**
   * Extract potential form fields from workflow nodes
   */
  private extractFormFields(nodes: any[]): any[] {
    const fields: any[] = [];
    
    // Look for Set nodes that might define form fields
    const setNodes = nodes.filter(n => n.type === 'n8n-nodes-base.set');
    
    setNodes.forEach(node => {
      const values = node.parameters?.values?.values || [];
      values.forEach((value: any) => {
        if (value.name) {
          fields.push({
            name: value.name,
            type: this.inferFieldType(value.value),
            required: true,
            description: `Field extracted from ${node.name}`
          });
        }
      });
    });

    // If no fields found, provide some defaults
    if (fields.length === 0) {
      fields.push(
        { name: 'message', type: 'textarea', required: true, description: 'Your message' },
        { name: 'email', type: 'text', required: false, description: 'Your email address' }
      );
    }

    return fields;
  }

  /**
   * Extract progress steps from workflow structure
   */
  private extractProgressSteps(nodes: any[]): string[] {
    const steps = ['Started'];
    
    // Add steps based on major node types
    if (nodes.some(n => n.type === 'n8n-nodes-base.webhook')) {
      steps.push('Data Received');
    }
    
    if (nodes.some(n => n.type === 'n8n-nodes-base.set')) {
      steps.push('Data Processed');
    }
    
    if (nodes.some(n => n.type?.includes('openAi') || n.type?.includes('langchain'))) {
      steps.push('AI Processing');
    }
    
    if (nodes.some(n => n.type === 'n8n-nodes-base.gmail' || n.type === 'n8n-nodes-base.slack')) {
      steps.push('Notification Sent');
    }
    
    steps.push('Completed');
    
    return steps;
  }

  /**
   * Infer field type from value
   */
  private inferFieldType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      if (value.includes('@')) return 'email';
      if (value.length > 100) return 'textarea';
      return 'text';
    }
    return 'text';
  }

  /**
   * Check if workflow has structured data flow
   */
  private hasStructuredDataFlow(nodes: any[], connections: any): boolean {
    return nodes.some(n => n.type === 'n8n-nodes-base.set') && 
           Object.keys(connections).length > 1;
  }

  /**
   * Check if workflow has iterative processing
   */
  private hasIterativeProcessing(nodes: any[], connections: any): boolean {
    return nodes.some(n => n.type?.includes('loop') || n.type === 'n8n-nodes-base.merge');
  }

  /**
   * Check if workflow has sequential processing
   */
  private hasSequentialProcessing(nodes: any[], connections: any): boolean {
    return Object.keys(connections).length >= nodes.length - 1;
  }

  /**
   * Generate fallback analysis when n8n API is unavailable
   */
  private generateFallbackAnalysis(workflowId: string): WorkflowAnalysisResult {
    // Create a simple fallback analysis based on common patterns
    // This is used when n8n API is rate-limited or unavailable
    
    const fallbackAnalysis: WorkflowAnalysisResult = {
      workflowId: workflowId,
      workflowName: `Workflow ${workflowId}`,
      interactions: [
        {
          type: 'chat',
          confidence: 0.7,
          reason: 'Fallback analysis - assuming chat capability for AI agent workflows',
          nodes: [
            {
              id: 'fallback-chat-node',
              name: 'Chat Interface',
              type: 'chat-handler',
              relevance: 'primary'
            }
          ]
        }
      ],
      primaryInteractionType: 'chat',
      complexity: 'medium',
      businessCategory: 'automation',
      chatCapability: {
        aiProvider: 'unknown',
        conversationFlow: ['greeting', 'input-processing', 'ai-response', 'output'],
        contextAware: true
      },
      monitoringCapability: {
        realTimeUpdates: true,
        statusTracking: true,
        progressSteps: ['Started', 'Processing Input', 'AI Thinking', 'Response Generated', 'Completed']
      }
    };

    logger.info(`Generated fallback analysis for workflow ${workflowId}: chat interaction type`);
    return fallbackAnalysis;
  }
}

export const workflowAnalysisService = new WorkflowAnalysisService();