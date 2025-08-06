/**
 * Privacy Service
 * Handles all privacy-related API calls and data management
 * Implements GDPR and PIPEDA compliance requirements
 */

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
export type DataRequestStatus = 'pending' | 'processing' | 'completed' | 'denied';
export type DataRequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';

export interface ExportRequest {
  id: string;
  userId: string;
  categories: string[];
  format: 'json' | 'csv' | 'xml';
  status: ExportStatus;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
  fileSize?: number;
  errorMessage?: string;
}

export interface DataRequest {
  id: string;
  userId: string;
  type: DataRequestType;
  status: DataRequestStatus;
  description: string;
  createdAt: string;
  processedAt?: string;
  response?: string;
  processingNotes?: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'cookies' | 'privacy_policy' | 'marketing' | 'analytics';
  granted: boolean;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  version: string; // Version of privacy policy/terms
  withdrawnAt?: string;
}

export interface UserData {
  personalInfo: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastLogin: string;
    accountStatus: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  preferences: {
    theme: string;
    language: string;
    timezone: string;
    notifications: boolean;
    autoSave: boolean;
    dataRetention: string;
  };
  workflows: {
    count: number;
    totalExecutions: number;
    lastModified: string;
    averageExecutionTime: number;
    errorRate: number;
  };
  connections: {
    count: number;
    providers: string[];
    lastUsed: string;
    totalCredentials: number;
  };
  activityLog: Array<{
    id: string;
    action: string;
    timestamp: string;
    details: string;
    ipAddress: string;
    userAgent: string;
  }>;
  dataProcessingLog: Array<{
    id: string;
    purpose: string;
    legalBasis: string;
    dataTypes: string[];
    timestamp: string;
    retention: string;
    thirdParties?: string[];
    safeguards?: string;
  }>;
  consentHistory: ConsentRecord[];
}

export interface ExportOptions {
  categories: string[];
  format: 'json' | 'csv' | 'xml';
  includeDeleted: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

class PrivacyService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.authToken = localStorage.getItem('authToken');
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // User Data Access
  async getUserData(): Promise<UserData> {
    return this.makeRequest<UserData>('/privacy/user-data');
  }

  // Data Export Functions
  async requestDataExport(options: ExportOptions): Promise<ExportRequest> {
    return this.makeRequest<ExportRequest>('/privacy/export', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getExportHistory(): Promise<ExportRequest[]> {
    return this.makeRequest<ExportRequest[]>('/privacy/exports');
  }

  async getExportStatus(exportId: string): Promise<ExportRequest> {
    return this.makeRequest<ExportRequest>(`/privacy/exports/${exportId}`);
  }

  async downloadExport(exportId: string): Promise<void> {
    const exportData = await this.getExportStatus(exportId);
    
    if (exportData.status !== 'completed' || !exportData.downloadUrl) {
      throw new Error('Export is not ready for download');
    }

    // Create download link
    const link = document.createElement('a');
    link.href = exportData.downloadUrl;
    link.download = `data-export-${exportId}.${exportData.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async downloadUserData(): Promise<void> {
    // Quick export for immediate download
    const exportRequest = await this.requestDataExport({
      categories: ['all'],
      format: 'json',
      includeDeleted: false,
    });

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    const checkStatus = async (): Promise<void> => {
      const status = await this.getExportStatus(exportRequest.id);
      
      if (status.status === 'completed') {
        await this.downloadExport(exportRequest.id);
        return;
      }
      
      if (status.status === 'failed') {
        throw new Error(status.errorMessage || 'Export failed');
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Export timeout - please try again later');
      }
      
      attempts++;
      setTimeout(checkStatus, 5000);
    };

    await checkStatus();
  }

  // Data Subject Rights Requests
  async submitDataRequest(type: DataRequestType, description: string): Promise<DataRequest> {
    return this.makeRequest<DataRequest>('/privacy/requests', {
      method: 'POST',
      body: JSON.stringify({ type, description }),
    });
  }

  async getDataRequests(): Promise<DataRequest[]> {
    return this.makeRequest<DataRequest[]>('/privacy/requests');
  }

  async getDataRequestStatus(requestId: string): Promise<DataRequest> {
    return this.makeRequest<DataRequest>(`/privacy/requests/${requestId}`);
  }

  // Account Deletion
  async requestAccountDeletion(reason?: string): Promise<DataRequest> {
    return this.makeRequest<DataRequest>('/privacy/delete-account', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async cancelAccountDeletion(requestId: string): Promise<void> {
    await this.makeRequest(`/privacy/delete-account/${requestId}/cancel`, {
      method: 'POST',
    });
  }

  // Consent Management
  async recordConsent(
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    version: string
  ): Promise<ConsentRecord> {
    return this.makeRequest<ConsentRecord>('/privacy/consent', {
      method: 'POST',
      body: JSON.stringify({
        consentType,
        granted,
        version,
        timestamp: new Date().toISOString(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
      }),
    });
  }

  async getConsentHistory(): Promise<ConsentRecord[]> {
    return this.makeRequest<ConsentRecord[]>('/privacy/consent-history');
  }

  async withdrawConsent(consentId: string): Promise<void> {
    await this.makeRequest(`/privacy/consent/${consentId}/withdraw`, {
      method: 'POST',
    });
  }

  // Data Rectification
  async updatePersonalData(updates: Partial<UserData['personalInfo']>): Promise<void> {
    await this.makeRequest('/privacy/personal-info', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async updatePreferences(preferences: Partial<UserData['preferences']>): Promise<void> {
    await this.makeRequest('/privacy/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  // Data Processing Records (GDPR Article 30 compliance)
  async getProcessingActivities(): Promise<UserData['dataProcessingLog']> {
    return this.makeRequest<UserData['dataProcessingLog']>('/privacy/processing-activities');
  }

  // Cookie Management
  async getCookieConsent(): Promise<any> {
    try {
      return this.makeRequest('/privacy/cookie-consent');
    } catch (error) {
      // If API call fails, fall back to localStorage
      const consent = localStorage.getItem('cookieConsent');
      return consent ? JSON.parse(consent) : null;
    }
  }

  async updateCookieConsent(consent: any): Promise<void> {
    try {
      await this.makeRequest('/privacy/cookie-consent', {
        method: 'POST',
        body: JSON.stringify(consent),
      });
    } catch (error) {
      console.warn('Failed to sync cookie consent to server:', error);
    }
    
    // Always update localStorage as backup
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    localStorage.setItem('consentTimestamp', new Date().toISOString());
  }

  // Breach Notification (for transparency)
  async getBreachNotifications(): Promise<Array<{
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    affectedData: string[];
    reportedAt: string;
    resolvedAt?: string;
    actionsTaken: string[];
    userActions?: string[];
  }>> {
    return this.makeRequest('/privacy/breach-notifications');
  }

  // Data Retention Policy
  async getRetentionPolicy(): Promise<{
    categories: Array<{
      category: string;
      description: string;
      retentionPeriod: string;
      legalBasis: string;
      deletionProcess: string;
    }>;
    lastUpdated: string;
  }> {
    return this.makeRequest('/privacy/retention-policy');
  }

  // Privacy Impact Assessment results (transparency)
  async getPrivacyAssessment(): Promise<{
    lastAssessment: string;
    riskLevel: 'low' | 'medium' | 'high';
    mitigations: string[];
    dataFlows: Array<{
      source: string;
      destination: string;
      dataTypes: string[];
      safeguards: string[];
    }>;
  }> {
    return this.makeRequest('/privacy/assessment');
  }

  // Utility Functions
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  // Data minimization check
  async checkDataMinimization(): Promise<{
    recommendations: Array<{
      category: string;
      suggestion: string;
      potentialSavings: string;
    }>;
    score: number; // 0-100
  }> {
    return this.makeRequest('/privacy/data-minimization');
  }

  // Regular data audit
  async triggerDataAudit(): Promise<{
    auditId: string;
    scheduledFor: string;
    expectedCompletion: string;
  }> {
    return this.makeRequest('/privacy/audit', {
      method: 'POST',
    });
  }

  // GDPR compliance score
  async getComplianceScore(): Promise<{
    overall: number;
    categories: {
      consent: number;
      dataMinimization: number;
      security: number;
      transparency: number;
      rights: number;
    };
    recommendations: string[];
    lastUpdated: string;
  }> {
    return this.makeRequest('/privacy/compliance-score');
  }
}

// Export singleton instance
export const privacyService = new PrivacyService();

// Utility functions for privacy compliance
export const privacyUtils = {
  // Check if data subject rights request is valid
  isValidRequestType: (type: string): type is DataRequestType => {
    return ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'].includes(type);
  },

  // Format personal data for display
  formatPersonalData: (data: any): string => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  },

  // Calculate data retention period
  calculateRetentionPeriod: (createdAt: string, retentionYears: number): Date => {
    const created = new Date(createdAt);
    created.setFullYear(created.getFullYear() + retentionYears);
    return created;
  },

  // Validate email for data subject requests
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Generate unique request ID
  generateRequestId: (): string => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Check if consent is still valid (expires after 13 months per GDPR)
  isConsentValid: (timestamp: string): boolean => {
    const consentDate = new Date(timestamp);
    const now = new Date();
    const monthsDiff = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff < 13;
  },

  // Format legal basis for display
  formatLegalBasis: (basis: string): string => {
    const basisMap: Record<string, string> = {
      consent: 'Consent (Art. 6(1)(a) GDPR)',
      contract: 'Contract (Art. 6(1)(b) GDPR)',
      legal_obligation: 'Legal Obligation (Art. 6(1)(c) GDPR)',
      vital_interests: 'Vital Interests (Art. 6(1)(d) GDPR)',
      public_task: 'Public Task (Art. 6(1)(e) GDPR)',
      legitimate_interests: 'Legitimate Interests (Art. 6(1)(f) GDPR)',
    };
    return basisMap[basis] || basis;
  },
};