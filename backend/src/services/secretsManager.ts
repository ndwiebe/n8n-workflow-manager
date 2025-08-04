import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Mock implementation of a secrets manager (simulates AWS Secrets Manager or HashiCorp Vault)
export interface SecretEntry {
  id: string;
  userId: string;
  workflowId: string;
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface SecretMetadata {
  type: 'credential' | 'config' | 'token';
  description?: string;
  expiresAt?: Date;
  lastRotated?: Date;
  rotationPolicy?: {
    enabled: boolean;
    intervalDays: number;
  };
}

export class SecretsManager {
  private secrets: Map<string, SecretEntry> = new Map();
  private encryptionKey: string;
  private algorithm = 'aes-256-gcm';

  constructor(encryptionKey?: string) {
    // In production, this would come from environment variables or key management service
    this.encryptionKey = encryptionKey || crypto.randomBytes(32).toString('hex');
    logger.info('SecretsManager initialized with encryption');
  }

  /**
   * Store a secret securely
   */
  public async storeSecret(
    userId: string,
    workflowId: string,
    key: string,
    value: string,
    metadata?: SecretMetadata
  ): Promise<string> {
    try {
      const secretId = uuidv4();
      const encryptedValue = this.encrypt(value);
      
      const secret: SecretEntry = {
        id: secretId,
        userId,
        workflowId,
        key,
        value: encryptedValue,
        encrypted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata
      };

      this.secrets.set(secretId, secret);
      
      // Log non-sensitive information
      logger.info(`Secret stored for user ${userId}, workflow ${workflowId}, key ${key}`);
      
      return secretId;
    } catch (error) {
      logger.error('Failed to store secret:', error);
      throw new Error('Failed to store secret');
    }
  }

  /**
   * Retrieve a secret by ID
   */
  public async getSecret(secretId: string, userId: string): Promise<SecretEntry | null> {
    try {
      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        logger.warn(`Secret not found: ${secretId}`);
        return null;
      }

      // Verify ownership
      if (secret.userId !== userId) {
        logger.warn(`Unauthorized access attempt to secret ${secretId} by user ${userId}`);
        return null;
      }

      // Decrypt the value
      const decryptedValue = this.decrypt(secret.value);
      
      return {
        ...secret,
        value: decryptedValue
      };
    } catch (error) {
      logger.error(`Failed to retrieve secret ${secretId}:`, error);
      return null;
    }
  }

  /**
   * Get all secrets for a user's workflow
   */
  public async getWorkflowSecrets(userId: string, workflowId: string): Promise<SecretEntry[]> {
    try {
      const workflowSecrets = Array.from(this.secrets.values())
        .filter(secret => secret.userId === userId && secret.workflowId === workflowId);

      // Decrypt all values
      const decryptedSecrets = workflowSecrets.map(secret => ({
        ...secret,
        value: this.decrypt(secret.value)
      }));

      logger.info(`Retrieved ${decryptedSecrets.length} secrets for user ${userId}, workflow ${workflowId}`);
      return decryptedSecrets;
    } catch (error) {
      logger.error(`Failed to retrieve workflow secrets for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get secrets as a key-value object for workflow configuration
   */
  public async getSecretsAsObject(userId: string, workflowId: string): Promise<Record<string, string>> {
    try {
      const secrets = await this.getWorkflowSecrets(userId, workflowId);
      const secretsObject: Record<string, string> = {};

      secrets.forEach(secret => {
        secretsObject[secret.key] = secret.value;
      });

      return secretsObject;
    } catch (error) {
      logger.error(`Failed to get secrets as object for user ${userId}:`, error);
      return {};
    }
  }

  /**
   * Update a secret value
   */
  public async updateSecret(secretId: string, userId: string, newValue: string): Promise<boolean> {
    try {
      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        logger.warn(`Secret not found for update: ${secretId}`);
        return false;
      }

      // Verify ownership
      if (secret.userId !== userId) {
        logger.warn(`Unauthorized update attempt to secret ${secretId} by user ${userId}`);
        return false;
      }

      // Update with new encrypted value
      const encryptedValue = this.encrypt(newValue);
      secret.value = encryptedValue;
      secret.updatedAt = new Date();

      // Update last rotated if metadata exists
      if (secret.metadata) {
        secret.metadata.lastRotated = new Date();
      }

      this.secrets.set(secretId, secret);
      logger.info(`Secret updated: ${secretId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update secret ${secretId}:`, error);
      return false;
    }
  }

  /**
   * Delete a secret
   */
  public async deleteSecret(secretId: string, userId: string): Promise<boolean> {
    try {
      const secret = this.secrets.get(secretId);
      
      if (!secret) {
        logger.warn(`Secret not found for deletion: ${secretId}`);
        return false;
      }

      // Verify ownership
      if (secret.userId !== userId) {
        logger.warn(`Unauthorized deletion attempt to secret ${secretId} by user ${userId}`);
        return false;
      }

      this.secrets.delete(secretId);
      logger.info(`Secret deleted: ${secretId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete secret ${secretId}:`, error);
      return false;
    }
  }

  /**
   * Delete all secrets for a workflow
   */
  public async deleteWorkflowSecrets(userId: string, workflowId: string): Promise<number> {
    try {
      const workflowSecrets = Array.from(this.secrets.entries())
        .filter(([_, secret]) => secret.userId === userId && secret.workflowId === workflowId);

      let deletedCount = 0;
      for (const [secretId, _] of workflowSecrets) {
        this.secrets.delete(secretId);
        deletedCount++;
      }

      logger.info(`Deleted ${deletedCount} secrets for user ${userId}, workflow ${workflowId}`);
      return deletedCount;
    } catch (error) {
      logger.error(`Failed to delete workflow secrets for user ${userId}:`, error);
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

      logger.info(`Stored ${secretIds.length} secrets for user ${userId}, workflow ${workflowId}`);
      return secretIds;
    } catch (error) {
      logger.error(`Failed to store multiple secrets for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List all secrets for a user (without values)
   */
  public async listUserSecrets(userId: string): Promise<Omit<SecretEntry, 'value'>[]> {
    try {
      const userSecrets = Array.from(this.secrets.values())
        .filter(secret => secret.userId === userId)
        .map(secret => ({
          id: secret.id,
          userId: secret.userId,
          workflowId: secret.workflowId,
          key: secret.key,
          encrypted: secret.encrypted,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
          metadata: secret.metadata
        }));

      return userSecrets;
    } catch (error) {
      logger.error(`Failed to list secrets for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check if secrets exist for a workflow
   */
  public async hasWorkflowSecrets(userId: string, workflowId: string): Promise<boolean> {
    const secrets = await this.getWorkflowSecrets(userId, workflowId);
    return secrets.length > 0;
  }

  /**
   * Get secrets statistics
   */
  public getSecretsStats(): {
    total: number;
    byUser: Record<string, number>;
    byWorkflow: Record<string, number>;
    encrypted: number;
  } {
    const secrets = Array.from(this.secrets.values());
    const byUser: Record<string, number> = {};
    const byWorkflow: Record<string, number> = {};

    secrets.forEach(secret => {
      byUser[secret.userId] = (byUser[secret.userId] || 0) + 1;
      byWorkflow[secret.workflowId] = (byWorkflow[secret.workflowId] || 0) + 1;
    });

    return {
      total: secrets.length,
      byUser,
      byWorkflow,
      encrypted: secrets.filter(s => s.encrypted).length
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
        logger.warn(`Secret ${secretId} has expired and needs rotation`);
        // In a real implementation, this would trigger a rotation workflow
        // For now, we'll just log the expiration
      }
    } catch (error) {
      logger.error('Failed to rotate expired secrets:', error);
    }
  }

  /**
   * Encrypt a value
   */
  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a value
   */
  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }
}

// Export singleton instance
export const secretsManager = new SecretsManager();