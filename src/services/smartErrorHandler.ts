/**
 * Smart Error Handler Service
 * Contextual error analysis and intelligent suggestions for setup issues
 */

import {
  SmartErrorAnalysis,
  ErrorSuggestion,
  ErrorFixStep,
  AutoRecoveryOption,
  ContextualHelp,
  RelatedIssue,
  ExpertConsultationInfo,
  CommunityResource,
  DocumentationLink,
  SmartCredentialResponse,
  ServiceConnectionCard,
  GuidedSetupSession
} from '../types/smartCredentials';

interface ErrorPattern {
  pattern: RegExp;
  errorType: SmartErrorAnalysis['errorType'];
  severity: SmartErrorAnalysis['severity'];
  commonCauses: string[];
  quickFixes: string[];
}

interface ServiceErrorConfig {
  serviceId: string;
  commonErrors: ErrorPattern[];
  recoveryStrategies: AutoRecoveryOption[];
  escalationThresholds: {
    maxRetries: number;
    timeoutMinutes: number;
    criticalErrors: string[];
  };
}

export class SmartErrorHandlerService {
  private errorPatterns: Map<string, ErrorPattern[]> = new Map();
  private serviceConfigs: Map<string, ServiceErrorConfig> = new Map();
  private errorHistory: Map<string, SmartErrorAnalysis[]> = new Map(); // serviceId -> errors
  private knowledgeBase: Map<string, RelatedIssue[]> = new Map();

  constructor() {
    this.initializeErrorPatterns();
    this.initializeServiceConfigs();
    this.initializeKnowledgeBase();
  }

  /**
   * Analyze an error and provide smart suggestions
   */
  public async analyzeError(
    serviceId: string,
    workflowId: string,
    userId: string,
    error: Error | string,
    context?: {
      setupSession?: GuidedSetupSession;
      service?: ServiceConnectionCard;
      attemptCount?: number;
      userInputs?: Record<string, any>;
    }
  ): Promise<SmartCredentialResponse<SmartErrorAnalysis>> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;

      // Detect error type and pattern
      const errorType = this.detectErrorType(serviceId, errorMessage);
      const severity = this.determineSeverity(errorType, context?.attemptCount || 1);

      // Generate contextual suggestions
      const suggestedFixes = await this.generateSuggestions(serviceId, errorMessage, context);
      
      // Find auto-recovery options
      const autoRecoveryOptions = this.getAutoRecoveryOptions(serviceId, errorType, context);

      // Determine if escalation is needed
      const escalationRequired = this.shouldEscalate(serviceId, errorType, severity, context?.attemptCount || 1);

      // Generate contextual help
      const contextualHelp = await this.generateContextualHelp(serviceId, errorMessage, context);

      const analysis: SmartErrorAnalysis = {
        errorId: this.generateErrorId(),
        errorType,
        severity,
        userFriendlyMessage: this.generateUserFriendlyMessage(errorType, errorMessage, context?.service),
        technicalDetails: errorStack || errorMessage,
        businessImpact: this.assessBusinessImpact(errorType, severity, context?.service),
        suggestedFixes,
        autoRecoveryOptions,
        escalationRequired,
        contextualHelp,
        timestamp: new Date(),
        serviceId,
        workflowId,
        userId
      };

      // Store in error history
      this.recordError(serviceId, analysis);

      return {
        success: true,
        data: analysis,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          processingTime: 0,
          version: '1.0'
        }
      };

    } catch (err) {
      return {
        success: false,
        error: {
          code: 'ERROR_ANALYSIS_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          userMessage: 'Unable to analyze the error. Please try again or contact support.'
        }
      };
    }
  }

  /**
   * Attempt automatic error recovery
   */
  public async attemptAutoRecovery(
    analysisId: string,
    recoveryOptionId: string,
    context?: Record<string, any>
  ): Promise<SmartCredentialResponse<{ success: boolean; details: string }>> {
    try {
      // Find the analysis and recovery option
      const analysis = this.findAnalysisById(analysisId);
      if (!analysis) {
        throw new Error('Error analysis not found');
      }

      const recoveryOption = analysis.autoRecoveryOptions.find(o => o.optionId === recoveryOptionId);
      if (!recoveryOption) {
        throw new Error('Recovery option not found');
      }

      // Execute recovery based on type
      const result = await this.executeRecovery(recoveryOption, analysis, context);

      return {
        success: true,
        data: result
      };

    } catch (err) {
      return {
        success: false,
        error: {
          code: 'AUTO_RECOVERY_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          userMessage: 'Automatic recovery failed. Manual intervention may be required.'
        }
      };
    }
  }

  /**
   * Get error history for a service
   */
  public getErrorHistory(serviceId: string): SmartErrorAnalysis[] {
    return this.errorHistory.get(serviceId) || [];
  }

  /**
   * Get error trends and patterns
   */
  public getErrorTrends(serviceId: string): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByDay: Record<string, number>;
    topIssues: string[];
    recoveryRate: number;
  } {
    const errors = this.getErrorHistory(serviceId);
    
    const errorsByType: Record<string, number> = {};
    const errorsByDay: Record<string, number> = {};
    const topIssues: string[] = [];

    errors.forEach(error => {
      // Count by type
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      
      // Count by day
      const day = error.timestamp.toISOString().split('T')[0];
      errorsByDay[day] = (errorsByDay[day] || 0) + 1;
    });

    // Calculate recovery rate (placeholder logic)
    const totalRecoveryAttempts = errors.filter(e => e.autoRecoveryOptions.length > 0).length;
    const successfulRecoveries = Math.floor(totalRecoveryAttempts * 0.7); // 70% success rate
    const recoveryRate = totalRecoveryAttempts > 0 ? successfulRecoveries / totalRecoveryAttempts : 0;

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsByDay,
      topIssues: Object.keys(errorsByType).sort((a, b) => errorsByType[b] - errorsByType[a]),
      recoveryRate
    };
  }

  /**
   * Private Methods
   */

  private initializeErrorPatterns(): void {
    // Gmail error patterns
    this.errorPatterns.set('gmail', [
      {
        pattern: /invalid.*(password|credentials|authentication)/i,
        errorType: 'authentication',
        severity: 'high',
        commonCauses: ['Incorrect app password', 'Two-factor authentication not enabled', 'Account locked'],
        quickFixes: ['Regenerate app password', 'Enable 2FA', 'Check account status']
      },
      {
        pattern: /quota.*exceeded|rate.*limit/i,
        errorType: 'rate_limit',
        severity: 'medium',
        commonCauses: ['Gmail API quota exceeded', 'Too many requests'],
        quickFixes: ['Wait and retry', 'Implement exponential backoff', 'Upgrade quota']
      },
      {
        pattern: /permission.*denied|insufficient.*scope/i,
        errorType: 'permission',
        severity: 'high',
        commonCauses: ['Missing OAuth scopes', 'Insufficient permissions'],
        quickFixes: ['Add required scopes', 'Re-authorize with correct permissions']
      }
    ]);

    // Slack error patterns
    this.errorPatterns.set('slack', [
      {
        pattern: /invalid.*token|token.*expired/i,
        errorType: 'authentication',
        severity: 'high',
        commonCauses: ['Invalid bot token', 'Expired token', 'Wrong token type'],
        quickFixes: ['Regenerate bot token', 'Check token format', 'Verify token type']
      },
      {
        pattern: /channel.*not.*found|not.*in.*channel/i,
        errorType: 'permission',
        severity: 'medium',
        commonCauses: ['Bot not added to channel', 'Channel deleted', 'Private channel access'],
        quickFixes: ['Add bot to channel', 'Verify channel exists', 'Check channel permissions']
      },
      {
        pattern: /workspace.*not.*found|team.*invalid/i,
        errorType: 'configuration',
        severity: 'critical',
        commonCauses: ['Wrong workspace URL', 'App not installed', 'Workspace deleted'],
        quickFixes: ['Verify workspace URL', 'Reinstall app', 'Check workspace status']
      }
    ]);

    // Custom API error patterns
    this.errorPatterns.set('custom_api', [
      {
        pattern: /connection.*refused|timeout|ECONNREFUSED/i,
        errorType: 'network',
        severity: 'high',
        commonCauses: ['Server down', 'Wrong URL', 'Firewall blocking'],
        quickFixes: ['Check server status', 'Verify URL', 'Check network connectivity']
      },
      {
        pattern: /unauthorized|401|403/i,
        errorType: 'authentication',
        severity: 'high',
        commonCauses: ['Invalid API key', 'Wrong authentication method', 'Expired credentials'],
        quickFixes: ['Verify API key', 'Check auth method', 'Regenerate credentials']
      },
      {
        pattern: /not.*found|404/i,
        errorType: 'configuration',
        severity: 'medium',
        commonCauses: ['Wrong endpoint URL', 'API version mismatch', 'Resource deleted'],
        quickFixes: ['Check endpoint URL', 'Verify API version', 'Confirm resource exists']
      }
    ]);
  }

  private initializeServiceConfigs(): void {
    this.serviceConfigs.set('gmail', {
      serviceId: 'gmail',
      commonErrors: [],
      recoveryStrategies: [
        {
          optionId: 'gmail_retry_with_backoff',
          type: 'retry',
          description: 'Retry connection with exponential backoff',
          businessImpact: 'Minimal interruption to email automation',
          automated: true,
          confidenceLevel: 0.8,
          estimatedSuccessRate: 0.7,
          executionConfig: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
          }
        },
        {
          optionId: 'gmail_refresh_token',
          type: 'alternative_method',
          description: 'Refresh OAuth token or regenerate app password',
          businessImpact: 'Brief authentication flow required',
          automated: false,
          confidenceLevel: 0.9,
          estimatedSuccessRate: 0.9,
          executionConfig: {
            requiresUserAction: true,
            steps: ['Navigate to Google Account', 'Generate new app password', 'Update credentials']
          }
        }
      ],
      escalationThresholds: {
        maxRetries: 3,
        timeoutMinutes: 10,
        criticalErrors: ['authentication', 'permission']
      }
    });

    this.serviceConfigs.set('slack', {
      serviceId: 'slack',
      commonErrors: [],
      recoveryStrategies: [
        {
          optionId: 'slack_retry_connection',
          type: 'retry',
          description: 'Retry Slack API connection',
          businessImpact: 'Brief delay in notifications',
          automated: true,
          confidenceLevel: 0.7,
          estimatedSuccessRate: 0.6,
          executionConfig: {
            maxRetries: 2,
            delay: 2000
          }
        },
        {
          optionId: 'slack_refresh_permissions',
          type: 'config_adjustment',
          description: 'Refresh bot permissions and channel access',
          businessImpact: 'Requires workspace admin approval',
          automated: false,
          confidenceLevel: 0.8,
          estimatedSuccessRate: 0.8,
          executionConfig: {
            requiresAdminAction: true,
            steps: ['Check bot permissions', 'Add bot to channels', 'Verify scopes']
          }
        }
      ],
      escalationThresholds: {
        maxRetries: 2,
        timeoutMinutes: 5,
        criticalErrors: ['workspace_not_found', 'app_not_installed']
      }
    });
  }

  private initializeKnowledgeBase(): void {
    this.knowledgeBase.set('gmail', [
      {
        issueId: 'gmail_app_password',
        title: 'Gmail App Password Setup',
        description: 'How to create and use app passwords for Gmail automation',
        resolution: 'Enable 2FA, generate app password in Google Account settings',
        similarity: 1.0,
        helpfulVotes: 45
      },
      {
        issueId: 'gmail_quota_limits',
        title: 'Gmail API Quota Management',
        description: 'Understanding and managing Gmail API quotas',
        resolution: 'Implement rate limiting and exponential backoff',
        similarity: 0.9,
        helpfulVotes: 32
      }
    ]);

    this.knowledgeBase.set('slack', [
      {
        issueId: 'slack_bot_setup',
        title: 'Slack Bot Token Configuration',
        description: 'Setting up bot tokens and permissions for Slack integration',
        resolution: 'Create Slack app, generate bot token, add to workspace',
        similarity: 1.0,
        helpfulVotes: 38
      }
    ]);
  }

  private detectErrorType(serviceId: string, errorMessage: string): SmartErrorAnalysis['errorType'] {
    const patterns = this.errorPatterns.get(serviceId) || [];
    
    for (const pattern of patterns) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern.errorType;
      }
    }

    // Fallback detection based on common keywords
    if (/auth|token|credential|password|login/i.test(errorMessage)) {
      return 'authentication';
    }
    if (/permission|access|forbidden|unauthorized/i.test(errorMessage)) {
      return 'permission';
    }
    if (/network|connection|timeout|dns|host/i.test(errorMessage)) {
      return 'network';
    }
    if (/config|setup|invalid.*format|missing.*field/i.test(errorMessage)) {
      return 'configuration';
    }
    if (/rate.*limit|quota|too.*many/i.test(errorMessage)) {
      return 'rate_limit';
    }
    if (/service.*unavailable|server.*error|maintenance/i.test(errorMessage)) {
      return 'service_down';
    }

    return 'unknown';
  }

  private determineSeverity(
    errorType: SmartErrorAnalysis['errorType'],
    attemptCount: number
  ): SmartErrorAnalysis['severity'] {
    // Critical errors that block functionality
    if (['authentication', 'permission'].includes(errorType)) {
      return attemptCount > 2 ? 'critical' : 'high';
    }

    // Service availability issues
    if (errorType === 'service_down') {
      return 'high';
    }

    // Configuration issues
    if (errorType === 'configuration') {
      return attemptCount > 1 ? 'high' : 'medium';
    }

    // Rate limiting and network issues
    if (['rate_limit', 'network'].includes(errorType)) {
      return attemptCount > 3 ? 'high' : 'medium';
    }

    return 'low';
  }

  private generateUserFriendlyMessage(
    errorType: SmartErrorAnalysis['errorType'],
    errorMessage: string,
    service?: ServiceConnectionCard
  ): string {
    const serviceName = service?.displayName || 'service';

    switch (errorType) {
      case 'authentication':
        return `We couldn't connect to your ${serviceName} account. This usually means your login credentials need to be updated or refreshed.`;
      
      case 'permission':
        return `Your ${serviceName} account doesn't have the necessary permissions for this automation. You may need to grant additional access or check your account settings.`;
      
      case 'network':
        return `We're having trouble reaching ${serviceName}. This could be a temporary network issue or the service might be temporarily unavailable.`;
      
      case 'configuration':
        return `There's an issue with how ${serviceName} is configured. Some settings may need to be adjusted for the integration to work properly.`;
      
      case 'rate_limit':
        return `${serviceName} is limiting how many requests we can make right now. This is temporary and should resolve shortly.`;
      
      case 'service_down':
        return `${serviceName} appears to be temporarily unavailable. This is usually resolved quickly by the service provider.`;
      
      default:
        return `We encountered an unexpected issue with ${serviceName}. Our team is looking into it.`;
    }
  }

  private assessBusinessImpact(
    errorType: SmartErrorAnalysis['errorType'],
    severity: SmartErrorAnalysis['severity'],
    service?: ServiceConnectionCard
  ): string {
    const serviceName = service?.displayName || 'this service';
    
    if (severity === 'critical') {
      return `Critical: Your business automation for ${serviceName} is completely blocked. This prevents important workflows from running and may impact customer experience.`;
    }
    
    if (severity === 'high') {
      return `High Impact: Your ${serviceName} automation is experiencing significant issues. Some business processes may be delayed or require manual intervention.`;
    }
    
    if (severity === 'medium') {
      return `Moderate Impact: Your ${serviceName} integration has some issues but core functionality may still work. Monitor for any business process delays.`;
    }
    
    return `Low Impact: Minor issues with ${serviceName} that shouldn't significantly affect your business operations.`;
  }

  private async generateSuggestions(
    serviceId: string,
    errorMessage: string,
    context?: any
  ): Promise<ErrorSuggestion[]> {
    const patterns = this.errorPatterns.get(serviceId) || [];
    const suggestions: ErrorSuggestion[] = [];

    // Find matching pattern and generate specific suggestions
    for (const pattern of patterns) {
      if (pattern.pattern.test(errorMessage)) {
        pattern.quickFixes.forEach((fix, index) => {
          suggestions.push({
            suggestionId: `${serviceId}_${pattern.errorType}_${index}`,
            title: fix,
            description: this.expandQuickFix(serviceId, fix),
            businessReason: `Resolving this will restore your ${serviceId} automation and prevent business disruption.`,
            difficulty: this.assessFixDifficulty(fix),
            estimatedTime: this.estimateFixTime(fix),
            successProbability: 0.8,
            steps: this.generateFixSteps(serviceId, fix),
            preventsFutureErrors: fix.includes('regenerate') || fix.includes('upgrade')
          });
        });
        break;
      }
    }

    // Add generic suggestions if no specific ones found
    if (suggestions.length === 0) {
      suggestions.push({
        suggestionId: `${serviceId}_generic_retry`,
        title: 'Retry Connection',
        description: 'Sometimes temporary issues resolve themselves. Try connecting again.',
        businessReason: 'Quick retry may resolve temporary connectivity issues.',
        difficulty: 'easy',
        estimatedTime: '1 minute',
        successProbability: 0.5,
        steps: [
          {
            stepId: 'retry_1',
            instruction: 'Click the "Test Connection" button again',
            type: 'user_action',
            automated: false
          }
        ],
        preventsFutureErrors: false
      });
    }

    return suggestions;
  }

  private getAutoRecoveryOptions(
    serviceId: string,
    errorType: SmartErrorAnalysis['errorType'],
    context?: any
  ): AutoRecoveryOption[] {
    const config = this.serviceConfigs.get(serviceId);
    if (!config) return [];

    return config.recoveryStrategies.filter(strategy => {
      // Filter strategies based on error type and context
      if (errorType === 'rate_limit' && strategy.type === 'retry') {
        return true;
      }
      if (errorType === 'network' && strategy.type === 'retry') {
        return true;
      }
      if (errorType === 'authentication' && strategy.type === 'alternative_method') {
        return true;
      }
      return false;
    });
  }

  private shouldEscalate(
    serviceId: string,
    errorType: SmartErrorAnalysis['errorType'],
    severity: SmartErrorAnalysis['severity'],
    attemptCount: number
  ): boolean {
    const config = this.serviceConfigs.get(serviceId);
    if (!config) return attemptCount > 3;

    // Check escalation thresholds
    if (attemptCount >= config.escalationThresholds.maxRetries) {
      return true;
    }

    if (config.escalationThresholds.criticalErrors.includes(errorType)) {
      return true;
    }

    if (severity === 'critical') {
      return true;
    }

    return false;
  }

  private async generateContextualHelp(
    serviceId: string,
    errorMessage: string,
    context?: any
  ): Promise<ContextualHelp> {
    return {
      quickTips: [
        'Check your internet connection',
        'Verify your account credentials are correct',
        'Try refreshing the page and attempting again'
      ],
      relatedIssues: this.knowledgeBase.get(serviceId) || [],
      expertConsultation: {
        available: true,
        estimatedWaitTime: '5-10 minutes',
        cost: 'Free for setup issues',
        expertise: ['Authentication', 'API Integration', 'Service Configuration'],
        bookingUrl: '/support/consultation'
      },
      communityResources: [
        {
          type: 'forum',
          title: 'n8n Community Forum',
          url: 'https://community.n8n.io',
          activeUsers: 15000,
          averageResponseTime: '2 hours'
        },
        {
          type: 'discord',
          title: 'n8n Discord',
          url: 'https://discord.gg/n8n',
          activeUsers: 8000,
          averageResponseTime: '30 minutes'
        }
      ],
      documentationLinks: [
        {
          title: `${serviceId} Integration Guide`,
          url: `https://docs.n8n.io/integrations/${serviceId}`,
          relevanceScore: 0.9,
          lastUpdated: new Date(),
          officialSource: true
        }
      ]
    };
  }

  private expandQuickFix(serviceId: string, fix: string): string {
    const expansions: Record<string, string> = {
      'Regenerate app password': 'Go to your Google Account settings, disable and re-enable app passwords, then create a new one specifically for this automation.',
      'Enable 2FA': 'Two-factor authentication is required for app passwords. Enable it in your account security settings.',
      'Add required scopes': 'The OAuth authorization needs additional permissions. Re-authorize with the correct scope settings.',
      'Check server status': 'Visit the service status page or try accessing the API directly to confirm it\'s operational.'
    };

    return expansions[fix] || fix;
  }

  private assessFixDifficulty(fix: string): 'easy' | 'moderate' | 'difficult' {
    if (fix.toLowerCase().includes('regenerate') || fix.toLowerCase().includes('retry')) {
      return 'easy';
    }
    if (fix.toLowerCase().includes('configure') || fix.toLowerCase().includes('setup')) {
      return 'moderate';
    }
    return 'difficult';
  }

  private estimateFixTime(fix: string): string {
    if (fix.toLowerCase().includes('retry') || fix.toLowerCase().includes('wait')) {
      return '1-2 minutes';
    }
    if (fix.toLowerCase().includes('regenerate') || fix.toLowerCase().includes('refresh')) {
      return '3-5 minutes';
    }
    if (fix.toLowerCase().includes('configure') || fix.toLowerCase().includes('setup')) {
      return '10-15 minutes';
    }
    return '5-10 minutes';
  }

  private generateFixSteps(serviceId: string, fix: string): ErrorFixStep[] {
    // Generate contextual fix steps based on service and fix type
    const baseSteps: ErrorFixStep[] = [
      {
        stepId: 'step_1',
        instruction: fix,
        type: 'user_action',
        automated: false
      }
    ];

    return baseSteps;
  }

  private async executeRecovery(
    option: AutoRecoveryOption,
    analysis: SmartErrorAnalysis,
    context?: Record<string, any>
  ): Promise<{ success: boolean; details: string }> {
    // Simulate recovery execution
    switch (option.type) {
      case 'retry':
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          success: Math.random() > 0.3,
          details: 'Attempted automatic retry with exponential backoff'
        };
      
      case 'config_adjustment':
        return {
          success: false,
          details: 'Configuration adjustment requires manual intervention'
        };
      
      default:
        return {
          success: false,
          details: 'Recovery type not implemented'
        };
    }
  }

  private recordError(serviceId: string, analysis: SmartErrorAnalysis): void {
    const history = this.errorHistory.get(serviceId) || [];
    history.push(analysis);
    
    // Keep only last 50 errors per service
    if (history.length > 50) {
      history.shift();
    }
    
    this.errorHistory.set(serviceId, history);
  }

  private findAnalysisById(analysisId: string): SmartErrorAnalysis | null {
    for (const [, errors] of this.errorHistory) {
      const found = errors.find(error => error.errorId === analysisId);
      if (found) return found;
    }
    return null;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const smartErrorHandler = new SmartErrorHandlerService();