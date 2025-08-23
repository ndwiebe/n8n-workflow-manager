/**
 * In-Memory Database Store for Client Workflow Mappings
 * This is a temporary implementation for development and testing.
 * In production, this should be replaced with a proper database (PostgreSQL, MongoDB, etc.)
 */

import { 
  ClientWorkflowMapping, 
  ClientWorkflowConfiguration, 
  WorkflowTemplate,
  ClientWorkflowMappingRepository,
  ClientWorkflowConfigurationRepository,
  WorkflowTemplateRepository
} from '../models/clientWorkflowMapping';
import { logger } from '../utils/logger';

// In-memory stores
const clientWorkflowMappings = new Map<string, ClientWorkflowMapping>();
const clientWorkflowConfigurations = new Map<string, ClientWorkflowConfiguration>();
const workflowTemplates = new Map<string, WorkflowTemplate>();

// Helper function to generate UUIDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export class InMemoryClientWorkflowMappingRepository implements ClientWorkflowMappingRepository {
  async create(data: Omit<ClientWorkflowMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientWorkflowMapping> {
    const mapping: ClientWorkflowMapping = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    clientWorkflowMappings.set(mapping.id, mapping);
    logger.info('Client workflow mapping created:', { id: mapping.id, clientId: mapping.clientId });
    return mapping;
  }

  async findById(id: string): Promise<ClientWorkflowMapping | null> {
    return clientWorkflowMappings.get(id) || null;
  }

  async findByClientId(clientId: string): Promise<ClientWorkflowMapping[]> {
    return Array.from(clientWorkflowMappings.values())
      .filter(mapping => mapping.clientId === clientId && !mapping.deletedAt);
  }

  async findByN8nWorkflowId(n8nWorkflowId: string): Promise<ClientWorkflowMapping | null> {
    return Array.from(clientWorkflowMappings.values())
      .find(mapping => mapping.n8nWorkflowId === n8nWorkflowId && !mapping.deletedAt) || null;
  }

  async findByTemplateId(templateId: string): Promise<ClientWorkflowMapping[]> {
    return Array.from(clientWorkflowMappings.values())
      .filter(mapping => mapping.templateId === templateId && !mapping.deletedAt);
  }

  async update(id: string, updates: Partial<ClientWorkflowMapping>): Promise<ClientWorkflowMapping> {
    const existing = clientWorkflowMappings.get(id);
    if (!existing) {
      throw new Error(`Client workflow mapping ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    clientWorkflowMappings.set(id, updated);
    logger.info('Client workflow mapping updated:', { id });
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = clientWorkflowMappings.get(id);
    if (existing) {
      existing.deletedAt = new Date();
      clientWorkflowMappings.set(id, existing);
      logger.info('Client workflow mapping soft deleted:', { id });
    }
  }

  async findActiveByClient(clientId: string): Promise<ClientWorkflowMapping[]> {
    return Array.from(clientWorkflowMappings.values())
      .filter(mapping => 
        mapping.clientId === clientId && 
        mapping.isActive && 
        !mapping.deletedAt
      );
  }

  async findByClientAndTemplate(clientId: string, templateId: string): Promise<ClientWorkflowMapping | null> {
    return Array.from(clientWorkflowMappings.values())
      .find(mapping => 
        mapping.clientId === clientId && 
        mapping.templateId === templateId && 
        !mapping.deletedAt
      ) || null;
  }

  async findByClientAndN8nWorkflow(clientId: string, n8nWorkflowId: string): Promise<ClientWorkflowMapping | null> {
    return Array.from(clientWorkflowMappings.values())
      .find(mapping => 
        mapping.clientId === clientId && 
        mapping.n8nWorkflowId === n8nWorkflowId && 
        !mapping.deletedAt
      ) || null;
  }

  async findByOrganization(organizationId: string): Promise<ClientWorkflowMapping[]> {
    return Array.from(clientWorkflowMappings.values())
      .filter(mapping => mapping.organizationId === organizationId && !mapping.deletedAt);
  }

  async findByCategory(category: string, clientId?: string): Promise<ClientWorkflowMapping[]> {
    let results = Array.from(clientWorkflowMappings.values())
      .filter(mapping => mapping.category === category && !mapping.deletedAt);
    
    if (clientId) {
      results = results.filter(mapping => mapping.clientId === clientId);
    }
    
    return results;
  }

  async findByDepartment(department: string, clientId?: string): Promise<ClientWorkflowMapping[]> {
    let results = Array.from(clientWorkflowMappings.values())
      .filter(mapping => mapping.businessConfig.department === department && !mapping.deletedAt);
    
    if (clientId) {
      results = results.filter(mapping => mapping.clientId === clientId);
    }
    
    return results;
  }

  async countByStatus(status: string): Promise<number> {
    // This would require joining with configurations, simplified for now
    return Array.from(clientWorkflowMappings.values())
      .filter(mapping => mapping.isActive && !mapping.deletedAt).length;
  }

  async getTotalSavings(clientId?: string, organizationId?: string): Promise<number> {
    let mappings = Array.from(clientWorkflowMappings.values())
      .filter(mapping => mapping.isActive && !mapping.deletedAt);
    
    if (clientId) {
      mappings = mappings.filter(mapping => mapping.clientId === clientId);
    }
    
    if (organizationId) {
      mappings = mappings.filter(mapping => mapping.organizationId === organizationId);
    }
    
    return mappings.reduce((total, mapping) => total + mapping.businessConfig.expectedMonthlySavings, 0);
  }

  async getDeploymentStats(timeframe?: 'day' | 'week' | 'month'): Promise<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageSetupTime: number;
  }> {
    const mappings = Array.from(clientWorkflowMappings.values())
      .filter(mapping => !mapping.deletedAt);
    
    // Filter by timeframe if provided
    let filteredMappings = mappings;
    if (timeframe) {
      const now = new Date();
      const cutoff = new Date();
      
      switch (timeframe) {
        case 'day':
          cutoff.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      
      filteredMappings = mappings.filter(mapping => mapping.createdAt >= cutoff);
    }
    
    const successful = filteredMappings.filter(mapping => mapping.isActive);
    
    return {
      totalDeployments: filteredMappings.length,
      successfulDeployments: successful.length,
      failedDeployments: filteredMappings.length - successful.length,
      averageSetupTime: 15 // Placeholder: 15 minutes average
    };
  }
}

export class InMemoryClientWorkflowConfigurationRepository implements ClientWorkflowConfigurationRepository {
  async create(data: Omit<ClientWorkflowConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientWorkflowConfiguration> {
    const config: ClientWorkflowConfiguration = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    clientWorkflowConfigurations.set(config.id, config);
    logger.info('Client workflow configuration created:', { id: config.id, mappingId: config.mappingId });
    return config;
  }

  async findById(id: string): Promise<ClientWorkflowConfiguration | null> {
    return clientWorkflowConfigurations.get(id) || null;
  }

  async findByMappingId(mappingId: string): Promise<ClientWorkflowConfiguration | null> {
    return Array.from(clientWorkflowConfigurations.values())
      .find(config => config.mappingId === mappingId) || null;
  }

  async update(id: string, updates: Partial<ClientWorkflowConfiguration>): Promise<ClientWorkflowConfiguration> {
    const existing = clientWorkflowConfigurations.get(id);
    if (!existing) {
      throw new Error(`Client workflow configuration ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    clientWorkflowConfigurations.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    clientWorkflowConfigurations.delete(id);
    logger.info('Client workflow configuration deleted:', { id });
  }

  async findByStatus(status: ClientWorkflowConfiguration['status']): Promise<ClientWorkflowConfiguration[]> {
    return Array.from(clientWorkflowConfigurations.values())
      .filter(config => config.status === status);
  }

  async findScheduledActivations(beforeDate?: Date): Promise<ClientWorkflowConfiguration[]> {
    const cutoff = beforeDate || new Date();
    return Array.from(clientWorkflowConfigurations.values())
      .filter(config => 
        config.status === 'scheduled' && 
        config.scheduledActivation && 
        config.scheduledActivation <= cutoff
      );
  }

  async findErroredConfigurations(): Promise<ClientWorkflowConfiguration[]> {
    return Array.from(clientWorkflowConfigurations.values())
      .filter(config => config.status === 'error');
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    const existing = clientWorkflowConfigurations.get(id);
    if (existing) {
      existing.progress = progress;
      existing.updatedAt = new Date();
      clientWorkflowConfigurations.set(id, existing);
    }
  }

  async updateStatus(id: string, status: ClientWorkflowConfiguration['status']): Promise<void> {
    const existing = clientWorkflowConfigurations.get(id);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date();
      clientWorkflowConfigurations.set(id, existing);
    }
  }

  async recordError(id: string, error: { type: string; message: string; stackTrace?: string }): Promise<void> {
    const existing = clientWorkflowConfigurations.get(id);
    if (existing) {
      existing.status = 'error';
      existing.errorDetails = {
        errorType: error.type,
        errorMessage: error.message,
        stackTrace: error.stackTrace,
        lastOccurred: new Date(),
        retryCount: (existing.errorDetails?.retryCount || 0) + 1
      };
      existing.updatedAt = new Date();
      clientWorkflowConfigurations.set(id, existing);
    }
  }
}

export class InMemoryWorkflowTemplateRepository implements WorkflowTemplateRepository {
  async findAll(): Promise<WorkflowTemplate[]> {
    return Array.from(workflowTemplates.values());
  }

  async findById(id: string): Promise<WorkflowTemplate | null> {
    return workflowTemplates.get(id) || null;
  }

  async findByCategory(category: string): Promise<WorkflowTemplate[]> {
    return Array.from(workflowTemplates.values())
      .filter(template => template.category === category);
  }

  async findActive(): Promise<WorkflowTemplate[]> {
    return Array.from(workflowTemplates.values())
      .filter(template => template.isActive);
  }

  async search(query: string): Promise<WorkflowTemplate[]> {
    const searchLower = query.toLowerCase();
    return Array.from(workflowTemplates.values())
      .filter(template => 
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.features.some(feature => feature.toLowerCase().includes(searchLower))
      );
  }

  async findByTags(tags: string[]): Promise<WorkflowTemplate[]> {
    return Array.from(workflowTemplates.values())
      .filter(template => 
        tags.some(tag => template.tags.includes(tag))
      );
  }

  async findByPriceRange(minPrice: number, maxPrice: number): Promise<WorkflowTemplate[]> {
    return Array.from(workflowTemplates.values())
      .filter(template => 
        template.monthlyPrice >= minPrice && template.monthlyPrice <= maxPrice
      );
  }

  async findBySupportLevel(supportLevel: WorkflowTemplate['supportLevel']): Promise<WorkflowTemplate[]> {
    return Array.from(workflowTemplates.values())
      .filter(template => template.supportLevel === supportLevel);
  }

  async getPopular(limit: number = 10): Promise<WorkflowTemplate[]> {
    // For demo purposes, return random templates sorted by name
    return Array.from(workflowTemplates.values())
      .filter(template => template.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  async getRecommended(clientId: string): Promise<WorkflowTemplate[]> {
    // For demo purposes, return active templates
    // In real implementation, this would use ML/recommendation algorithms
    return Array.from(workflowTemplates.values())
      .filter(template => template.isActive)
      .slice(0, 5);
  }

  async findByBusinessNeeds(industry: string, businessSize: string): Promise<WorkflowTemplate[]> {
    // For demo purposes, return templates based on tags
    const industryTags = [industry.toLowerCase()];
    const sizeTags = [businessSize.toLowerCase(), 'smb', 'small-business'];
    
    return Array.from(workflowTemplates.values())
      .filter(template => 
        template.isActive && 
        (industryTags.some(tag => template.tags.includes(tag)) ||
         sizeTags.some(tag => template.tags.includes(tag)))
      );
  }
}

// Singleton instances
export const clientWorkflowMappingRepository = new InMemoryClientWorkflowMappingRepository();
export const clientWorkflowConfigurationRepository = new InMemoryClientWorkflowConfigurationRepository();
export const workflowTemplateRepository = new InMemoryWorkflowTemplateRepository();

// Data initialization - load templates from JSON
export async function initializeTemplateData(): Promise<void> {
  try {
    // Load workflow templates from the existing JSON data
    const templatesModule = await import('../../api-data/workflows.json');
    const templatesData = templatesModule.workflows || templatesModule.default?.workflows || [];
    
    for (const templateData of templatesData) {
      const template: WorkflowTemplate = {
        id: templateData.id,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        icon: templateData.icon || '⚡',
        monthlyPrice: templateData.monthlyPrice || 0,
        estimatedSetupTime: templateData.estimatedSetupTime || '15-30 minutes',
        features: templateData.features || [],
        externalTools: templateData.externalTools || [],
        requiredCredentials: (templateData.requiredCredentials || []).map((cred: any) => ({
          id: cred.id || cred.name,
          name: cred.name,
          type: cred.type,
          required: cred.required !== false,
          description: cred.description || `${cred.name} credentials`,
          setupInstructions: cred.setupInstructions,
          validationRules: cred.validationRules
        })),
        templateData: {
          n8nWorkflowJson: templateData.n8nWorkflowJson || {},
          configurationSchema: templateData.configurationSchema || {},
          setupInstructions: templateData.setupInstructions || [],
          prerequisites: templateData.prerequisites || []
        },
        businessMetrics: {
          estimatedTimeSavedPerWeek: templateData.estimatedTimeSavedPerWeek || 8,
          estimatedMonthlySavings: templateData.estimatedMonthlySavings || 800,
          expectedROI: templateData.expectedROI || 300
        },
        tags: templateData.tags || [templateData.category],
        isActive: templateData.active !== false,
        supportLevel: templateData.supportLevel || 'community',
        version: templateData.version || '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      workflowTemplates.set(template.id, template);
    }
    
    logger.info('Template data initialized:', { count: workflowTemplates.size });
  } catch (error) {
    logger.error('Failed to initialize template data:', error);
  }
}

// Initialize on module load
initializeTemplateData();