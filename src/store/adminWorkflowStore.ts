import { create } from 'zustand';
import { WorkflowModule, CredentialField } from '../types';
import { mockWorkflowModules } from '../utils/mockData';

interface AdminWorkflowState {
  modules: WorkflowModule[];
  loading: boolean;
  error: string | null;
  selectedModule: WorkflowModule | null;
}

interface AdminWorkflowStore extends AdminWorkflowState {
  fetchModules: () => Promise<void>;
  createModule: (module: Omit<WorkflowModule, 'id'>) => Promise<string>;
  updateModule: (id: string, module: Partial<WorkflowModule>) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  setSelectedModule: (module: WorkflowModule | null) => void;
  duplicateModule: (id: string) => Promise<string>;
  toggleModuleStatus: (id: string, active: boolean) => Promise<void>;
}

export const useAdminWorkflowStore = create<AdminWorkflowStore>((set, get) => ({
  modules: [],
  loading: false,
  error: null,
  selectedModule: null,

  fetchModules: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      // In production, this would fetch from API
      set({ modules: [...mockWorkflowModules], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch modules', loading: false });
    }
  },

  createModule: async (moduleData: Omit<WorkflowModule, 'id'>) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newModule: WorkflowModule = {
        ...moduleData,
        id: `module-${Date.now()}`
      };
      
      const { modules } = get();
      set({ 
        modules: [...modules, newModule], 
        loading: false 
      });
      
      return newModule.id;
    } catch (error) {
      set({ error: 'Failed to create module', loading: false });
      throw error;
    }
  },

  updateModule: async (id: string, updates: Partial<WorkflowModule>) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { modules } = get();
      const updatedModules = modules.map(module =>
        module.id === id ? { ...module, ...updates } : module
      );
      
      set({ modules: updatedModules, loading: false });
    } catch (error) {
      set({ error: 'Failed to update module', loading: false });
      throw error;
    }
  },

  deleteModule: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const { modules } = get();
      const filteredModules = modules.filter(module => module.id !== id);
      
      set({ modules: filteredModules, loading: false });
    } catch (error) {
      set({ error: 'Failed to delete module', loading: false });
      throw error;
    }
  },

  setSelectedModule: (module: WorkflowModule | null) => {
    set({ selectedModule: module });
  },

  duplicateModule: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { modules } = get();
      const originalModule = modules.find(m => m.id === id);
      
      if (!originalModule) {
        throw new Error('Module not found');
      }
      
      const duplicatedModule: WorkflowModule = {
        ...originalModule,
        id: `module-${Date.now()}`,
        name: `${originalModule.name} (Copy)`
      };
      
      set({ 
        modules: [...modules, duplicatedModule], 
        loading: false 
      });
      
      return duplicatedModule.id;
    } catch (error) {
      set({ error: 'Failed to duplicate module', loading: false });
      throw error;
    }
  },

  toggleModuleStatus: async (id: string, active: boolean) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { modules } = get();
      const updatedModules = modules.map(module =>
        module.id === id ? { ...module, active } : module
      );
      
      set({ modules: updatedModules, loading: false });
    } catch (error) {
      set({ error: 'Failed to toggle module status', loading: false });
      throw error;
    }
  }
}));