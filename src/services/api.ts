import axios from 'axios';
import { ApiResponse, User, WorkflowModule, WorkflowConfiguration } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Mock implementations for now
export const authService = {
  login: async (email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
    // Mock implementation
    return {
      success: true,
      data: {
        user: {
          id: '1',
          email,
          name: 'John Doe',
          company: 'Acme Corp',
          role: 'admin'
        },
        token: 'mock-jwt-token'
      }
    };
  },

  register: async (data: any): Promise<ApiResponse<{ user: User; token: string }>> => {
    // Mock implementation
    return {
      success: true,
      data: {
        user: {
          id: '2',
          email: data.email,
          name: data.name,
          company: data.company,
          role: 'user'
        },
        token: 'mock-jwt-token'
      }
    };
  },

  logout: async (): Promise<void> => {
    // Mock implementation
    return Promise.resolve();
  }
};

export const workflowService = {
  getModules: async (): Promise<ApiResponse<WorkflowModule[]>> => {
    // In production, this would be: return api.get('/workflows/modules');
    return { success: true, data: [] };
  },

  getConfigurations: async (userId: string): Promise<ApiResponse<WorkflowConfiguration[]>> => {
    // In production: return api.get(`/workflows/configurations?userId=${userId}`);
    return { success: true, data: [] };
  },

  createConfiguration: async (data: Partial<WorkflowConfiguration>): Promise<ApiResponse<WorkflowConfiguration>> => {
    // In production: return api.post('/workflows/configurations', data);
    return {
      success: true,
      data: {
        id: Date.now().toString(),
        ...data,
        status: 'configuring',
        lastModified: new Date()
      } as WorkflowConfiguration
    };
  },

  updateConfiguration: async (id: string, data: any): Promise<ApiResponse<WorkflowConfiguration>> => {
    // In production: return api.put(`/workflows/configurations/${id}`, data);
    return { success: true, data: {} as WorkflowConfiguration };
  },

  validateCredentials: async (workflowId: string, credentials: any): Promise<ApiResponse<boolean>> => {
    // In production: return api.post(`/workflows/${workflowId}/validate`, credentials);
    return { success: true, data: true };
  },

  activateWorkflow: async (configId: string, enabled: boolean): Promise<ApiResponse<void>> => {
    // In production: return api.post(`/workflows/configurations/${configId}/activate`, { enabled });
    return { success: true };
  }
};

export default api;