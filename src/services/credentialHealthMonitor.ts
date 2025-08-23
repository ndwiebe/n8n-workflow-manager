import {
  CredentialHealth,
  ConnectionQuality,
  SecurityMetric,
  HealthAlert,
  AutoRenewalConfig,
  ServiceConnectionCard
} from '../types/smartCredentials';
import { logger } from '../utils/logger';

export interface HealthMonitorConfig {
  checkInterval: number; // milliseconds
  alertThresholds: {
    responseTime: number; // milliseconds
    errorRate: number; // 0-1
    availability: number; // 0-1
    expirationDays: number;
  };
  enableNotifications: boolean;
  enableAutoHealing: boolean;
  businessHours: {
    start: number; // hour 0-23
    end: number; // hour 0-23
    timezone: string;
  };
}

export interface HealthCheckResult {
  credentialId: string;
  serviceId: string;
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
  businessImpact: string;
}

export interface HealthTrend {
  metric: string;
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'stable' | 'degrading';
  businessMeaning: string;
}

export class CredentialHealthMonitor {
  private healthData: Map<string, CredentialHealth> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertCallbacks: Array<(alert: HealthAlert) => void> = [];
  private config: HealthMonitorConfig;

  constructor(config?: Partial<HealthMonitorConfig>) {
    this.config = {
      checkInterval: 5 * 60 * 1000, // 5 minutes
      alertThresholds: {
        responseTime: 5000, // 5 seconds
        errorRate: 0.1, // 10%
        availability: 0.95, // 95%
        expirationDays: 30
      },
      enableNotifications: true,
      enableAutoHealing: true,
      businessHours: {
        start: 9,
        end: 17,
        timezone: 'UTC'
      },
      ...config
    };

    logger.info('Credential Health Monitor initialized', { config: this.config });
  }

  /**
   * Start monitoring a credential's health
   */
  public startMonitoring(
    credentialId: string,
    serviceConnectionCard: ServiceConnectionCard
  ): void {
    logger.info(`Starting health monitoring for credential ${credentialId}`);

    // Initialize health data if not exists
    if (!this.healthData.has(credentialId)) {
      this.initializeHealthData(credentialId, serviceConnectionCard);
    }

    // Clear existing interval if any
    const existingInterval = this.monitoringIntervals.get(credentialId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start periodic health checks
    const interval = setInterval(async () => {
      try {
        await this.performHealthCheck(credentialId, serviceConnectionCard);
      } catch (error) {
        logger.error(`Health check failed for credential ${credentialId}:`, error);
      }
    }, this.config.checkInterval);

    this.monitoringIntervals.set(credentialId, interval);

    // Perform initial health check
    this.performHealthCheck(credentialId, serviceConnectionCard);
  }

  /**
   * Stop monitoring a credential
   */
  public stopMonitoring(credentialId: string): void {
    logger.info(`Stopping health monitoring for credential ${credentialId}`);

    const interval = this.monitoringIntervals.get(credentialId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(credentialId);
    }
  }

  /**
   * Get current health status for a credential
   */
  public getHealthStatus(credentialId: string): CredentialHealth | null {
    return this.healthData.get(credentialId) || null;
  }

  /**
   * Get health status for all monitored credentials
   */
  public getAllHealthStatuses(): CredentialHealth[] {
    return Array.from(this.healthData.values());
  }

  /**
   * Get health trends for analysis
   */
  public getHealthTrends(credentialId: string, days: number = 7): HealthTrend[] {
    const health = this.healthData.get(credentialId);
    if (!health) return [];

    // In a real implementation, this would analyze historical data
    // For now, we'll return sample trends based on current metrics
    return health.securityMetrics.map(metric => ({
      metric: metric.metricType,
      current: metric.value,
      previous: metric.value * 1.1, // Simulated previous value
      change: metric.value - (metric.value * 1.1),
      trend: metric.status === 'good' ? 'improving' : 
             metric.status === 'warning' ? 'stable' : 'degrading',
      businessMeaning: this.getBusinessMeaning(metric.metricType, metric.status)
    }));
  }

  /**
   * Register callback for health alerts
   */
  public onAlert(callback: (alert: HealthAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Force immediate health check
   */
  public async forceHealthCheck(
    credentialId: string,
    serviceConnectionCard: ServiceConnectionCard
  ): Promise<HealthCheckResult> {
    return await this.performHealthCheck(credentialId, serviceConnectionCard);
  }

  /**
   * Update auto-renewal configuration
   */
  public updateAutoRenewal(
    credentialId: string,
    config: AutoRenewalConfig
  ): void {
    const health = this.healthData.get(credentialId);
    if (health) {
      health.autoRenewal = config;
      this.healthData.set(credentialId, health);
      
      logger.info(`Updated auto-renewal config for credential ${credentialId}`, config);
    }
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(credentialId: string, alertId: string): void {
    const health = this.healthData.get(credentialId);
    if (health) {
      const alert = health.alerts.find(a => a.alertId === alertId);
      if (alert) {
        alert.acknowledgedAt = new Date();
        this.healthData.set(credentialId, health);
        
        logger.info(`Acknowledged alert ${alertId} for credential ${credentialId}`);
      }
    }
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(credentialId: string, alertId: string): void {
    const health = this.healthData.get(credentialId);
    if (health) {
      const alert = health.alerts.find(a => a.alertId === alertId);
      if (alert) {
        alert.resolvedAt = new Date();
        this.healthData.set(credentialId, health);
        
        logger.info(`Resolved alert ${alertId} for credential ${credentialId}`);
      }
    }
  }

  /**
   * Get business impact summary
   */
  public getBusinessImpactSummary(): {
    totalCredentials: number;
    healthyCredentials: number;
    warningCredentials: number;
    criticalCredentials: number;
    expiringSoon: number;
    businessRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    businessRecommendations: string[];
  } {
    const allHealth = this.getAllHealthStatuses();
    const total = allHealth.length;
    const healthy = allHealth.filter(h => h.status === 'healthy').length;
    const warning = allHealth.filter(h => h.status === 'warning').length;
    const critical = allHealth.filter(h => ['critical', 'expired', 'compromised'].includes(h.status)).length;
    const expiringSoon = allHealth.filter(h => 
      h.daysUntilExpiration !== undefined && h.daysUntilExpiration <= 30
    ).length;

    let businessRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    if (critical > 0) {
      businessRiskLevel = 'critical';
      recommendations.push('Immediate action required: Fix critical credential issues to prevent service disruptions');
    } else if (warning > total * 0.3) {
      businessRiskLevel = 'high';
      recommendations.push('High number of credentials need attention to maintain business continuity');
    } else if (warning > 0 || expiringSoon > 0) {
      businessRiskLevel = 'medium';
      recommendations.push('Regular maintenance needed to prevent future issues');
    }

    if (expiringSoon > 0) {
      recommendations.push(`${expiringSoon} credentials expiring soon - plan renewal to avoid business interruption`);
    }

    if (total > 0 && healthy / total < 0.8) {
      recommendations.push('Consider implementing automated credential management to improve reliability');
    }

    return {
      totalCredentials: total,
      healthyCredentials: healthy,
      warningCredentials: warning,
      criticalCredentials: critical,
      expiringSoon,
      businessRiskLevel,
      businessRecommendations: recommendations
    };
  }

  // Private methods

  private initializeHealthData(
    credentialId: string,
    serviceConnectionCard: ServiceConnectionCard
  ): void {
    const health: CredentialHealth = {
      credentialId,
      serviceId: serviceConnectionCard.serviceId,
      healthScore: 100,
      status: 'healthy',
      lastHealthCheck: new Date(),
      connectionQuality: {
        responseTime: 0,
        availability: 1.0,
        errorRate: 0,
        lastSuccessfulConnection: new Date(),
        consecutiveFailures: 0,
        qualityTrend: 'stable',
        businessImpact: 'No impact - service operating normally'
      },
      securityMetrics: this.initializeSecurityMetrics(),
      alerts: [],
      autoRenewal: {
        enabled: false,
        renewalMethod: 'manual',
        warningDays: 30,
        businessApprovalRequired: true,
        backupCredentials: false,
        testAfterRenewal: true
      }
    };

    this.healthData.set(credentialId, health);
  }

  private initializeSecurityMetrics(): SecurityMetric[] {
    return [
      {
        metricType: 'authentication_strength',
        value: 85,
        threshold: 70,
        status: 'good',
        businessMeaning: 'Strong authentication provides good protection against unauthorized access',
        lastUpdated: new Date()
      },
      {
        metricType: 'permission_scope',
        value: 75,
        threshold: 80,
        status: 'warning',
        businessMeaning: 'Some permissions may be broader than necessary for business functions',
        improvement: 'Review and reduce unnecessary permissions to minimize risk',
        lastUpdated: new Date()
      },
      {
        metricType: 'encryption_level',
        value: 95,
        threshold: 90,
        status: 'good',
        businessMeaning: 'Data is well-protected with strong encryption standards',
        lastUpdated: new Date()
      },
      {
        metricType: 'audit_compliance',
        value: 90,
        threshold: 85,
        status: 'good',
        businessMeaning: 'Comprehensive audit trails support compliance requirements',
        lastUpdated: new Date()
      }
    ];
  }

  private async performHealthCheck(
    credentialId: string,
    serviceConnectionCard: ServiceConnectionCard
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let businessImpact = '';

    try {
      // Simulate health check - in real implementation, this would test actual connectivity
      await this.simulateConnectionTest(serviceConnectionCard);
      success = true;
      businessImpact = 'Service is responding normally - no business impact';
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      businessImpact = this.getBusinessImpactForFailure(serviceConnectionCard);
    }

    const responseTime = Date.now() - startTime;
    const result: HealthCheckResult = {
      credentialId,
      serviceId: serviceConnectionCard.serviceId,
      success,
      responseTime,
      error,
      timestamp: new Date(),
      businessImpact
    };

    // Update health data
    await this.updateHealthFromCheckResult(result);

    return result;
  }

  private async simulateConnectionTest(serviceConnectionCard: ServiceConnectionCard): Promise<void> {
    // Simulate network delay and potential failures
    const delay = Math.random() * 2000; // 0-2 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures for demonstration
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Connection timeout - service may be experiencing issues');
    }

    // Simulate different response times based on service priority
    if (serviceConnectionCard.priority === 'critical' && Math.random() < 0.02) {
      throw new Error('Critical service degradation detected');
    }
  }

  private async updateHealthFromCheckResult(result: HealthCheckResult): Promise<void> {
    const health = this.healthData.get(result.credentialId);
    if (!health) return;

    // Update connection quality
    health.connectionQuality.responseTime = result.responseTime;
    health.connectionQuality.lastSuccessfulConnection = result.success ? 
      result.timestamp : health.connectionQuality.lastSuccessfulConnection;
    
    if (result.success) {
      health.connectionQuality.consecutiveFailures = 0;
      health.connectionQuality.businessImpact = result.businessImpact;
    } else {
      health.connectionQuality.consecutiveFailures++;
      health.connectionQuality.businessImpact = result.businessImpact;
    }

    // Calculate availability (simplified)
    const recentSuccess = result.success ? 1 : 0;
    health.connectionQuality.availability = 
      (health.connectionQuality.availability * 0.9) + (recentSuccess * 0.1);

    // Calculate error rate (simplified)
    const recentError = result.success ? 0 : 1;
    health.connectionQuality.errorRate = 
      (health.connectionQuality.errorRate * 0.9) + (recentError * 0.1);

    // Determine quality trend
    if (health.connectionQuality.availability > 0.95 && health.connectionQuality.errorRate < 0.05) {
      health.connectionQuality.qualityTrend = 'improving';
    } else if (health.connectionQuality.availability < 0.9 || health.connectionQuality.errorRate > 0.15) {
      health.connectionQuality.qualityTrend = 'degrading';
    } else {
      health.connectionQuality.qualityTrend = 'stable';
    }

    // Update overall health status
    health.lastHealthCheck = result.timestamp;
    health.status = this.calculateHealthStatus(health);
    health.healthScore = this.calculateHealthScore(health);

    // Check for alerts
    await this.checkAndCreateAlerts(health);

    this.healthData.set(result.credentialId, health);
  }

  private calculateHealthStatus(health: CredentialHealth): 'healthy' | 'warning' | 'critical' | 'expired' | 'compromised' {
    // Check for expiration
    if (health.expirationDate && health.expirationDate < new Date()) {
      return 'expired';
    }

    // Check critical thresholds
    if (health.connectionQuality.availability < 0.8 || 
        health.connectionQuality.errorRate > 0.2 ||
        health.connectionQuality.consecutiveFailures > 5) {
      return 'critical';
    }

    // Check warning thresholds
    if (health.connectionQuality.availability < 0.95 || 
        health.connectionQuality.errorRate > 0.1 ||
        health.connectionQuality.responseTime > this.config.alertThresholds.responseTime ||
        (health.daysUntilExpiration !== undefined && health.daysUntilExpiration <= 7)) {
      return 'warning';
    }

    return 'healthy';
  }

  private calculateHealthScore(health: CredentialHealth): number {
    let score = 100;

    // Deduct for availability issues
    score -= (1 - health.connectionQuality.availability) * 30;

    // Deduct for error rate
    score -= health.connectionQuality.errorRate * 25;

    // Deduct for slow response times
    if (health.connectionQuality.responseTime > this.config.alertThresholds.responseTime) {
      score -= 15;
    }

    // Deduct for consecutive failures
    score -= Math.min(health.connectionQuality.consecutiveFailures * 5, 20);

    // Deduct for approaching expiration
    if (health.daysUntilExpiration !== undefined) {
      if (health.daysUntilExpiration <= 7) {
        score -= 20;
      } else if (health.daysUntilExpiration <= 30) {
        score -= 10;
      }
    }

    return Math.max(0, Math.round(score));
  }

  private async checkAndCreateAlerts(health: CredentialHealth): Promise<void> {
    const alerts: HealthAlert[] = [];

    // Check for expiration warnings
    if (health.daysUntilExpiration !== undefined) {
      if (health.daysUntilExpiration <= 7 && health.daysUntilExpiration > 0) {
        alerts.push({
          alertId: `exp_${health.credentialId}_${Date.now()}`,
          type: 'expiration_warning',
          severity: 'error',
          message: `Credential expires in ${health.daysUntilExpiration} days`,
          businessImpact: 'Service will stop working when credential expires, causing business disruption',
          actionRequired: true,
          suggestedActions: [
            'Renew credential before expiration',
            'Set up automated renewal if available',
            'Prepare backup authentication method'
          ],
          escalated: health.daysUntilExpiration <= 3
        });
      } else if (health.daysUntilExpiration <= 30 && health.daysUntilExpiration > 7) {
        alerts.push({
          alertId: `exp_warn_${health.credentialId}_${Date.now()}`,
          type: 'expiration_warning',
          severity: 'warning',
          message: `Credential expires in ${health.daysUntilExpiration} days`,
          businessImpact: 'Plan renewal to avoid service interruption',
          actionRequired: false,
          suggestedActions: [
            'Schedule credential renewal',
            'Review auto-renewal options',
            'Notify stakeholders of upcoming expiration'
          ],
          escalated: false
        });
      }
    }

    // Check for connection failures
    if (health.connectionQuality.consecutiveFailures >= 3) {
      alerts.push({
        alertId: `conn_${health.credentialId}_${Date.now()}`,
        type: 'connection_failure',
        severity: health.connectionQuality.consecutiveFailures >= 5 ? 'critical' : 'error',
        message: `${health.connectionQuality.consecutiveFailures} consecutive connection failures`,
        businessImpact: health.connectionQuality.businessImpact,
        actionRequired: true,
        suggestedActions: [
          'Check service status and availability',
          'Verify credential validity',
          'Review network connectivity',
          'Consider backup authentication method'
        ],
        escalated: health.connectionQuality.consecutiveFailures >= 5
      });
    }

    // Check for performance issues
    if (health.connectionQuality.responseTime > this.config.alertThresholds.responseTime * 2) {
      alerts.push({
        alertId: `perf_${health.credentialId}_${Date.now()}`,
        type: 'connection_failure',
        severity: 'warning',
        message: `Slow response time: ${health.connectionQuality.responseTime}ms`,
        businessImpact: 'Reduced performance may impact user experience and business operations',
        actionRequired: false,
        suggestedActions: [
          'Monitor service performance',
          'Check network conditions',
          'Contact service provider if issues persist'
        ],
        escalated: false
      });
    }

    // Add new alerts and notify
    for (const alert of alerts) {
      const existingAlert = health.alerts.find(a => 
        a.type === alert.type && 
        !a.resolvedAt && 
        a.message === alert.message
      );

      if (!existingAlert) {
        health.alerts.push(alert);
        
        if (this.config.enableNotifications) {
          this.notifyAlert(alert);
        }
      }
    }
  }

  private notifyAlert(alert: HealthAlert): void {
    logger.warn('Health Alert:', alert);
    
    // Notify all registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Error in alert callback:', error);
      }
    });
  }

  private getBusinessImpactForFailure(serviceConnectionCard: ServiceConnectionCard): string {
    const impacts = {
      critical: 'Service failure will cause immediate business disruption and potential revenue loss',
      high: 'Service issues may impact customer experience and business operations',
      medium: 'Service problems could affect productivity and workflow efficiency',
      low: 'Service interruption has minimal immediate business impact'
    };

    return impacts[serviceConnectionCard.priority] || impacts.medium;
  }

  private getBusinessMeaning(metricType: string, status: string): string {
    const meanings: Record<string, Record<string, string>> = {
      authentication_strength: {
        good: 'Strong authentication protects against unauthorized access',
        warning: 'Authentication could be strengthened to better protect business data',
        critical: 'Weak authentication poses significant security risk to business operations'
      },
      permission_scope: {
        good: 'Permissions are appropriately scoped for business needs',
        warning: 'Some permissions may be broader than necessary',
        critical: 'Excessive permissions create significant security and compliance risks'
      },
      encryption_level: {
        good: 'Data is well-protected with strong encryption',
        warning: 'Encryption should be strengthened to meet security standards',
        critical: 'Insufficient encryption puts sensitive business data at risk'
      },
      audit_compliance: {
        good: 'Comprehensive audit trails support compliance requirements',
        warning: 'Some audit gaps may affect compliance posture',
        critical: 'Insufficient audit trails create compliance and legal risks'
      }
    };

    return meanings[metricType]?.[status] || 'Status requires review';
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Clear all monitoring intervals
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals.clear();
    
    // Clear data
    this.healthData.clear();
    this.alertCallbacks.length = 0;
    
    logger.info('Credential Health Monitor disposed');
  }
}

// Export singleton instance
export const credentialHealthMonitor = new CredentialHealthMonitor();