/**
 * Auto-Healing System
 * Proactive connection monitoring and automatic recovery for service integrations
 */

import {
  ConnectionHealth,
  HealthMetric,
  AutoHealingAttempt,
  HealingAction,
  MonitoringConfig,
  AlertThreshold,
  EscalationPolicy,
  BusinessHours,
  ServiceConnectionCard,
  ConnectionStatus,
  SmartCredentialResponse
} from '../types/smartCredentials';
import { smartErrorHandler } from './smartErrorHandler';

interface HealthCheckResult {
  serviceId: string;
  healthy: boolean;
  responseTime: number;
  errorMessage?: string;
  metrics: HealthMetric[];
}

interface HealingStrategy {
  actionType: HealingAction['actionType'];
  condition: (health: ConnectionHealth) => boolean;
  execute: (health: ConnectionHealth) => Promise<boolean>;
  riskLevel: 'low' | 'medium' | 'high';
  businessApprovalRequired: boolean;
}

export class AutoHealingService {
  private healthStatus: Map<string, ConnectionHealth> = new Map(); // serviceId -> health
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private healingStrategies: Map<string, HealingStrategy[]> = new Map();
  private activeHealingAttempts: Map<string, AutoHealingAttempt> = new Map();
  private isMonitoring: boolean = false;
  private globalMonitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeHealingStrategies();
    this.startGlobalMonitoring();
  }

  /**
   * Start monitoring a service connection
   */
  public async startMonitoring(
    serviceId: string,
    workflowId: string,
    service: ServiceConnectionCard,
    config?: Partial<MonitoringConfig>
  ): Promise<SmartCredentialResponse<ConnectionHealth>> {
    try {
      const monitoringConfig = this.createMonitoringConfig(serviceId, config);
      
      const health: ConnectionHealth = {
        serviceId,
        workflowId,
        status: 'healthy',
        lastHealthCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        availability: 1,
        healthMetrics: [],
        autoHealingAttempts: [],
        monitoringConfig
      };

      this.healthStatus.set(`${workflowId}-${serviceId}`, health);

      // Start periodic health checks
      if (monitoringConfig.enabled) {
        this.startPeriodicHealthChecks(workflowId, serviceId, service);
      }

      return {
        success: true,
        data: health,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          processingTime: 0,
          version: '1.0'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MONITORING_START_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Failed to start connection monitoring'
        }
      };
    }
  }

  /**
   * Stop monitoring a service connection
   */
  public stopMonitoring(workflowId: string, serviceId: string): boolean {
    const key = `${workflowId}-${serviceId}`;
    
    // Clear monitoring interval
    const interval = this.monitoringIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(key);
    }

    // Remove health status
    this.healthStatus.delete(key);

    return true;
  }

  /**
   * Get current health status for a service
   */
  public getHealthStatus(workflowId: string, serviceId: string): ConnectionHealth | null {
    return this.healthStatus.get(`${workflowId}-${serviceId}`) || null;
  }

  /**
   * Get health status for all monitored services
   */
  public getAllHealthStatus(): ConnectionHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Manually trigger a health check
   */
  public async performHealthCheck(
    workflowId: string,
    serviceId: string,
    service: ServiceConnectionCard
  ): Promise<SmartCredentialResponse<HealthCheckResult>> {
    try {
      const result = await this.executeHealthCheck(workflowId, serviceId, service);
      
      // Update health status
      const key = `${workflowId}-${serviceId}`;
      const health = this.healthStatus.get(key);
      if (health) {
        this.updateHealthStatus(health, result);
      }

      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Health check failed. The service may be experiencing issues.'
        }
      };
    }
  }

  /**
   * Manually trigger healing for a service
   */
  public async triggerHealing(
    workflowId: string,
    serviceId: string,
    actionType?: HealingAction['actionType']
  ): Promise<SmartCredentialResponse<AutoHealingAttempt>> {
    try {
      const key = `${workflowId}-${serviceId}`;
      const health = this.healthStatus.get(key);
      if (!health) {
        throw new Error('Service not found in monitoring');
      }

      const attempt = await this.attemptHealing(health, actionType);
      
      return {
        success: true,
        data: attempt
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALING_TRIGGER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Failed to trigger healing. Manual intervention may be required.'
        }
      };
    }
  }

  /**
   * Update monitoring configuration for a service
   */
  public updateMonitoringConfig(
    workflowId: string,
    serviceId: string,
    config: Partial<MonitoringConfig>
  ): boolean {
    const key = `${workflowId}-${serviceId}`;
    const health = this.healthStatus.get(key);
    if (!health) return false;

    health.monitoringConfig = { ...health.monitoringConfig, ...config };
    
    // Restart monitoring with new config
    this.stopMonitoring(workflowId, serviceId);
    // Note: Would need service reference to restart properly
    
    return true;
  }

  /**
   * Get healing history for a service
   */
  public getHealingHistory(workflowId: string, serviceId: string): AutoHealingAttempt[] {
    const health = this.getHealthStatus(workflowId, serviceId);
    return health?.autoHealingAttempts || [];
  }

  /**
   * Get system-wide healing statistics
   */
  public getHealingStatistics(): {
    totalAttempts: number;
    successRate: number;
    avgHealingTime: number;
    topIssues: Array<{ actionType: string; count: number; successRate: number }>;
    healthyServices: number;
    degradedServices: number;
    failingServices: number;
  } {
    const allHealth = this.getAllHealthStatus();
    const allAttempts = allHealth.flatMap(h => h.autoHealingAttempts);

    const totalAttempts = allAttempts.length;
    const successfulAttempts = allAttempts.filter(a => a.result === 'success').length;
    const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;

    // Calculate average healing time
    const completedAttempts = allAttempts.filter(a => a.completedAt);
    const avgHealingTime = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => 
          sum + (a.completedAt!.getTime() - a.triggeredAt.getTime()), 0
        ) / completedAttempts.length / 1000 // Convert to seconds
      : 0;

    // Count services by status
    const healthyServices = allHealth.filter(h => h.status === 'healthy').length;
    const degradedServices = allHealth.filter(h => h.status === 'degraded').length;
    const failingServices = allHealth.filter(h => h.status === 'failing' || h.status === 'down').length;

    // Top issues
    const issueMap = new Map<string, { count: number; successful: number }>();
    allAttempts.forEach(attempt => {
      const actionType = attempt.healingAction.actionType;
      const current = issueMap.get(actionType) || { count: 0, successful: 0 };
      current.count++;
      if (attempt.result === 'success') {
        current.successful++;
      }
      issueMap.set(actionType, current);
    });

    const topIssues = Array.from(issueMap.entries()).map(([actionType, stats]) => ({
      actionType,
      count: stats.count,
      successRate: stats.count > 0 ? stats.successful / stats.count : 0
    })).sort((a, b) => b.count - a.count);

    return {
      totalAttempts,
      successRate,
      avgHealingTime,
      topIssues,
      healthyServices,
      degradedServices,
      failingServices
    };
  }

  /**
   * Private Methods
   */

  private initializeHealingStrategies(): void {
    // Generic healing strategies
    const genericStrategies: HealingStrategy[] = [
      {
        actionType: 'retry_connection',
        condition: (health) => health.status === 'degraded' && health.errorRate < 0.5,
        execute: async (health) => {
          // Simulate retry logic
          await new Promise(resolve => setTimeout(resolve, 1000));
          return Math.random() > 0.3; // 70% success rate
        },
        riskLevel: 'low',
        businessApprovalRequired: false
      },
      {
        actionType: 'refresh_token',
        condition: (health) => {
          const authErrors = health.healthMetrics.filter(m => 
            m.metricType === 'error_rate' && m.status === 'critical'
          );
          return authErrors.length > 0;
        },
        execute: async (health) => {
          // Simulate token refresh
          await new Promise(resolve => setTimeout(resolve, 2000));
          return Math.random() > 0.2; // 80% success rate
        },
        riskLevel: 'medium',
        businessApprovalRequired: false
      },
      {
        actionType: 'restart_service',
        condition: (health) => health.status === 'down',
        execute: async (health) => {
          // Simulate service restart
          await new Promise(resolve => setTimeout(resolve, 5000));
          return Math.random() > 0.4; // 60% success rate
        },
        riskLevel: 'high',
        businessApprovalRequired: true
      }
    ];

    // Apply to all services
    this.healingStrategies.set('default', genericStrategies);

    // Service-specific strategies
    this.healingStrategies.set('gmail', [
      ...genericStrategies,
      {
        actionType: 'rate_limit_backoff',
        condition: (health) => {
          return health.healthMetrics.some(m => 
            m.metricType === 'rate_limit' && m.status === 'warning'
          );
        },
        execute: async (health) => {
          // Implement exponential backoff
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true; // Always succeeds
        },
        riskLevel: 'low',
        businessApprovalRequired: false
      }
    ]);

    this.healingStrategies.set('slack', [
      ...genericStrategies,
      {
        actionType: 'switch_endpoint',
        condition: (health) => health.responseTime > 5000,
        execute: async (health) => {
          // Switch to alternative endpoint
          await new Promise(resolve => setTimeout(resolve, 1000));
          return Math.random() > 0.25; // 75% success rate
        },
        riskLevel: 'medium',
        businessApprovalRequired: false
      }
    ]);
  }

  private createMonitoringConfig(
    serviceId: string,
    config?: Partial<MonitoringConfig>
  ): MonitoringConfig {
    const defaultConfig: MonitoringConfig = {
      enabled: true,
      checkInterval: 300, // 5 minutes
      alertThresholds: [
        {
          metric: 'response_time',
          warningLevel: 3000, // 3 seconds
          criticalLevel: 10000, // 10 seconds
          consecutiveFailures: 3,
          alertingEnabled: true
        },
        {
          metric: 'error_rate',
          warningLevel: 0.1, // 10%
          criticalLevel: 0.3, // 30%
          consecutiveFailures: 2,
          alertingEnabled: true
        }
      ],
      autoHealingEnabled: true,
      escalationPolicy: {
        levels: [
          {
            level: 1,
            triggerAfter: 5, // 5 minutes
            actions: ['auto_heal'],
            contacts: [],
            automated: true
          },
          {
            level: 2,
            triggerAfter: 15, // 15 minutes
            actions: ['notify_admin'],
            contacts: [],
            automated: true
          }
        ],
        maxAutoHealing: 3,
        requiresBusinessApproval: ['restart_service', 'reset_credentials'],
        emergencyContact: {
          type: 'email',
          contact: 'emergency@company.com',
          name: 'Emergency Support',
          role: 'System Administrator',
          availability: {
            timezone: 'UTC',
            schedule: [],
            holidays: [],
            emergencyOverride: true
          }
        }
      },
      businessHours: {
        timezone: 'UTC',
        schedule: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', available: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', available: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', available: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', available: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', available: true }
        ],
        holidays: [],
        emergencyOverride: false
      }
    };

    return { ...defaultConfig, ...config };
  }

  private startPeriodicHealthChecks(
    workflowId: string,
    serviceId: string,
    service: ServiceConnectionCard
  ): void {
    const key = `${workflowId}-${serviceId}`;
    const health = this.healthStatus.get(key);
    if (!health) return;

    const interval = setInterval(async () => {
      try {
        const result = await this.executeHealthCheck(workflowId, serviceId, service);
        this.updateHealthStatus(health, result);

        // Check if healing is needed
        if (!result.healthy && health.monitoringConfig.autoHealingEnabled) {
          await this.evaluateAndHeal(health);
        }

      } catch (error) {
        console.error(`Health check failed for ${serviceId}:`, error);
      }
    }, health.monitoringConfig.checkInterval * 1000);

    this.monitoringIntervals.set(key, interval);
  }

  private async executeHealthCheck(
    workflowId: string,
    serviceId: string,
    service: ServiceConnectionCard
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simulate health check (in real implementation, this would test actual service)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      const responseTime = Date.now() - startTime;
      const healthy = Math.random() > 0.05; // 95% healthy rate for simulation

      const metrics: HealthMetric[] = [
        {
          metricType: 'response_time',
          value: responseTime,
          threshold: 3000,
          status: responseTime > 3000 ? 'critical' : responseTime > 1000 ? 'warning' : 'normal',
          trend: 'stable',
          timestamp: new Date()
        },
        {
          metricType: 'availability',
          value: healthy ? 1 : 0,
          threshold: 0.99,
          status: healthy ? 'normal' : 'critical',
          trend: 'stable',
          timestamp: new Date()
        }
      ];

      return {
        serviceId,
        healthy,
        responseTime,
        errorMessage: healthy ? undefined : 'Simulated connection error',
        metrics
      };

    } catch (error) {
      return {
        serviceId,
        healthy: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metrics: []
      };
    }
  }

  private updateHealthStatus(health: ConnectionHealth, result: HealthCheckResult): void {
    health.lastHealthCheck = new Date();
    health.responseTime = result.responseTime;
    health.healthMetrics.push(...result.metrics);

    // Keep only last 24 hours of metrics
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    health.healthMetrics = health.healthMetrics.filter(m => m.timestamp > cutoff);

    // Calculate error rate and availability
    const recentMetrics = health.healthMetrics.filter(m => 
      m.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    const availabilityMetrics = recentMetrics.filter(m => m.metricType === 'availability');
    if (availabilityMetrics.length > 0) {
      health.availability = availabilityMetrics.reduce((sum, m) => sum + m.value, 0) / availabilityMetrics.length;
    }

    const errorMetrics = recentMetrics.filter(m => m.status === 'critical');
    health.errorRate = recentMetrics.length > 0 ? errorMetrics.length / recentMetrics.length : 0;

    // Determine overall status
    if (!result.healthy || health.availability < 0.8) {
      health.status = 'down';
    } else if (health.errorRate > 0.2 || health.responseTime > 5000) {
      health.status = 'failing';
    } else if (health.errorRate > 0.1 || health.responseTime > 3000) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }
  }

  private async evaluateAndHeal(health: ConnectionHealth): Promise<void> {
    // Check if already healing
    const activeAttempt = this.activeHealingAttempts.get(health.serviceId);
    if (activeAttempt && activeAttempt.result === 'in_progress') {
      return;
    }

    // Get applicable strategies
    const strategies = this.healingStrategies.get(health.serviceId) || 
                     this.healingStrategies.get('default') || [];

    // Find the first applicable strategy
    for (const strategy of strategies) {
      if (strategy.condition(health)) {
        await this.attemptHealing(health, strategy.actionType);
        break;
      }
    }
  }

  private async attemptHealing(
    health: ConnectionHealth,
    actionType?: HealingAction['actionType']
  ): Promise<AutoHealingAttempt> {
    const attemptId = this.generateAttemptId();
    const strategies = this.healingStrategies.get(health.serviceId) || 
                      this.healingStrategies.get('default') || [];

    let strategy: HealingStrategy | undefined;
    if (actionType) {
      strategy = strategies.find(s => s.actionType === actionType);
    } else {
      strategy = strategies.find(s => s.condition(health));
    }

    if (!strategy) {
      throw new Error('No applicable healing strategy found');
    }

    const healingAction: HealingAction = {
      actionType: strategy.actionType,
      description: this.getActionDescription(strategy.actionType),
      automated: true,
      riskLevel: strategy.riskLevel,
      rollbackPossible: true,
      businessApprovalRequired: strategy.businessApprovalRequired,
      estimatedDowntime: this.getEstimatedDowntime(strategy.actionType)
    };

    const attempt: AutoHealingAttempt = {
      attemptId,
      triggeredAt: new Date(),
      healingAction,
      result: 'in_progress',
      businessImpact: this.getBusinessImpact(strategy.actionType, health),
      detailsLog: [`Starting ${strategy.actionType} healing attempt`]
    };

    // Store active attempt
    this.activeHealingAttempts.set(health.serviceId, attempt);
    health.autoHealingAttempts.push(attempt);

    try {
      // Execute healing strategy
      const success = await strategy.execute(health);
      
      attempt.completedAt = new Date();
      attempt.result = success ? 'success' : 'failed';
      attempt.detailsLog.push(
        success ? 'Healing completed successfully' : 'Healing attempt failed'
      );

      if (success) {
        // Reset health status on successful healing
        health.status = 'healthy';
        health.errorRate = 0;
      }

    } catch (error) {
      attempt.completedAt = new Date();
      attempt.result = 'failed';
      attempt.detailsLog.push(`Healing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Remove from active attempts
    this.activeHealingAttempts.delete(health.serviceId);

    return attempt;
  }

  private getActionDescription(actionType: HealingAction['actionType']): string {
    const descriptions: Record<string, string> = {
      'retry_connection': 'Retry the connection with exponential backoff',
      'refresh_token': 'Refresh authentication tokens',
      'reset_credentials': 'Reset and regenerate credentials',
      'switch_endpoint': 'Switch to alternative API endpoint',
      'rate_limit_backoff': 'Apply rate limiting and backoff strategy',
      'restart_service': 'Restart the service connection'
    };

    return descriptions[actionType] || `Perform ${actionType} healing action`;
  }

  private getEstimatedDowntime(actionType: HealingAction['actionType']): string {
    const downtimes: Record<string, string> = {
      'retry_connection': '30 seconds',
      'refresh_token': '2 minutes',
      'reset_credentials': '5 minutes',
      'switch_endpoint': '1 minute',
      'rate_limit_backoff': '10 seconds',
      'restart_service': '5 minutes'
    };

    return downtimes[actionType] || '2 minutes';
  }

  private getBusinessImpact(actionType: HealingAction['actionType'], health: ConnectionHealth): string {
    const serviceId = health.serviceId;
    
    if (actionType === 'restart_service') {
      return `Brief service interruption for ${serviceId} while restarting connection`;
    }
    
    if (actionType === 'reset_credentials') {
      return `${serviceId} automation will be temporarily paused during credential reset`;
    }
    
    return `Minimal business impact during ${serviceId} connection healing`;
  }

  private startGlobalMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Global monitoring for system health
    this.globalMonitoringInterval = setInterval(() => {
      this.performSystemHealthCheck();
    }, 60000); // Every minute
    console.log('🔄 AutoHealingService: Started global monitoring (60s interval)');
  }

  private performSystemHealthCheck(): void {
    const allHealth = this.getAllHealthStatus();
    
    // Check for system-wide issues
    const failingServices = allHealth.filter(h => h.status === 'failing' || h.status === 'down');
    
    if (failingServices.length > allHealth.length * 0.5) {
      // More than 50% of services failing - system-wide issue
      console.warn('System-wide service degradation detected');
      // Would trigger system-level alerts in production
    }
  }

  private generateAttemptId(): string {
    return `heal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop all monitoring and cleanup resources
   */
  public destroy(): void {
    // Stop global monitoring
    if (this.globalMonitoringInterval) {
      clearInterval(this.globalMonitoringInterval);
      this.globalMonitoringInterval = undefined;
      console.log('✅ AutoHealingService: Stopped global monitoring');
    }

    // Stop all individual monitoring intervals
    this.monitoringIntervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`✅ AutoHealingService: Stopped monitoring for ${key}`);
    });
    this.monitoringIntervals.clear();

    // Clear all data
    this.healthStatus.clear();
    this.healingStrategies.clear();
    this.activeHealingAttempts.clear();
    this.isMonitoring = false;

    console.log('🧹 AutoHealingService: Cleaned up all resources');
  }
}

// Export singleton instance
export const autoHealing = new AutoHealingService();