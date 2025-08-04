import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AdminUser extends User {
  permissions: string[];
  lastLogin: Date;
}

interface AdminState {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  permissions: string[];
}

interface AdminStore extends AdminState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkPermission: (permission: string) => boolean;
  refreshToken: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      permissions: [],

      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Admin credentials validation
          if (email !== 'admin@n8nmanager.com' || password !== 'admin123') {
            set({ loading: false });
            throw new Error('Invalid admin credentials');
          }
          
          const adminUser: AdminUser = {
            id: 'admin-1',
            email,
            name: 'System Administrator',
            company: 'n8n Workflow Manager',
            role: 'admin',
            permissions: [
              'workflows.create',
              'workflows.read',
              'workflows.update',
              'workflows.delete',
              'clients.read',
              'clients.update',
              'analytics.read',
              'system.admin'
            ],
            lastLogin: new Date()
          };
          
          const adminToken = 'admin-jwt-token-' + Date.now();
          
          set({
            admin: adminUser,
            token: adminToken,
            isAuthenticated: true,
            loading: false,
            permissions: adminUser.permissions
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          permissions: []
        });
      },

      checkPermission: (permission: string) => {
        const { permissions } = get();
        return permissions.includes(permission) || permissions.includes('system.admin');
      },

      refreshToken: async () => {
        const { token } = get();
        if (!token) return;
        
        try {
          // Mock token refresh
          await new Promise(resolve => setTimeout(resolve, 500));
          const newToken = 'admin-jwt-token-' + Date.now();
          set({ token: newToken });
        } catch (error) {
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
            permissions: []
          });
          throw error;
        }
      }
    }),
    {
      name: 'admin-storage',
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions
      })
    }
  )
);