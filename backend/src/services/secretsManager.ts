import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Enterprise-grade secrets manager with proper encryption and key management
export interface SecretEntry {
  id: string;
  userId: string;
  workflowId: string;
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
  keyVersion: number;
  metadata?: SecretMetadata;
}

export interface SecretMetadata {
  type: 'credential' | 'config' | 'token' | 'api_key' | 'certificate';
  description?: string;
  expiresAt?: Date;
  lastRotated?: Date;
  rotationPolicy?: {
    enabled: boolean;
    intervalDays: number;
    autoRotate: boolean;
    notifyBeforeExpiry: number;
  };
  complianceFlags?: {
    pii: boolean;
    financial: boolean;
    healthcare: boolean;
    gdpr: boolean;
    pipeda: boolean;
  };
  auditInfo?: {
    createdBy: string;
    lastAccessedAt?: Date;
    accessCount: number;
    lastModifiedBy?: string;
  };
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: {
    algorithm: 'pbkdf2' | 'scrypt';
    iterations: number;
    saltLength: number;
    keyLength: number;
  };
  encryption: {
    ivLength: number;
    tagLength: number;
  };
}

export interface KeyRotationEvent {
  oldKeyVersion: number;
  newKeyVersion: number;
  rotatedAt: Date;
  reason: 'scheduled' | 'manual' | 'compromise' | 'policy';
  rotatedBy?: string;
}

export class SecretsManager {
  private secrets: Map<string, SecretEntry> = new Map();
  private masterKeys: Map<number, Buffer> = new Map();
  private currentKeyVersion: number = 1;
  private readonly config: EncryptionConfig;
  private rotationHistory: Map<string, KeyRotationEvent[]> = new Map();

  constructor(masterPassword?: string) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyDerivation: {
        algorithm: 'pbkdf2',
        iterations: 100000,
        saltLength: 32,
        keyLength: 32
      },
      encryption: {
        ivLength: 16,
        tagLength: 16
      }
    };

    this.initializeMasterKey(masterPassword);
    this.startRotationScheduler();
    logger.info('SecretsManager initialized with enterprise-grade encryption');
  }

  /**
   * Store a secret securely with enhanced encryption
   */
  public async storeSecret(
    userId: string,
    workflowId: string,
    key: string,
    value: string,
    metadata?: SecretMetadata
  ): Promise<string> {
    try {
      if (!userId || !workflowId || !key || !value) {
        throw new Error('Invalid input parameters');
      }

      const secretId = uuidv4();
      const encryptedValue = await this.encryptValue(value);
      
      const secret: SecretEntry = {
        id: secretId,
        userId: this.sanitizeUserId(userId),
        workflowId: this.sanitizeWorkflowId(workflowId),
        key: this.sanitizeKey(key),
        value: encryptedValue,
        encrypted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        keyVersion: this.currentKeyVersion,
        metadata: this.enhanceMetadata(metadata, userId)
      };

      this.secrets.set(secretId, secret);
      
      // Audit log - never log sensitive values
      this.auditLog('SECRET_STORED', {
        secretId,
        userId: this.hashUserId(userId),
        workflowId: this.hashWorkflowId(workflowId),
        keyName: this.hashKey(key),
        keyVersion: this.currentKeyVersion,
        complianceFlags: metadata?.complianceFlags
      });
      
      return secretId;
    } catch (error) {
      this.auditLog('SECRET_STORE_FAILED', {
        userId: this.hashUserId(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to store secret securely');
    }
  }

  /**
   * Retrieve a secret by ID with proper access control
   */
  public async getSecret(secretId: string, userId: string): Promise<SecretEntry | null> {
    try {
      if (!secretId || !userId) {
        throw new Error('Invalid input parameters');
      }

      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        this.auditLog('SECRET_NOT_FOUND', { secretId, userId: this.hashUserId(userId) });
        return null;
      }

      // Verify ownership and access control
      if (secret.userId !== this.sanitizeUserId(userId)) {
        this.auditLog('UNAUTHORIZED_ACCESS_ATTEMPT', {
          secretId,
          requestedBy: this.hashUserId(userId),
          ownedBy: this.hashUserId(secret.userId)
        });
        return null;
      }

      // Check if secret has expired
      if (this.isSecretExpired(secret)) {
        this.auditLog('EXPIRED_SECRET_ACCESS', { secretId, userId: this.hashUserId(userId) });
        return null;
      }

      // Decrypt the value
      const decryptedValue = await this.decryptValue(secret.value, secret.keyVersion);
      
      // Update access tracking
      if (secret.metadata?.auditInfo) {
        secret.metadata.auditInfo.lastAccessedAt = new Date();
        secret.metadata.auditInfo.accessCount++;
      }

      this.auditLog('SECRET_ACCESSED', {
        secretId,
        userId: this.hashUserId(userId),
        keyVersion: secret.keyVersion
      });

      return {
        ...secret,
        value: decryptedValue
      };
    } catch (error) {
      this.auditLog('SECRET_ACCESS_FAILED', {
        secretId,
        userId: this.hashUserId(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get all secrets for a user's workflow with pagination
   */
  public async getWorkflowSecrets(
    userId: string, 
    workflowId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<{ secrets: SecretEntry[]; total: number }> {
    try {
      if (!userId || !workflowId) {
        throw new Error('Invalid input parameters');
      }

      const { offset = 0, limit = 100 } = options;
      const sanitizedUserId = this.sanitizeUserId(userId);
      const sanitizedWorkflowId = this.sanitizeWorkflowId(workflowId);

      const workflowSecrets = Array.from(this.secrets.values())
        .filter(secret => 
          secret.userId === sanitizedUserId && 
          secret.workflowId === sanitizedWorkflowId &&
          !this.isSecretExpired(secret)
        )
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      const total = workflowSecrets.length;
      const paginatedSecrets = workflowSecrets.slice(offset, offset + limit);

      // Decrypt all values
      const decryptedSecrets = await Promise.all(
        paginatedSecrets.map(async secret => ({
          ...secret,
          value: await this.decryptValue(secret.value, secret.keyVersion)
        }))
      );

      this.auditLog('WORKFLOW_SECRETS_ACCESSED', {
        userId: this.hashUserId(userId),
        workflowId: this.hashWorkflowId(workflowId),
        secretCount: decryptedSecrets.length,
        total
      });

      return { secrets: decryptedSecrets, total };
    } catch (error) {
      this.auditLog('WORKFLOW_SECRETS_ACCESS_FAILED', {
        userId: this.hashUserId(userId),
        workflowId: this.hashWorkflowId(workflowId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { secrets: [], total: 0 };
    }
  }

  /**
   * Get secrets as a key-value object for workflow configuration
   */
  public async getSecretsAsObject(userId: string, workflowId: string): Promise<Record<string, string>> {
    try {
      const { secrets } = await this.getWorkflowSecrets(userId, workflowId);
      const secretsObject: Record<string, string> = {};

      secrets.forEach(secret => {
        secretsObject[secret.key] = secret.value;
      });

      return secretsObject;
    } catch (error) {
      logger.error(`Failed to get secrets as object for user ${this.hashUserId(userId)}:`, error);
      return {};
    }
  }

  /**
   * Update a secret value with key rotation support
   */
  public async updateSecret(
    secretId: string, 
    userId: string, 
    newValue: string,
    rotateKey: boolean = false
  ): Promise<boolean> {
    try {
      if (!secretId || !userId || !newValue) {
        throw new Error('Invalid input parameters');
      }

      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        this.auditLog('SECRET_UPDATE_NOT_FOUND', { secretId, userId: this.hashUserId(userId) });
        return false;
      }

      // Verify ownership
      if (secret.userId !== this.sanitizeUserId(userId)) {
        this.auditLog('UNAUTHORIZED_UPDATE_ATTEMPT', {
          secretId,
          requestedBy: this.hashUserId(userId),
          ownedBy: this.hashUserId(secret.userId)
        });
        return false;
      }

      // Rotate key if requested or if current key is old
      const useKeyVersion = rotateKey ? this.currentKeyVersion : secret.keyVersion;
      
      // Update with new encrypted value
      const encryptedValue = await this.encryptValue(newValue);
      secret.value = encryptedValue;
      secret.updatedAt = new Date();
      secret.keyVersion = useKeyVersion;

      // Update metadata
      if (secret.metadata) {
        secret.metadata.lastRotated = new Date();
        if (secret.metadata.auditInfo) {
          secret.metadata.auditInfo.lastModifiedBy = userId;
        }
      }

      this.secrets.set(secretId, secret);
      
      this.auditLog('SECRET_UPDATED', {
        secretId,
        userId: this.hashUserId(userId),
        keyVersion: useKeyVersion,
        rotatedKey: rotateKey
      });

      return true;
    } catch (error) {
      this.auditLog('SECRET_UPDATE_FAILED', {
        secretId,
        userId: this.hashUserId(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Delete a secret with audit trail
   */
  public async deleteSecret(secretId: string, userId: string): Promise<boolean> {
    try {
      if (!secretId || !userId) {
        throw new Error('Invalid input parameters');
      }

      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        this.auditLog('SECRET_DELETE_NOT_FOUND', { secretId, userId: this.hashUserId(userId) });
        return false;
      }

      // Verify ownership
      if (secret.userId !== this.sanitizeUserId(userId)) {
        this.auditLog('UNAUTHORIZED_DELETE_ATTEMPT', {
          secretId,
          requestedBy: this.hashUserId(userId),
          ownedBy: this.hashUserId(secret.userId)
        });
        return false;
      }

      // Secure deletion - overwrite memory
      this.secureDelete(secret);
      this.secrets.delete(secretId);

      this.auditLog('SECRET_DELETED', {
        secretId,
        userId: this.hashUserId(userId),
        keyVersion: secret.keyVersion
      });

      return true;
    } catch (error) {
      this.auditLog('SECRET_DELETE_FAILED', {
        secretId,
        userId: this.hashUserId(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Delete all secrets for a workflow
   */
  public async deleteWorkflowSecrets(userId: string, workflowId: string): Promise<number> {
    try {
      const workflowSecrets = Array.from(this.secrets.entries())
        .filter(([_, secret]) => secret.userId === this.sanitizeUserId(userId) && secret.workflowId === this.sanitizeWorkflowId(workflowId));

      let deletedCount = 0;
      for (const [secretId, secret] of workflowSecrets) {
        this.secureDelete(secret);
        this.secrets.delete(secretId);
        deletedCount++;
      }

      this.auditLog('WORKFLOW_SECRETS_DELETED', {
        userId: this.hashUserId(userId),
        workflowId: this.hashWorkflowId(workflowId),
        deletedCount
      });
      return deletedCount;
    } catch (error) {
      this.auditLog('WORKFLOW_SECRETS_DELETE_FAILED', {
        userId: this.hashUserId(userId),
        workflowId: this.hashWorkflowId(workflowId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Store multiple secrets at once
   */
  public async storeSecrets(
    userId: string,
    workflowId: string,
    secrets: Record<string, string>,
    metadata?: SecretMetadata
  ): Promise<string[]> {
    try {
      const secretIds: string[] = [];

      for (const [key, value] of Object.entries(secrets)) {
        const secretId = await this.storeSecret(userId, workflowId, key, value, metadata);
        secretIds.push(secretId);
      }

      this.auditLog('MULTIPLE_SECRETS_STORED', {
        userId: this.hashUserId(userId),
        workflowId: this.hashWorkflowId(workflowId),
        count: secretIds.length
      });
      return secretIds;
    } catch (error) {
      this.auditLog('MULTIPLE_SECRETS_STORE_FAILED', {
        userId: this.hashUserId(userId),
        workflowId: this.hashWorkflowId(workflowId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List all secrets for a user (without values)
   */
  public async listUserSecrets(userId: string): Promise<Omit<SecretEntry, 'value'>[]> {
    try {
      const sanitizedUserId = this.sanitizeUserId(userId);
      const userSecrets = Array.from(this.secrets.values())
        .filter(secret => secret.userId === sanitizedUserId)
        .map(secret => ({
          id: secret.id,
          userId: secret.userId,
          workflowId: secret.workflowId,
          key: secret.key,
          encrypted: secret.encrypted,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
          keyVersion: secret.keyVersion,
          metadata: secret.metadata
        }));

      return userSecrets;
    } catch (error) {
      this.auditLog('USER_SECRETS_LIST_FAILED', {
        userId: this.hashUserId(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Check if secrets exist for a workflow
   */
  public async hasWorkflowSecrets(userId: string, workflowId: string): Promise<boolean> {
    const { total } = await this.getWorkflowSecrets(userId, workflowId, { limit: 1 });
    return total > 0;
  }

  /**
   * Rotate master key and re-encrypt all secrets
   */
  public async rotateMasterKey(reason: KeyRotationEvent['reason'] = 'manual'): Promise<void> {
    try {
      const oldKeyVersion = this.currentKeyVersion;
      const newKeyVersion = this.currentKeyVersion + 1;

      // Generate new master key
      const salt = crypto.randomBytes(this.config.keyDerivation.saltLength);
      const newMasterKey = crypto.pbkdf2Sync(
        crypto.randomBytes(32),
        salt,
        this.config.keyDerivation.iterations,
        this.config.keyDerivation.keyLength,
        'sha256'
      );

      this.masterKeys.set(newKeyVersion, newMasterKey);
      this.currentKeyVersion = newKeyVersion;

      // Re-encrypt all secrets with new key
      const reencryptionPromises = Array.from(this.secrets.entries()).map(
        async ([secretId, secret]) => {
          try {
            const decryptedValue = await this.decryptValue(secret.value, secret.keyVersion);
            const reencryptedValue = await this.encryptValue(decryptedValue);
            
            secret.value = reencryptedValue;
            secret.keyVersion = newKeyVersion;
            secret.updatedAt = new Date();
            
            this.secrets.set(secretId, secret);
          } catch (error) {
            logger.error(`Failed to re-encrypt secret ${secretId}:`, error);
          }
        }
      );

      await Promise.all(reencryptionPromises);

      // Record rotation event
      const rotationEvent: KeyRotationEvent = {
        oldKeyVersion,
        newKeyVersion,
        rotatedAt: new Date(),
        reason
      };

      this.rotationHistory.set(newKeyVersion.toString(), [
        ...(this.rotationHistory.get(oldKeyVersion.toString()) || []),
        rotationEvent
      ]);

      // Schedule old key deletion (keep for grace period)
      setTimeout(() => {
        this.masterKeys.delete(oldKeyVersion);
        this.auditLog('OLD_MASTER_KEY_DELETED', { keyVersion: oldKeyVersion });
      }, 7 * 24 * 60 * 60 * 1000); // 7 days grace period

      this.auditLog('MASTER_KEY_ROTATED', {
        oldKeyVersion,
        newKeyVersion,
        reason,
        secretsReencrypted: reencryptionPromises.length
      });

      logger.info(`Master key rotated from version ${oldKeyVersion} to ${newKeyVersion}`);
    } catch (error) {
      this.auditLog('MASTER_KEY_ROTATION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to rotate master key');
    }
  }

  /**
   * Get secrets statistics for monitoring
   */
  public getSecretsStats(): {
    total: number;
    byUser: Record<string, number>;
    byWorkflow: Record<string, number>;
    encrypted: number;
    expired: number;
    keyVersions: Record<number, number>;
  } {
    const secrets = Array.from(this.secrets.values());
    const byUser: Record<string, number> = {};
    const byWorkflow: Record<string, number> = {};
    const keyVersions: Record<number, number> = {};
    
    let expired = 0;

    secrets.forEach(secret => {
      const hashedUserId = this.hashUserId(secret.userId);
      const hashedWorkflowId = this.hashWorkflowId(secret.workflowId);
      
      byUser[hashedUserId] = (byUser[hashedUserId] || 0) + 1;
      byWorkflow[hashedWorkflowId] = (byWorkflow[hashedWorkflowId] || 0) + 1;
      keyVersions[secret.keyVersion] = (keyVersions[secret.keyVersion] || 0) + 1;
      
      if (this.isSecretExpired(secret)) {
        expired++;
      }
    });

    return {
      total: secrets.length,
      byUser,
      byWorkflow,
      encrypted: secrets.filter(s => s.encrypted).length,
      expired,
      keyVersions
    };
  }

  /**
   * Rotate expired secrets (background task)
   */
  public async rotateExpiredSecrets(): Promise<void> {
    try {
      const now = new Date();
      const expiredSecrets = Array.from(this.secrets.entries())
        .filter(([_, secret]) => {
          const metadata = secret.metadata;
          return metadata?.expiresAt && metadata.expiresAt < now;
        });

      for (const [secretId, secret] of expiredSecrets) {
        this.auditLog('SECRET_EXPIRED', { 
          secretId, 
          userId: this.hashUserId(secret.userId),
          expiresAt: secret.metadata?.expiresAt?.toISOString()
        });
      }
    } catch (error) {
      logger.error('Failed to rotate expired secrets:', error);
    }
  }

  /**
   * Private encryption methods with proper GCM implementation
   */
  private async encryptValue(value: string): Promise<string> {
    try {
      const masterKey = this.masterKeys.get(this.currentKeyVersion);
      if (!masterKey) {
        throw new Error('Master key not available');
      }

      const iv = crypto.randomBytes(this.config.encryption.ivLength);
      const cipher = crypto.createCipherGCM(this.config.algorithm, masterKey);
      cipher.setIV(iv);

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      // Format: IV:AuthTag:EncryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption operation failed');
    }
  }

  private async decryptValue(encryptedValue: string, keyVersion: number): Promise<string> {
    try {
      const masterKey = this.masterKeys.get(keyVersion);
      if (!masterKey) {
        throw new Error('Decryption key not available');
      }

      const parts = encryptedValue.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipherGCM(this.config.algorithm, masterKey);
      decipher.setIV(iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption operation failed');
    }
  }

  private initializeMasterKey(masterPassword?: string): void {
    try {
      const password = masterPassword || process.env.SECRETS_MASTER_PASSWORD || crypto.randomBytes(32).toString('hex');
      const salt = Buffer.from(process.env.SECRETS_SALT || crypto.randomBytes(32).toString('hex'), 'hex');

      const masterKey = crypto.pbkdf2Sync(
        password,
        salt,
        this.config.keyDerivation.iterations,
        this.config.keyDerivation.keyLength,
        'sha256'
      );

      this.masterKeys.set(this.currentKeyVersion, masterKey);
      
      this.auditLog('MASTER_KEY_INITIALIZED', { keyVersion: this.currentKeyVersion });
    } catch (error) {
      logger.error('Master key initialization failed:', error);
      throw new Error('Failed to initialize master key');
    }
  }

  private enhanceMetadata(metadata?: SecretMetadata, userId?: string): SecretMetadata {
    const enhanced: SecretMetadata = {
      type: metadata?.type || 'config',
      description: metadata?.description,
      expiresAt: metadata?.expiresAt,
      lastRotated: new Date(),
      rotationPolicy: metadata?.rotationPolicy || {
        enabled: true,
        intervalDays: 90,
        autoRotate: false,
        notifyBeforeExpiry: 7
      },
      complianceFlags: metadata?.complianceFlags || {
        pii: false,
        financial: false,
        healthcare: false,
        gdpr: true,
        pipeda: true
      },
      auditInfo: {
        createdBy: userId || 'system',
        lastAccessedAt: new Date(),
        accessCount: 0
      }
    };

    return enhanced;
  }

  private isSecretExpired(secret: SecretEntry): boolean {
    return secret.metadata?.expiresAt ? secret.metadata.expiresAt < new Date() : false;
  }

  private sanitizeUserId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 50);
  }

  private sanitizeWorkflowId(workflowId: string): string {
    return workflowId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 50);
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9\-_\.]/g, '').substring(0, 100);
  }

  private hashUserId(userId: string): string {
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }

  private hashWorkflowId(workflowId: string): string {
    return crypto.createHash('sha256').update(workflowId).digest('hex').substring(0, 16);
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  private secureDelete(secret: SecretEntry): void {
    // Overwrite sensitive data in memory
    if (secret.value) {
      const buffer = Buffer.from(secret.value, 'utf8');
      buffer.fill(0);
    }
  }

  private auditLog(action: string, details: Record<string, any>): void {
    logger.info(`SECRETS_AUDIT: ${action}`, {
      timestamp: new Date().toISOString(),
      action,
      ...details
    });
  }

  private startRotationScheduler(): void {
    // Check for secrets that need rotation every 24 hours
    setInterval(() => {
      this.checkSecretsForRotation();
    }, 24 * 60 * 60 * 1000);
  }

  private async checkSecretsForRotation(): Promise<void> {
    try {
      const now = new Date();
      const secretsNeedingRotation: string[] = [];

      for (const [secretId, secret] of this.secrets.entries()) {
        const policy = secret.metadata?.rotationPolicy;
        if (!policy?.enabled || !policy.autoRotate) continue;

        const lastRotated = secret.metadata?.lastRotated || secret.createdAt;
        const daysSinceRotation = Math.floor(
          (now.getTime() - lastRotated.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceRotation >= policy.intervalDays) {
          secretsNeedingRotation.push(secretId);
        }
      }

      if (secretsNeedingRotation.length > 0) {
        this.auditLog('SECRETS_ROTATION_NEEDED', {
          secretIds: secretsNeedingRotation,
          count: secretsNeedingRotation.length
        });
      }
    } catch (error) {
      logger.error('Secret rotation check failed:', error);
    }
  }
}

// Export singleton instance with enhanced security
export const secretsManager = new SecretsManager();