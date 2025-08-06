/**
 * Privacy Compliance Service
 * Implements GDPR and PIPEDA compliance features
 * Handles data subject rights, consent management, and data processing transparency
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { DatabaseService } from './databaseService';
import { EmailService } from './emailService';
import { EncryptionService } from '../utils/encryptionService';
import { AuditLogger } from '../utils/auditLogger';

export interface ExportRequest {
  id: string;
  userId: string;
  categories: string[];
  format: 'json' | 'csv' | 'xml';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
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
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'denied';
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

class PrivacyComplianceService {
  private db: DatabaseService;
  private emailService: EmailService;
  private encryptionService: EncryptionService;
  private auditLogger: AuditLogger;

  constructor() {
    this.db = new DatabaseService();
    this.emailService = new EmailService();
    this.encryptionService = new EncryptionService();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Get comprehensive user data for transparency (GDPR Art. 15)
   */
  async getUserData(userId: string): Promise<any> {
    try {
      const [
        personalInfo,
        preferences,
        workflows,
        connections,
        activityLog,
        dataProcessingLog,
        consentHistory
      ] = await Promise.all([
        this.getPersonalInfo(userId),
        this.getPreferences(userId),
        this.getWorkflowData(userId),
        this.getConnectionData(userId),
        this.getActivityLog(userId),
        this.getProcessingActivities(userId),
        this.getConsentHistory(userId)
      ]);

      await this.auditLogger.log('data_access', userId, {
        action: 'user_data_retrieved',
        timestamp: new Date().toISOString()
      });

      return {
        personalInfo,
        preferences,
        workflows,
        connections,
        activityLog,
        dataProcessingLog,
        consentHistory
      };
    } catch (error) {
      console.error('Error getting user data:', error);
      throw new Error('Failed to retrieve user data');
    }
  }

  /**
   * Request data export (GDPR Art. 20)
   */
  async requestDataExport(userId: string, options: {
    categories: string[];
    format: 'json' | 'csv' | 'xml';
    includeDeleted: boolean;
    dateRange?: { from: string; to: string };
  }): Promise<ExportRequest> {
    try {
      const exportId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const exportRequest: ExportRequest = {
        id: exportId,
        userId,
        categories: options.categories,
        format: options.format,
        status: 'pending',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      await this.db.query(
        `INSERT INTO data_exports (id, user_id, categories, format, status, created_at, expires_at, options) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          exportId,
          userId,
          JSON.stringify(options.categories),
          options.format,
          'pending',
          now,
          expiresAt,
          JSON.stringify(options)
        ]
      );

      // Queue export processing
      await this.queueExportProcessing(exportRequest);

      await this.auditLogger.log('export_requested', userId, {
        exportId,
        categories: options.categories,
        format: options.format
      });

      return exportRequest;
    } catch (error) {
      console.error('Error requesting data export:', error);
      throw new Error('Failed to request data export');
    }
  }

  /**
   * Get export history for user
   */
  async getExportHistory(userId: string): Promise<ExportRequest[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM data_exports 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        categories: JSON.parse(row.categories),
        format: row.format,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        completedAt: row.completed_at?.toISOString(),
        expiresAt: row.expires_at?.toISOString(),
        downloadUrl: row.download_url,
        fileSize: row.file_size,
        errorMessage: row.error_message
      }));
    } catch (error) {
      console.error('Error getting export history:', error);
      throw new Error('Failed to get export history');
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(userId: string, exportId: string): Promise<ExportRequest | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM data_exports 
         WHERE id = $1 AND user_id = $2`,
        [exportId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        categories: JSON.parse(row.categories),
        format: row.format,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        completedAt: row.completed_at?.toISOString(),
        expiresAt: row.expires_at?.toISOString(),
        downloadUrl: row.download_url,
        fileSize: row.file_size,
        errorMessage: row.error_message
      };
    } catch (error) {
      console.error('Error getting export status:', error);
      throw new Error('Failed to get export status');
    }
  }

  /**
   * Submit data subject rights request
   */
  async submitDataRequest(userId: string, type: string, description: string): Promise<DataRequest> {
    try {
      const requestId = uuidv4();
      const now = new Date();

      const dataRequest: DataRequest = {
        id: requestId,
        userId,
        type: type as any,
        status: 'pending',
        description,
        createdAt: now.toISOString()
      };

      await this.db.query(
        `INSERT INTO data_requests (id, user_id, type, status, description, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [requestId, userId, type, 'pending', description, now]
      );

      // Send notification to privacy team
      await this.notifyPrivacyTeam(dataRequest);

      // Send confirmation to user
      await this.sendRequestConfirmation(userId, dataRequest);

      await this.auditLogger.log('data_request_submitted', userId, {
        requestId,
        type,
        description: description.substring(0, 100) // Log first 100 chars only
      });

      return dataRequest;
    } catch (error) {
      console.error('Error submitting data request:', error);
      throw new Error('Failed to submit data request');
    }
  }

  /**
   * Get user's data requests
   */
  async getDataRequests(userId: string): Promise<DataRequest[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM data_requests 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        status: row.status,
        description: row.description,
        createdAt: row.created_at.toISOString(),
        processedAt: row.processed_at?.toISOString(),
        response: row.response,
        processingNotes: row.processing_notes
      }));
    } catch (error) {
      console.error('Error getting data requests:', error);
      throw new Error('Failed to get data requests');
    }
  }

  /**
   * Get specific data request status
   */
  async getDataRequestStatus(userId: string, requestId: string): Promise<DataRequest | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM data_requests 
         WHERE id = $1 AND user_id = $2`,
        [requestId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        status: row.status,
        description: row.description,
        createdAt: row.created_at.toISOString(),
        processedAt: row.processed_at?.toISOString(),
        response: row.response,
        processingNotes: row.processing_notes
      };
    } catch (error) {
      console.error('Error getting data request status:', error);
      throw new Error('Failed to get data request status');
    }
  }

  /**
   * Request account deletion (GDPR Art. 17)
   */
  async requestAccountDeletion(userId: string, reason?: string): Promise<DataRequest> {
    try {
      const description = `Account deletion request. ${reason ? `Reason: ${reason}` : ''}`;
      
      // Check for existing pending deletion request
      const existingRequest = await this.db.query(
        `SELECT id FROM data_requests 
         WHERE user_id = $1 AND type = 'erasure' AND status IN ('pending', 'processing')`,
        [userId]
      );

      if (existingRequest.rows.length > 0) {
        throw new Error('Account deletion request already pending');
      }

      const request = await this.submitDataRequest(userId, 'erasure', description);

      // Send additional confirmation email for account deletion
      await this.sendDeletionConfirmation(userId, request.id);

      return request;
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      throw new Error('Failed to request account deletion');
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(userId: string, requestId: string): Promise<void> {
    try {
      const result = await this.db.query(
        `UPDATE data_requests 
         SET status = 'denied', processed_at = $1, response = 'Cancelled by user' 
         WHERE id = $2 AND user_id = $3 AND type = 'erasure' AND status IN ('pending', 'processing')`,
        [new Date(), requestId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Deletion request not found or cannot be cancelled');
      }

      await this.auditLogger.log('deletion_cancelled', userId, { requestId });
    } catch (error) {
      console.error('Error cancelling account deletion:', error);
      throw new Error('Failed to cancel account deletion');
    }
  }

  /**
   * Record user consent
   */
  async recordConsent(consentData: Omit<ConsentRecord, 'id'>): Promise<ConsentRecord> {
    try {
      const consentId = uuidv4();

      const consent: ConsentRecord = {
        id: consentId,
        ...consentData
      };

      await this.db.query(
        `INSERT INTO consent_records (id, user_id, consent_type, granted, timestamp, ip_address, user_agent, version) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          consentId,
          consentData.userId,
          consentData.consentType,
          consentData.granted,
          new Date(consentData.timestamp),
          consentData.ipAddress,
          consentData.userAgent,
          consentData.version
        ]
      );

      await this.auditLogger.log('consent_recorded', consentData.userId, {
        consentType: consentData.consentType,
        granted: consentData.granted,
        version: consentData.version
      });

      return consent;
    } catch (error) {
      console.error('Error recording consent:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Get user's consent history
   */
  async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM consent_records 
         WHERE user_id = $1 
         ORDER BY timestamp DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        consentType: row.consent_type,
        granted: row.granted,
        timestamp: row.timestamp.toISOString(),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        version: row.version,
        withdrawnAt: row.withdrawn_at?.toISOString()
      }));
    } catch (error) {
      console.error('Error getting consent history:', error);
      throw new Error('Failed to get consent history');
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(userId: string, consentId: string): Promise<void> {
    try {
      const result = await this.db.query(
        `UPDATE consent_records 
         SET withdrawn_at = $1 
         WHERE id = $2 AND user_id = $3 AND withdrawn_at IS NULL`,
        [new Date(), consentId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Consent record not found or already withdrawn');
      }

      await this.auditLogger.log('consent_withdrawn', userId, { consentId });
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw new Error('Failed to withdraw consent');
    }
  }

  /**
   * Update personal information (GDPR Art. 16)
   */
  async updatePersonalInfo(userId: string, updates: any): Promise<void> {
    try {
      const allowedFields = ['email', 'name'];
      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [userId, ...updateFields.map(field => updates[field])];

      await this.db.query(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        values
      );

      await this.auditLogger.log('personal_info_updated', userId, { updatedFields: updateFields });
    } catch (error) {
      console.error('Error updating personal info:', error);
      throw new Error('Failed to update personal information');
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: any): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO user_preferences (user_id, preferences, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) 
         DO UPDATE SET preferences = $2, updated_at = CURRENT_TIMESTAMP`,
        [userId, JSON.stringify(preferences)]
      );

      await this.auditLogger.log('preferences_updated', userId, { preferences });
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }

  /**
   * Get data processing activities (GDPR Art. 30)
   */
  async getProcessingActivities(userId: string): Promise<any[]> {
    try {
      // This would typically come from a comprehensive data processing registry
      return [
        {
          id: uuidv4(),
          purpose: 'Account Management',
          legalBasis: 'contract',
          dataTypes: ['Personal identifiers', 'Contact information'],
          timestamp: new Date().toISOString(),
          retention: '7 years after account closure',
          thirdParties: [],
          safeguards: 'Encryption at rest and in transit'
        },
        {
          id: uuidv4(),
          purpose: 'Service Provision - n8n Workflow Management',
          legalBasis: 'contract',
          dataTypes: ['Workflow configurations', 'Execution logs', 'Performance data'],
          timestamp: new Date().toISOString(),
          retention: '2 years after last workflow execution',
          thirdParties: ['n8n instances (user-configured)'],
          safeguards: 'End-to-end encryption, access controls'
        },
        {
          id: uuidv4(),
          purpose: 'Analytics and Service Improvement',
          legalBasis: 'legitimate_interests',
          dataTypes: ['Usage patterns', 'Performance metrics', 'Error logs'],
          timestamp: new Date().toISOString(),
          retention: '13 months',
          thirdParties: [],
          safeguards: 'Pseudonymization, aggregation'
        }
      ];
    } catch (error) {
      console.error('Error getting processing activities:', error);
      throw new Error('Failed to get processing activities');
    }
  }

  // Helper methods for data retrieval
  private async getPersonalInfo(userId: string): Promise<any> {
    const result = await this.db.query(
      'SELECT id, email, name, created_at, last_login, status, email_verified, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at.toISOString(),
      lastLogin: user.last_login?.toISOString(),
      accountStatus: user.status,
      emailVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled
    };
  }

  private async getPreferences(userId: string): Promise<any> {
    const result = await this.db.query(
      'SELECT preferences FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: true,
        autoSave: true,
        dataRetention: 'standard'
      };
    }

    return JSON.parse(result.rows[0].preferences);
  }

  private async getWorkflowData(userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT COUNT(*) as count, 
              COALESCE(SUM(execution_count), 0) as total_executions,
              MAX(updated_at) as last_modified,
              AVG(avg_execution_time) as avg_execution_time,
              AVG(error_rate) as error_rate
       FROM workflows 
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    return {
      count: parseInt(row.count),
      totalExecutions: parseInt(row.total_executions),
      lastModified: row.last_modified?.toISOString() || new Date().toISOString(),
      averageExecutionTime: parseFloat(row.avg_execution_time) || 0,
      errorRate: parseFloat(row.error_rate) || 0
    };
  }

  private async getConnectionData(userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT COUNT(*) as count,
              array_agg(DISTINCT provider) as providers,
              MAX(last_used) as last_used
       FROM connections 
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    return {
      count: parseInt(row.count),
      providers: row.providers || [],
      lastUsed: row.last_used?.toISOString(),
      totalCredentials: parseInt(row.count) // Same as connections for now
    };
  }

  private async getActivityLog(userId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT id, action, timestamp, details, ip_address, user_agent 
       FROM activity_logs 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 100`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      action: row.action,
      timestamp: row.timestamp.toISOString(),
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent
    }));
  }

  // Additional helper methods
  private async queueExportProcessing(exportRequest: ExportRequest): Promise<void> {
    // This would typically queue the export for background processing
    // For now, we'll simulate with a timeout
    setTimeout(async () => {
      try {
        await this.processDataExport(exportRequest);
      } catch (error) {
        console.error('Error processing export:', error);
        await this.markExportFailed(exportRequest.id, error.message);
      }
    }, 5000); // 5 second delay for demo
  }

  private async processDataExport(exportRequest: ExportRequest): Promise<void> {
    // Update status to processing
    await this.db.query(
      'UPDATE data_exports SET status = $1 WHERE id = $2',
      ['processing', exportRequest.id]
    );

    // Generate export file (simplified)
    const userData = await this.getUserData(exportRequest.userId);
    const exportData = this.filterExportData(userData, exportRequest.categories);
    
    // Save file and get download URL (simplified)
    const downloadUrl = await this.saveExportFile(exportData, exportRequest.format, exportRequest.id);
    const fileSize = JSON.stringify(exportData).length;

    // Update export record
    await this.db.query(
      `UPDATE data_exports 
       SET status = $1, completed_at = $2, download_url = $3, file_size = $4 
       WHERE id = $5`,
      ['completed', new Date(), downloadUrl, fileSize, exportRequest.id]
    );

    // Notify user
    await this.emailService.sendExportReadyNotification(exportRequest.userId, exportRequest.id);
  }

  private filterExportData(userData: any, categories: string[]): any {
    if (categories.includes('all')) {
      return userData;
    }

    const filtered: any = {};
    categories.forEach(category => {
      if (userData[category]) {
        filtered[category] = userData[category];
      }
    });

    return filtered;
  }

  private async saveExportFile(data: any, format: string, exportId: string): Promise<string> {
    // This would typically save to cloud storage and return a signed URL
    // For now, return a placeholder URL
    return `https://api.example.com/exports/${exportId}/download`;
  }

  private async markExportFailed(exportId: string, errorMessage: string): Promise<void> {
    await this.db.query(
      'UPDATE data_exports SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', errorMessage, exportId]
    );
  }

  private async notifyPrivacyTeam(request: DataRequest): Promise<void> {
    await this.emailService.sendPrivacyTeamNotification(request);
  }

  private async sendRequestConfirmation(userId: string, request: DataRequest): Promise<void> {
    await this.emailService.sendRequestConfirmation(userId, request);
  }

  private async sendDeletionConfirmation(userId: string, requestId: string): Promise<void> {
    await this.emailService.sendDeletionConfirmation(userId, requestId);
  }

  // Additional compliance methods can be added here...
  
  async getCookieConsent(userId: string): Promise<any> {
    const result = await this.db.query(
      'SELECT consent_data FROM cookie_consent WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    return result.rows.length > 0 ? JSON.parse(result.rows[0].consent_data) : null;
  }

  async updateCookieConsent(consentData: any): Promise<void> {
    await this.db.query(
      `INSERT INTO cookie_consent (user_id, consent_data, created_at, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        consentData.userId,
        JSON.stringify(consentData),
        new Date(consentData.timestamp),
        consentData.ipAddress,
        consentData.userAgent
      ]
    );
  }

  async getBreachNotifications(userId: string): Promise<any[]> {
    // Return any data breaches that affected this user
    // This would typically query a breach notifications table
    return [];
  }

  async getRetentionPolicy(): Promise<any> {
    return {
      categories: [
        {
          category: 'Account Data',
          description: 'Personal information and account settings',
          retentionPeriod: '7 years after account closure',
          legalBasis: 'Legal obligation (accounting records)',
          deletionProcess: 'Automatic deletion after retention period'
        },
        {
          category: 'Workflow Data',
          description: 'n8n workflow configurations and execution logs',
          retentionPeriod: '2 years after last execution',
          legalBasis: 'Contract performance',
          deletionProcess: 'Scheduled cleanup process'
        },
        {
          category: 'Analytics Data',
          description: 'Usage patterns and performance metrics',
          retentionPeriod: '13 months',
          legalBasis: 'Legitimate interests',
          deletionProcess: 'Rolling window deletion'
        }
      ],
      lastUpdated: '2024-01-01T00:00:00Z'
    };
  }

  async getComplianceScore(userId: string): Promise<any> {
    // Calculate compliance score based on various factors
    return {
      overall: 85,
      categories: {
        consent: 90,
        dataMinimization: 80,
        security: 88,
        transparency: 85,
        rights: 82
      },
      recommendations: [
        'Consider implementing data retention automation',
        'Review third-party data sharing agreements',
        'Update privacy policy to reflect new processing activities'
      ],
      lastUpdated: new Date().toISOString()
    };
  }
}

export const privacyComplianceService = new PrivacyComplianceService();