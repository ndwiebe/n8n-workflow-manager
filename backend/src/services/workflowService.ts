import { WorkflowModule, WorkflowConfiguration } from '../types';
import { logger } from '../utils/logger';

// Mock data store (in production, this would be replaced with database queries)
let workflowModules: WorkflowModule[] = [
  {
    id: 'invoice-processor',
    name: 'Invoice Processing Automation',
    description: 'Automatically extract data from invoices, validate amounts, and sync with your accounting software.',
    category: 'Finance',
    icon: 'Receipt',
    requiredCredentials: [
      {
        name: 'ocrApiKey',
        label: 'OCR API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your OCR service API key',
        helpText: 'Get your API key from your OCR provider dashboard'
      }
    ],
    externalTools: ['OCR Service', 'QuickBooks/Xero/Sage API'],
    features: ['Automatic invoice data extraction', 'Multi-currency support'],
    estimatedSetupTime: '5-7 days',
    monthlyPrice: 99,
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

let configurations: WorkflowConfiguration[] = [];

export const getAllWorkflowModules = async (filters: {
  category?: string;
  active?: boolean;
} = {}): Promise<WorkflowModule[]> => {
  let filtered = [...workflowModules];

  if (filters.category) {
    filtered = filtered.filter(module => module.category === filters.category);
  }

  if (filters.active !== undefined) {
    filtered = filtered.filter(module => module.active === filters.active);
  }

  return filtered;
};

export const getWorkflowModuleById = async (id: string): Promise<WorkflowModule | null> => {
  return workflowModules.find(module => module.id === id) || null;
};

export const createWorkflowModule = async (moduleData: Omit<WorkflowModule, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowModule> => {
  const newModule: WorkflowModule = {
    ...moduleData,
    id: `module-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  workflowModules.push(newModule);
  logger.info(`Created workflow module: ${newModule.id}`);

  return newModule;
};

export const updateWorkflowModule = async (id: string, updates: Partial<WorkflowModule>): Promise<WorkflowModule | null> => {
  const index = workflowModules.findIndex(module => module.id === id);
  
  if (index === -1) {
    return null;
  }

  workflowModules[index] = {
    ...workflowModules[index],
    ...updates,
    updatedAt: new Date()
  };

  logger.info(`Updated workflow module: ${id}`);
  return workflowModules[index];
};

export const deleteWorkflowModule = async (id: string): Promise<boolean> => {
  const index = workflowModules.findIndex(module => module.id === id);
  
  if (index === -1) {
    return false;
  }

  workflowModules.splice(index, 1);
  logger.info(`Deleted workflow module: ${id}`);

  return true;
};

export const duplicateWorkflowModule = async (id: string): Promise<WorkflowModule | null> => {
  const original = workflowModules.find(module => module.id === id);
  
  if (!original) {
    return null;
  }

  const duplicated: WorkflowModule = {
    ...original,
    id: `module-${Date.now()}`,
    name: `${original.name} (Copy)`,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  workflowModules.push(duplicated);
  logger.info(`Duplicated workflow module: ${id} -> ${duplicated.id}`);

  return duplicated;
};

export const getUserConfigurations = async (userId: string): Promise<WorkflowConfiguration[]> => {
  return configurations.filter(config => config.userId === userId);
};

export const createConfiguration = async (data: {
  workflowId: string;
  userId: string;
  credentials: Record<string, any>;
}): Promise<WorkflowConfiguration> => {
  const newConfiguration: WorkflowConfiguration = {
    id: `config-${Date.now()}`,
    workflowId: data.workflowId,
    userId: data.userId,
    status: 'configuring',
    credentials: data.credentials,
    lastModified: new Date(),
    createdAt: new Date()
  };

  configurations.push(newConfiguration);
  logger.info(`Created configuration: ${newConfiguration.id}`);

  return newConfiguration;
};

export const updateConfiguration = async (
  id: string, 
  updates: Partial<WorkflowConfiguration>,
  userId?: string
): Promise<WorkflowConfiguration | null> => {
  const index = configurations.findIndex(config => 
    config.id === id && (!userId || config.userId === userId)
  );
  
  if (index === -1) {
    return null;
  }

  configurations[index] = {
    ...configurations[index],
    ...updates,
    lastModified: new Date()
  };

  logger.info(`Updated configuration: ${id}`);
  return configurations[index];
};

export const activateWorkflow = async (
  configId: string,
  enabled: boolean,
  userId?: string
): Promise<WorkflowConfiguration | null> => {
  const config = configurations.find(c => 
    c.id === configId && (!userId || c.userId === userId)
  );
  
  if (!config) {
    return null;
  }

  const updates: Partial<WorkflowConfiguration> = {
    status: enabled ? 'scheduled' : 'pending',
    lastModified: new Date()
  };

  if (enabled) {
    updates.scheduledActivation = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  } else {
    updates.scheduledActivation = undefined;
    updates.activatedAt = undefined;
  }

  return await updateConfiguration(configId, updates, userId);
};

export const validateWorkflowCredentials = async (
  workflowId: string,
  credentials: Record<string, any>
): Promise<boolean> => {
  // Mock validation - in production, this would validate against external APIs
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple validation: check if all required fields are present
  const module = await getWorkflowModuleById(workflowId);
  if (!module) {
    return false;
  }

  const requiredFields = module.requiredCredentials
    .filter(field => field.required)
    .map(field => field.name);

  for (const field of requiredFields) {
    if (!credentials[field] || credentials[field].trim() === '') {
      return false;
    }
  }

  return true;
};