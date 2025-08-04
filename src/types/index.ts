export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role: 'admin' | 'user';
}

export interface WorkflowModule {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  requiredCredentials: CredentialField[];
  externalTools: string[];
  features: string[];
  estimatedSetupTime: string;
  monthlyPrice?: number;
}

export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'file';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

export interface WorkflowConfiguration {
  id: string;
  workflowId: string;
  userId: string;
  status: 'pending' | 'configuring' | 'validating' | 'scheduled' | 'active' | 'error';
  credentials: Record<string, any>;
  activatedAt?: Date;
  scheduledActivation?: Date;
  lastModified: Date;
}

export interface WorkflowActivation {
  configurationId: string;
  workflowId: string;
  enabled: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface WorkflowState {
  modules: WorkflowModule[];
  configurations: WorkflowConfiguration[];
  loading: boolean;
  error: string | null;
}