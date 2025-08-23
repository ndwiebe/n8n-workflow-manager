import { logger } from '../utils/logger';
import { encryptionService } from './encryptionService';
import { auditService } from './auditService';
import { securityService } from './securityService';

export interface SecurityAssessment {
  credentialId: string;
  serviceId: string;
  organizationId: string;
  assessmentDate: Date;
  overallScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  securityFactors: SecurityFactor[];
  recommendations: SecurityRecommendation[];
  complianceStatus: ComplianceAssessment;
  trustIndicators: TrustIndicator[];
  businessImpact: BusinessImpactAssessment;
}

export interface SecurityFactor {
  factor: 'encryption_strength' | 'authentication_method' | 'permission_scope' | 'access_frequency' | 'data_sensitivity' | 'compliance_alignment';
  score: number; // 0-100
  weight: number; // 0-1
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  details: string;
  businessMeaning: string;
  improvement?: string;
  evidence: string[];
}

export interface SecurityRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'encryption' | 'authentication' | 'permissions' | 'monitoring' | 'compliance';
  title: string;
  description: string;
  businessJustification: string;
  implementationSteps: ImplementationStep[];
  estimatedCost: 'none' | 'low' | 'medium' | 'high';
  estimatedTimeframe: string;
  riskMitigation: string;
  complianceAlignment: string[];
  businessBenefits: string[];
}

export interface ImplementationStep {
  stepId: string;
  description: string;
  owner: 'business_user' | 'it_admin' | 'security_team' | 'compliance_officer';
  estimatedTime: string;
  dependencies: string[];
  automatable: boolean;
  businessContext: string;
}

export interface ComplianceAssessment {
  frameworks: FrameworkAssessment[];
  overallCompliance: number; // 0-100
  criticalGaps: ComplianceGap[];
  certificationReadiness: CertificationReadiness[];
  businessRiskExposure: string;
}

export interface FrameworkAssessment {
  framework: 'GDPR' | 'SOC2' | 'HIPAA' | 'SOX' | 'ISO27001' | 'CCPA' | 'PCI_DSS';
  applicability: 'applicable' | 'not_applicable' | 'under_review';
  complianceScore: number; // 0-100
  requirements: RequirementAssessment[];
  businessRelevance: string;
  lastAssessment: Date;
  nextReview: Date;
}

export interface RequirementAssessment {
  requirementId: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: string[];
  businessImpact: string;
  remediationPlan?: string;
  deadline?: Date;
}

export interface ComplianceGap {
  gapId: string;
  framework: string;
  requirement: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  businessConsequence: string;
  regulatoryRisk: string;
  remediationPlan: string;
  estimatedCost: string;
  timeline: string;
}

export interface CertificationReadiness {
  certification: string;
  readinessScore: number; // 0-100
  readinessLevel: 'not_ready' | 'preparation_needed' | 'nearly_ready' | 'ready';
  missingRequirements: string[];
  businessValue: string;
  certificationCost: string;
  timeToAchieve: string;
}

export interface TrustIndicator {
  indicator: 'encryption_badge' | 'compliance_certification' | 'security_assessment' | 'audit_trail' | 'access_control' | 'monitoring_coverage';
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'enterprise';
  earned: boolean;
  criteria: TrustCriteria[];
  businessValue: string;
  competitiveAdvantage: string;
  earnedDate?: Date;
  expirationDate?: Date;
}

export interface TrustCriteria {
  criterion: string;
  met: boolean;
  evidence?: string;
  businessReason: string;
  improvementAction?: string;
}

export interface BusinessImpactAssessment {
  operationalRisk: 'low' | 'medium' | 'high' | 'critical';
  reputationalRisk: 'low' | 'medium' | 'high' | 'critical';
  financialRisk: 'low' | 'medium' | 'high' | 'critical';
  complianceRisk: 'low' | 'medium' | 'high' | 'critical';
  businessContinuityImpact: string;
  customerTrustImpact: string;
  competitivePositionImpact: string;
  insurancePremiumImpact: string;
  riskMitigationStrategies: string[];
}

export interface SecurityHealthMetrics {
  credentialId: string;
  healthScore: number; // 0-100
  encryptionHealth: number; // 0-100
  authenticationHealth: number; // 0-100
  permissionHealth: number; // 0-100
  complianceHealth: number; // 0-100
  monitoringHealth: number; // 0-100
  lastAssessment: Date;
  trend: 'improving' | 'stable' | 'declining';
  businessImplication: string;
}

export interface SecurityAlert {
  alertId: string;
  credentialId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'encryption' | 'authentication' | 'permissions' | 'compliance' | 'monitoring';
  title: string;
  description: string;
  businessImpact: string;
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actionsTaken: string[];
  preventionMeasures: string[];
  escalated: boolean;
  assignedTo?: string;
}

export class CredentialSecurityService {
  private assessmentCache: Map<string, SecurityAssessment> = new Map();
  private metricsCache: Map<string, SecurityHealthMetrics> = new Map();
  private alertsCache: Map<string, SecurityAlert[]> = new Map();

  constructor() {
    logger.info('Credential Security Service initialized');
  }

  /**
   * Perform comprehensive security assessment for a credential
   */
  public async performSecurityAssessment(
    credentialId: string,
    serviceId: string,
    organizationId: string,
    credentialData: any
  ): Promise<SecurityAssessment> {
    try {
      logger.info(`Performing security assessment for credential ${credentialId}`);

      // Analyze security factors
      const securityFactors = await this.analyzeSecurityFactors(credentialData, serviceId);
      
      // Calculate overall score
      const overallScore = this.calculateOverallSecurityScore(securityFactors);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(overallScore, securityFactors);
      
      // Generate recommendations
      const recommendations = this.generateSecurityRecommendations(securityFactors, riskLevel);
      
      // Assess compliance
      const complianceStatus = await this.assessCompliance(organizationId, credentialData);
      
      // Evaluate trust indicators
      const trustIndicators = this.evaluateTrustIndicators(securityFactors, complianceStatus);
      
      // Assess business impact
      const businessImpact = this.assessBusinessImpact(riskLevel, securityFactors);

      const assessment: SecurityAssessment = {
        credentialId,
        serviceId,
        organizationId,
        assessmentDate: new Date(),
        overallScore,
        riskLevel,
        securityFactors,
        recommendations,
        complianceStatus,
        trustIndicators,
        businessImpact
      };

      // Cache the assessment
      this.assessmentCache.set(credentialId, assessment);

      // Log audit event
      await auditService.logAuditEvent({
        organizationId,
        action: 'security_assessment_completed',
        resourceType: 'credential',
        resourceId: credentialId,
        businessContext: {
          overallScore,
          riskLevel,
          serviceId,
          assessmentDate: new Date().toISOString()
        },
        complianceRelevant: true
      });

      logger.info(`Security assessment completed for credential ${credentialId}`, {
        overallScore,
        riskLevel,
        recommendationCount: recommendations.length
      });

      return assessment;
    } catch (error) {
      logger.error('Security assessment failed:', error);
      throw new Error('Failed to perform security assessment');
    }
  }

  /**
   * Calculate trust score for a credential
   */
  public async calculateTrustScore(
    credentialId: string,
    organizationId: string
  ): Promise<{
    score: number;
    components: {
      security: number;
      compliance: number;
      monitoring: number;
      businessPractices: number;
    };
    businessImpact: string;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    try {
      const assessment = this.assessmentCache.get(credentialId);
      if (!assessment) {
        throw new Error('Security assessment not found. Please run assessment first.');
      }

      // Calculate component scores
      const security = this.calculateSecurityComponentScore(assessment.securityFactors);
      const compliance = assessment.complianceStatus.overallCompliance;
      const monitoring = this.calculateMonitoringScore(assessment.securityFactors);
      const businessPractices = this.calculateBusinessPracticesScore(assessment);

      // Weighted trust score calculation
      const weights = {
        security: 0.35,
        compliance: 0.25,
        monitoring: 0.20,
        businessPractices: 0.20
      };

      const score = Math.round(
        security * weights.security +
        compliance * weights.compliance +
        monitoring * weights.monitoring +
        businessPractices * weights.businessPractices
      );

      const businessImpact = this.getTrustScoreBusinessImpact(score);
      const trend = this.calculateTrustTrend(credentialId);

      return {
        score,
        components: {
          security,
          compliance,
          monitoring,
          businessPractices
        },
        businessImpact,
        trend
      };
    } catch (error) {
      logger.error('Trust score calculation failed:', error);
      throw new Error('Failed to calculate trust score');
    }
  }

  /**
   * Monitor credential health in real-time
   */
  public async monitorCredentialHealth(credentialId: string): Promise<SecurityHealthMetrics> {
    try {
      const assessment = this.assessmentCache.get(credentialId);
      if (!assessment) {
        throw new Error('Security assessment not found');
      }

      // Calculate health metrics
      const encryptionHealth = this.calculateEncryptionHealth(assessment.securityFactors);
      const authenticationHealth = this.calculateAuthenticationHealth(assessment.securityFactors);
      const permissionHealth = this.calculatePermissionHealth(assessment.securityFactors);
      const complianceHealth = assessment.complianceStatus.overallCompliance;
      const monitoringHealth = this.calculateMonitoringScore(assessment.securityFactors);

      // Overall health score
      const healthScore = Math.round((
        encryptionHealth +
        authenticationHealth +
        permissionHealth +
        complianceHealth +
        monitoringHealth
      ) / 5);

      const metrics: SecurityHealthMetrics = {
        credentialId,
        healthScore,
        encryptionHealth,
        authenticationHealth,
        permissionHealth,
        complianceHealth,
        monitoringHealth,
        lastAssessment: new Date(),
        trend: this.calculateHealthTrend(credentialId),
        businessImplication: this.getHealthBusinessImplication(healthScore)
      };

      // Cache metrics
      this.metricsCache.set(credentialId, metrics);

      // Check for alerts
      await this.checkSecurityAlerts(credentialId, metrics);

      return metrics;
    } catch (error) {
      logger.error('Health monitoring failed:', error);
      throw new Error('Failed to monitor credential health');
    }
  }

  /**
   * Generate security alerts based on assessment
   */
  public async generateSecurityAlerts(
    credentialId: string,
    assessment: SecurityAssessment
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];

    // Critical risk level alert
    if (assessment.riskLevel === 'critical') {
      alerts.push({
        alertId: `critical_${credentialId}_${Date.now()}`,
        credentialId,
        severity: 'critical',
        category: 'authentication',
        title: 'Critical Security Risk Detected',
        description: 'This credential has been assessed as critical risk and requires immediate attention',
        businessImpact: 'High risk of security breach, data loss, or service disruption',
        detectedAt: new Date(),
        resolved: false,
        actionsTaken: [],
        preventionMeasures: [
          'Implement immediate security improvements',
          'Review and restrict access permissions',
          'Enable additional monitoring',
          'Consider credential rotation'
        ],
        escalated: true
      });
    }

    // Compliance gap alerts
    for (const gap of assessment.complianceStatus.criticalGaps) {
      if (gap.severity === 'critical' || gap.severity === 'high') {
        alerts.push({
          alertId: `compliance_${gap.gapId}_${Date.now()}`,
          credentialId,
          severity: gap.severity === 'critical' ? 'critical' : 'error',
          category: 'compliance',
          title: `Compliance Gap: ${gap.framework}`,
          description: gap.description,
          businessImpact: gap.businessConsequence,
          detectedAt: new Date(),
          resolved: false,
          actionsTaken: [],
          preventionMeasures: [gap.remediationPlan],
          escalated: gap.severity === 'critical'
        });
      }
    }

    // Security factor alerts
    for (const factor of assessment.securityFactors) {
      if (factor.status === 'critical' || factor.status === 'poor') {
        alerts.push({
          alertId: `factor_${factor.factor}_${Date.now()}`,
          credentialId,
          severity: factor.status === 'critical' ? 'critical' : 'warning',
          category: this.mapFactorToCategory(factor.factor),
          title: `Security Factor Issue: ${factor.factor.replace(/_/g, ' ')}`,
          description: factor.details,
          businessImpact: factor.businessMeaning,
          detectedAt: new Date(),
          resolved: false,
          actionsTaken: [],
          preventionMeasures: factor.improvement ? [factor.improvement] : [],
          escalated: factor.status === 'critical'
        });
      }
    }

    // Cache alerts
    this.alertsCache.set(credentialId, alerts);

    return alerts;
  }

  /**
   * Get security recommendations for improvement
   */
  public getSecurityRecommendations(
    credentialId: string,
    priority?: 'critical' | 'high' | 'medium' | 'low'
  ): SecurityRecommendation[] {
    const assessment = this.assessmentCache.get(credentialId);
    if (!assessment) {
      return [];
    }

    let recommendations = assessment.recommendations;

    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get compliance status for organization
   */
  public async getComplianceStatus(
    organizationId: string,
    framework?: string
  ): Promise<{
    overallScore: number;
    frameworks: FrameworkAssessment[];
    criticalGaps: ComplianceGap[];
    businessRisk: string;
    actionItems: string[];
  }> {
    try {
      // Aggregate compliance data from all credentials
      const assessments = Array.from(this.assessmentCache.values())
        .filter(a => a.organizationId === organizationId);

      if (assessments.length === 0) {
        return {
          overallScore: 0,
          frameworks: [],
          criticalGaps: [],
          businessRisk: 'No assessments available',
          actionItems: ['Perform security assessments for all credentials']
        };
      }

      let frameworks: FrameworkAssessment[] = [];
      let criticalGaps: ComplianceGap[] = [];

      // Aggregate compliance data
      for (const assessment of assessments) {
        frameworks.push(...assessment.complianceStatus.frameworks);
        criticalGaps.push(...assessment.complianceStatus.criticalGaps);
      }

      // Filter by framework if specified
      if (framework) {
        frameworks = frameworks.filter(f => f.framework === framework);
        criticalGaps = criticalGaps.filter(g => g.framework === framework);
      }

      // Calculate overall score
      const overallScore = frameworks.length > 0 ?
        Math.round(frameworks.reduce((sum, f) => sum + f.complianceScore, 0) / frameworks.length) : 0;

      // Determine business risk
      const businessRisk = this.calculateComplianceBusinessRisk(overallScore, criticalGaps);

      // Generate action items
      const actionItems = this.generateComplianceActionItems(frameworks, criticalGaps);

      return {
        overallScore,
        frameworks,
        criticalGaps,
        businessRisk,
        actionItems
      };
    } catch (error) {
      logger.error('Failed to get compliance status:', error);
      throw new Error('Failed to retrieve compliance status');
    }
  }

  // Private helper methods

  private async analyzeSecurityFactors(
    credentialData: any,
    serviceId: string
  ): Promise<SecurityFactor[]> {
    const factors: SecurityFactor[] = [];

    // Encryption strength analysis
    factors.push(await this.analyzeEncryptionStrength(credentialData));

    // Authentication method analysis
    factors.push(this.analyzeAuthenticationMethod(credentialData, serviceId));

    // Permission scope analysis
    factors.push(this.analyzePermissionScope(credentialData));

    // Access frequency analysis
    factors.push(this.analyzeAccessFrequency(credentialData));

    // Data sensitivity analysis
    factors.push(this.analyzeDataSensitivity(serviceId));

    // Compliance alignment analysis
    factors.push(this.analyzeComplianceAlignment(credentialData, serviceId));

    return factors;
  }

  private async analyzeEncryptionStrength(credentialData: any): Promise<SecurityFactor> {
    try {
      // Get encryption information from encryption service
      const orgKeys = encryptionService.getActiveKeys(credentialData.organizationId || 'default');
      
      let score = 85; // Default good score
      let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'good';
      let details = 'Credentials are encrypted with standard enterprise encryption';

      if (orgKeys.length === 0) {
        score = 30;
        status = 'critical';
        details = 'No encryption keys found - credentials may not be properly encrypted';
      } else {
        const latestKey = orgKeys[0];
        if (latestKey.purpose === 'credentials' && latestKey.algorithm.includes('256')) {
          score = 95;
          status = 'excellent';
          details = 'Credentials encrypted with enterprise-grade AES-256 encryption';
        }
      }

      return {
        factor: 'encryption_strength',
        score,
        weight: 0.25,
        status,
        details,
        businessMeaning: this.getEncryptionBusinessMeaning(status),
        improvement: status !== 'excellent' ? 'Upgrade to enterprise-grade encryption with regular key rotation' : undefined,
        evidence: [`Encryption algorithm: ${orgKeys[0]?.algorithm || 'unknown'}`, 'Key management: Active']
      };
    } catch (error) {
      return {
        factor: 'encryption_strength',
        score: 0,
        weight: 0.25,
        status: 'critical',
        details: 'Unable to verify encryption status',
        businessMeaning: 'Data protection status unknown - high security risk',
        improvement: 'Implement proper credential encryption',
        evidence: ['Encryption verification failed']
      };
    }
  }

  private analyzeAuthenticationMethod(credentialData: any, serviceId: string): SecurityFactor {
    let score = 70;
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'good';
    let details = 'Standard authentication method in use';

    // Check authentication type
    if (credentialData.type === 'oauth') {
      score = 90;
      status = 'excellent';
      details = 'OAuth authentication provides secure, token-based access';
    } else if (credentialData.type === 'api_key') {
      score = 75;
      status = 'good';
      details = 'API key authentication is secure when properly managed';
    } else if (credentialData.type === 'username_password') {
      score = 60;
      status = 'fair';
      details = 'Username/password authentication has moderate security';
    }

    // Check for MFA
    if (credentialData.mfaEnabled) {
      score += 10;
      details += ' with multi-factor authentication enabled';
    }

    return {
      factor: 'authentication_method',
      score: Math.min(100, score),
      weight: 0.2,
      status,
      details,
      businessMeaning: 'Determines how securely users are verified when accessing business systems',
      improvement: score < 90 ? 'Enable multi-factor authentication and consider OAuth where available' : undefined,
      evidence: [`Authentication type: ${credentialData.type}`, `MFA enabled: ${credentialData.mfaEnabled || false}`]
    };
  }

  private analyzePermissionScope(credentialData: any): SecurityFactor {
    const permissions = credentialData.permissions || [];
    const requiredPermissions = credentialData.requiredPermissions || [];
    
    let score = 80;
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'good';
    let details = 'Permission scope is appropriately configured';

    // Check for excessive permissions
    const excessivePermissions = permissions.filter((p: string) => !requiredPermissions.includes(p));
    if (excessivePermissions.length > 0) {
      score -= excessivePermissions.length * 10;
      details = `${excessivePermissions.length} excessive permissions detected`;
    }

    // Check for missing required permissions
    const missingPermissions = requiredPermissions.filter((p: string) => !permissions.includes(p));
    if (missingPermissions.length > 0) {
      score -= missingPermissions.length * 15;
      details += `. ${missingPermissions.length} required permissions missing`;
    }

    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else if (score >= 40) status = 'poor';
    else status = 'critical';

    return {
      factor: 'permission_scope',
      score: Math.max(0, score),
      weight: 0.2,
      status,
      details,
      businessMeaning: 'Controls what business data and functions this credential can access',
      improvement: score < 90 ? 'Review and optimize permissions to follow principle of least privilege' : undefined,
      evidence: [
        `Total permissions: ${permissions.length}`,
        `Required permissions: ${requiredPermissions.length}`,
        `Excessive permissions: ${excessivePermissions.length}`
      ]
    };
  }

  private analyzeAccessFrequency(credentialData: any): SecurityFactor {
    const lastUsed = credentialData.lastUsed ? new Date(credentialData.lastUsed) : null;
    const createdAt = credentialData.createdAt ? new Date(credentialData.createdAt) : new Date();
    
    let score = 85;
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'good';
    let details = 'Credential usage pattern is normal';

    if (lastUsed) {
      const daysSinceLastUse = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastUse > 90) {
        score = 40;
        status = 'poor';
        details = `Credential hasn't been used for ${daysSinceLastUse} days - consider deactivation`;
      } else if (daysSinceLastUse > 30) {
        score = 65;
        status = 'fair';
        details = `Credential used ${daysSinceLastUse} days ago - review necessity`;
      } else if (daysSinceLastUse <= 7) {
        score = 95;
        status = 'excellent';
        details = 'Credential is actively used and well-maintained';
      }
    } else {
      const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreation > 7) {
        score = 30;
        status = 'critical';
        details = 'Credential created but never used - potential security risk';
      }
    }

    return {
      factor: 'access_frequency',
      score,
      weight: 0.15,
      status,
      details,
      businessMeaning: 'Indicates whether the credential is actively needed for business operations',
      improvement: score < 70 ? 'Review credential usage and deactivate if no longer needed' : undefined,
      evidence: [
        `Last used: ${lastUsed ? lastUsed.toLocaleDateString() : 'Never'}`,
        `Created: ${createdAt.toLocaleDateString()}`
      ]
    };
  }

  private analyzeDataSensitivity(serviceId: string): SecurityFactor {
    // Service-specific data sensitivity mapping
    const serviceSensitivity: Record<string, { score: number; level: string; description: string }> = {
      'gmail': { score: 85, level: 'high', description: 'Access to business email communications and contacts' },
      'salesforce': { score: 90, level: 'high', description: 'Access to customer data and sales information' },
      'slack': { score: 75, level: 'medium', description: 'Access to internal business communications' },
      'shopify': { score: 88, level: 'high', description: 'Access to customer and financial transaction data' },
      'github': { score: 82, level: 'high', description: 'Access to source code and development assets' },
      'google_sheets': { score: 70, level: 'medium', description: 'Access to business documents and data' }
    };

    const sensitivity = serviceSensitivity[serviceId] || { score: 60, level: 'medium', description: 'General business data access' };

    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'good';
    if (sensitivity.score >= 90) status = 'excellent';
    else if (sensitivity.score >= 75) status = 'good';
    else if (sensitivity.score >= 60) status = 'fair';
    else status = 'poor';

    return {
      factor: 'data_sensitivity',
      score: sensitivity.score,
      weight: 0.1,
      status,
      details: `Service handles ${sensitivity.level} sensitivity data: ${sensitivity.description}`,
      businessMeaning: 'Indicates the potential business impact if this credential is compromised',
      evidence: [`Service: ${serviceId}`, `Sensitivity level: ${sensitivity.level}`]
    };
  }

  private analyzeComplianceAlignment(credentialData: any, serviceId: string): SecurityFactor {
    let score = 75;
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'good';
    let details = 'Basic compliance requirements met';

    // Check for audit logging
    if (credentialData.auditLogging) {
      score += 10;
      details = 'Audit logging enabled for compliance tracking';
    }

    // Check for encryption
    if (credentialData.encrypted) {
      score += 10;
    }

    // Check for access reviews
    if (credentialData.lastAccessReview) {
      const daysSinceReview = Math.floor(
        (Date.now() - new Date(credentialData.lastAccessReview).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceReview <= 90) {
        score += 5;
      }
    }

    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else if (score >= 40) status = 'poor';
    else status = 'critical';

    return {
      factor: 'compliance_alignment',
      score: Math.min(100, score),
      weight: 0.1,
      status,
      details,
      businessMeaning: 'Measures alignment with regulatory requirements and industry standards',
      improvement: score < 90 ? 'Implement comprehensive audit logging and regular access reviews' : undefined,
      evidence: [
        `Audit logging: ${credentialData.auditLogging || false}`,
        `Encryption: ${credentialData.encrypted || false}`,
        `Last access review: ${credentialData.lastAccessReview || 'Never'}`
      ]
    };
  }

  private calculateOverallSecurityScore(factors: SecurityFactor[]): number {
    const weightedSum = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    return Math.round(weightedSum / totalWeight);
  }

  private determineRiskLevel(
    overallScore: number,
    factors: SecurityFactor[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Check for any critical factors
    const hasCriticalFactor = factors.some(f => f.status === 'critical');
    if (hasCriticalFactor) return 'critical';

    // Check for multiple poor factors
    const poorFactors = factors.filter(f => f.status === 'poor').length;
    if (poorFactors >= 2) return 'high';

    // Score-based determination
    if (overallScore >= 85) return 'low';
    if (overallScore >= 70) return 'medium';
    if (overallScore >= 50) return 'high';
    return 'critical';
  }

  private generateSecurityRecommendations(
    factors: SecurityFactor[],
    riskLevel: string
  ): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    // Generate recommendations based on factors
    for (const factor of factors) {
      if (factor.status === 'critical' || factor.status === 'poor') {
        recommendations.push(this.createRecommendationForFactor(factor));
      }
    }

    // Add general recommendations based on risk level
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push(this.createGeneralSecurityRecommendation(riskLevel));
    }

    return recommendations;
  }

  private createRecommendationForFactor(factor: SecurityFactor): SecurityRecommendation {
    const recommendations: Record<string, Partial<SecurityRecommendation>> = {
      'encryption_strength': {
        title: 'Upgrade Encryption Standards',
        category: 'encryption',
        description: 'Implement enterprise-grade encryption with regular key rotation',
        businessJustification: 'Protects sensitive business data from unauthorized access and meets compliance requirements'
      },
      'authentication_method': {
        title: 'Strengthen Authentication',
        category: 'authentication',
        description: 'Enable multi-factor authentication and consider OAuth where available',
        businessJustification: 'Reduces risk of unauthorized access and potential data breaches'
      },
      'permission_scope': {
        title: 'Optimize Permission Scope',
        category: 'permissions',
        description: 'Review and reduce permissions to follow principle of least privilege',
        businessJustification: 'Minimizes potential damage from compromised credentials and improves compliance posture'
      }
    };

    const baseRec = recommendations[factor.factor] || {
      title: 'Improve Security Factor',
      category: 'authentication' as const,
      description: factor.improvement || 'Address security concerns',
      businessJustification: factor.businessMeaning
    };

    return {
      id: `rec_${factor.factor}_${Date.now()}`,
      priority: factor.status === 'critical' ? 'critical' : 'high',
      title: baseRec.title!,
      category: baseRec.category!,
      description: baseRec.description!,
      businessJustification: baseRec.businessJustification!,
      implementationSteps: [
        {
          stepId: 'step_1',
          description: factor.improvement || 'Implement recommended changes',
          owner: 'it_admin',
          estimatedTime: '1-2 days',
          dependencies: [],
          automatable: false,
          businessContext: 'Improves security posture and reduces business risk'
        }
      ],
      estimatedCost: 'low',
      estimatedTimeframe: '1-2 weeks',
      riskMitigation: `Addresses ${factor.factor.replace(/_/g, ' ')} vulnerabilities`,
      complianceAlignment: ['General security standards'],
      businessBenefits: ['Reduced security risk', 'Improved compliance posture', 'Enhanced customer trust']
    };
  }

  private createGeneralSecurityRecommendation(riskLevel: string): SecurityRecommendation {
    return {
      id: `rec_general_${Date.now()}`,
      priority: riskLevel === 'critical' ? 'critical' : 'high',
      title: 'Implement Comprehensive Security Review',
      category: 'monitoring',
      description: 'Conduct thorough security review and implement monitoring',
      businessJustification: 'Provides comprehensive protection against security threats and ensures business continuity',
      implementationSteps: [
        {
          stepId: 'review_step',
          description: 'Conduct comprehensive security review',
          owner: 'security_team',
          estimatedTime: '3-5 days',
          dependencies: [],
          automatable: false,
          businessContext: 'Identifies and addresses all security vulnerabilities'
        }
      ],
      estimatedCost: 'medium',
      estimatedTimeframe: '2-4 weeks',
      riskMitigation: 'Comprehensive risk reduction across all security factors',
      complianceAlignment: ['SOC2', 'ISO27001', 'General security frameworks'],
      businessBenefits: [
        'Comprehensive risk reduction',
        'Improved regulatory compliance',
        'Enhanced business reputation',
        'Reduced insurance premiums'
      ]
    };
  }

  private async assessCompliance(
    organizationId: string,
    credentialData: any
  ): Promise<ComplianceAssessment> {
    // This would integrate with the security service for compliance assessment
    const frameworks = await this.getApplicableFrameworks(organizationId);
    const overallCompliance = 75; // Default value
    const criticalGaps: ComplianceGap[] = [];

    return {
      frameworks,
      overallCompliance,
      criticalGaps,
      certificationReadiness: [],
      businessRiskExposure: 'Medium compliance risk with some gaps requiring attention'
    };
  }

  private async getApplicableFrameworks(organizationId: string): Promise<FrameworkAssessment[]> {
    // Default frameworks applicable to most organizations
    return [
      {
        framework: 'SOC2',
        applicability: 'applicable',
        complianceScore: 80,
        requirements: [],
        businessRelevance: 'Required for customer trust and enterprise sales',
        lastAssessment: new Date(),
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      {
        framework: 'GDPR',
        applicability: 'applicable',
        complianceScore: 75,
        requirements: [],
        businessRelevance: 'Required for EU customer data protection',
        lastAssessment: new Date(),
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  private evaluateTrustIndicators(
    factors: SecurityFactor[],
    compliance: ComplianceAssessment
  ): TrustIndicator[] {
    const indicators: TrustIndicator[] = [];

    // Encryption badge
    const encryptionFactor = factors.find(f => f.factor === 'encryption_strength');
    if (encryptionFactor) {
      indicators.push({
        indicator: 'encryption_badge',
        level: this.getIndicatorLevel(encryptionFactor.score),
        earned: encryptionFactor.score >= 70,
        criteria: [
          {
            criterion: 'Enterprise-grade encryption',
            met: encryptionFactor.score >= 85,
            businessReason: 'Protects sensitive business data'
          }
        ],
        businessValue: 'Demonstrates commitment to data protection',
        competitiveAdvantage: 'Trust differentiator for enterprise customers'
      });
    }

    return indicators;
  }

  private getIndicatorLevel(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'enterprise' {
    if (score >= 95) return 'enterprise';
    if (score >= 90) return 'platinum';
    if (score >= 80) return 'gold';
    if (score >= 70) return 'silver';
    return 'bronze';
  }

  private assessBusinessImpact(
    riskLevel: string,
    factors: SecurityFactor[]
  ): BusinessImpactAssessment {
    const riskMapping = {
      low: { operational: 'low', reputational: 'low', financial: 'low', compliance: 'low' },
      medium: { operational: 'medium', reputational: 'low', financial: 'medium', compliance: 'medium' },
      high: { operational: 'high', reputational: 'medium', financial: 'high', compliance: 'high' },
      critical: { operational: 'critical', reputational: 'high', financial: 'critical', compliance: 'critical' }
    };

    const risks = riskMapping[riskLevel as keyof typeof riskMapping];

    return {
      operationalRisk: risks.operational as any,
      reputationalRisk: risks.reputational as any,
      financialRisk: risks.financial as any,
      complianceRisk: risks.compliance as any,
      businessContinuityImpact: this.getBusinessContinuityImpact(riskLevel),
      customerTrustImpact: this.getCustomerTrustImpact(riskLevel),
      competitivePositionImpact: this.getCompetitivePositionImpact(riskLevel),
      insurancePremiumImpact: this.getInsurancePremiumImpact(riskLevel),
      riskMitigationStrategies: this.getRiskMitigationStrategies(riskLevel)
    };
  }

  // Additional helper methods for business impact assessment
  private getBusinessContinuityImpact(riskLevel: string): string {
    const impacts = {
      low: 'Minimal impact on business operations',
      medium: 'Some potential for service disruption',
      high: 'Significant risk of operational interruption',
      critical: 'High probability of business disruption and downtime'
    };
    return impacts[riskLevel as keyof typeof impacts];
  }

  private getCustomerTrustImpact(riskLevel: string): string {
    const impacts = {
      low: 'No impact on customer confidence',
      medium: 'Minor concern for security-conscious customers',
      high: 'Potential loss of customer trust and business',
      critical: 'Severe damage to customer relationships and reputation'
    };
    return impacts[riskLevel as keyof typeof impacts];
  }

  private getCompetitivePositionImpact(riskLevel: string): string {
    const impacts = {
      low: 'Strong competitive position with superior security',
      medium: 'Neutral competitive position',
      high: 'Disadvantage against security-focused competitors',
      critical: 'Significant competitive disadvantage due to security concerns'
    };
    return impacts[riskLevel as keyof typeof impacts];
  }

  private getInsurancePremiumImpact(riskLevel: string): string {
    const impacts = {
      low: 'Potential for reduced insurance premiums',
      medium: 'Standard insurance rates',
      high: 'Higher insurance costs due to increased risk',
      critical: 'Significantly higher premiums or coverage limitations'
    };
    return impacts[riskLevel as keyof typeof impacts];
  }

  private getRiskMitigationStrategies(riskLevel: string): string[] {
    const strategies = {
      low: [
        'Maintain current security standards',
        'Regular security monitoring',
        'Periodic security reviews'
      ],
      medium: [
        'Implement additional security controls',
        'Increase monitoring frequency',
        'Staff security training',
        'Regular penetration testing'
      ],
      high: [
        'Immediate security improvements',
        'Enhanced monitoring and alerting',
        'Incident response planning',
        'Regular security audits',
        'Staff security awareness training'
      ],
      critical: [
        'Emergency security assessment',
        'Immediate remediation of critical issues',
        'Comprehensive security overhaul',
        'Continuous monitoring implementation',
        'Expert security consultation',
        'Business continuity planning'
      ]
    };
    return strategies[riskLevel as keyof typeof strategies];
  }

  // Additional helper methods
  private calculateSecurityComponentScore(factors: SecurityFactor[]): number {
    const securityFactors = factors.filter(f => 
      ['encryption_strength', 'authentication_method', 'permission_scope'].includes(f.factor)
    );
    
    if (securityFactors.length === 0) return 0;
    
    return Math.round(
      securityFactors.reduce((sum, f) => sum + f.score, 0) / securityFactors.length
    );
  }

  private calculateMonitoringScore(factors: SecurityFactor[]): number {
    // Base monitoring score
    let score = 70;
    
    // Check for audit logging
    const complianceFactor = factors.find(f => f.factor === 'compliance_alignment');
    if (complianceFactor && complianceFactor.score >= 80) {
      score += 20;
    }
    
    return Math.min(100, score);
  }

  private calculateBusinessPracticesScore(assessment: SecurityAssessment): number {
    let score = 75; // Base score
    
    // Add points for good practices
    if (assessment.recommendations.length <= 2) score += 10;
    if (assessment.trustIndicators.some(t => t.earned)) score += 15;
    
    return Math.min(100, score);
  }

  private getTrustScoreBusinessImpact(score: number): string {
    if (score >= 90) return 'Excellent security posture provides strong competitive advantage and customer confidence';
    if (score >= 80) return 'Good security posture supports business growth and customer trust';
    if (score >= 70) return 'Adequate security posture with room for improvement';
    if (score >= 60) return 'Below-average security posture may impact customer confidence';
    return 'Poor security posture poses significant business risk and competitive disadvantage';
  }

  private calculateTrustTrend(credentialId: string): 'improving' | 'stable' | 'declining' {
    // In a real implementation, this would analyze historical data
    // For now, return a default value
    return 'stable';
  }

  private calculateEncryptionHealth(factors: SecurityFactor[]): number {
    const encryptionFactor = factors.find(f => f.factor === 'encryption_strength');
    return encryptionFactor?.score || 0;
  }

  private calculateAuthenticationHealth(factors: SecurityFactor[]): number {
    const authFactor = factors.find(f => f.factor === 'authentication_method');
    return authFactor?.score || 0;
  }

  private calculatePermissionHealth(factors: SecurityFactor[]): number {
    const permissionFactor = factors.find(f => f.factor === 'permission_scope');
    return permissionFactor?.score || 0;
  }

  private calculateHealthTrend(credentialId: string): 'improving' | 'stable' | 'declining' {
    // In a real implementation, this would analyze historical health data
    return 'stable';
  }

  private getHealthBusinessImplication(healthScore: number): string {
    if (healthScore >= 90) return 'Excellent security health supports reliable business operations';
    if (healthScore >= 80) return 'Good security health with minimal business risk';
    if (healthScore >= 70) return 'Adequate security health requiring some attention';
    if (healthScore >= 60) return 'Below-average security health may impact business operations';
    return 'Poor security health poses significant risk to business continuity';
  }

  private async checkSecurityAlerts(
    credentialId: string,
    metrics: SecurityHealthMetrics
  ): Promise<void> {
    const alerts: SecurityAlert[] = [];

    // Health score alerts
    if (metrics.healthScore < 60) {
      alerts.push({
        alertId: `health_${credentialId}_${Date.now()}`,
        credentialId,
        severity: metrics.healthScore < 40 ? 'critical' : 'warning',
        category: 'monitoring',
        title: 'Poor Credential Health Detected',
        description: `Credential health score is ${metrics.healthScore}/100`,
        businessImpact: metrics.businessImplication,
        detectedAt: new Date(),
        resolved: false,
        actionsTaken: [],
        preventionMeasures: ['Perform security assessment', 'Address identified issues'],
        escalated: metrics.healthScore < 40
      });
    }

    if (alerts.length > 0) {
      this.alertsCache.set(credentialId, alerts);
    }
  }

  private mapFactorToCategory(factor: string): 'encryption' | 'authentication' | 'permissions' | 'monitoring' | 'compliance' {
    const mapping: Record<string, 'encryption' | 'authentication' | 'permissions' | 'monitoring' | 'compliance'> = {
      'encryption_strength': 'encryption',
      'authentication_method': 'authentication',
      'permission_scope': 'permissions',
      'access_frequency': 'monitoring',
      'data_sensitivity': 'monitoring',
      'compliance_alignment': 'compliance'
    };
    return mapping[factor] || 'monitoring';
  }

  private getEncryptionBusinessMeaning(status: string): string {
    const meanings = {
      excellent: 'Data is protected with the highest security standards, providing maximum customer confidence',
      good: 'Data is well-protected with industry-standard encryption',
      fair: 'Data has basic encryption protection but could be strengthened',
      poor: 'Data encryption is below industry standards and may not meet customer expectations',
      critical: 'Data protection is inadequate and poses significant business and legal risks'
    };
    return meanings[status as keyof typeof meanings];
  }

  private calculateComplianceBusinessRisk(
    overallScore: number,
    criticalGaps: ComplianceGap[]
  ): string {
    if (criticalGaps.filter(g => g.severity === 'critical').length > 0) {
      return 'High business risk due to critical compliance gaps requiring immediate attention';
    }
    
    if (overallScore < 60) {
      return 'Significant business risk with multiple compliance issues affecting operations';
    }
    
    if (overallScore < 80) {
      return 'Moderate business risk with some compliance gaps requiring attention';
    }
    
    return 'Low business risk with good compliance posture';
  }

  private generateComplianceActionItems(
    frameworks: FrameworkAssessment[],
    criticalGaps: ComplianceGap[]
  ): string[] {
    const items: string[] = [];
    
    // Critical gaps
    for (const gap of criticalGaps.filter(g => g.severity === 'critical').slice(0, 3)) {
      items.push(`URGENT: ${gap.description} - ${gap.remediationPlan}`);
    }
    
    // Framework improvements
    for (const framework of frameworks.filter(f => f.complianceScore < 80).slice(0, 2)) {
      items.push(`Improve ${framework.framework} compliance score from ${framework.complianceScore}%`);
    }
    
    // General improvements
    if (items.length === 0) {
      items.push('Maintain current compliance standards through regular reviews');
    }
    
    return items;
  }
}

// Export singleton instance
export const credentialSecurityService = new CredentialSecurityService();