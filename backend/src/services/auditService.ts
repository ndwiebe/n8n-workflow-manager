import { logger } from '../utils/logger';

export interface AuditLogEntry {
  id?: string;
  organizationId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  businessContext?: Record<string, any>;
  complianceRelevant?: boolean;
  retentionUntil?: Date;
  createdAt?: Date;
}

export interface BusinessAuditEntry {
  id?: string;
  organizationId: string;
  userId?: string;
  businessAction: string;
  workflowId?: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  businessMetrics?: {
    costImpact?: number;
    timeImpact?: number;
    roiImpact?: number;
    userImpact?: number;
  };
  stakeholders?: string[];
  complianceFlags?: string[];
  createdAt?: Date;
}

export interface ComplianceAuditTrail {
  organizationId: string;
  complianceType: string;
  period: {
    start: Date;
    end: Date;
  };
  events: AuditLogEntry[];
  businessActions: BusinessAuditEntry[];
  complianceStatus: 'compliant' | 'non_compliant' | 'under_review';
  findings: ComplianceFinding[];
  recommendations: string[];
}

export interface ComplianceFinding {
  findingId: string;
  category: 'access_control' | 'data_handling' | 'workflow_security' | 'user_management';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: AuditLogEntry[];
  remediation: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface AuditReport {
  reportId: string;
  organizationId: string;
  reportType: 'security' | 'business' | 'compliance' | 'operational';
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    highRiskEvents: number;
    businessImpactEvents: number;
    complianceEvents: number;
    userActivity: Record<string, number>;
    workflowActivity: Record<string, number>;
  };
  sections: AuditReportSection[];
  generatedAt: Date;
  generatedBy?: string;
}

export interface AuditReportSection {
  title: string;
  description: string;
  data: any;
  charts?: ChartData[];
  tables?: TableData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
}

export interface TableData {
  title: string;
  headers: string[];
  rows: any[][];
}

export interface AuditConfiguration {
  organizationId: string;
  settings: {
    enableBusinessMetricsTracking: boolean;
    enableSecurityEventTracking: boolean;
    enableComplianceTracking: boolean;
    retentionPeriod: number; // days
    alertThresholds: {
      highRiskEventsPerHour: number;
      failedLoginAttempts: number;
      privilegeEscalationEvents: number;
      dataExportEvents: number;
    };
    complianceRequirements: string[];
    businessMetricsToTrack: string[];
    automaticReportGeneration: boolean;
    reportSchedule: 'daily' | 'weekly' | 'monthly';
  };
}

export class AuditService {
  private auditBuffer: Map<string, AuditLogEntry[]> = new Map();
  private businessAuditBuffer: Map<string, BusinessAuditEntry[]> = new Map();
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeBufferFlush();
  }

  /**
   * Log system audit event
   */
  public async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
      // Enhance entry with metadata
      const enhancedEntry: AuditLogEntry = {
        ...entry,
        id: entry.id || this.generateId(),
        createdAt: entry.createdAt || new Date(),
        complianceRelevant: this.isComplianceRelevant(entry.action, entry.resourceType)
      };

      // Add to buffer
      const orgBuffer = this.auditBuffer.get(entry.organizationId) || [];
      orgBuffer.push(enhancedEntry);
      this.auditBuffer.set(entry.organizationId, orgBuffer);

      // Flush buffer if it exceeds size limit
      if (orgBuffer.length >= this.BUFFER_SIZE) {
        await this.flushAuditBuffer(entry.organizationId);
      }

      // Log critical events immediately
      if (this.isCriticalEvent(enhancedEntry)) {
        logger.warn('Critical audit event:', {
          organizationId: entry.organizationId,
          action: entry.action,
          resourceType: entry.resourceType,
          userId: entry.userId,
          timestamp: enhancedEntry.createdAt
        });
        await this.triggerRealTimeAlert(enhancedEntry);
      }
    } catch (error) {
      logger.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log business audit event with impact analysis
   */
  public async logBusinessAuditEvent(entry: BusinessAuditEntry): Promise<void> {
    try {
      const enhancedEntry: BusinessAuditEntry = {
        ...entry,
        id: entry.id || this.generateId(),
        createdAt: entry.createdAt || new Date(),
        complianceFlags: this.determineComplianceFlags(entry)
      };

      // Add to business audit buffer
      const orgBuffer = this.businessAuditBuffer.get(entry.organizationId) || [];
      orgBuffer.push(enhancedEntry);
      this.businessAuditBuffer.set(entry.organizationId, orgBuffer);

      // Also log as regular audit event for comprehensive tracking
      await this.logAuditEvent({
        organizationId: entry.organizationId,
        userId: entry.userId,
        action: entry.businessAction,
        resourceType: 'business_process',
        resourceId: entry.workflowId,
        businessContext: {
          impactLevel: entry.impactLevel,
          businessMetrics: entry.businessMetrics,
          stakeholders: entry.stakeholders
        },
        complianceRelevant: (entry.complianceFlags?.length || 0) > 0
      });

      // Generate business impact alert if needed
      if (entry.impactLevel === 'high' || entry.impactLevel === 'critical') {
        await this.triggerBusinessImpactAlert(enhancedEntry);
      }
    } catch (error) {
      logger.error('Failed to log business audit event:', error);
    }
  }

  /**
   * Generate compliance audit trail for a specific period
   */
  public async generateComplianceAuditTrail(
    organizationId: string,
    complianceType: string,
    period: { start: Date; end: Date }
  ): Promise<ComplianceAuditTrail> {
    try {
      // Get relevant audit events
      const auditEvents = await this.getAuditEvents(organizationId, period, true); // compliance relevant only
      const businessActions = await this.getBusinessAuditEvents(organizationId, period);

      // Analyze compliance status
      const findings = await this.analyzeComplianceFindings(auditEvents, complianceType);
      const complianceStatus = this.determineComplianceStatus(findings);
      const recommendations = this.generateComplianceRecommendations(findings);

      return {
        organizationId,
        complianceType,
        period,
        events: auditEvents,
        businessActions,
        complianceStatus,
        findings,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to generate compliance audit trail:', error);
      throw new Error('Failed to generate compliance audit trail');
    }
  }

  /**
   * Generate comprehensive audit report
   */
  public async generateAuditReport(
    organizationId: string,
    reportType: 'security' | 'business' | 'compliance' | 'operational',
    period: { start: Date; end: Date },
    options: Record<string, any> = {}
  ): Promise<AuditReport> {
    try {
      const reportId = this.generateId();
      
      // Get audit data
      const auditEvents = await this.getAuditEvents(organizationId, period);
      const businessActions = await this.getBusinessAuditEvents(organizationId, period);

      // Generate summary statistics
      const summary = this.generateReportSummary(auditEvents, businessActions);

      // Generate report sections based on type
      const sections = await this.generateReportSections(
        reportType, 
        auditEvents, 
        businessActions, 
        options
      );

      return {
        reportId,
        organizationId,
        reportType,
        period,
        summary,
        sections,
        generatedAt: new Date(),
        generatedBy: options.generatedBy
      };
    } catch (error) {
      logger.error('Failed to generate audit report:', error);
      throw new Error('Failed to generate audit report');
    }
  }

  /**
   * Track workflow business impact
   */
  public async trackWorkflowBusinessImpact(
    organizationId: string,
    workflowId: string,
    userId: string,
    impactData: {
      action: string;
      costImpact?: number;
      timeImpact?: number;
      userCount?: number;
      businessValue?: number;
    }
  ): Promise<void> {
    try {
      const impactLevel = this.calculateBusinessImpactLevel(impactData);
      
      await this.logBusinessAuditEvent({
        organizationId,
        userId,
        workflowId,
        businessAction: impactData.action,
        impactLevel,
        businessMetrics: {
          costImpact: impactData.costImpact,
          timeImpact: impactData.timeImpact,
          userImpact: impactData.userCount,
          roiImpact: impactData.businessValue
        },
        stakeholders: await this.identifyStakeholders(organizationId, workflowId)
      });
    } catch (error) {
      logger.error('Failed to track workflow business impact:', error);
    }
  }

  /**
   * Monitor security events and trigger alerts
   */
  public async monitorSecurityEvents(organizationId: string): Promise<void> {
    try {
      const recentEvents = await this.getRecentSecurityEvents(organizationId);
      
      // Analyze patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(recentEvents);
      
      // Generate security alerts if patterns detected
      for (const pattern of suspiciousPatterns) {
        await this.logAuditEvent({
          organizationId,
          action: 'security_pattern_detected',
          resourceType: 'security_monitoring',
          businessContext: {
            pattern: pattern.type,
            confidence: pattern.confidence,
            affectedEvents: pattern.eventIds
          },
          complianceRelevant: true
        });

        if (pattern.confidence > 0.8) {
          logger.warn('High-confidence security pattern detected:', pattern);
        }
      }
    } catch (error) {
      logger.error('Security monitoring failed:', error);
    }
  }

  /**
   * Get audit configuration for organization
   */
  public async getAuditConfiguration(organizationId: string): Promise<AuditConfiguration> {
    // In production, this would fetch from database
    return {
      organizationId,
      settings: {
        enableBusinessMetricsTracking: true,
        enableSecurityEventTracking: true,
        enableComplianceTracking: true,
        retentionPeriod: 2555, // 7 years for compliance
        alertThresholds: {
          highRiskEventsPerHour: 10,
          failedLoginAttempts: 5,
          privilegeEscalationEvents: 1,
          dataExportEvents: 20
        },
        complianceRequirements: ['SOX', 'GDPR', 'SOC2'],
        businessMetricsToTrack: ['roi_calculation', 'cost_savings', 'time_savings', 'user_adoption'],
        automaticReportGeneration: true,
        reportSchedule: 'monthly'
      }
    };
  }

  /**
   * Archive old audit data based on retention policies
   */
  public async archiveOldAuditData(organizationId: string): Promise<void> {
    try {
      const config = await this.getAuditConfiguration(organizationId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.settings.retentionPeriod);

      // Archive non-compliance-relevant events
      await this.archiveAuditEvents(organizationId, cutoffDate, false);
      
      logger.info(`Archived audit data older than ${cutoffDate.toISOString()} for organization ${organizationId}`);
    } catch (error) {
      logger.error('Failed to archive audit data:', error);
    }
  }

  /**
   * Private helper methods
   */
  private initializeBufferFlush(): void {
    setInterval(async () => {
      for (const organizationId of this.auditBuffer.keys()) {
        await this.flushAuditBuffer(organizationId);
      }
      for (const organizationId of this.businessAuditBuffer.keys()) {
        await this.flushBusinessAuditBuffer(organizationId);
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flushAuditBuffer(organizationId: string): Promise<void> {
    const buffer = this.auditBuffer.get(organizationId);
    if (!buffer || buffer.length === 0) return;

    try {
      // In production, this would batch insert to database
      logger.info(`Flushing ${buffer.length} audit events for organization ${organizationId}`);
      this.auditBuffer.set(organizationId, []);
    } catch (error) {
      logger.error('Failed to flush audit buffer:', error);
    }
  }

  private async flushBusinessAuditBuffer(organizationId: string): Promise<void> {
    const buffer = this.businessAuditBuffer.get(organizationId);
    if (!buffer || buffer.length === 0) return;

    try {
      // In production, this would batch insert to database
      logger.info(`Flushing ${buffer.length} business audit events for organization ${organizationId}`);
      this.businessAuditBuffer.set(organizationId, []);
    } catch (error) {
      logger.error('Failed to flush business audit buffer:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private isComplianceRelevant(action: string, resourceType: string): boolean {
    const complianceActions = [
      'login', 'logout', 'password_change', 'permission_change',
      'data_export', 'data_import', 'workflow_create', 'workflow_delete',
      'credential_create', 'credential_update', 'credential_delete',
      'user_create', 'user_delete', 'role_change'
    ];
    
    const complianceResources = [
      'user', 'credential', 'workflow', 'business_data',
      'security_setting', 'audit_log', 'compliance_record'
    ];

    return complianceActions.includes(action) || complianceResources.includes(resourceType);
  }

  private isCriticalEvent(entry: AuditLogEntry): boolean {
    const criticalActions = [
      'data_export', 'permission_escalation', 'security_breach',
      'unauthorized_access', 'system_compromise'
    ];
    
    return criticalActions.includes(entry.action);
  }

  private determineComplianceFlags(entry: BusinessAuditEntry): string[] {
    const flags: string[] = [];
    
    if (entry.businessMetrics?.costImpact && Math.abs(entry.businessMetrics.costImpact) > 10000) {
      flags.push('SOX_MATERIAL_IMPACT');
    }
    
    if (entry.businessAction.includes('data') || entry.businessAction.includes('export')) {
      flags.push('GDPR_DATA_PROCESSING');
    }
    
    if (entry.impactLevel === 'critical') {
      flags.push('SOC2_CRITICAL_SYSTEM');
    }

    return flags;
  }

  private calculateBusinessImpactLevel(impactData: any): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;
    
    if (impactData.costImpact) {
      if (Math.abs(impactData.costImpact) > 50000) score += 3;
      else if (Math.abs(impactData.costImpact) > 10000) score += 2;
      else if (Math.abs(impactData.costImpact) > 1000) score += 1;
    }
    
    if (impactData.userCount) {
      if (impactData.userCount > 100) score += 3;
      else if (impactData.userCount > 20) score += 2;
      else if (impactData.userCount > 5) score += 1;
    }
    
    if (impactData.timeImpact) {
      if (impactData.timeImpact > 100) score += 2; // hours
      else if (impactData.timeImpact > 20) score += 1;
    }

    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private async identifyStakeholders(organizationId: string, workflowId: string): Promise<string[]> {
    // In production, this would query database for workflow stakeholders
    return ['workflow_owner', 'business_analyst', 'it_administrator'];
  }

  private async triggerRealTimeAlert(entry: AuditLogEntry): Promise<void> {
    logger.warn('REAL-TIME AUDIT ALERT:', {
      organizationId: entry.organizationId,
      action: entry.action,
      resourceType: entry.resourceType,
      userId: entry.userId,
      timestamp: entry.createdAt
    });
  }

  private async triggerBusinessImpactAlert(entry: BusinessAuditEntry): Promise<void> {
    logger.warn('BUSINESS IMPACT ALERT:', {
      organizationId: entry.organizationId,
      businessAction: entry.businessAction,
      impactLevel: entry.impactLevel,
      businessMetrics: entry.businessMetrics,
      timestamp: entry.createdAt
    });
  }

  private async getAuditEvents(
    organizationId: string, 
    period: { start: Date; end: Date }, 
    complianceOnly: boolean = false
  ): Promise<AuditLogEntry[]> {
    // In production, this would query the database
    return [];
  }

  private async getBusinessAuditEvents(
    organizationId: string, 
    period: { start: Date; end: Date }
  ): Promise<BusinessAuditEntry[]> {
    // In production, this would query the database
    return [];
  }

  private async analyzeComplianceFindings(
    events: AuditLogEntry[], 
    complianceType: string
  ): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Analyze events for compliance violations
    // This is a simplified implementation
    const highRiskEvents = events.filter(e => 
      e.action.includes('delete') || 
      e.action.includes('export') || 
      e.resourceType === 'security_setting'
    );

    if (highRiskEvents.length > 10) {
      findings.push({
        findingId: this.generateId(),
        category: 'data_handling',
        severity: 'medium',
        description: `High volume of data handling events (${highRiskEvents.length}) detected`,
        evidence: highRiskEvents.slice(0, 5), // First 5 as evidence
        remediation: 'Review data handling procedures and implement additional controls',
        status: 'open'
      });
    }

    return findings;
  }

  private determineComplianceStatus(findings: ComplianceFinding[]): 'compliant' | 'non_compliant' | 'under_review' {
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const highFindings = findings.filter(f => f.severity === 'high');

    if (criticalFindings.length > 0) return 'non_compliant';
    if (highFindings.length > 3) return 'under_review';
    return 'compliant';
  }

  private generateComplianceRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = [];
    
    findings.forEach(finding => {
      if (finding.remediation) {
        recommendations.push(finding.remediation);
      }
    });

    // Add general recommendations
    recommendations.push('Implement regular compliance training for all users');
    recommendations.push('Establish automated compliance monitoring and alerting');
    recommendations.push('Conduct quarterly compliance assessments');

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private generateReportSummary(
    auditEvents: AuditLogEntry[], 
    businessActions: BusinessAuditEntry[]
  ): AuditReport['summary'] {
    const userActivity: Record<string, number> = {};
    const workflowActivity: Record<string, number> = {};

    auditEvents.forEach(event => {
      if (event.userId) {
        userActivity[event.userId] = (userActivity[event.userId] || 0) + 1;
      }
      if (event.resourceType === 'workflow' && event.resourceId) {
        workflowActivity[event.resourceId] = (workflowActivity[event.resourceId] || 0) + 1;
      }
    });

    return {
      totalEvents: auditEvents.length,
      highRiskEvents: auditEvents.filter(e => this.isCriticalEvent(e)).length,
      businessImpactEvents: businessActions.filter(b => 
        b.impactLevel === 'high' || b.impactLevel === 'critical'
      ).length,
      complianceEvents: auditEvents.filter(e => e.complianceRelevant).length,
      userActivity,
      workflowActivity
    };
  }

  private async generateReportSections(
    reportType: string,
    auditEvents: AuditLogEntry[],
    businessActions: BusinessAuditEntry[],
    options: Record<string, any>
  ): Promise<AuditReportSection[]> {
    const sections: AuditReportSection[] = [];

    switch (reportType) {
      case 'security':
        sections.push({
          title: 'Security Events Overview',
          description: 'Summary of security-related audit events',
          data: {
            criticalEvents: auditEvents.filter(e => this.isCriticalEvent(e)),
            failedLogins: auditEvents.filter(e => e.action === 'failed_login'),
            privilegeChanges: auditEvents.filter(e => e.action.includes('permission'))
          }
        });
        break;

      case 'business':
        sections.push({
          title: 'Business Impact Analysis',
          description: 'Analysis of business process changes and their impact',
          data: {
            highImpactActions: businessActions.filter(b => 
              b.impactLevel === 'high' || b.impactLevel === 'critical'
            ),
            costImpacts: businessActions.map(b => b.businessMetrics?.costImpact).filter(Boolean),
            timeImpacts: businessActions.map(b => b.businessMetrics?.timeImpact).filter(Boolean)
          }
        });
        break;

      case 'compliance':
        sections.push({
          title: 'Compliance Status',
          description: 'Compliance-relevant events and status',
          data: {
            complianceEvents: auditEvents.filter(e => e.complianceRelevant),
            dataEvents: auditEvents.filter(e => 
              e.action.includes('data') || e.resourceType.includes('data')
            )
          }
        });
        break;

      case 'operational':
        sections.push({
          title: 'Operational Metrics',
          description: 'System usage and operational statistics',
          data: {
            totalEvents: auditEvents.length,
            uniqueUsers: new Set(auditEvents.map(e => e.userId).filter(Boolean)).size,
            eventsByType: this.groupEventsByType(auditEvents)
          }
        });
        break;
    }

    return sections;
  }

  private groupEventsByType(events: AuditLogEntry[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    events.forEach(event => {
      grouped[event.action] = (grouped[event.action] || 0) + 1;
    });
    return grouped;
  }

  private async getRecentSecurityEvents(organizationId: string): Promise<AuditLogEntry[]> {
    // In production, this would query recent security events from database
    return [];
  }

  private detectSuspiciousPatterns(events: AuditLogEntry[]): any[] {
    // Simplified pattern detection
    const patterns: any[] = [];
    
    // Detect multiple failed logins
    const failedLogins = events.filter(e => e.action === 'failed_login');
    if (failedLogins.length > 5) {
      patterns.push({
        type: 'multiple_failed_logins',
        confidence: Math.min(failedLogins.length / 10, 1),
        eventIds: failedLogins.map(e => e.id).filter(Boolean)
      });
    }

    return patterns;
  }

  private async archiveAuditEvents(
    organizationId: string, 
    cutoffDate: Date, 
    complianceOnly: boolean
  ): Promise<void> {
    // In production, this would archive old events to cold storage
    logger.info(`Archiving audit events older than ${cutoffDate.toISOString()}`);
  }
}

// Export singleton instance
export const auditService = new AuditService();