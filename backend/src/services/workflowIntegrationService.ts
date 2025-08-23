/**
 * Workflow Integration Service
 * Provides unified interface for both template and live n8n workflows
 * Calculates business metrics and handles state transitions
 */

import { N8nService, N8nWorkflow, WorkflowStats } from './n8nService';
import { logger } from '../utils/logger';
import { ClientWorkflowMapping, WorkflowTemplate } from '../models/clientWorkflowMapping';
import { VisibilityService, VisibilityFilter } from './visibilityService';

export interface UnifiedWorkflowData {
  id: string;
  type: 'template' | 'live';
  name: string;
  businessName: string;
  description: string;
  category: string;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'inactive';
  isActive: boolean;
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
  template?: WorkflowTemplate;
  n8nWorkflow?: N8nWorkflow;
  stats?: WorkflowStats;
}


export class WorkflowIntegrationService {
  private n8nService: N8nService;
  private templates: Map<string, WorkflowTemplate> = new Map();

  constructor() {
    this.n8nService = new N8nService();
    this.loadWorkflowTemplates();
  }

  /**
   * Load workflow templates from configuration
   */
  private async loadWorkflowTemplates(): Promise<void> {
    try {
      // Load templates from the in-memory store which initializes from JSON
      const { workflowTemplateRepository } = await import('../database/inMemoryStore');
      const templates = await workflowTemplateRepository.findAll();
      
      templates.forEach((template) => {
        this.templates.set(template.id, template);
      });

      logger.info('Workflow templates loaded:', { count: this.templates.size });
    } catch (error) {
      logger.error('Failed to load workflow templates:', error);
    }
  }

  /**
   * Get all unified workflows for a client (templates + live workflows)
   */
  async getUnifiedWorkflows(
    clientId: string, 
    visibilityFilter?: VisibilityFilter
  ): Promise<UnifiedWorkflowData[]> {
    try {
      const [templates, liveWorkflows, clientMappings] = await Promise.all([
        this.getAvailableTemplates(),
        this.getLiveWorkflowsForClient(clientId),
        this.getClientWorkflowMappings(clientId)
      ]);

      let filteredTemplates = templates;
      let filteredLiveWorkflows = liveWorkflows;

      // Apply visibility filtering if provided
      if (visibilityFilter) {
        logger.info('Applying visibility filtering to unified workflows:', {
          clientId,
          originalTemplates: templates.length,
          originalLiveWorkflows: liveWorkflows.length,
          filterLevel: visibilityFilter.level
        });

        // Create maps for filtering
        const templateMap = new Map(templates.map(t => [t.id, t]));
        const liveWorkflowMap = new Map(liveWorkflows.filter(w => w?.id).map(w => [w.id, w]));

        // Filter templates
        filteredTemplates = VisibilityService.filterWorkflowsByVisibility(
          templates,
          visibilityFilter,
          visibilityFilter.settings || {}
        );

        // Filter live workflows
        filteredLiveWorkflows = VisibilityService.filterWorkflowsByVisibility(
          liveWorkflows.filter(w => w?.id),
          visibilityFilter,
          visibilityFilter.settings || {}
        );

        logger.info('Visibility filtering results:', {
          filteredTemplates: filteredTemplates.length,
          filteredLiveWorkflows: filteredLiveWorkflows.length
        });
      }

      const unifiedWorkflows: UnifiedWorkflowData[] = [];

      // Add filtered template workflows
      for (const template of filteredTemplates) {
        const mapping = clientMappings.find(m => m.templateId === template.id);
        const unifiedWorkflow = await this.createUnifiedWorkflowFromTemplate(template, mapping);
        unifiedWorkflows.push(unifiedWorkflow);
      }

      // Add filtered live workflows that aren't from templates
      for (const liveWorkflow of filteredLiveWorkflows) {
        if (!liveWorkflow || !liveWorkflow.id) {
          logger.warn('Skipping invalid live workflow:', { workflow: liveWorkflow });
          continue;
        }
        const mapping = clientMappings.find(m => m.n8nWorkflowId === liveWorkflow.id);
        if (!mapping?.templateId) {
          const unifiedWorkflow = await this.createUnifiedWorkflowFromLive(liveWorkflow, mapping);
          unifiedWorkflows.push(unifiedWorkflow);
        }
      }

      return unifiedWorkflows.sort((a, b) => {
        // Sort by: active live workflows first, then templates, then inactive
        if (a.type === 'live' && a.isActive && b.type !== 'live') return -1;
        if (b.type === 'live' && b.isActive && a.type !== 'live') return 1;
        if (a.type === 'template' && b.type === 'live' && !b.isActive) return -1;
        if (b.type === 'template' && a.type === 'live' && !a.isActive) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logger.error('Failed to get unified workflows:', error);
      throw new Error('Failed to retrieve unified workflows');
    }
  }

  /**
   * Get specific unified workflow by ID
   */
  async getUnifiedWorkflow(clientId: string, workflowId: string): Promise<UnifiedWorkflowData | null> {
    try {
      // Check if it's a template
      const template = this.templates.get(workflowId);
      if (template) {
        const mapping = await this.getClientWorkflowMapping(clientId, template.id);
        return await this.createUnifiedWorkflowFromTemplate(template, mapping || undefined);
      }

      // Check if it's a live workflow
      const liveWorkflow = await this.n8nService.getWorkflow(workflowId);
      if (liveWorkflow) {
        const mapping = await this.getClientWorkflowMapping(clientId, liveWorkflow.id);
        return await this.createUnifiedWorkflowFromLive(liveWorkflow, mapping || undefined);
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get unified workflow ${workflowId}:`, error);
      throw new Error(`Failed to retrieve workflow ${workflowId}`);
    }
  }

  /**
   * Deploy template workflow for client
   */
  async deployTemplateWorkflow(
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
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Load template JSON file
      const templateJson = await this.loadTemplateJson(templateId);
      
      // Create n8n workflow
      const n8nWorkflow = await this.n8nService.importWorkflow({
        ...templateJson,
        name: businessConfig.businessName
      });

      // Deploy with business configuration
      await this.n8nService.deployWorkflowForBusiness(n8nWorkflow.id, {
        category: businessConfig.category,
        expectedMonthlySavings: businessConfig.expectedMonthlySavings,
        targetUsers: businessConfig.targetUsers,
        department: businessConfig.department
      });

      // Create client mapping
      const mappingData = {
        clientId,
        organizationId: clientId, // Use clientId as organizationId for now
        n8nWorkflowId: n8nWorkflow.id,
        businessName: businessConfig.businessName,
        businessDescription: businessConfig.businessDescription,
        category: businessConfig.category,
        templateId,
        deployedAt: new Date(),
        isActive: true,
        businessConfig: {
          expectedMonthlySavings: businessConfig.expectedMonthlySavings,
          targetUsers: businessConfig.targetUsers,
          department: businessConfig.department
        }
      };

      const mapping = await this.saveClientWorkflowMapping(mappingData);

      logger.info('Template workflow deployed successfully:', {
        clientId,
        templateId,
        n8nWorkflowId: n8nWorkflow.id,
        businessName: businessConfig.businessName
      });

      return await this.createUnifiedWorkflowFromLive(n8nWorkflow, mapping);
    } catch (error) {
      logger.error(`Failed to deploy template ${templateId}:`, error);
      throw new Error(`Failed to deploy template workflow`);
    }
  }

  /**
   * Execute workflow action (pause, resume, restart, etc.)
   */
  async executeWorkflowAction(
    clientId: string,
    workflowId: string,
    action: string,
    options?: any
  ): Promise<{ success: boolean; message: string; businessImpact: string }> {
    try {
      const mapping = await this.getClientWorkflowMapping(clientId, workflowId);
      if (!mapping) {
        throw new Error('Workflow not found or access denied');
      }

      let result = { success: false, message: '', businessImpact: '' };

      switch (action) {
        case 'pause':
          await this.n8nService.deactivateWorkflow(workflowId);
          result = {
            success: true,
            message: 'Workflow paused successfully',
            businessImpact: `${mapping.businessName} automation is now paused. Manual processes may be needed.`
          };
          break;

        case 'resume':
          await this.n8nService.activateWorkflow(workflowId);
          result = {
            success: true,
            message: 'Workflow resumed successfully',
            businessImpact: `${mapping.businessName} automation is now active and saving time.`
          };
          break;

        case 'restart':
          await this.n8nService.deactivateWorkflow(workflowId);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          await this.n8nService.activateWorkflow(workflowId);
          result = {
            success: true,
            message: 'Workflow restarted successfully',
            businessImpact: `${mapping.businessName} automation has been restarted and should resolve any issues.`
          };
          break;

        case 'test':
          const execution = await this.n8nService.executeWorkflow(workflowId, {}, {
            triggeredBy: 'manual_test',
            department: mapping.businessConfig.department
          });
          result = {
            success: true,
            message: 'Test execution started',
            businessImpact: `Testing ${mapping.businessName} automation to ensure it works correctly.`
          };
          break;

        case 'configure':
          result = {
            success: true,
            message: 'Configuration access granted',
            businessImpact: `Configuration for ${mapping.businessName} automation is now available for editing.`
          };
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      logger.info('Workflow action executed:', {
        clientId,
        workflowId,
        action,
        success: result.success
      });

      return result;
    } catch (error) {
      logger.error(`Failed to execute action ${action} on workflow ${workflowId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        businessImpact: `Failed to ${action} automation. Please try again or contact support.`
      };
    }
  }

  /**
   * Calculate business metrics for a workflow
   */
  private calculateBusinessMetrics(
    template?: WorkflowTemplate,
    stats?: WorkflowStats,
    mapping?: ClientWorkflowMapping,
    isActive: boolean = false
  ): { timeSavedPerWeek: number; monthlySavings: number; roi: number; estimatedValue?: number } {
    
    const baseHoursSaved = 8; // Default 8 hours per week
    const hourlyRate = 25; // Average SMB hourly rate
    const monthlyPrice = template?.monthlyPrice || 0;

    if (isActive && stats) {
      // Calculate actual savings based on execution data
      const executionsPerWeek = stats.executionsToday * 7; // Rough estimate
      const minutesSavedPerExecution = 15; // Average time saved per execution
      const hoursSavedPerWeek = (executionsPerWeek * minutesSavedPerExecution) / 60;
      const weeklySavings = hoursSavedPerWeek * hourlyRate;
      const monthlySavings = weeklySavings * 4.33; // Average weeks per month
      const roi = monthlyPrice > 0 ? Math.round(((monthlySavings - monthlyPrice) / monthlyPrice) * 100) : 0;

      return {
        timeSavedPerWeek: hoursSavedPerWeek,
        monthlySavings,
        roi
      };
    } else {
      // Use estimated values for templates or inactive workflows
      const weeklySavings = baseHoursSaved * hourlyRate;
      const monthlySavings = weeklySavings * 4.33;
      const roi = monthlyPrice > 0 ? Math.round(((monthlySavings - monthlyPrice) / monthlyPrice) * 100) : 0;

      return {
        timeSavedPerWeek: isActive ? baseHoursSaved : 0,
        monthlySavings: isActive ? monthlySavings : 0,
        roi: isActive ? roi : 0,
        estimatedValue: monthlySavings
      };
    }
  }

  /**
   * Determine workflow health status
   */
  private determineHealthStatus(
    n8nWorkflow?: N8nWorkflow,
    stats?: WorkflowStats
  ): 'healthy' | 'warning' | 'critical' | 'inactive' {
    if (!n8nWorkflow) return 'inactive';
    if (!n8nWorkflow.active) return 'inactive';
    if (!stats) return 'warning';

    // Check for critical issues
    if (stats.uptimePercentage < 80) return 'critical';
    if (stats.failedExecutions > stats.successfulExecutions) return 'critical';

    // Check for warnings
    if (stats.uptimePercentage < 95) return 'warning';
    if (stats.averageExecutionTime > 300000) return 'warning'; // 5 minutes

    // Check if no recent executions
    if (stats.lastExecution) {
      const daysSince = (Date.now() - new Date(stats.lastExecution).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) return 'warning';
    }

    return 'healthy';
  }

  /**
   * Get available actions for a workflow
   */
  private getAvailableActions(
    type: 'template' | 'live',
    isActive: boolean,
    healthStatus: string
  ): string[] {
    if (type === 'template') {
      return ['configure'];
    }

    const actions = [];
    
    if (isActive) {
      actions.push('pause');
      if (healthStatus === 'critical' || healthStatus === 'warning') {
        actions.push('restart');
      }
    } else {
      actions.push('resume');
    }
    
    actions.push('test', 'configure', 'view-logs');
    return actions;
  }

  /**
   * Create unified workflow from template
   */
  private async createUnifiedWorkflowFromTemplate(
    template: WorkflowTemplate,
    mapping?: ClientWorkflowMapping
  ): Promise<UnifiedWorkflowData> {
    const businessMetrics = this.calculateBusinessMetrics(template, undefined, mapping, false);
    
    return {
      id: template.id,
      type: 'template',
      name: template.name,
      businessName: mapping?.businessName || template.name,
      description: template.description,
      category: template.category,
      healthStatus: 'inactive',
      isActive: false,
      configuration: {
        status: mapping ? 'active' : 'template',
        lastConfigured: mapping?.deployedAt
      },
      metrics: {
        executionsToday: 0,
        successRate: 0,
        avgExecutionTime: 0
      },
      businessMetrics,
      quickActions: this.getAvailableActions('template', false, 'inactive'),
      template
    };
  }

  /**
   * Create unified workflow from live n8n workflow
   */
  private async createUnifiedWorkflowFromLive(
    n8nWorkflow: N8nWorkflow,
    mapping?: ClientWorkflowMapping
  ): Promise<UnifiedWorkflowData> {
    let stats: WorkflowStats | undefined;
    try {
      stats = await this.n8nService.getWorkflowStats(n8nWorkflow.id);
    } catch (error) {
      logger.warn(`Failed to get stats for workflow ${n8nWorkflow.id}, using defaults:`, error);
      // Provide default stats when n8n API is unavailable or rate limited
      stats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecution: undefined,
        executionsThisMonth: 0,
        executionsToday: 0,
        uptimePercentage: 100
      };
    }
    const healthStatus = this.determineHealthStatus(n8nWorkflow, stats);
    const businessMetrics = this.calculateBusinessMetrics(
      mapping?.templateId ? this.templates.get(mapping.templateId) : undefined,
      stats,
      mapping,
      n8nWorkflow.active
    );

    const lastExecution = stats.lastExecution ? {
      time: new Date(stats.lastExecution),
      status: 'success' as const, // Simplified for now
      businessImpact: `Successfully completed ${mapping?.businessName || n8nWorkflow.name} automation`
    } : undefined;

    return {
      id: n8nWorkflow.id,
      type: 'live',
      name: n8nWorkflow.name,
      businessName: mapping?.businessName || n8nWorkflow.name,
      description: mapping?.businessDescription || `${n8nWorkflow.name} automation workflow`,
      category: mapping?.category || 'General',
      healthStatus,
      isActive: n8nWorkflow.active,
      configuration: {
        status: n8nWorkflow.active ? 'active' : 'paused',
        lastConfigured: mapping?.deployedAt
      },
      lastExecution,
      metrics: {
        executionsToday: stats.executionsToday,
        successRate: Math.round(stats.uptimePercentage),
        avgExecutionTime: Math.round(stats.averageExecutionTime / 1000) // Convert to seconds
      },
      businessMetrics,
      quickActions: this.getAvailableActions('live', n8nWorkflow.active, healthStatus),
      n8nWorkflow,
      stats
    };
  }

  // Helper methods (database implementations)
  private async getAvailableTemplates(): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values());
  }

  private async getLiveWorkflowsForClient(clientId: string): Promise<N8nWorkflow[]> {
    try {
      // First try to get mapped workflows
      const mappings = await this.getClientWorkflowMappings(clientId);
      
      // If no mappings exist, auto-discover and map all n8n workflows to this client
      if (mappings.length === 0) {
        await this.autoDiscoverAndMapWorkflows(clientId);
        const newMappings = await this.getClientWorkflowMappings(clientId);
        
        // Use Promise.allSettled to handle individual workflow failures gracefully
        const workflowResults = await Promise.allSettled(
          newMappings.map(async (mapping) => {
            try {
              return await this.n8nService.getWorkflow(mapping.n8nWorkflowId);
            } catch (error) {
              logger.warn(`Failed to fetch workflow ${mapping.n8nWorkflowId}:`, error);
              return null;
            }
          })
        );
        
        const workflows = workflowResults
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<N8nWorkflow>).value);
        
        return workflows;
      }
      
      // Get workflows for existing mappings
      const workflowResults = await Promise.allSettled(
        mappings.map(async (mapping) => {
          try {
            return await this.n8nService.getWorkflow(mapping.n8nWorkflowId);
          } catch (error) {
            logger.warn(`Failed to fetch workflow ${mapping.n8nWorkflowId}:`, error);
            return null;
          }
        })
      );
      
      const workflows = workflowResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<N8nWorkflow>).value);
      
      return workflows;
    } catch (error) {
      logger.error(`Failed to get live workflows for client ${clientId}:`, error);
      return [];
    }
  }

  // Auto-discovery lock to prevent race conditions
  private autoDiscoveryLocks = new Map<string, Promise<void>>();

  /**
   * Auto-discover all n8n workflows and create mappings to a client
   * Prevents duplicate creation through locking mechanism
   */
  private async autoDiscoverAndMapWorkflows(clientId: string): Promise<void> {
    // Check if auto-discovery is already in progress for this client
    if (this.autoDiscoveryLocks.has(clientId)) {
      logger.info('Auto-discovery already in progress for client, waiting:', { clientId });
      await this.autoDiscoveryLocks.get(clientId);
      return;
    }

    // Create a lock for this client
    const discoveryPromise = this.performAutoDiscovery(clientId);
    this.autoDiscoveryLocks.set(clientId, discoveryPromise);

    try {
      await discoveryPromise;
    } finally {
      // Remove the lock when done
      this.autoDiscoveryLocks.delete(clientId);
    }
  }

  /**
   * Perform the actual auto-discovery logic
   */
  private async performAutoDiscovery(clientId: string): Promise<void> {
    try {
      logger.info('Auto-discovering n8n workflows for client:', { clientId });
      
      // Get all workflows from n8n
      const allWorkflows = await this.n8nService.getWorkflows();
      
      if (allWorkflows.length === 0) {
        logger.info('No n8n workflows found to map');
        return;
      }

      const { clientWorkflowMappingRepository } = await import('../database/inMemoryStore');
      
      // Get existing mappings for this client to avoid duplicates
      const existingMappings = await clientWorkflowMappingRepository.findByClientId(clientId);
      const existingWorkflowIds = new Set(existingMappings.map(m => m.n8nWorkflowId));
      
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const workflow of allWorkflows) {
        // Check if this workflow is already mapped for this client
        if (existingWorkflowIds.has(workflow.id)) {
          skippedCount++;
          logger.debug('Workflow already mapped for client, skipping:', { 
            clientId, 
            workflowId: workflow.id, 
            workflowName: workflow.name 
          });
          continue;
        }

        // Double-check with database to prevent race conditions
        const existingMapping = await clientWorkflowMappingRepository.findByClientAndN8nWorkflow(clientId, workflow.id);
        if (existingMapping) {
          skippedCount++;
          logger.debug('Workflow mapping found in database check, skipping:', { 
            clientId, 
            workflowId: workflow.id,
            existingMappingId: existingMapping.id
          });
          continue;
        }

        try {
          // Create mapping (let the repository generate the ID)
          const mappingData = {
            clientId,
            organizationId: clientId, // Use clientId as organizationId for now
            templateId: undefined, // This is a live workflow, not from template
            n8nWorkflowId: workflow.id,
            businessName: workflow.name,
            businessDescription: `Live n8n workflow: ${workflow.name}`,
            category: this.extractCategoryFromWorkflow(workflow),
            deployedAt: new Date(), // Set current time as deployment time for discovered workflows
            isActive: workflow.active,
            businessConfig: {
              expectedMonthlySavings: 500, // Default estimate
              targetUsers: [],
              department: this.extractDepartmentFromWorkflow(workflow)
            }
          };

          const newMapping = await clientWorkflowMappingRepository.create(mappingData);
          createdCount++;
          
          logger.info('Created workflow mapping:', { 
            clientId,
            workflowId: workflow.id, 
            workflowName: workflow.name,
            mappingId: newMapping.id
          });
        } catch (error) {
          logger.error('Failed to create mapping for workflow:', { 
            clientId,
            workflowId: workflow.id, 
            workflowName: workflow.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('Auto-discovery completed:', { 
        clientId, 
        totalWorkflows: allWorkflows.length,
        created: createdCount,
        skipped: skippedCount
      });
    } catch (error) {
      logger.error('Failed to auto-discover workflows:', {
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw to ensure the lock is properly cleaned up
    }
  }

  /**
   * Extract category from workflow tags or name
   */
  private extractCategoryFromWorkflow(workflow: N8nWorkflow): string {
    // Check tags first
    if (workflow.tags) {
      const categoryTags = workflow.tags.filter(tag => 
        tag.toLowerCase().includes('category:') || 
        ['automation', 'ai', 'data', 'integration', 'notification'].some(cat => 
          tag.toLowerCase().includes(cat)
        )
      );
      if (categoryTags.length > 0) {
        return categoryTags[0]?.replace('category:', '').trim() || 'General Automation';
      }
    }

    // Analyze workflow name for category clues
    const name = workflow.name.toLowerCase();
    if (name.includes('ai') || name.includes('agent') || name.includes('chat')) return 'AI & Automation';
    if (name.includes('email') || name.includes('marketing')) return 'Marketing';
    if (name.includes('pdf') || name.includes('document') || name.includes('extract')) return 'Document Processing';
    if (name.includes('calendar') || name.includes('schedule')) return 'Productivity';
    if (name.includes('demo') || name.includes('test')) return 'Demo & Testing';
    
    return 'General Automation';
  }

  /**
   * Extract department from workflow tags or default
   */
  private extractDepartmentFromWorkflow(workflow: N8nWorkflow): string {
    if (workflow.tags) {
      const deptTags = workflow.tags.filter(tag => 
        tag.toLowerCase().includes('department:') ||
        ['it', 'marketing', 'sales', 'hr', 'finance'].some(dept => 
          tag.toLowerCase().includes(dept)
        )
      );
      if (deptTags.length > 0) {
        return deptTags[0]?.replace('department:', '').trim() || 'IT & Operations';
      }
    }

    return 'IT & Operations';
  }

  private async getClientWorkflowMappings(clientId: string): Promise<ClientWorkflowMapping[]> {
    try {
      const { clientWorkflowMappingRepository } = await import('../database/inMemoryStore');
      return await clientWorkflowMappingRepository.findByClientId(clientId);
    } catch (error) {
      logger.error(`Failed to get client workflow mappings for ${clientId}:`, error);
      return [];
    }
  }

  private async getClientWorkflowMapping(clientId: string, workflowId: string): Promise<ClientWorkflowMapping | null> {
    try {
      const { clientWorkflowMappingRepository } = await import('../database/inMemoryStore');
      
      // Try to find by client and n8n workflow ID combination first
      let mapping = await clientWorkflowMappingRepository.findByClientAndN8nWorkflow(clientId, workflowId);
      
      // If not found, try to find by template ID within client's mappings
      if (!mapping) {
        mapping = await clientWorkflowMappingRepository.findByClientAndTemplate(clientId, workflowId);
      }
      
      return mapping;
    } catch (error) {
      logger.error(`Failed to get client workflow mapping for client ${clientId}, workflow ${workflowId}:`, error);
      return null;
    }
  }

  private async saveClientWorkflowMapping(mappingData: Omit<ClientWorkflowMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientWorkflowMapping> {
    try {
      const { clientWorkflowMappingRepository } = await import('../database/inMemoryStore');
      const mapping = await clientWorkflowMappingRepository.create(mappingData);
      logger.info('Client workflow mapping saved successfully:', { 
        id: mapping.id, 
        clientId: mapping.clientId,
        n8nWorkflowId: mapping.n8nWorkflowId 
      });
      return mapping;
    } catch (error) {
      logger.error('Failed to save client workflow mapping:', error);
      throw new Error('Failed to save workflow mapping');
    }
  }

  private async loadTemplateJson(templateId: string): Promise<any> {
    try {
      // Load from backend/data/workflow-templates/
      const templatePath = `../data/workflow-templates/${templateId}.json`;
      return await import(templatePath);
    } catch (error) {
      logger.error(`Failed to load template JSON for ${templateId}:`, error);
      throw new Error(`Template ${templateId} not found`);
    }
  }
}

export const workflowIntegrationService = new WorkflowIntegrationService();