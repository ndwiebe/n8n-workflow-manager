import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { logger } from '../utils/logger';

export interface SecurityEvent {
  id?: string;
  organizationId: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sourceIp?: string;
  userAgent?: string;
  eventData?: Record<string, any>;
  resolved?: boolean;
  createdAt?: Date;
}

export interface EncryptionOptions {
  algorithm?: string;
  keyVersion?: number;
  associatedData?: string;
}

export interface SecurityScanResult {
  workflowId: string;
  organizationId: string;
  riskScore: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  scanDate: Date;
}

export interface SecurityVulnerability {
  type: 'credential_exposure' | 'insecure_connection' | 'data_leak' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  affected_components: string[];
}

export interface AccessControlRule {
  organizationId: string;
  userId: string;
  resource: string;
  action: string;
  permissions: string[];
  conditions?: Record<string, any>;
}

export interface ComplianceCheck {
  organizationId: string;
  complianceType: string; // 'SOX', 'GDPR', 'HIPAA', 'SOC2'
  status: 'compliant' | 'non_compliant' | 'under_review' | 'not_applicable';
  requirements: ComplianceRequirement[];
  lastAssessment: Date;
  nextAssessment: Date;
}

export interface ComplianceRequirement {
  requirementId: string;
  description: string;
  status: 'met' | 'not_met' | 'partial' | 'not_applicable';
  evidence: string[];
  remediation?: string;
}

export class SecurityService {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly TAG_LENGTH = 16; // 128 bits
  private readonly SALT_ROUNDS = 12;
  
  // Risk scoring weights
  private readonly RISK_WEIGHTS = {
    credential_exposure: 30,
    insecure_connection: 20,
    data_leak: 40,
    privilege_escalation: 35,
    failed_login_attempts: 15,
    suspicious_activity: 25
  };

  private encryptionKeys: Map<string, Buffer> = new Map();

  constructor() {
    this.initializeEncryptionKeys();
  }

  /**
   * Initialize encryption keys for organizations
   */
  private initializeEncryptionKeys(): void {
    // In production, these would be loaded from a secure key management service
    const masterKey = process.env.MASTER_ENCRYPTION_KEY || crypto.randomBytes(this.KEY_LENGTH).toString('hex');
    this.encryptionKeys.set('default', Buffer.from(masterKey, 'hex'));
  }

  /**
   * Generate organization-specific encryption key
   */
  public generateOrganizationKey(organizationId: string): string {
    const organizationKey = crypto.randomBytes(this.KEY_LENGTH);
    this.encryptionKeys.set(organizationId, organizationKey);
    return organizationKey.toString('hex');
  }

  /**
   * Encrypt sensitive data using organization-specific key
   */
  public encryptData(
    plaintext: string, 
    organizationId: string, 
    options: EncryptionOptions = {}
  ): { encrypted: string; metadata: Record<string, any> } {
    try {
      const key = this.encryptionKeys.get(organizationId) || this.encryptionKeys.get('default')!;
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(options.algorithm || this.ENCRYPTION_ALGORITHM, key);
      cipher.setAutoPadding(true);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag for GCM mode
      const tag = (cipher as any).getAuthTag ? (cipher as any).getAuthTag() : Buffer.alloc(0);

      const metadata = {
        algorithm: options.algorithm || this.ENCRYPTION_ALGORITHM,
        keyVersion: options.keyVersion || 1,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        timestamp: new Date().toISOString()
      };

      return {
        encrypted,
        metadata
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data using organization-specific key
   */
  public decryptData(
    encryptedData: string,
    organizationId: string,
    metadata: Record<string, any>
  ): string {
    try {
      const key = this.encryptionKeys.get(organizationId) || this.encryptionKeys.get('default')!;
      const iv = Buffer.from(metadata.iv, 'hex');
      const tag = Buffer.from(metadata.tag || '', 'hex');

      const decipher = crypto.createDecipher(metadata.algorithm, key);
      if (tag.length > 0 && (decipher as any).setAuthTag) {
        (decipher as any).setAuthTag(tag);
      }

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash passwords with salt
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Generate MFA secret for TOTP
   */
  public generateMFASecret(userEmail: string, organizationName: string): {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } {
    const secret = speakeasy.generateSecret({
      name: `${organizationName} - ${userEmail}`,
      issuer: 'n8n Workflow Manager'
    });

    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url || '',
      backupCodes
    };
  }

  /**
   * Verify MFA token
   */
  public verifyMFAToken(secret: string, token: string, window: number = 1): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window
      });
    } catch (error) {
      logger.error('MFA verification failed:', error);
      return false;
    }
  }

  /**
   * Perform security scan on workflow configuration
   */
  public async performSecurityScan(
    workflowId: string,
    organizationId: string,
    workflowData: any
  ): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = [];
    let riskScore = 0;

    try {
      // Check for credential exposure
      const credentialVulns = this.scanForCredentialExposure(workflowData);
      vulnerabilities.push(...credentialVulns);

      // Check for insecure connections
      const connectionVulns = this.scanForInsecureConnections(workflowData);
      vulnerabilities.push(...connectionVulns);

      // Check for data leak potential
      const dataLeakVulns = this.scanForDataLeaks(workflowData);
      vulnerabilities.push(...dataLeakVulns);

      // Check for privilege escalation risks
      const privilegeVulns = this.scanForPrivilegeEscalation(workflowData);
      vulnerabilities.push(...privilegeVulns);

      // Calculate risk score
      riskScore = this.calculateRiskScore(vulnerabilities);

      // Generate recommendations
      const recommendations = this.generateSecurityRecommendations(vulnerabilities);

      return {
        workflowId,
        organizationId,
        riskScore,
        vulnerabilities,
        recommendations,
        scanDate: new Date()
      };
    } catch (error) {
      logger.error('Security scan failed:', error);
      throw new Error('Failed to perform security scan');
    }
  }

  /**
   * Check access control permissions
   */
  public checkAccessControl(
    rule: AccessControlRule,
    requestedAction: string,
    context: Record<string, any> = {}
  ): boolean {
    try {
      // Check if user has permission for the requested action
      if (!rule.permissions.includes(requestedAction) && !rule.permissions.includes('*')) {
        return false;
      }

      // Check conditional access rules
      if (rule.conditions) {
        return this.evaluateAccessConditions(rule.conditions, context);
      }

      return true;
    } catch (error) {
      logger.error('Access control check failed:', error);
      return false;
    }
  }

  /**
   * Log security event
   */
  public async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // In production, this would save to the security_events table
      logger.warn('Security Event:', {
        organizationId: event.organizationId,
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        sourceIp: event.sourceIp,
        timestamp: new Date().toISOString()
      });

      // Trigger alerts for high/critical severity events
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.triggerSecurityAlert(event);
      }
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  /**
   * Assess compliance status
   */
  public async assessCompliance(
    organizationId: string,
    complianceType: string
  ): Promise<ComplianceCheck> {
    try {
      const requirements = this.getComplianceRequirements(complianceType);
      const assessedRequirements: ComplianceRequirement[] = [];

      for (const requirement of requirements) {
        const status = await this.checkComplianceRequirement(organizationId, requirement);
        assessedRequirements.push({
          ...requirement,
          status
        });
      }

      const overallStatus = this.determineOverallComplianceStatus(assessedRequirements);

      return {
        organizationId,
        complianceType,
        status: overallStatus,
        requirements: assessedRequirements,
        lastAssessment: new Date(),
        nextAssessment: this.calculateNextAssessmentDate(complianceType)
      };
    } catch (error) {
      logger.error('Compliance assessment failed:', error);
      throw new Error('Failed to assess compliance');
    }
  }

  /**
   * Generate security report
   */
  public async generateSecurityReport(
    organizationId: string,
    reportType: 'summary' | 'detailed' | 'compliance'
  ): Promise<Record<string, any>> {
    try {
      // This would aggregate security data from various sources
      const report = {
        organizationId,
        reportType,
        generatedAt: new Date(),
        summary: {
          totalWorkflows: 0,
          securityScansCompleted: 0,
          highRiskWorkflows: 0,
          complianceStatus: 'unknown',
          averageRiskScore: 0
        },
        details: {
          recentSecurityEvents: [],
          vulnerabilityBreakdown: {},
          complianceGaps: [],
          recommendations: []
        }
      };

      return report;
    } catch (error) {
      logger.error('Security report generation failed:', error);
      throw new Error('Failed to generate security report');
    }
  }

  /**
   * Private helper methods
   */
  private scanForCredentialExposure(workflowData: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const sensitivePatterns = [
      /password\s*[=:]\s*['"]\w+['"]?/gi,
      /api[_-]?key\s*[=:]\s*['"]\w+['"]?/gi,
      /secret\s*[=:]\s*['"]\w+['"]?/gi,
      /token\s*[=:]\s*['"]\w+['"]?/gi
    ];

    const workflowString = JSON.stringify(workflowData);

    for (const pattern of sensitivePatterns) {
      if (pattern.test(workflowString)) {
        vulnerabilities.push({
          type: 'credential_exposure',
          severity: 'high',
          description: 'Potential hardcoded credentials detected in workflow configuration',
          recommendation: 'Use encrypted credential storage instead of hardcoded values',
          affected_components: ['workflow_configuration']
        });
      }
    }

    return vulnerabilities;
  }

  private scanForInsecureConnections(workflowData: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for HTTP endpoints (should be HTTPS)
    const httpPattern = /http:\/\/[^\s"']+/gi;
    const workflowString = JSON.stringify(workflowData);

    if (httpPattern.test(workflowString)) {
      vulnerabilities.push({
        type: 'insecure_connection',
        severity: 'medium',
        description: 'HTTP connections detected (should use HTTPS)',
        recommendation: 'Replace HTTP URLs with HTTPS endpoints',
        affected_components: ['http_nodes', 'webhook_nodes']
      });
    }

    return vulnerabilities;
  }

  private scanForDataLeaks(workflowData: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for potential PII exposure
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
    ];

    const workflowString = JSON.stringify(workflowData);

    for (const pattern of piiPatterns) {
      if (pattern.test(workflowString)) {
        vulnerabilities.push({
          type: 'data_leak',
          severity: 'critical',
          description: 'Potential PII data detected in workflow configuration',
          recommendation: 'Remove sensitive data from workflow and use secure data handling practices',
          affected_components: ['data_nodes', 'output_nodes']
        });
      }
    }

    return vulnerabilities;
  }

  private scanForPrivilegeEscalation(workflowData: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for admin/root level operations
    const privilegedOperations = ['exec', 'system', 'admin', 'root', 'sudo'];
    const workflowString = JSON.stringify(workflowData).toLowerCase();

    for (const operation of privilegedOperations) {
      if (workflowString.includes(operation)) {
        vulnerabilities.push({
          type: 'privilege_escalation',
          severity: 'high',
          description: `Potential privileged operation detected: ${operation}`,
          recommendation: 'Review and validate privileged operations, use least privilege principle',
          affected_components: ['system_nodes', 'script_nodes']
        });
      }
    }

    return vulnerabilities;
  }

  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    let score = 0;
    
    for (const vuln of vulnerabilities) {
      const weight = this.RISK_WEIGHTS[vuln.type] || 10;
      const severityMultiplier = {
        low: 0.25,
        medium: 0.5,
        high: 0.75,
        critical: 1.0
      }[vuln.severity];
      
      score += weight * severityMultiplier;
    }

    return Math.min(100, Math.round(score));
  }

  private generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations = new Set<string>();
    
    for (const vuln of vulnerabilities) {
      recommendations.add(vuln.recommendation);
    }

    // Add general security recommendations
    recommendations.add('Enable multi-factor authentication for all users');
    recommendations.add('Regularly review and update access permissions');
    recommendations.add('Implement audit logging for all sensitive operations');
    recommendations.add('Use encrypted credential storage for API keys and passwords');

    return Array.from(recommendations);
  }

  private evaluateAccessConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    // Simple condition evaluation - in production, use a more robust rules engine
    for (const [key, expectedValue] of Object.entries(conditions)) {
      if (context[key] !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    // In production, this would send alerts via email, Slack, etc.
    logger.error('SECURITY ALERT:', {
      organizationId: event.organizationId,
      eventType: event.eventType,
      severity: event.severity,
      timestamp: new Date().toISOString()
    });
  }

  private getComplianceRequirements(complianceType: string): ComplianceRequirement[] {
    const requirements: Record<string, ComplianceRequirement[]> = {
      'GDPR': [
        {
          requirementId: 'GDPR-1',
          description: 'Data encryption at rest and in transit',
          status: 'not_met',
          evidence: []
        },
        {
          requirementId: 'GDPR-2',
          description: 'User consent management',
          status: 'not_met',
          evidence: []
        },
        {
          requirementId: 'GDPR-3',
          description: 'Data breach notification procedures',
          status: 'not_met',
          evidence: []
        }
      ],
      'SOC2': [
        {
          requirementId: 'SOC2-1',
          description: 'Access control and user authentication',
          status: 'not_met',
          evidence: []
        },
        {
          requirementId: 'SOC2-2',
          description: 'Data encryption and protection',
          status: 'not_met',
          evidence: []
        },
        {
          requirementId: 'SOC2-3',
          description: 'Audit logging and monitoring',
          status: 'not_met',
          evidence: []
        }
      ]
    };

    return requirements[complianceType] || [];
  }

  private async checkComplianceRequirement(
    organizationId: string,
    requirement: ComplianceRequirement
  ): Promise<'met' | 'not_met' | 'partial' | 'not_applicable'> {
    // In production, this would check actual compliance status
    // For now, return a default status
    return 'partial';
  }

  private determineOverallComplianceStatus(
    requirements: ComplianceRequirement[]
  ): 'compliant' | 'non_compliant' | 'under_review' | 'not_applicable' {
    const totalRequirements = requirements.length;
    const metRequirements = requirements.filter(r => r.status === 'met').length;
    const partialRequirements = requirements.filter(r => r.status === 'partial').length;

    if (metRequirements === totalRequirements) {
      return 'compliant';
    } else if (metRequirements + partialRequirements >= totalRequirements * 0.8) {
      return 'under_review';
    } else {
      return 'non_compliant';
    }
  }

  private calculateNextAssessmentDate(complianceType: string): Date {
    const assessmentIntervals: Record<string, number> = {
      'GDPR': 90, // 3 months
      'SOC2': 180, // 6 months
      'HIPAA': 180, // 6 months
      'SOX': 90 // 3 months
    };

    const intervalDays = assessmentIntervals[complianceType] || 180;
    const nextAssessment = new Date();
    nextAssessment.setDate(nextAssessment.getDate() + intervalDays);
    
    return nextAssessment;
  }
}

// Export singleton instance
export const securityService = new SecurityService();