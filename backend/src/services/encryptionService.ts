import crypto from 'crypto';
import { logger } from '../utils/logger';
import { auditService } from './auditService';

export interface EncryptionKey {
  keyId: string;
  organizationId: string;
  algorithm: string;
  keyVersion: number;
  key: Buffer;
  derivedFrom?: string;
  purpose: 'general' | 'credentials' | 'pii' | 'financial' | 'healthcare';
  createdAt: Date;
  expiresAt?: Date;
  rotatedAt?: Date;
  status: 'active' | 'rotated' | 'revoked' | 'expired';
}

export interface EncryptedData {
  data: string;
  keyId: string;
  keyVersion: number;
  algorithm: string;
  iv: string;
  authTag: string;
  metadata: {
    purpose: string;
    organizationId: string;
    dataType: string;
    encryptedAt: Date;
  };
}

export interface KeyRotationPolicy {
  organizationId: string;
  keyPurpose: string;
  rotationInterval: number; // days
  gracePeriod: number; // days to keep old key active
  autoRotation: boolean;
  notifyBeforeRotation: number; // days
  requiresApproval: boolean;
  approvers: string[];
}

export interface KeyDerivationConfig {
  algorithm: 'pbkdf2' | 'scrypt' | 'argon2';
  iterations?: number;
  salt: string;
  keyLength: number;
  memory?: number; // for scrypt/argon2
  parallelism?: number; // for argon2
}

export interface HSMConfig {
  enabled: boolean;
  provider: 'aws-kms' | 'azure-kv' | 'gcp-kms' | 'vault' | 'local';
  endpoint?: string;
  region?: string;
  keyIds: Record<string, string>;
  credentials: Record<string, any>;
}

export class EncryptionService {
  private readonly DEFAULT_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits for GCM
  private readonly TAG_LENGTH = 16; // 128 bits auth tag
  private readonly SALT_LENGTH = 32; // 256 bits salt

  private keys: Map<string, EncryptionKey> = new Map();
  private rotationPolicies: Map<string, KeyRotationPolicy> = new Map();
  private hsmConfig: HSMConfig;

  constructor() {
    this.hsmConfig = {
      enabled: process.env.HSM_ENABLED === 'true',
      provider: (process.env.HSM_PROVIDER as any) || 'local',
      endpoint: process.env.HSM_ENDPOINT,
      region: process.env.HSM_REGION,
      keyIds: {},
      credentials: {}
    };

    this.initializeDefaultKeys();
    this.startKeyRotationScheduler();
  }

  /**
   * Generate a new encryption key for an organization
   */
  public async generateKey(
    organizationId: string,
    purpose: EncryptionKey['purpose'] = 'general',
    expirationDays?: number
  ): Promise<EncryptionKey> {
    try {
      const keyId = this.generateKeyId(organizationId, purpose);
      const key = crypto.randomBytes(this.KEY_LENGTH);
      
      let expiresAt: Date | undefined;
      if (expirationDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expirationDays);
      }

      const encryptionKey: EncryptionKey = {
        keyId,
        organizationId,
        algorithm: this.DEFAULT_ALGORITHM,
        keyVersion: 1,
        key,
        purpose,
        createdAt: new Date(),
        expiresAt,
        status: 'active'
      };

      // Store key (in production, this would be in HSM or secure key store)
      this.keys.set(keyId, encryptionKey);

      // Audit key generation
      await auditService.logAuditEvent({
        organizationId,
        action: 'encryption_key_generated',
        resourceType: 'encryption_key',
        resourceId: keyId,
        businessContext: {
          purpose,
          algorithm: this.DEFAULT_ALGORITHM,
          keyVersion: 1,
          expiresAt: expiresAt?.toISOString()
        },
        complianceRelevant: true
      });

      logger.info(`Generated new encryption key for organization ${organizationId}, purpose: ${purpose}`);
      return encryptionKey;
    } catch (error) {
      logger.error('Key generation failed:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Derive a key from a master key using key derivation function
   */
  public async deriveKey(
    masterKeyId: string,
    derivationConfig: KeyDerivationConfig,
    organizationId: string,
    purpose: EncryptionKey['purpose'] = 'general'
  ): Promise<EncryptionKey> {
    try {
      const masterKey = this.keys.get(masterKeyId);
      if (!masterKey) {
        throw new Error('Master key not found');
      }

      let derivedKey: Buffer;
      const salt = Buffer.from(derivationConfig.salt, 'hex');

      switch (derivationConfig.algorithm) {
        case 'pbkdf2':
          derivedKey = crypto.pbkdf2Sync(
            masterKey.key,
            salt,
            derivationConfig.iterations || 100000,
            derivationConfig.keyLength,
            'sha256'
          );
          break;
        case 'scrypt':
          derivedKey = crypto.scryptSync(
            masterKey.key,
            salt,
            derivationConfig.keyLength,
            {
              N: derivationConfig.iterations || 32768,
              r: 8,
              p: 1,
              maxmem: derivationConfig.memory || 64 * 1024 * 1024
            }
          );
          break;
        default:
          throw new Error(`Unsupported key derivation algorithm: ${derivationConfig.algorithm}`);
      }

      const keyId = this.generateKeyId(organizationId, purpose);
      const encryptionKey: EncryptionKey = {
        keyId,
        organizationId,
        algorithm: masterKey.algorithm,
        keyVersion: 1,
        key: derivedKey,
        derivedFrom: masterKeyId,
        purpose,
        createdAt: new Date(),
        status: 'active'
      };

      this.keys.set(keyId, encryptionKey);

      await auditService.logAuditEvent({
        organizationId,
        action: 'encryption_key_derived',
        resourceType: 'encryption_key',
        resourceId: keyId,
        businessContext: {
          masterKeyId,
          derivationAlgorithm: derivationConfig.algorithm,
          purpose
        },
        complianceRelevant: true
      });

      return encryptionKey;
    } catch (error) {
      logger.error('Key derivation failed:', error);
      throw new Error('Failed to derive encryption key');
    }
  }

  /**
   * Encrypt data using organization-specific key
   */
  public async encrypt(
    plaintext: string | Buffer,
    organizationId: string,
    purpose: EncryptionKey['purpose'] = 'general',
    dataType: string = 'generic'
  ): Promise<EncryptedData> {
    try {
      const keyId = this.findActiveKeyId(organizationId, purpose);
      const key = this.keys.get(keyId);
      
      if (!key) {
        // Generate new key if none exists
        const newKey = await this.generateKey(organizationId, purpose);
        return this.encryptWithKey(plaintext, newKey, dataType);
      }

      return this.encryptWithKey(plaintext, key, dataType);
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using stored key information
   */
  public async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const key = this.keys.get(encryptedData.keyId);
      if (!key) {
        throw new Error('Encryption key not found');
      }

      if (key.status !== 'active' && key.status !== 'rotated') {
        throw new Error('Encryption key is not available for decryption');
      }

      const decipher = crypto.createDecipherGCM(encryptedData.algorithm, key.key);
      decipher.setIV(Buffer.from(encryptedData.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Audit successful decryption for sensitive data
      if (['credentials', 'pii', 'financial', 'healthcare'].includes(key.purpose)) {
        await auditService.logAuditEvent({
          organizationId: key.organizationId,
          action: 'data_decrypted',
          resourceType: 'encrypted_data',
          businessContext: {
            keyId: encryptedData.keyId,
            dataType: encryptedData.metadata.dataType,
            purpose: key.purpose
          },
          complianceRelevant: true
        });
      }

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Rotate encryption keys according to policy
   */
  public async rotateKey(
    organizationId: string,
    purpose: EncryptionKey['purpose']
  ): Promise<EncryptionKey> {
    try {
      const oldKeyId = this.findActiveKeyId(organizationId, purpose);
      const oldKey = this.keys.get(oldKeyId);
      
      if (!oldKey) {
        throw new Error('No active key found to rotate');
      }

      // Generate new key
      const newKey = await this.generateKey(organizationId, purpose);
      newKey.keyVersion = oldKey.keyVersion + 1;

      // Mark old key as rotated
      oldKey.status = 'rotated';
      oldKey.rotatedAt = new Date();

      // Update keys map
      this.keys.set(newKey.keyId, newKey);
      this.keys.set(oldKeyId, oldKey);

      // Audit key rotation
      await auditService.logAuditEvent({
        organizationId,
        action: 'encryption_key_rotated',
        resourceType: 'encryption_key',
        businessContext: {
          oldKeyId,
          newKeyId: newKey.keyId,
          purpose,
          oldVersion: oldKey.keyVersion,
          newVersion: newKey.keyVersion
        },
        complianceRelevant: true
      });

      logger.info(`Rotated encryption key for organization ${organizationId}, purpose: ${purpose}`);
      
      // Schedule old key deletion based on grace period
      const policy = this.getRotationPolicy(organizationId, purpose);
      if (policy) {
        this.scheduleKeyDeletion(oldKeyId, policy.gracePeriod);
      }

      return newKey;
    } catch (error) {
      logger.error('Key rotation failed:', error);
      throw new Error('Failed to rotate encryption key');
    }
  }

  /**
   * Set key rotation policy for organization
   */
  public setRotationPolicy(policy: KeyRotationPolicy): void {
    const policyKey = `${policy.organizationId}:${policy.keyPurpose}`;
    this.rotationPolicies.set(policyKey, policy);
    
    logger.info(`Set key rotation policy for ${policy.organizationId}:${policy.keyPurpose}`);
  }

  /**
   * Get active encryption keys for organization
   */
  public getActiveKeys(organizationId: string): EncryptionKey[] {
    return Array.from(this.keys.values()).filter(
      key => key.organizationId === organizationId && key.status === 'active'
    );
  }

  /**
   * Revoke encryption key
   */
  public async revokeKey(keyId: string, reason: string): Promise<void> {
    try {
      const key = this.keys.get(keyId);
      if (!key) {
        throw new Error('Key not found');
      }

      key.status = 'revoked';
      this.keys.set(keyId, key);

      await auditService.logAuditEvent({
        organizationId: key.organizationId,
        action: 'encryption_key_revoked',
        resourceType: 'encryption_key',
        resourceId: keyId,
        businessContext: {
          reason,
          purpose: key.purpose,
          keyVersion: key.keyVersion
        },
        complianceRelevant: true
      });

      logger.warn(`Revoked encryption key ${keyId}, reason: ${reason}`);
    } catch (error) {
      logger.error('Key revocation failed:', error);
      throw new Error('Failed to revoke encryption key');
    }
  }

  /**
   * Re-encrypt data with new key (for key rotation)
   */
  public async reencrypt(
    encryptedData: EncryptedData,
    newKeyId: string
  ): Promise<EncryptedData> {
    try {
      // Decrypt with old key
      const plaintext = await this.decrypt(encryptedData);
      
      // Encrypt with new key
      const newKey = this.keys.get(newKeyId);
      if (!newKey) {
        throw new Error('New encryption key not found');
      }

      return this.encryptWithKey(plaintext, newKey, encryptedData.metadata.dataType);
    } catch (error) {
      logger.error('Re-encryption failed:', error);
      throw new Error('Failed to re-encrypt data');
    }
  }

  /**
   * Export key for backup (encrypted)
   */
  public async exportKey(
    keyId: string,
    exportPassword: string
  ): Promise<{
    encryptedKey: string;
    exportMetadata: Record<string, any>;
  }> {
    try {
      const key = this.keys.get(keyId);
      if (!key) {
        throw new Error('Key not found');
      }

      // Create export cipher
      const exportSalt = crypto.randomBytes(this.SALT_LENGTH);
      const exportKey = crypto.pbkdf2Sync(exportPassword, exportSalt, 100000, this.KEY_LENGTH, 'sha256');
      const exportIv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipherGCM('aes-256-gcm', exportKey);
      cipher.setIV(exportIv);
      
      const keyData = JSON.stringify({
        keyId: key.keyId,
        organizationId: key.organizationId,
        algorithm: key.algorithm,
        keyVersion: key.keyVersion,
        key: key.key.toString('base64'),
        purpose: key.purpose,
        createdAt: key.createdAt.toISOString()
      });

      let encrypted = cipher.update(keyData, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag();

      const exportMetadata = {
        salt: exportSalt.toString('base64'),
        iv: exportIv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: 'aes-256-gcm',
        exportedAt: new Date().toISOString(),
        keyId: key.keyId
      };

      await auditService.logAuditEvent({
        organizationId: key.organizationId,
        action: 'encryption_key_exported',
        resourceType: 'encryption_key',
        resourceId: keyId,
        complianceRelevant: true
      });

      return {
        encryptedKey: encrypted,
        exportMetadata
      };
    } catch (error) {
      logger.error('Key export failed:', error);
      throw new Error('Failed to export encryption key');
    }
  }

  /**
   * Import key from backup
   */
  public async importKey(
    encryptedKey: string,
    exportMetadata: Record<string, any>,
    importPassword: string
  ): Promise<EncryptionKey> {
    try {
      // Derive import key
      const importSalt = Buffer.from(exportMetadata.salt, 'base64');
      const importKey = crypto.pbkdf2Sync(importPassword, importSalt, 100000, this.KEY_LENGTH, 'sha256');
      
      // Decrypt key data
      const decipher = crypto.createDecipherGCM(exportMetadata.algorithm, importKey);
      decipher.setIV(Buffer.from(exportMetadata.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(exportMetadata.authTag, 'base64'));
      
      let decrypted = decipher.update(encryptedKey, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      const keyData = JSON.parse(decrypted);
      
      // Reconstruct key object
      const importedKey: EncryptionKey = {
        keyId: keyData.keyId,
        organizationId: keyData.organizationId,
        algorithm: keyData.algorithm,
        keyVersion: keyData.keyVersion,
        key: Buffer.from(keyData.key, 'base64'),
        purpose: keyData.purpose,
        createdAt: new Date(keyData.createdAt),
        status: 'active'
      };

      // Store imported key
      this.keys.set(importedKey.keyId, importedKey);

      await auditService.logAuditEvent({
        organizationId: importedKey.organizationId,
        action: 'encryption_key_imported',
        resourceType: 'encryption_key',
        resourceId: importedKey.keyId,
        complianceRelevant: true
      });

      logger.info(`Imported encryption key ${importedKey.keyId} for organization ${importedKey.organizationId}`);
      return importedKey;
    } catch (error) {
      logger.error('Key import failed:', error);
      throw new Error('Failed to import encryption key');
    }
  }

  /**
   * Private helper methods
   */
  private encryptWithKey(
    plaintext: string | Buffer,
    key: EncryptionKey,
    dataType: string
  ): EncryptedData {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipherGCM(key.algorithm, key.key);
    cipher.setIV(iv);

    const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    
    let encrypted = cipher.update(plaintextBuffer, undefined, 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      keyId: key.keyId,
      keyVersion: key.keyVersion,
      algorithm: key.algorithm,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      metadata: {
        purpose: key.purpose,
        organizationId: key.organizationId,
        dataType,
        encryptedAt: new Date()
      }
    };
  }

  private generateKeyId(organizationId: string, purpose: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${organizationId.slice(0, 8)}_${purpose}_${timestamp}_${random}`;
  }

  private findActiveKeyId(organizationId: string, purpose: EncryptionKey['purpose']): string {
    const activeKey = Array.from(this.keys.values()).find(
      key => key.organizationId === organizationId && 
             key.purpose === purpose && 
             key.status === 'active'
    );

    if (!activeKey) {
      throw new Error(`No active encryption key found for ${organizationId}:${purpose}`);
    }

    return activeKey.keyId;
  }

  private getRotationPolicy(organizationId: string, purpose: string): KeyRotationPolicy | undefined {
    const policyKey = `${organizationId}:${purpose}`;
    return this.rotationPolicies.get(policyKey);
  }

  private scheduleKeyDeletion(keyId: string, gracePeriodDays: number): void {
    setTimeout(async () => {
      try {
        const key = this.keys.get(keyId);
        if (key && key.status === 'rotated') {
          this.keys.delete(keyId);
          
          await auditService.logAuditEvent({
            organizationId: key.organizationId,
            action: 'encryption_key_deleted',
            resourceType: 'encryption_key',
            resourceId: keyId,
            businessContext: {
              gracePeriodDays,
              purpose: key.purpose
            },
            complianceRelevant: true
          });

          logger.info(`Deleted rotated encryption key ${keyId} after grace period`);
        }
      } catch (error) {
        logger.error('Scheduled key deletion failed:', error);
      }
    }, gracePeriodDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds
  }

  private initializeDefaultKeys(): void {
    // Initialize default master keys for system
    const systemMasterKey = crypto.randomBytes(this.KEY_LENGTH);
    const defaultKey: EncryptionKey = {
      keyId: 'system_master_001',
      organizationId: 'system',
      algorithm: this.DEFAULT_ALGORITHM,
      keyVersion: 1,
      key: systemMasterKey,
      purpose: 'general',
      createdAt: new Date(),
      status: 'active'
    };

    this.keys.set(defaultKey.keyId, defaultKey);
  }

  private startKeyRotationScheduler(): void {
    // Check for keys that need rotation every hour
    setInterval(async () => {
      try {
        await this.checkAndRotateKeys();
      } catch (error) {
        logger.error('Automated key rotation check failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private async checkAndRotateKeys(): Promise<void> {
    const now = new Date();
    
    for (const [policyKey, policy] of this.rotationPolicies.entries()) {
      if (!policy.autoRotation) continue;

      const [organizationId, purpose] = policyKey.split(':');
      
      try {
        const activeKey = Array.from(this.keys.values()).find(
          key => key.organizationId === organizationId && 
                 key.purpose === purpose as EncryptionKey['purpose'] && 
                 key.status === 'active'
        );

        if (!activeKey) continue;

        const daysSinceCreation = Math.floor(
          (now.getTime() - activeKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceCreation >= policy.rotationInterval) {
          logger.info(`Initiating automatic key rotation for ${policyKey}`);
          await this.rotateKey(organizationId, purpose as EncryptionKey['purpose']);
        }
      } catch (error) {
        logger.error(`Automatic key rotation failed for ${policyKey}:`, error);
      }
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();