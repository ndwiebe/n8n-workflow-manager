import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User } from '../types';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          // Mock API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Validate demo credentials
          if (email !== 'demo@example.com' || password !== 'password') {
            set({ loading: false });
            throw new Error('Invalid email or password');
          }
          
          const mockUser: User = {
            id: '1',
            email,
            name: 'John Doe',
            company: 'Acme Corp',
            role: 'admin'
          };
          
          const mockToken = 'mock-jwt-token-' + Date.now();
          
          set({
            user: mockUser,
            token: mockToken,
            isAuthenticated: true,
            loading: false
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);