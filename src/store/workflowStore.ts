import { create } from 'zustand';
import { WorkflowState, WorkflowConfiguration, WorkflowActivation } from '../types';
import { mockWorkflowModules } from '../utils/mockData';

interface WorkflowStore extends WorkflowState {
  fetchModules: () => Promise<void>;
  fetchConfigurations: (userId: string) => Promise<void>;
  activateWorkflow: (activation: WorkflowActivation) => Promise<void>;
  updateConfiguration: (configId: string, credentials: Record<string, any>) => Promise<void>;
  createConfiguration: (workflowId: string, userId: string) => Promise<WorkflowConfiguration>;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  modules: [],
  configurations: [],
  loading: false,
  error: null,

  fetchModules: async () => {
    set({ loading: true, error: null });
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ modules: mockWorkflowModules, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch workflow modules', loading: false });
    }
  },

  fetchConfigurations: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Generate some mock configurations
      const mockConfigs: WorkflowConfiguration[] = [
        {
          id: '1',
          workflowId: 'invoice-processor',
          userId,
          status: 'active',
          credentials: { apiKey: '***' },
          activatedAt: new Date('2024-01-01'),
          lastModified: new Date('2024-01-01')
        },
        {
          id: '2',
          workflowId: 'email-automation',
          userId,
          status: 'scheduled',
          credentials: { smtp: '***' },
          scheduledActivation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastModified: new Date()
        }
      ];
      
      set({ configurations: mockConfigs, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch configurations', loading: false });
    }
  },

  activateWorkflow: async (activation: WorkflowActivation) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { configurations } = get();
      const updated = configurations.map(config => {
        if (config.id === activation.configurationId) {
          return {
            ...config,
            status: (activation.enabled ? 'scheduled' : 'pending') as 'scheduled' | 'pending',
            scheduledActivation: activation.enabled 
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              : undefined
          };
        }
        return config;
      });
      
      set({ configurations: updated, loading: false });
    } catch (error) {
      set({ error: 'Failed to activate workflow', loading: false });
    }
  },

  updateConfiguration: async (configId: string, credentials: Record<string, any>) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { configurations } = get();
      const updated = configurations.map(config => {
        if (config.id === configId) {
          return {
            ...config,
            credentials,
            status: 'validating' as const,
            lastModified: new Date()
          };
        }
        return config;
      });
      
      set({ configurations: updated, loading: false });
      
      // Simulate validation with proper state update
      setTimeout(() => {
        const currentState = get();
        const validatedConfigs = currentState.configurations.map(config => {
          if (config.id === configId) {
            return { 
              ...config, 
              status: 'scheduled' as const,
              scheduledActivation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
          }
          return config;
        });
        set({ configurations: validatedConfigs });
      }, 2000);
    } catch (error) {
      set({ error: 'Failed to update configuration', loading: false });
    }
  },

  createConfiguration: async (workflowId: string, userId: string) => {
    const newConfig: WorkflowConfiguration = {
      id: Date.now().toString(),
      workflowId,
      userId,
      status: 'configuring',
      credentials: {},
      lastModified: new Date()
    };
    
    const { configurations } = get();
    set({ configurations: [...configurations, newConfig] });
    
    return newConfig;
  }
}));