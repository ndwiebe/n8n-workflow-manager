export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
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
  monthlyPrice: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'url' | 'select' | 'file' | 'number' | 'checkbox';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{
    value: string;
    label: string;
  }>;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    message?: string;
  };
}

export interface WorkflowConfiguration {
  id: string;
  workflowId: string;
  userId: string;
  status: 'pending' | 'configuring' | 'validating' | 'scheduled' | 'active' | 'error';
  credentials: Record<string, any>;
  activatedAt?: Date;
  scheduledActivation?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export interface ProvisioningJob {
  id: string;
  userId: string;
  workflowId: string;
  templateId: string;
  status: 'pending' | 'validating' | 'provisioning' | 'configuring' | 'testing' | 'ready' | 'active' | 'failed' | 'scheduled';
  configuration: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  version: string;
  author: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: string;
  monthlyPrice: number;
  fields: CredentialField[];
  externalTools: string[];
  features: string[];
  requirements: Record<string, any>;
  provisioning: {
    type: string;
    template: string;
    estimatedProvisionTime: string;
    dependencies: string[];
  };
}