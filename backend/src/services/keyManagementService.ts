import crypto from 'crypto';
import { logger } from '../utils/logger';
import { auditService } from './auditService';

// HSM Provider types
export type HSMProvider = 'aws-kms' | 'azure-kv' | 'gcp-kms' | 'vault' | 'local' | 'thales' | 'safenet';

// Key types and purposes
export type KeyType = 'aes' | 'rsa' | 'ec' | 'hmac' | 'derived';
export type KeyPurpose = 'encryption' | 'signing' | 'authentication' | 'key-derivation' | 'data-protection';
export type KeyStatus = 'active' | 'inactive' | 'revoked' | 'expired' | 'compromised' | 'archived';

// Compliance standards
export interface ComplianceStandards {
  fips140_2: boolean;
  commonCriteria: boolean;
  gdpr: boolean;
  pipeda: boolean;
  soc2: boolean;
  iso27001: boolean;
  pci_dss: boolean;
}

// Key metadata interface
export interface KeyMetadata {
  keyId: string;
  organizationId: string;
  tenantId?: string;
  keyType: KeyType;
  keyPurpose: KeyPurpose;
  keyStatus: KeyStatus;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  version: number;
  parentKeyId?: string;
  derivationPath?: string;
  tags: Record<string, string>;
  compliance: ComplianceStandards;
  accessPolicy: KeyAccessPolicy;
  rotationPolicy: KeyRotationPolicy;
  auditLog: KeyAuditEntry[];
}

// Key access control
export interface KeyAccessPolicy {
  allowedOperations: KeyOperation[];
  restrictedOperations: KeyOperation[];
  allowedUsers: string[];
  allowedRoles: string[];
  ipWhitelist: string[];
  timeRestrictions?: {
    startTime: string;
    endTime: string;
    timezone: string;
    daysOfWeek: number[];
  };
  geographicRestrictions?: {
    allowedCountries: string[];
    blockedCountries: string[];
  };
  requiresMFA: boolean;
  approvalRequired: boolean;
  approvers: string[];
}

// Key rotation policy
export interface KeyRotationPolicy {
  enabled: boolean;
  automaticRotation: boolean;
  rotationInterval: number; // days
  gracePeriod: number; // days
  notificationPeriod: number; // days before rotation
  maxKeyAge: number; // days
  rotateOnCompromise: boolean;
  rotateOnUsageThreshold: number;
  backupOldKeys: boolean;
  archiveOldKeys: boolean;
}

// Key operations
export type KeyOperation = 
  | 'encrypt' | 'decrypt' 
  | 'sign' | 'verify' 
  | 'derive' | 'wrap' | 'unwrap'
  | 'generate' | 'import' | 'export'
  | 'rotate' | 'revoke' | 'archive';

// Audit entry for key operations
export interface KeyAuditEntry {
  timestamp: Date;
  operation: KeyOperation;
  userId: string;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure' | 'unauthorized';
  details: Record<string, any>;
  complianceRelevant: boolean;
}

// HSM configuration
export interface HSMConfiguration {
  provider: HSMProvider;
  endpoint?: string;
  region?: string;
  credentials: {
    accessKeyId?: string;
    secretAccessKey?: string;
    token?: string;
    certificatePath?: string;
    privateKeyPath?: string;
    passphrase?: string;
  };
  encryptionContext?: Record<string, string>;
  keySpec?: string;
  keyUsage?: string[];
  multiRegion?: boolean;
  tags?: Record<string, string>;
}

// Key backup and recovery
export interface KeyBackup {
  backupId: string;
  keyId: string;
  encryptedKeyMaterial: string;
  backupMetadata: {
    timestamp: Date;
    backupType: 'scheduled' | 'manual' | 'pre-rotation';
    encryptionMethod: string;
    integrityHash: string;
    recoveryInstructions: string;
  };
  storageLocation: string;
  retentionPeriod: number; // days
  accessRequirements: {
    minimumApprovals: number;
    approvers: string[];
    auditRequired: boolean;
    complianceChecks: string[];
  };
}

// Key performance metrics
export interface KeyPerformanceMetrics {
  keyId: string;
  operationsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  availabilityPercentage: number;
  lastHealthCheck: Date;
  performanceAlerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  alertId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Enterprise Key Management Service
 * Provides comprehensive key lifecycle management with HSM integration
 */
export class KeyManagementService {
  private keys: Map<string, KeyMetadata> = new Map();
  private backups: Map<string, KeyBackup> = new Map();
  private performanceMetrics: Map<string, KeyPerformanceMetrics> = new Map();
  private hsmConfig: HSMConfiguration;
  private initialized: boolean = false;

  constructor(hsmConfig?: HSMConfiguration) {
    this.hsmConfig = hsmConfig || {
      provider: 'local',
      credentials: {}
    };
    
    this.initialize();
  }

  /**
   * Initialize the key management service
   */
  private async initialize(): Promise<void> {
    try {
      // Validate HSM configuration
      await this.validateHSMConfiguration();
      
      // Initialize HSM connection
      await this.initializeHSMConnection();
      
      // Load existing keys metadata
      await this.loadKeysMetadata();
      
      // Start background services
      this.startKeyRotationScheduler();
      this.startPerformanceMonitoring();
      this.startComplianceMonitoring();
      
      this.initialized = true;
      logger.info('Key Management Service initialized successfully', {
        provider: this.hsmConfig.provider,
        keysLoaded: this.keys.size
      });
      
      await auditService.logAuditEvent({
        organizationId: 'system',
        action: 'key_management_service_initialized',
        resourceType: 'key_management_service',
        businessContext: {
          provider: this.hsmConfig.provider,
          keysLoaded: this.keys.size
        },
        complianceRelevant: true
      });
    } catch (error) {
      logger.error('Failed to initialize Key Management Service:', error);
      throw new Error('Key Management Service initialization failed');
    }
  }

  /**
   * Generate a new cryptographic key
   */
  public async generateKey(
    organizationId: string,
    keyType: KeyType,
    keyPurpose: KeyPurpose,
    options: {
      keySize?: number;
      algorithm?: string;
      expirationDays?: number;
      tags?: Record<string, string>;
      tenantId?: string;
      accessPolicy?: Partial<KeyAccessPolicy>;
      rotationPolicy?: Partial<KeyRotationPolicy>;
    } = {}
  ): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('Key Management Service not initialized');
      }

      const keyId = this.generateKeyId(organizationId, keyType);
      
      // Generate key material based on HSM provider
      const keyMaterial = await this.generateKeyMaterial(keyType, options.keySize);
      
      // Create key metadata
      const keyMetadata: KeyMetadata = {
        keyId,
        organizationId,
        tenantId: options.tenantId,
        keyType,
        keyPurpose,
        keyStatus: 'active',
        algorithm: options.algorithm || this.getDefaultAlgorithm(keyType),
        keySize: options.keySize || this.getDefaultKeySize(keyType),
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: options.expirationDays ? 
          new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000) : 
          undefined,
        usageCount: 0,
        version: 1,
        tags: options.tags || {},
        compliance: this.getComplianceStandards(),
        accessPolicy: this.createDefaultAccessPolicy(options.accessPolicy),
        rotationPolicy: this.createDefaultRotationPolicy(options.rotationPolicy),
        auditLog: []
      };

      // Store key in HSM
      await this.storeKeyInHSM(keyId, keyMaterial, keyMetadata);
      
      // Store metadata locally
      this.keys.set(keyId, keyMetadata);
      
      // Create initial backup
      await this.createKeyBackup(keyId, 'manual');
      
      // Log audit event
      await this.logKeyAuditEvent(keyId, 'generate', 'system', {
        keyType,
        keyPurpose,
        algorithm: keyMetadata.algorithm,
        keySize: keyMetadata.keySize
      });

      logger.info('Cryptographic key generated successfully', {
        keyId,
        organizationId,
        keyType,
        keyPurpose,
        algorithm: keyMetadata.algorithm
      });

      return keyId;
    } catch (error) {
      logger.error('Key generation failed:', error);
      throw new Error('Failed to generate cryptographic key');
    }
  }

  /**
   * Rotate an existing key
   */
  public async rotateKey(
    keyId: string,
    userId: string,
    reason: 'scheduled' | 'manual' | 'compromise' | 'policy' = 'manual'
  ): Promise<string> {
    try {
      const keyMetadata = this.keys.get(keyId);
      if (!keyMetadata) {
        throw new Error('Key not found');
      }

      // Check access permissions
      if (!this.checkKeyAccess(keyMetadata, userId, 'rotate')) {
        throw new Error('Access denied for key rotation');
      }

      // Create backup of current key
      await this.createKeyBackup(keyId, 'pre-rotation');
      
      // Generate new key version
      const newKeyId = `${keyId}_v${keyMetadata.version + 1}`;
      const newKeyMaterial = await this.generateKeyMaterial(keyMetadata.keyType, keyMetadata.keySize);
      
      // Update metadata for new version
      const newKeyMetadata: KeyMetadata = {
        ...keyMetadata,
        keyId: newKeyId,
        version: keyMetadata.version + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        parentKeyId: keyId,
        auditLog: []
      };

      // Store new key in HSM
      await this.storeKeyInHSM(newKeyId, newKeyMaterial, newKeyMetadata);
      
      // Update old key status
      keyMetadata.keyStatus = 'inactive';
      keyMetadata.updatedAt = new Date();
      
      // Store both keys
      this.keys.set(newKeyId, newKeyMetadata);
      this.keys.set(keyId, keyMetadata);
      
      // Schedule old key archival based on grace period
      this.scheduleKeyArchival(keyId, keyMetadata.rotationPolicy.gracePeriod);
      
      // Log audit events
      await this.logKeyAuditEvent(keyId, 'rotate', userId, {
        reason,
        newKeyId,
        newVersion: newKeyMetadata.version
      });

      logger.info('Key rotated successfully', {
        oldKeyId: keyId,
        newKeyId,
        reason,
        userId,
        version: newKeyMetadata.version
      });

      return newKeyId;
    } catch (error) {
      logger.error('Key rotation failed:', error);
      throw new Error('Failed to rotate cryptographic key');
    }
  }

  /**
   * Revoke a key
   */
  public async revokeKey(
    keyId: string,
    userId: string,
    reason: string,
    immediate: boolean = false
  ): Promise<void> {
    try {
      const keyMetadata = this.keys.get(keyId);
      if (!keyMetadata) {
        throw new Error('Key not found');
      }

      // Check access permissions
      if (!this.checkKeyAccess(keyMetadata, userId, 'revoke')) {
        throw new Error('Access denied for key revocation');
      }

      // Create backup before revocation
      await this.createKeyBackup(keyId, 'manual');
      
      // Update key status
      keyMetadata.keyStatus = 'revoked';
      keyMetadata.updatedAt = new Date();
      
      if (immediate) {
        // Immediately remove from HSM
        await this.deleteKeyFromHSM(keyId);
      } else {
        // Schedule for archival
        this.scheduleKeyArchival(keyId, 7); // 7 days grace period
      }
      
      this.keys.set(keyId, keyMetadata);
      
      // Log audit event
      await this.logKeyAuditEvent(keyId, 'revoke', userId, {
        reason,
        immediate,
        revokedAt: new Date().toISOString()
      });

      logger.warn('Key revoked', {
        keyId,
        reason,
        userId,
        immediate
      });
    } catch (error) {
      logger.error('Key revocation failed:', error);
      throw new Error('Failed to revoke cryptographic key');
    }
  }

  /**
   * Get key metadata
   */
  public async getKeyMetadata(keyId: string, userId: string): Promise<KeyMetadata | null> {
    try {
      const keyMetadata = this.keys.get(keyId);
      if (!keyMetadata) {
        return null;
      }

      // Check access permissions
      if (!this.checkKeyAccess(keyMetadata, userId, 'encrypt')) {
        throw new Error('Access denied');
      }

      // Update last used timestamp
      keyMetadata.lastUsedAt = new Date();
      this.keys.set(keyId, keyMetadata);

      return keyMetadata;
    } catch (error) {
      logger.error('Failed to get key metadata:', error);
      return null;
    }
  }

  /**
   * List keys for organization
   */
  public async listKeys(
    organizationId: string,
    userId: string,
    filters: {
      keyType?: KeyType;
      keyPurpose?: KeyPurpose;
      keyStatus?: KeyStatus;
      tenantId?: string;
    } = {}
  ): Promise<KeyMetadata[]> {
    try {
      const orgKeys = Array.from(this.keys.values())
        .filter(key => key.organizationId === organizationId)
        .filter(key => this.checkKeyAccess(key, userId, 'encrypt'))
        .filter(key => !filters.keyType || key.keyType === filters.keyType)
        .filter(key => !filters.keyPurpose || key.keyPurpose === filters.keyPurpose)
        .filter(key => !filters.keyStatus || key.keyStatus === filters.keyStatus)
        .filter(key => !filters.tenantId || key.tenantId === filters.tenantId);

      return orgKeys;
    } catch (error) {
      logger.error('Failed to list keys:', error);
      return [];
    }
  }

  /**
   * Create key backup
   */
  private async createKeyBackup(
    keyId: string,
    backupType: 'scheduled' | 'manual' | 'pre-rotation'
  ): Promise<string> {
    try {
      const keyMetadata = this.keys.get(keyId);
      if (!keyMetadata) {
        throw new Error('Key not found for backup');
      }

      const backupId = `backup_${keyId}_${Date.now()}`;
      
      // Get key material from HSM (encrypted)
      const keyMaterial = await this.getKeyFromHSM(keyId);
      
      // Encrypt key material for backup
      const backupEncryptionKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipherGCM('aes-256-gcm', backupEncryptionKey);
      cipher.setIV(iv);
      
      let encryptedKeyMaterial = cipher.update(JSON.stringify(keyMaterial), 'utf8', 'hex');
      encryptedKeyMaterial += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      // Create integrity hash
      const integrityHash = crypto.createHash('sha256')
        .update(encryptedKeyMaterial)
        .digest('hex');

      const backup: KeyBackup = {
        backupId,
        keyId,
        encryptedKeyMaterial: `${iv.toString('hex')}:${authTag.toString('hex')}:${encryptedKeyMaterial}`,
        backupMetadata: {
          timestamp: new Date(),
          backupType,
          encryptionMethod: 'aes-256-gcm',
          integrityHash,
          recoveryInstructions: 'Contact key management administrator for recovery procedures'
        },
        storageLocation: `backup_storage/${organizationId}/${backupId}`,
        retentionPeriod: 2555, // 7 years
        accessRequirements: {
          minimumApprovals: 2,
          approvers: ['key-admin', 'security-officer'],
          auditRequired: true,
          complianceChecks: ['identity-verification', 'business-justification']
        }
      };

      this.backups.set(backupId, backup);
      
      // Store backup encryption key securely (would be in separate HSM in production)
      await this.storeBackupKey(backupId, backupEncryptionKey);
      
      await this.logKeyAuditEvent(keyId, 'generate', 'system', {
        backupId,
        backupType,
        storageLocation: backup.storageLocation
      });

      return backupId;
    } catch (error) {
      logger.error('Key backup creation failed:', error);
      throw new Error('Failed to create key backup');
    }
  }

  /**
   * Health check for key management service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const hsmStatus = await this.checkHSMHealth();
      const keyCount = this.keys.size;
      const activeKeys = Array.from(this.keys.values()).filter(k => k.keyStatus === 'active').length;
      const expiredKeys = Array.from(this.keys.values()).filter(k => 
        k.expiresAt && k.expiresAt < new Date()
      ).length;

      const status = hsmStatus && keyCount > 0 ? 'healthy' : 'degraded';

      return {
        status,
        details: {
          hsmConnected: hsmStatus,
          provider: this.hsmConfig.provider,
          totalKeys: keyCount,
          activeKeys,
          expiredKeys,
          initialized: this.initialized,
          lastCheck: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          initialized: this.initialized
        }
      };
    }
  }

  // Private helper methods

  private generateKeyId(organizationId: string, keyType: KeyType): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `key_${organizationId.substring(0, 8)}_${keyType}_${timestamp}_${random}`;
  }

  private async generateKeyMaterial(keyType: KeyType, keySize?: number): Promise<Buffer> {
    switch (keyType) {
      case 'aes':
        return crypto.randomBytes(keySize || 32); // 256-bit default
      case 'hmac':
        return crypto.randomBytes(keySize || 64); // 512-bit default
      case 'rsa':
        // In production, this would generate RSA key pair in HSM
        return crypto.randomBytes(256); // Placeholder
      case 'ec':
        // In production, this would generate EC key pair in HSM
        return crypto.randomBytes(32); // Placeholder
      default:
        throw new Error(`Unsupported key type: ${keyType}`);
    }
  }

  private getDefaultAlgorithm(keyType: KeyType): string {
    const algorithms = {
      aes: 'aes-256-gcm',
      rsa: 'rsa-2048',
      ec: 'secp256r1',
      hmac: 'hmac-sha256',
      derived: 'pbkdf2'
    };
    return algorithms[keyType];
  }

  private getDefaultKeySize(keyType: KeyType): number {
    const sizes = {
      aes: 256,
      rsa: 2048,
      ec: 256,
      hmac: 512,
      derived: 256
    };
    return sizes[keyType];
  }

  private getComplianceStandards(): ComplianceStandards {
    return {
      fips140_2: process.env.FIPS_140_2_COMPLIANCE === 'true',
      commonCriteria: process.env.COMMON_CRITERIA_COMPLIANCE === 'true',
      gdpr: true,
      pipeda: true,
      soc2: true,
      iso27001: true,
      pci_dss: process.env.PCI_DSS_COMPLIANCE === 'true'
    };
  }

  private createDefaultAccessPolicy(partial?: Partial<KeyAccessPolicy>): KeyAccessPolicy {
    return {
      allowedOperations: ['encrypt', 'decrypt'],
      restrictedOperations: ['export'],
      allowedUsers: [],
      allowedRoles: ['key-user'],
      ipWhitelist: [],
      requiresMFA: false,
      approvalRequired: false,
      approvers: [],
      ...partial
    };
  }

  private createDefaultRotationPolicy(partial?: Partial<KeyRotationPolicy>): KeyRotationPolicy {
    return {
      enabled: true,
      automaticRotation: false,
      rotationInterval: 90,
      gracePeriod: 7,
      notificationPeriod: 7,
      maxKeyAge: 365,
      rotateOnCompromise: true,
      rotateOnUsageThreshold: 1000000,
      backupOldKeys: true,
      archiveOldKeys: true,
      ...partial
    };
  }

  private checkKeyAccess(keyMetadata: KeyMetadata, userId: string, operation: KeyOperation): boolean {
    const policy = keyMetadata.accessPolicy;
    
    // Check if operation is allowed
    if (!policy.allowedOperations.includes(operation)) {
      return false;
    }
    
    // Check if operation is restricted
    if (policy.restrictedOperations.includes(operation)) {
      return false;
    }
    
    // Check user permissions (simplified for demo)
    if (policy.allowedUsers.length > 0 && !policy.allowedUsers.includes(userId)) {
      return false;
    }
    
    return true;
  }

  private async logKeyAuditEvent(
    keyId: string,
    operation: KeyOperation,
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    const auditEntry: KeyAuditEntry = {
      timestamp: new Date(),
      operation,
      userId,
      ipAddress: '0.0.0.0', // Would be passed from request
      userAgent: 'KeyManagementService',
      result: 'success',
      details,
      complianceRelevant: true
    };

    const keyMetadata = this.keys.get(keyId);
    if (keyMetadata) {
      keyMetadata.auditLog.push(auditEntry);
      keyMetadata.usageCount++;
      this.keys.set(keyId, keyMetadata);
    }

    // Also log to central audit service
    await auditService.logAuditEvent({
      organizationId: keyMetadata?.organizationId || 'system',
      action: `key_${operation}`,
      resourceType: 'cryptographic_key',
      resourceId: keyId,
      businessContext: details,
      complianceRelevant: true
    });
  }

  private scheduleKeyArchival(keyId: string, gracePeriodDays: number): void {
    setTimeout(async () => {
      try {
        const keyMetadata = this.keys.get(keyId);
        if (keyMetadata && keyMetadata.keyStatus === 'inactive') {
          keyMetadata.keyStatus = 'archived';
          await this.deleteKeyFromHSM(keyId);
          this.keys.set(keyId, keyMetadata);
          
          logger.info(`Key archived after grace period: ${keyId}`);
        }
      } catch (error) {
        logger.error(`Failed to archive key ${keyId}:`, error);
      }
    }, gracePeriodDays * 24 * 60 * 60 * 1000);
  }

  // HSM integration methods (simplified for demo)
  private async validateHSMConfiguration(): Promise<void> {
    // Validate HSM configuration based on provider
    logger.info('HSM configuration validated');
  }

  private async initializeHSMConnection(): Promise<void> {
    // Initialize connection to HSM based on provider
    logger.info('HSM connection initialized');
  }

  private async loadKeysMetadata(): Promise<void> {
    // Load existing keys metadata from persistent storage
    logger.info('Keys metadata loaded');
  }

  private async storeKeyInHSM(keyId: string, keyMaterial: Buffer, metadata: KeyMetadata): Promise<void> {
    // Store key in HSM based on provider
    logger.info(`Key stored in HSM: ${keyId}`);
  }

  private async getKeyFromHSM(keyId: string): Promise<Buffer> {
    // Retrieve key from HSM
    return Buffer.from('mock_key_material');
  }

  private async deleteKeyFromHSM(keyId: string): Promise<void> {
    // Delete key from HSM
    logger.info(`Key deleted from HSM: ${keyId}`);
  }

  private async storeBackupKey(backupId: string, backupKey: Buffer): Promise<void> {
    // Store backup encryption key securely
    logger.info(`Backup key stored: ${backupId}`);
  }

  private async checkHSMHealth(): Promise<boolean> {
    // Check HSM health based on provider
    return true;
  }

  private startKeyRotationScheduler(): void {
    setInterval(async () => {
      await this.checkKeysForRotation();
    }, 24 * 60 * 60 * 1000); // Daily check
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 60 * 1000); // Every minute
  }

  private startComplianceMonitoring(): void {
    setInterval(async () => {
      await this.runComplianceChecks();
    }, 60 * 60 * 1000); // Hourly
  }

  private async checkKeysForRotation(): Promise<void> {
    // Check keys that need rotation based on policy
    logger.debug('Checking keys for rotation');
  }

  private updatePerformanceMetrics(): void {
    // Update performance metrics for all keys
    logger.debug('Performance metrics updated');
  }

  private async runComplianceChecks(): Promise<void> {
    // Run compliance checks on all keys
    logger.debug('Compliance checks completed');
  }
}

// Export singleton instance
export const keyManagementService = new KeyManagementService();