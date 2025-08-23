/**
 * Setup Assistant Service
 * Phase 3: Intelligent, screenshot-guided setup system for services
 */

import {
  ServiceConnectionCard,
  ServiceCategory,
  SetupStep,
  SetupInstruction,
  ScreenshotGuide,
  ScreenshotAnnotation,
  InteractiveElement,
  CodeSnippet,
  TroubleshootingTip,
  HelpResource,
  GuidedSetupSession,
  StepProgress,
  ValidationResult,
  SessionBusinessImpact,
  SmartCredentialResponse,
  SmartCredentialError
} from '../types/smartCredentials';

interface ServiceSetupConfig {
  serviceId: string;
  serviceName: string;
  complexity: 'simple' | 'moderate' | 'complex';
  setupSteps: SetupStep[];
  screenshots: ScreenshotGuide[];
  businessBenefits: string[];
  commonIssues: string[];
}

export class SetupAssistantService {
  private setupConfigs: Map<string, ServiceSetupConfig> = new Map();
  private activeSessions: Map<string, GuidedSetupSession> = new Map();
  private screenshotAssets: Map<string, string> = new Map(); // serviceId -> asset URLs

  constructor() {
    this.initializeServiceConfigs();
    this.loadScreenshotAssets();
  }

  /**
   * Start a guided setup session for a service
   */
  public async startGuidedSetup(
    workflowId: string,
    serviceId: string,
    userId: string,
    service: ServiceConnectionCard
  ): Promise<SmartCredentialResponse<GuidedSetupSession>> {
    try {
      const config = this.setupConfigs.get(serviceId);
      if (!config) {
        throw new Error(`No setup configuration found for service: ${serviceId}`);
      }

      const sessionId = this.generateSessionId();
      const businessImpact = this.calculateBusinessImpact(service);

      const session: GuidedSetupSession = {
        sessionId,
        workflowId,
        serviceId,
        userId,
        startedAt: new Date(),
        currentStepId: config.setupSteps[0]?.stepId || '',
        completedSteps: [],
        stepProgress: {},
        sessionData: {},
        escalated: false,
        estimatedCompletion: this.calculateEstimatedCompletion(config.setupSteps),
        businessImpact
      };

      // Initialize step progress
      config.setupSteps.forEach(step => {
        session.stepProgress[step.stepId] = {
          stepId: step.stepId,
          status: 'not_started',
          attempts: 0,
          userData: {},
          timeSpent: 0
        };
      });

      this.activeSessions.set(sessionId, session);

      return {
        success: true,
        data: session,
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
          code: 'SETUP_SESSION_START_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Unable to start the guided setup. Please try again.',
          resolution: 'Check your internet connection and refresh the page.'
        }
      };
    }
  }

  /**
   * Get step-by-step instructions for a specific service and step
   */
  public async getStepInstructions(
    sessionId: string,
    stepId: string
  ): Promise<SmartCredentialResponse<SetupStep>> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Setup session not found');
      }

      const config = this.setupConfigs.get(session.serviceId);
      if (!config) {
        throw new Error('Service configuration not found');
      }

      const step = config.setupSteps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error('Setup step not found');
      }

      // Enhance step with session-specific data
      const enhancedStep = await this.enhanceStepWithSessionData(step, session);

      return {
        success: true,
        data: enhancedStep
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STEP_INSTRUCTIONS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Unable to load step instructions. Please try again.'
        }
      };
    }
  }

  /**
   * Progress to the next step in the setup process
   */
  public async progressToNextStep(
    sessionId: string,
    currentStepId: string,
    stepData?: Record<string, any>
  ): Promise<SmartCredentialResponse<{ nextStep?: SetupStep; completed: boolean }>> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Setup session not found');
      }

      const config = this.setupConfigs.get(session.serviceId);
      if (!config) {
        throw new Error('Service configuration not found');
      }

      // Mark current step as completed
      const currentProgress = session.stepProgress[currentStepId];
      if (currentProgress) {
        currentProgress.status = 'completed';
        currentProgress.completedAt = new Date();
        if (stepData) {
          currentProgress.userData = { ...currentProgress.userData, ...stepData };
        }
      }

      // Add to completed steps
      if (!session.completedSteps.includes(currentStepId)) {
        session.completedSteps.push(currentStepId);
      }

      // Find next step
      const currentStepIndex = config.setupSteps.findIndex(s => s.stepId === currentStepId);
      const nextStepIndex = currentStepIndex + 1;

      if (nextStepIndex >= config.setupSteps.length) {
        // Setup completed
        session.actualCompletion = new Date();
        
        return {
          success: true,
          data: { completed: true }
        };
      }

      const nextStep = config.setupSteps[nextStepIndex];
      session.currentStepId = nextStep.stepId;

      // Initialize next step progress
      session.stepProgress[nextStep.stepId].status = 'in_progress';
      session.stepProgress[nextStep.stepId].startedAt = new Date();

      const enhancedNextStep = await this.enhanceStepWithSessionData(nextStep, session);

      return {
        success: true,
        data: {
          nextStep: enhancedNextStep,
          completed: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STEP_PROGRESSION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Unable to progress to the next step. Please try again.'
        }
      };
    }
  }

  /**
   * Validate a setup step
   */
  public async validateStep(
    sessionId: string,
    stepId: string,
    validationData: Record<string, any>
  ): Promise<SmartCredentialResponse<ValidationResult[]>> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Setup session not found');
      }

      const config = this.setupConfigs.get(session.serviceId);
      if (!config) {
        throw new Error('Service configuration not found');
      }

      const step = config.setupSteps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error('Setup step not found');
      }

      const validationResults: ValidationResult[] = [];

      // Perform step-specific validation
      if (step.validation) {
        const result = await this.performStepValidation(step, validationData, session);
        validationResults.push(result);
      }

      // Update step progress
      const progress = session.stepProgress[stepId];
      if (progress) {
        progress.validationResults = validationResults;
        progress.attempts += 1;
      }

      return {
        success: true,
        data: validationResults
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STEP_VALIDATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Unable to validate the step. Please check your inputs and try again.'
        }
      };
    }
  }

  /**
   * Get troubleshooting help for a specific issue
   */
  public async getTroubleshootingHelp(
    serviceId: string,
    stepId: string,
    errorMessage?: string
  ): Promise<SmartCredentialResponse<TroubleshootingTip[]>> {
    try {
      const config = this.setupConfigs.get(serviceId);
      if (!config) {
        throw new Error('Service configuration not found');
      }

      const step = config.setupSteps.find(s => s.stepId === stepId);
      if (!step) {
        throw new Error('Setup step not found');
      }

      let troubleshootingTips = step.instruction.troubleshooting || [];

      // Filter tips based on error message if provided
      if (errorMessage) {
        troubleshootingTips = troubleshootingTips.filter(tip =>
          tip.problem.toLowerCase().includes(errorMessage.toLowerCase()) ||
          errorMessage.toLowerCase().includes(tip.problem.toLowerCase())
        );
      }

      // Add general tips if no specific ones found
      if (troubleshootingTips.length === 0) {
        troubleshootingTips = this.getGeneralTroubleshootingTips(serviceId);
      }

      return {
        success: true,
        data: troubleshootingTips
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TROUBLESHOOTING_HELP_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'Unable to load troubleshooting help. Please try again.'
        }
      };
    }
  }

  /**
   * Get session status and progress
   */
  public getSessionStatus(sessionId: string): GuidedSetupSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Pause a setup session
   */
  public pauseSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      // Update current step time spent
      const currentProgress = session.stepProgress[session.currentStepId];
      if (currentProgress && currentProgress.startedAt) {
        currentProgress.timeSpent += Date.now() - currentProgress.startedAt.getTime();
      }
      return true;
    }
    return false;
  }

  /**
   * Resume a setup session
   */
  public resumeSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      // Reset current step start time
      const currentProgress = session.stepProgress[session.currentStepId];
      if (currentProgress) {
        currentProgress.startedAt = new Date();
      }
      return true;
    }
    return false;
  }

  /**
   * Abandon a setup session
   */
  public abandonSession(sessionId: string): boolean {
    return this.activeSessions.delete(sessionId);
  }

  /**
   * Private Methods
   */

  private initializeServiceConfigs(): void {
    // Gmail Configuration
    this.setupConfigs.set('gmail', {
      serviceId: 'gmail',
      serviceName: 'Gmail',
      complexity: 'simple',
      setupSteps: this.createGmailSetupSteps(),
      screenshots: this.createGmailScreenshots(),
      businessBenefits: [
        'Automate email responses and notifications',
        'Integrate email with your business workflows',
        'Track important communications automatically'
      ],
      commonIssues: [
        'App password authentication',
        'Two-factor authentication setup',
        'Gmail API quota limits'
      ]
    });

    // Slack Configuration
    this.setupConfigs.set('slack', {
      serviceId: 'slack',
      serviceName: 'Slack',
      complexity: 'simple',
      setupSteps: this.createSlackSetupSteps(),
      screenshots: this.createSlackScreenshots(),
      businessBenefits: [
        'Send automated notifications to team channels',
        'Integrate business alerts with team communication',
        'Streamline team collaboration workflows'
      ],
      commonIssues: [
        'Workspace permission issues',
        'Bot token vs user token confusion',
        'Channel access permissions'
      ]
    });

    // Custom API Configuration
    this.setupConfigs.set('custom_api', {
      serviceId: 'custom_api',
      serviceName: 'Custom API',
      complexity: 'complex',
      setupSteps: this.createCustomApiSetupSteps(),
      screenshots: this.createCustomApiScreenshots(),
      businessBenefits: [
        'Integrate with your existing business systems',
        'Automate data transfer between platforms',
        'Create custom business workflow integrations'
      ],
      commonIssues: [
        'Authentication header configuration',
        'API endpoint URL formatting',
        'Rate limiting and retry logic'
      ]
    });
  }

  private createGmailSetupSteps(): SetupStep[] {
    return [
      {
        stepId: 'gmail_prerequisites',
        title: 'Check Gmail Prerequisites',
        description: 'Ensure your Gmail account is ready for automation',
        businessReason: 'Proper setup ensures reliable email automation for your business',
        estimatedTime: '2 minutes',
        type: 'verification',
        required: true,
        order: 1,
        dependencies: [],
        instruction: {
          type: 'screenshot',
          content: 'Before we begin, let\'s make sure your Gmail account is properly configured for business automation.',
          screenshots: [
            {
              id: 'gmail_settings',
              title: 'Gmail Settings Access',
              description: 'Navigate to Gmail settings to enable necessary features',
              imageUrl: '/assets/screenshots/gmail/settings-access.png',
              annotations: [
                {
                  id: 'settings_gear',
                  type: 'highlight',
                  x: 85,
                  y: 15,
                  width: 5,
                  height: 5,
                  text: 'Click the gear icon',
                  color: '#ff4444',
                  style: 'solid'
                }
              ],
              alternativeText: 'Gmail settings gear icon in top right corner',
              order: 1
            }
          ],
          businessContext: 'These settings ensure your Gmail account can send automated emails on behalf of your business.',
          commonMistakes: [
            'Forgetting to enable 2-factor authentication',
            'Not checking spam folder settings',
            'Missing app password setup'
          ],
          troubleshooting: [
            {
              problem: 'Cannot find settings menu',
              solution: 'Look for the gear icon in the top-right corner of Gmail',
              businessImpact: 'Without access to settings, email automation cannot be configured',
              prevention: 'Bookmark the Gmail settings page for easy access',
              escalationTrigger: false
            }
          ]
        },
        helpResources: [
          {
            type: 'documentation',
            title: 'Gmail API Setup Guide',
            description: 'Official Google documentation for Gmail API',
            url: 'https://developers.google.com/gmail/api/quickstart',
            available: true,
            cost: 'free'
          }
        ]
      },
      {
        stepId: 'gmail_app_password',
        title: 'Create Gmail App Password',
        description: 'Generate a secure app password for automation',
        businessReason: 'App passwords provide secure, automated access to your Gmail account',
        estimatedTime: '3 minutes',
        type: 'form',
        required: true,
        order: 2,
        dependencies: ['gmail_prerequisites'],
        instruction: {
          type: 'screenshot',
          content: 'Now we\'ll create a dedicated app password for secure email automation.',
          screenshots: [
            {
              id: 'gmail_2fa_setup',
              title: 'Enable Two-Factor Authentication',
              description: 'Two-factor authentication is required for app passwords',
              imageUrl: '/assets/screenshots/gmail/2fa-setup.png',
              annotations: [
                {
                  id: 'security_tab',
                  type: 'click',
                  x: 20,
                  y: 30,
                  text: 'Click Security',
                  color: '#4CAF50',
                  style: 'solid'
                }
              ],
              alternativeText: 'Google Account Security tab',
              order: 1
            }
          ],
          interactiveElements: [
            {
              type: 'button',
              label: 'Test App Password',
              action: 'test_gmail_connection',
              businessReason: 'Verifies that your app password works correctly',
              successMessage: 'Gmail connection successful! Your email automation is ready.',
              errorMessage: 'Connection failed. Please check your app password and try again.'
            }
          ],
          businessContext: 'App passwords allow secure automation without compromising your main Gmail password.',
          commonMistakes: [
            'Using regular password instead of app password',
            'Not enabling 2-factor authentication first',
            'Copying app password with extra spaces'
          ],
          troubleshooting: [
            {
              problem: 'App password not working',
              solution: 'Ensure 2-factor authentication is enabled and regenerate the app password',
              businessImpact: 'Email automation will fail without proper authentication',
              prevention: 'Save app password securely and test immediately after creation',
              escalationTrigger: true
            }
          ]
        },
        helpResources: [
          {
            type: 'video',
            title: 'Gmail App Password Setup',
            description: 'Step-by-step video guide for creating app passwords',
            url: 'https://support.google.com/accounts/answer/185833',
            available: true,
            cost: 'free'
          }
        ]
      }
    ];
  }

  private createSlackSetupSteps(): SetupStep[] {
    return [
      {
        stepId: 'slack_workspace_check',
        title: 'Verify Slack Workspace Access',
        description: 'Confirm you have admin access to your Slack workspace',
        businessReason: 'Admin access is required to create apps and manage integrations',
        estimatedTime: '1 minute',
        type: 'verification',
        required: true,
        order: 1,
        dependencies: [],
        instruction: {
          type: 'screenshot',
          content: 'Let\'s verify you have the necessary permissions in your Slack workspace.',
          screenshots: [
            {
              id: 'slack_admin_check',
              title: 'Check Workspace Permissions',
              description: 'Verify your admin status in Slack workspace settings',
              imageUrl: '/assets/screenshots/slack/admin-check.png',
              annotations: [
                {
                  id: 'workspace_settings',
                  type: 'highlight',
                  x: 10,
                  y: 85,
                  width: 20,
                  height: 8,
                  text: 'Workspace Settings',
                  color: '#4A154B',
                  style: 'solid'
                }
              ],
              alternativeText: 'Slack workspace settings in sidebar',
              order: 1
            }
          ],
          businessContext: 'Proper permissions ensure you can set up reliable business notifications in Slack.',
          commonMistakes: [
            'Not having admin privileges',
            'Working in wrong workspace',
            'Confusing user settings with workspace settings'
          ],
          troubleshooting: [
            {
              problem: 'No admin access to workspace',
              solution: 'Contact your Slack workspace administrator to grant permissions',
              businessImpact: 'Cannot set up automated notifications without proper permissions',
              prevention: 'Verify permissions before starting automation setup',
              escalationTrigger: true
            }
          ]
        },
        helpResources: [
          {
            type: 'support_chat',
            title: 'Slack Permission Help',
            description: 'Get help with Slack workspace permissions',
            available: true,
            estimated_response_time: '5 minutes',
            cost: 'free'
          }
        ]
      }
    ];
  }

  private createCustomApiSetupSteps(): SetupStep[] {
    return [
      {
        stepId: 'api_documentation_review',
        title: 'Review API Documentation',
        description: 'Gather necessary API information and credentials',
        businessReason: 'Understanding the API structure ensures successful integration with your business systems',
        estimatedTime: '10 minutes',
        type: 'navigation',
        required: true,
        order: 1,
        dependencies: [],
        instruction: {
          type: 'text',
          content: 'Let\'s gather the essential information needed to connect to your API.',
          businessContext: 'Proper API setup ensures reliable data flow between your business systems.',
          commonMistakes: [
            'Using test API endpoints in production',
            'Mixing up authentication methods',
            'Not checking API rate limits'
          ],
          troubleshooting: [
            {
              problem: 'API documentation unclear',
              solution: 'Contact the API provider for clarification or look for community examples',
              businessImpact: 'Unclear documentation can lead to integration delays',
              prevention: 'Document your understanding and test with simple requests first',
              escalationTrigger: true
            }
          ]
        },
        helpResources: [
          {
            type: 'consultant',
            title: 'API Integration Specialist',
            description: 'Expert help with complex API integrations',
            available: true,
            estimated_response_time: '30 minutes',
            cost: 'premium'
          }
        ]
      }
    ];
  }

  private createGmailScreenshots(): ScreenshotGuide[] {
    return [
      {
        id: 'gmail_settings',
        title: 'Gmail Settings Access',
        description: 'Navigate to Gmail settings',
        imageUrl: '/assets/screenshots/gmail/settings-access.png',
        annotations: [],
        alternativeText: 'Gmail settings gear icon',
        order: 1
      }
    ];
  }

  private createSlackScreenshots(): ScreenshotGuide[] {
    return [
      {
        id: 'slack_admin_check',
        title: 'Slack Admin Check',
        description: 'Check Slack workspace permissions',
        imageUrl: '/assets/screenshots/slack/admin-check.png',
        annotations: [],
        alternativeText: 'Slack workspace settings',
        order: 1
      }
    ];
  }

  private createCustomApiScreenshots(): ScreenshotGuide[] {
    return [];
  }

  private async enhanceStepWithSessionData(
    step: SetupStep,
    session: GuidedSetupSession
  ): Promise<SetupStep> {
    // Clone the step to avoid modifying the original
    const enhancedStep = JSON.parse(JSON.stringify(step)) as SetupStep;

    // Add session-specific customizations
    if (session.sessionData.userPreferences) {
      // Customize based on user preferences
    }

    // Add progress context to business reason
    const completedSteps = session.completedSteps.length;
    const totalSteps = Object.keys(session.stepProgress).length;
    enhancedStep.businessReason += ` (Step ${completedSteps + 1} of ${totalSteps})`;

    return enhancedStep;
  }

  private async performStepValidation(
    step: SetupStep,
    validationData: Record<string, any>,
    session: GuidedSetupSession
  ): Promise<ValidationResult> {
    // Simulate validation logic
    const passed = Math.random() > 0.2; // 80% success rate for demo

    return {
      validationType: step.validation?.type || 'user_confirmation',
      passed,
      details: passed ? 'Validation successful' : 'Validation failed - please check your inputs',
      timestamp: new Date(),
      businessMessage: passed 
        ? 'Great! This step is configured correctly for your business needs.'
        : 'This step needs attention before we can continue with your setup.',
      technicalDetails: validationData
    };
  }

  private calculateBusinessImpact(service: ServiceConnectionCard): SessionBusinessImpact {
    const baseTimeSaving = service.estimatedSetupTime;
    const setupMinutes = parseInt(baseTimeSaving.match(/\d+/)?.[0] || '5');
    
    return {
      expectedTimeSaving: `${setupMinutes * 10} hours per month`,
      expectedCostSaving: `$${setupMinutes * 50} per month`,
      businessGoalsAchieved: [
        'Automated workflow execution',
        'Reduced manual data entry',
        'Improved process reliability'
      ],
      automationValue: service.businessValue,
      riskMitigation: [
        'Reduced human error',
        'Consistent process execution',
        'Better audit trail'
      ]
    };
  }

  private calculateEstimatedCompletion(steps: SetupStep[]): Date {
    const totalMinutes = steps.reduce((sum, step) => {
      const minutes = parseInt(step.estimatedTime.match(/\d+/)?.[0] || '5');
      return sum + minutes;
    }, 0);

    const completion = new Date();
    completion.setMinutes(completion.getMinutes() + totalMinutes);
    return completion;
  }

  private getGeneralTroubleshootingTips(serviceId: string): TroubleshootingTip[] {
    return [
      {
        problem: 'Connection timeout',
        solution: 'Check your internet connection and try again',
        businessImpact: 'Temporary delay in setup process',
        prevention: 'Ensure stable internet connection before starting',
        escalationTrigger: false
      },
      {
        problem: 'Authentication failed',
        solution: 'Verify your credentials and try again',
        businessImpact: 'Setup cannot proceed without proper authentication',
        prevention: 'Double-check credentials before entering them',
        escalationTrigger: false
      }
    ];
  }

  private loadScreenshotAssets(): void {
    // Initialize screenshot asset URLs
    this.screenshotAssets.set('gmail', '/assets/screenshots/gmail/');
    this.screenshotAssets.set('slack', '/assets/screenshots/slack/');
    this.screenshotAssets.set('custom_api', '/assets/screenshots/api/');
  }

  private generateSessionId(): string {
    return `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const setupAssistant = new SetupAssistantService();