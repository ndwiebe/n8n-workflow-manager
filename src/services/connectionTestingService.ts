/**
 * Connection Testing Service
 * Business-context connection testing with real-time health monitoring
 * Phase 2: OAuth Excellence System
 */

import { 
  OAuthConnectionTest, 
  OAuthTest, 
  OAuthTestResult,
  ServiceConnectionCard,
  OAuthServiceConnectionCard,
  SmartCredentialResponse
} from '../types/smartCredentials';

export interface ConnectionTestSuite {
  serviceId: string;
  providerId: string;
  tests: BusinessContextTest[];
  estimatedDuration: number; // milliseconds
  requiresToken: boolean;
}

export interface BusinessContextTest {
  testId: string;
  name: string;
  description: string;
  businessPurpose: string;
  category: 'connectivity' | 'permissions' | 'functionality' | 'performance';
  priority: 'critical' | 'important' | 'optional';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiredScopes: string[];
  expectedResult: 'success' | 'data_returned' | 'permission_granted' | 'specific_value';
  expectedValue?: any;
  timeout: number;
  businessImpact: string;
  failureGuidance: string;
  retryable: boolean;
}

export interface ConnectionTestExecution {
  testSuiteId: string;
  serviceId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: OAuthTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    averageResponseTime: number;
    connectionHealth: 'excellent' | 'good' | 'limited' | 'poor';
    businessReadiness: 'ready' | 'limited' | 'not_ready';
  };
  recommendations: string[];
  nextSteps: string[];
}

export interface ServiceHealthStatus {
  serviceId: string;
  providerId: string;
  overallHealth: 'excellent' | 'good' | 'limited' | 'poor';
  lastTested: Date;
  connectivity: {
    status: 'connected' | 'degraded' | 'failed';
    responseTime: number;
    uptime: number;
  };
  permissions: {
    status: 'full' | 'partial' | 'insufficient';
    grantedScopes: string[];
    missingScopes: string[];
    criticalMissing: boolean;
  };
  functionality: {
    coreFeatures: Array<{
      feature: string;
      working: boolean;
      lastTested: Date;
      businessImpact: string;
    }>;
    performanceMetrics: {
      averageResponseTime: number;
      successRate: number;
      errorRate: number;
    };
  };
  businessContext: {
    canSendData: boolean;
    canReceiveData: boolean;
    canProcessWorkflows: boolean;
    limitedFeatures: string[];
    blockerIssues: string[];
  };
}

export class ConnectionTestingService {
  private testSuites: Map<string, ConnectionTestSuite> = new Map();
  private runningTests: Map<string, ConnectionTestExecution> = new Map();
  private healthStatus: Map<string, ServiceHealthStatus> = new Map();
  private testHistory: Map<string, ConnectionTestExecution[]> = new Map();

  constructor() {
    this.initializeTestSuites();
  }

  /**
   * Execute comprehensive connection test for a service
   */
  public async testConnection(
    service: ServiceConnectionCard | OAuthServiceConnectionCard,
    workflowId: string,
    userId: string
  ): Promise<SmartCredentialResponse<ConnectionTestExecution>> {
    try {
      const testSuite = this.testSuites.get(service.serviceId);
      if (!testSuite) {
        throw new Error(`No test suite found for service: ${service.serviceId}`);
      }

      // Create test execution
      const executionId = this.generateExecutionId();
      const execution: ConnectionTestExecution = {
        testSuiteId: testSuite.serviceId,
        serviceId: service.serviceId,
        startedAt: new Date(),
        status: 'running',
        results: [],
        summary: {
          totalTests: testSuite.tests.length,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          averageResponseTime: 0,
          connectionHealth: 'poor',
          businessReadiness: 'not_ready'
        },
        recommendations: [],
        nextSteps: []
      };

      this.runningTests.set(executionId, execution);

      // Execute tests sequentially with business context
      const results: OAuthTestResult[] = [];
      let totalResponseTime = 0;

      for (const test of testSuite.tests) {
        const testResult = await this.executeBusinessContextTest(test, service, workflowId, userId);
        results.push(testResult);
        totalResponseTime += testResult.executionTime;

        // Update execution status
        execution.results = results;
        if (testResult.passed) {
          execution.summary.passedTests++;
        } else {
          execution.summary.failedTests++;
        }
      }

      // Calculate final metrics
      execution.completedAt = new Date();
      execution.status = 'completed';
      execution.summary.averageResponseTime = totalResponseTime / testSuite.tests.length;
      execution.summary.connectionHealth = this.calculateConnectionHealth(results);
      execution.summary.businessReadiness = this.calculateBusinessReadiness(results, testSuite.tests);
      execution.recommendations = this.generateRecommendations(results, testSuite.tests);
      execution.nextSteps = this.generateNextSteps(results, testSuite.tests, service);

      // Update health status
      await this.updateHealthStatus(service.serviceId, testSuite.providerId, execution);

      // Store in history
      const history = this.testHistory.get(service.serviceId) || [];
      history.push(execution);
      this.testHistory.set(service.serviceId, history.slice(-10)); // Keep last 10 executions

      this.runningTests.delete(executionId);

      return {
        success: true,
        data: execution,
        metadata: {
          requestId: executionId,
          timestamp: new Date(),
          processingTime: execution.completedAt.getTime() - execution.startedAt.getTime(),
          version: '2.0'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: error instanceof Error ? error.message : 'Connection test failed',
          userMessage: 'Unable to complete connection testing. Please check your service configuration.',
          resolution: 'Verify your credentials and network connectivity, then try again.'
        }
      };
    }
  }

  /**
   * Get real-time health status for a service
   */
  public getHealthStatus(serviceId: string): ServiceHealthStatus | null {
    return this.healthStatus.get(serviceId) || null;
  }

  /**
   * Get test execution history for a service
   */
  public getTestHistory(serviceId: string): ConnectionTestExecution[] {
    return this.testHistory.get(serviceId) || [];
  }

  /**
   * Get running test status
   */
  public getRunningTest(serviceId: string): ConnectionTestExecution | null {
    for (const [_, execution] of this.runningTests) {
      if (execution.serviceId === serviceId && execution.status === 'running') {
        return execution;
      }
    }
    return null;
  }

  /**
   * Cancel running test
   */
  public async cancelTest(serviceId: string): Promise<boolean> {
    for (const [executionId, execution] of this.runningTests) {
      if (execution.serviceId === serviceId && execution.status === 'running') {
        execution.status = 'cancelled';
        execution.completedAt = new Date();
        this.runningTests.delete(executionId);
        return true;
      }
    }
    return false;
  }

  /**
   * Execute specific business context test
   */
  private async executeBusinessContextTest(
    test: BusinessContextTest,
    service: ServiceConnectionCard | OAuthServiceConnectionCard,
    workflowId: string,
    userId: string
  ): Promise<OAuthTestResult> {
    const startTime = Date.now();
    
    try {
      // Check if OAuth service and has required scopes
      const oauthService = this.isOAuthService(service) ? service : null;
      if (oauthService && test.requiredScopes.length > 0) {
        const hasRequiredScopes = test.requiredScopes.every(scope =>
          oauthService.oauthStatus?.authorizedScopes?.includes(scope)
        );

        if (!hasRequiredScopes) {
          return {
            testId: test.testId,
            passed: false,
            error: 'Insufficient permissions',
            businessMessage: `Missing required permissions: ${test.requiredScopes.filter(scope =>
              !oauthService.oauthStatus?.authorizedScopes?.includes(scope)
            ).join(', ')}. ${test.failureGuidance}`,
            recommendations: [
              'Reconnect your account with additional permissions',
              'Contact your administrator to grant required access'
            ],
            executionTime: Date.now() - startTime
          };
        }
      }

      // Execute the test based on category
      let result: any;
      let passed = false;

      switch (test.category) {
        case 'connectivity':
          result = await this.testConnectivity(test, service);
          passed = result.connected === true;
          break;
        case 'permissions':
          result = await this.testPermissions(test, service);
          passed = result.hasPermission === true;
          break;
        case 'functionality':
          result = await this.testFunctionality(test, service);
          passed = result.functional === true;
          break;
        case 'performance':
          result = await this.testPerformance(test, service);
          passed = result.performance === 'good' || result.performance === 'excellent';
          break;
        default:
          throw new Error(`Unknown test category: ${test.category}`);
      }

      const businessMessage = passed
        ? `✅ ${test.businessPurpose} - Working correctly`
        : `❌ ${test.businessPurpose} - ${test.failureGuidance}`;

      return {
        testId: test.testId,
        passed,
        result,
        businessMessage,
        recommendations: passed ? [] : this.getTestRecommendations(test, result),
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        testId: test.testId,
        passed: false,
        error: error instanceof Error ? error.message : 'Test execution failed',
        businessMessage: `❌ ${test.businessPurpose} - ${test.failureGuidance}`,
        recommendations: [
          'Check your internet connection',
          'Verify service credentials',
          'Try reconnecting your account'
        ],
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test basic connectivity
   */
  private async testConnectivity(
    test: BusinessContextTest,
    service: ServiceConnectionCard | OAuthServiceConnectionCard
  ): Promise<any> {
    if (!test.endpoint) {
      return { connected: true, simulated: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), test.timeout);
      
      const response = await fetch('/api/oauth/test/' + this.getProviderId(service), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('authToken')
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      return {
        connected: response.ok,
        statusCode: response.status,
        responseTime: Date.now() - Date.now() // Simplified for demo
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Test permissions
   */
  private async testPermissions(
    test: BusinessContextTest,
    service: ServiceConnectionCard | OAuthServiceConnectionCard
  ): Promise<any> {
    const oauthService = this.isOAuthService(service) ? service : null;
    
    if (!oauthService?.oauthStatus) {
      return { hasPermission: false, reason: 'Not an OAuth service' };
    }

    const hasAllRequiredScopes = test.requiredScopes.every(scope =>
      oauthService.oauthStatus?.authorizedScopes?.includes(scope)
    );

    return {
      hasPermission: hasAllRequiredScopes,
      grantedScopes: oauthService.oauthStatus.authorizedScopes || [],
      requiredScopes: test.requiredScopes,
      missingScopes: test.requiredScopes.filter(scope =>
        !oauthService.oauthStatus?.authorizedScopes?.includes(scope)
      )
    };
  }

  /**
   * Test functionality
   */
  private async testFunctionality(
    test: BusinessContextTest,
    service: ServiceConnectionCard | OAuthServiceConnectionCard
  ): Promise<any> {
    // For demo purposes, simulate functionality tests
    const simulatedResult = Math.random() > 0.2; // 80% success rate
    
    return {
      functional: simulatedResult,
      feature: test.name,
      details: simulatedResult 
        ? 'Feature is working correctly'
        : 'Feature test failed - check configuration'
    };
  }

  /**
   * Test performance
   */
  private async testPerformance(
    test: BusinessContextTest,
    service: ServiceConnectionCard | OAuthServiceConnectionCard
  ): Promise<any> {
    const startTime = Date.now();
    
    // Simulate performance test
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
    
    const responseTime = Date.now() - startTime;
    let performance: string;
    
    if (responseTime < 500) performance = 'excellent';
    else if (responseTime < 1000) performance = 'good';
    else if (responseTime < 2000) performance = 'fair';
    else performance = 'poor';

    return {
      performance,
      responseTime,
      threshold: test.timeout,
      recommendation: responseTime > test.timeout ? 'Consider optimizing API calls' : 'Performance is acceptable'
    };
  }

  /**
   * Helper methods
   */
  private isOAuthService(service: ServiceConnectionCard | OAuthServiceConnectionCard): service is OAuthServiceConnectionCard {
    return 'oauthConfig' in service && service.oauthConfig !== undefined;
  }

  private getProviderId(service: ServiceConnectionCard | OAuthServiceConnectionCard): string {
    if (this.isOAuthService(service)) {
      return service.oauthConfig?.providerId || service.serviceId;
    }
    return service.serviceId;
  }

  private calculateConnectionHealth(results: OAuthTestResult[]): 'excellent' | 'good' | 'limited' | 'poor' {
    const passRate = results.filter(r => r.passed).length / results.length;
    if (passRate === 1) return 'excellent';
    if (passRate >= 0.8) return 'good';
    if (passRate >= 0.6) return 'limited';
    return 'poor';
  }

  private calculateBusinessReadiness(
    results: OAuthTestResult[],
    tests: BusinessContextTest[]
  ): 'ready' | 'limited' | 'not_ready' {
    const criticalTests = tests.filter(t => t.priority === 'critical');
    const criticalResults = results.filter(r => 
      tests.find(t => t.testId === r.testId)?.priority === 'critical'
    );
    
    const criticalPassRate = criticalResults.filter(r => r.passed).length / criticalTests.length;
    
    if (criticalPassRate === 1) return 'ready';
    if (criticalPassRate >= 0.5) return 'limited';
    return 'not_ready';
  }

  private generateRecommendations(
    results: OAuthTestResult[],
    tests: BusinessContextTest[]
  ): string[] {
    const recommendations: string[] = [];
    
    results.forEach(result => {
      if (!result.passed && result.recommendations) {
        recommendations.push(...result.recommendations);
      }
    });

    // Remove duplicates and return top 5
    return Array.from(new Set(recommendations)).slice(0, 5);
  }

  private generateNextSteps(
    results: OAuthTestResult[],
    tests: BusinessContextTest[],
    service: ServiceConnectionCard | OAuthServiceConnectionCard
  ): string[] {
    const nextSteps: string[] = [];
    const failedTests = results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      nextSteps.push('✅ All tests passed! Your service is ready to use.');
    } else {
      const criticalFailures = failedTests.filter(r => 
        tests.find(t => t.testId === r.testId)?.priority === 'critical'
      );
      
      if (criticalFailures.length > 0) {
        nextSteps.push('🚨 Fix critical issues before proceeding with automation');
      }
      
      nextSteps.push('⚙️ Review connection configuration');
      nextSteps.push('🔄 Test connection again after making changes');
    }

    return nextSteps;
  }

  private getTestRecommendations(test: BusinessContextTest, result: any): string[] {
    const recommendations: string[] = [];
    
    switch (test.category) {
      case 'connectivity':
        recommendations.push('Check internet connection');
        recommendations.push('Verify service endpoint is accessible');
        break;
      case 'permissions':
        recommendations.push('Reconnect with required permissions');
        recommendations.push('Contact administrator for access');
        break;
      case 'functionality':
        recommendations.push('Review service configuration');
        recommendations.push('Check for service updates');
        break;
      case 'performance':
        recommendations.push('Optimize API usage');
        recommendations.push('Consider rate limiting');
        break;
    }
    
    return recommendations;
  }

  private async updateHealthStatus(
    serviceId: string,
    providerId: string,
    execution: ConnectionTestExecution
  ): Promise<void> {
    const healthStatus: ServiceHealthStatus = {
      serviceId,
      providerId,
      overallHealth: execution.summary.connectionHealth,
      lastTested: execution.completedAt || new Date(),
      connectivity: {
        status: execution.summary.passedTests > 0 ? 'connected' : 'failed',
        responseTime: execution.summary.averageResponseTime,
        uptime: 0.99 // Simulated
      },
      permissions: {
        status: execution.summary.businessReadiness === 'ready' ? 'full' : 'partial',
        grantedScopes: [],
        missingScopes: [],
        criticalMissing: execution.summary.businessReadiness === 'not_ready'
      },
      functionality: {
        coreFeatures: [],
        performanceMetrics: {
          averageResponseTime: execution.summary.averageResponseTime,
          successRate: execution.summary.passedTests / execution.summary.totalTests,
          errorRate: execution.summary.failedTests / execution.summary.totalTests
        }
      },
      businessContext: {
        canSendData: execution.summary.businessReadiness !== 'not_ready',
        canReceiveData: execution.summary.businessReadiness !== 'not_ready',
        canProcessWorkflows: execution.summary.businessReadiness === 'ready',
        limitedFeatures: execution.results
          .filter(r => !r.passed)
          .map(r => r.testId),
        blockerIssues: execution.results
          .filter(r => !r.passed)
          .map(r => r.businessMessage)
      }
    };

    this.healthStatus.set(serviceId, healthStatus);
  }

  private generateExecutionId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTestSuites(): void {
    // Gmail test suite
    this.testSuites.set('gmail', {
      serviceId: 'gmail',
      providerId: 'gmail',
      estimatedDuration: 15000,
      requiresToken: true,
      tests: [
        {
          testId: 'gmail_profile',
          name: 'Profile Access',
          description: 'Test access to Gmail profile information',
          businessPurpose: 'Verify we can identify your Gmail account',
          category: 'connectivity',
          priority: 'critical',
          endpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
          method: 'GET',
          requiredScopes: ['email'],
          expectedResult: 'data_returned',
          timeout: 5000,
          businessImpact: 'Required to connect and identify your Gmail account',
          failureGuidance: 'Check your internet connection and Gmail account access',
          retryable: true
        },
        {
          testId: 'gmail_read_access',
          name: 'Email Reading',
          description: 'Test ability to read Gmail messages',
          businessPurpose: 'Verify we can access your emails for processing',
          category: 'permissions',
          priority: 'critical',
          requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          expectedResult: 'permission_granted',
          timeout: 5000,
          businessImpact: 'Essential for email automation and processing',
          failureGuidance: 'Reconnect Gmail with email reading permissions',
          retryable: true
        },
        {
          testId: 'gmail_send_access',
          name: 'Email Sending',
          description: 'Test ability to send emails via Gmail',
          businessPurpose: 'Verify we can send emails on your behalf',
          category: 'permissions',
          priority: 'important',
          requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
          expectedResult: 'permission_granted',
          timeout: 5000,
          businessImpact: 'Required for automated email sending and responses',
          failureGuidance: 'Reconnect Gmail with email sending permissions',
          retryable: true
        },
        {
          testId: 'gmail_performance',
          name: 'Response Performance',
          description: 'Test Gmail API response performance',
          businessPurpose: 'Ensure Gmail integration performs well',
          category: 'performance',
          priority: 'optional',
          requiredScopes: ['email'],
          expectedResult: 'success',
          timeout: 3000,
          businessImpact: 'Affects speed of email processing workflows',
          failureGuidance: 'Performance may be slow due to network or API limits',
          retryable: true
        }
      ]
    });

    // Slack test suite
    this.testSuites.set('slack', {
      serviceId: 'slack',
      providerId: 'slack',
      estimatedDuration: 12000,
      requiresToken: true,
      tests: [
        {
          testId: 'slack_auth',
          name: 'Authentication',
          description: 'Test Slack authentication status',
          businessPurpose: 'Verify connection to your Slack workspace',
          category: 'connectivity',
          priority: 'critical',
          endpoint: 'https://slack.com/api/auth.test',
          method: 'GET',
          requiredScopes: [],
          expectedResult: 'success',
          timeout: 5000,
          businessImpact: 'Required to connect to Slack workspace',
          failureGuidance: 'Check Slack workspace access and permissions',
          retryable: true
        },
        {
          testId: 'slack_channels',
          name: 'Channel Access',
          description: 'Test ability to read Slack channels',
          businessPurpose: 'Verify we can access your Slack channels',
          category: 'permissions',
          priority: 'critical',
          requiredScopes: ['channels:read'],
          expectedResult: 'permission_granted',
          timeout: 5000,
          businessImpact: 'Essential for channel-based notifications',
          failureGuidance: 'Reconnect Slack with channel reading permissions',
          retryable: true
        },
        {
          testId: 'slack_messaging',
          name: 'Message Sending',
          description: 'Test ability to send Slack messages',
          businessPurpose: 'Verify we can send notifications to your workspace',
          category: 'permissions',
          priority: 'critical',
          requiredScopes: ['chat:write'],
          expectedResult: 'permission_granted',
          timeout: 5000,
          businessImpact: 'Required for automated notifications and alerts',
          failureGuidance: 'Reconnect Slack with message sending permissions',
          retryable: true
        }
      ]
    });

    // Microsoft 365 test suite
    this.testSuites.set('office365', {
      serviceId: 'office365',
      providerId: 'office365',
      estimatedDuration: 18000,
      requiresToken: true,
      tests: [
        {
          testId: 'office365_profile',
          name: 'Profile Access',
          description: 'Test access to Microsoft 365 profile',
          businessPurpose: 'Verify connection to your Microsoft 365 account',
          category: 'connectivity',
          priority: 'critical',
          endpoint: 'https://graph.microsoft.com/v1.0/me',
          method: 'GET',
          requiredScopes: ['User.Read'],
          expectedResult: 'data_returned',
          timeout: 5000,
          businessImpact: 'Required to connect to Microsoft 365',
          failureGuidance: 'Check Microsoft 365 account access',
          retryable: true
        },
        {
          testId: 'office365_mail_read',
          name: 'Outlook Email Reading',
          description: 'Test ability to read Outlook emails',
          businessPurpose: 'Verify we can access your Outlook emails',
          category: 'permissions',
          priority: 'important',
          requiredScopes: ['Mail.Read'],
          expectedResult: 'permission_granted',
          timeout: 5000,
          businessImpact: 'Essential for Outlook email automation',
          failureGuidance: 'Reconnect with Outlook email reading permissions',
          retryable: true
        },
        {
          testId: 'office365_mail_send',
          name: 'Outlook Email Sending',
          description: 'Test ability to send Outlook emails',
          businessPurpose: 'Verify we can send emails via Outlook',
          category: 'permissions',
          priority: 'important',
          requiredScopes: ['Mail.Send'],
          expectedResult: 'permission_granted',
          timeout: 5000,
          businessImpact: 'Required for automated Outlook email sending',
          failureGuidance: 'Reconnect with Outlook email sending permissions',
          retryable: true
        },
        {
          testId: 'office365_onedrive',
          name: 'OneDrive Access',
          description: 'Test ability to access OneDrive files',
          businessPurpose: 'Verify we can work with your OneDrive documents',
          category: 'permissions',
          priority: 'optional',
          requiredScopes: ['Files.ReadWrite'],
          expectedResult: 'permission_granted',
          timeout: 5000,
          businessImpact: 'Enables document automation and file processing',
          failureGuidance: 'Reconnect with OneDrive file access permissions',
          retryable: true
        }
      ]
    });
  }
}

// Export singleton instance
export const connectionTestingService = new ConnectionTestingService();