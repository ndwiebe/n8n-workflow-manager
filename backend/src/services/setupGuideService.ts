/**
 * Setup Guide Service
 * Backend service for managing service-specific setup instructions and assets
 */

import path from 'path';
import fs from 'fs/promises';
import {
  ServiceSetupGuide,
  SetupStep,
  Prerequisite,
  CommonIssue,
  BusinessBenefit,
  TestingProcedure,
  ScreenshotGuide,
  ScreenshotAnnotation
} from '../types/index';

interface SetupAssetManager {
  getScreenshotPath(serviceId: string, screenshotId: string): string;
  saveScreenshot(serviceId: string, screenshotId: string, imageData: Buffer): Promise<string>;
  getInstructionTemplate(serviceId: string, stepType: string): Promise<string>;
}

interface SetupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class SetupGuideService {
  private setupGuides: Map<string, ServiceSetupGuide> = new Map();
  private assetManager: SetupAssetManager;
  private guidesDirectory: string;
  private assetsDirectory: string;

  constructor() {
    this.guidesDirectory = path.join(__dirname, '../../assets/setup-guides');
    this.assetsDirectory = path.join(__dirname, '../../assets/screenshots');
    this.assetManager = new AssetManager(this.assetsDirectory);
    this.initializeSetupGuides();
  }

  /**
   * Get setup guide for a specific service
   */
  public async getSetupGuide(serviceId: string): Promise<ServiceSetupGuide | null> {
    const guide = this.setupGuides.get(serviceId);
    if (!guide) {
      // Try to load from file system
      try {
        const loadedGuide = await this.loadSetupGuideFromFile(serviceId);
        if (loadedGuide) {
          this.setupGuides.set(serviceId, loadedGuide);
          return loadedGuide;
        }
      } catch (error) {
        console.error(`Failed to load setup guide for ${serviceId}:`, error);
      }
    }
    return guide || null;
  }

  /**
   * Create or update a setup guide
   */
  public async saveSetupGuide(guide: ServiceSetupGuide): Promise<boolean> {
    try {
      // Validate the guide
      const validation = this.validateSetupGuide(guide);
      if (!validation.isValid) {
        throw new Error(`Setup guide validation failed: ${validation.errors.join(', ')}`);
      }

      // Save to memory
      this.setupGuides.set(guide.serviceId, guide);

      // Save to file system
      await this.saveSetupGuideToFile(guide);

      return true;
    } catch (error) {
      console.error(`Failed to save setup guide for ${guide.serviceId}:`, error);
      return false;
    }
  }

  /**
   * Generate setup guide from service template
   */
  public async generateSetupGuide(
    serviceId: string,
    serviceName: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    customization?: {
      industry?: string;
      useCase?: string;
      businessGoals?: string[];
    }
  ): Promise<ServiceSetupGuide> {
    const guide: ServiceSetupGuide = {
      serviceId,
      serviceName,
      version: '1.0.0',
      lastUpdated: new Date(),
      difficulty,
      prerequisites: await this.generatePrerequisites(serviceId, customization),
      setupSteps: await this.generateSetupSteps(serviceId, customization),
      commonIssues: await this.generateCommonIssues(serviceId),
      businessBenefits: await this.generateBusinessBenefits(serviceId, customization),
      integrationPoints: await this.generateIntegrationPoints(serviceId),
      testingProcedure: await this.generateTestingProcedure(serviceId),
      maintenanceInfo: await this.generateMaintenanceInfo(serviceId)
    };

    // Save the generated guide
    await this.saveSetupGuide(guide);

    return guide;
  }

  /**
   * Validate setup completion for a service
   */
  public async validateSetupCompletion(
    serviceId: string,
    setupData: Record<string, any>
  ): Promise<SetupValidationResult> {
    const guide = await this.getSetupGuide(serviceId);
    if (!guide) {
      return {
        isValid: false,
        errors: ['Setup guide not found'],
        warnings: [],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate prerequisites
    for (const prerequisite of guide.prerequisites) {
      if (prerequisite.checkable && prerequisite.type === 'account') {
        if (!setupData.accountVerified) {
          errors.push(`Account verification required: ${prerequisite.title}`);
        }
      }
    }

    // Validate required setup steps
    const requiredSteps = guide.setupSteps.filter(step => step.required);
    for (const step of requiredSteps) {
      const stepCompleted = setupData.completedSteps?.includes(step.stepId);
      if (!step.required && !stepCompleted) {
        warnings.push(`Optional step not completed: ${step.title}`);
      } else if (step.required && !stepCompleted) {
        errors.push(`Required step not completed: ${step.title}`);
      }
    }

    // Service-specific validation
    const serviceValidation = await this.performServiceSpecificValidation(serviceId, setupData);
    errors.push(...serviceValidation.errors);
    warnings.push(...serviceValidation.warnings);
    suggestions.push(...serviceValidation.suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get setup statistics and analytics
   */
  public async getSetupAnalytics(serviceId: string): Promise<{
    totalSetups: number;
    successRate: number;
    avgCompletionTime: number;
    commonFailurePoints: Array<{ stepId: string; failureRate: number }>;
    userFeedback: Array<{ rating: number; feedback: string; timestamp: Date }>;
  }> {
    // This would integrate with actual analytics data in production
    return {
      totalSetups: 150,
      successRate: 0.87,
      avgCompletionTime: 12, // minutes
      commonFailurePoints: [
        { stepId: 'authentication_setup', failureRate: 0.23 },
        { stepId: 'permission_config', failureRate: 0.15 }
      ],
      userFeedback: [
        {
          rating: 4,
          feedback: 'Clear instructions, but authentication was confusing',
          timestamp: new Date()
        },
        {
          rating: 5,
          feedback: 'Excellent step-by-step guide with great screenshots',
          timestamp: new Date()
        }
      ]
    };
  }

  /**
   * Private Methods
   */

  private async initializeSetupGuides(): Promise<void> {
    // Initialize with pre-built guides for common services
    await this.createGmailSetupGuide();
    await this.createSlackSetupGuide();
    await this.createCustomApiSetupGuide();
  }

  private async createGmailSetupGuide(): Promise<void> {
    const guide: ServiceSetupGuide = {
      serviceId: 'gmail',
      serviceName: 'Gmail',
      version: '1.2.0',
      lastUpdated: new Date(),
      difficulty: 'beginner',
      prerequisites: [
        {
          type: 'account',
          title: 'Gmail Account',
          description: 'Active Gmail account with administrative access',
          checkable: true,
          businessReason: 'Required to send and receive emails through automation',
          alternativeOptions: ['Google Workspace account', 'G Suite legacy account']
        },
        {
          type: 'technical',
          title: 'Two-Factor Authentication',
          description: 'Enable 2FA on your Google account',
          checkable: true,
          businessReason: 'Required for app password generation and enhanced security',
          alternativeOptions: ['OAuth 2.0 flow (more complex)']
        }
      ],
      setupSteps: [
        {
          stepId: 'gmail_2fa_enable',
          title: 'Enable Two-Factor Authentication',
          description: 'Set up 2FA on your Google account to enable app passwords',
          businessReason: 'App passwords require 2FA and provide secure automated access',
          estimatedTime: '3-5 minutes',
          type: 'navigation',
          required: true,
          order: 1,
          dependencies: [],
          instruction: {
            type: 'screenshot',
            content: 'Navigate to your Google Account security settings and enable two-factor authentication.',
            screenshots: [
              {
                id: 'gmail_security_page',
                title: 'Google Account Security',
                description: 'Navigate to security settings in your Google account',
                imageUrl: '/assets/screenshots/gmail/security-page.png',
                annotations: [
                  {
                    id: 'security_tab',
                    type: 'highlight',
                    x: 15,
                    y: 25,
                    width: 20,
                    height: 8,
                    text: 'Click Security',
                    color: '#4285f4',
                    style: 'solid'
                  }
                ],
                alternativeText: 'Google Account security settings page',
                order: 1
              }
            ],
            businessContext: 'Two-factor authentication adds an extra layer of security to your account while enabling automation features.',
            commonMistakes: [
              'Skipping 2FA setup',
              'Using SMS instead of authenticator app',
              'Not saving backup codes'
            ],
            troubleshooting: [
              {
                problem: 'Cannot enable 2FA',
                solution: 'Ensure you have access to a mobile device or authenticator app',
                businessImpact: 'Cannot proceed with app password setup without 2FA',
                prevention: 'Set up authenticator app beforehand',
                escalationTrigger: false
              }
            ]
          },
          helpResources: [
            {
              type: 'documentation',
              title: 'Google 2FA Setup Guide',
              description: 'Official Google guide for enabling two-factor authentication',
              url: 'https://support.google.com/accounts/answer/185839',
              available: true,
              cost: 'free'
            }
          ]
        },
        {
          stepId: 'gmail_app_password',
          title: 'Generate App Password',
          description: 'Create a dedicated app password for email automation',
          businessReason: 'App passwords provide secure, dedicated access for automated systems',
          estimatedTime: '2-3 minutes',
          type: 'form',
          required: true,
          order: 2,
          dependencies: ['gmail_2fa_enable'],
          instruction: {
            type: 'screenshot',
            content: 'Generate a new app password specifically for your business automation.',
            screenshots: [
              {
                id: 'gmail_app_passwords',
                title: 'App Passwords Section',
                description: 'Location of app passwords in Google security settings',
                imageUrl: '/assets/screenshots/gmail/app-passwords.png',
                annotations: [
                  {
                    id: 'app_passwords_link',
                    type: 'click',
                    x: 25,
                    y: 60,
                    text: 'Click App passwords',
                    color: '#34a853',
                    style: 'solid'
                  }
                ],
                alternativeText: 'App passwords section in Google security settings',
                order: 1
              }
            ],
            businessContext: 'App passwords allow secure automation without exposing your main account password.',
            commonMistakes: [
              'Using regular password instead of app password',
              'Sharing app password across multiple applications',
              'Not storing app password securely'
            ],
            troubleshooting: [
              {
                problem: 'App passwords option not visible',
                solution: 'Ensure 2FA is enabled and you are in the correct Google account',
                businessImpact: 'Cannot proceed with automation setup',
                prevention: 'Verify 2FA is properly configured',
                escalationTrigger: true
              }
            ]
          },
          helpResources: [
            {
              type: 'video',
              title: 'App Password Creation Walkthrough',
              description: 'Video guide showing app password creation process',
              available: true,
              cost: 'free'
            }
          ]
        }
      ],
      commonIssues: [
        {
          issueId: 'gmail_auth_failed',
          title: 'Authentication Failed',
          description: 'Gmail rejects the provided credentials',
          frequency: 'common',
          businessImpact: 'Email automation completely blocked',
          resolution: {
            steps: [
              'Verify 2FA is enabled',
              'Regenerate app password',
              'Check for typos in credentials',
              'Ensure using app password, not regular password'
            ],
            estimatedTime: '5-10 minutes',
            difficulty: 'easy',
            requiresSupport: false,
            businessImplications: 'Temporary disruption in email automation'
          },
          prevention: [
            'Use password manager for app passwords',
            'Test credentials immediately after creation',
            'Document the setup process'
          ]
        }
      ],
      businessBenefits: [
        {
          category: 'time_saving',
          description: 'Automate email responses and notifications',
          quantifiedBenefit: '10-15 hours per month',
          realizationTimeframe: 'Immediate after setup',
          measurementMethod: 'Track automated vs manual email processing'
        },
        {
          category: 'error_prevention',
          description: 'Eliminate manual email mistakes and missed notifications',
          quantifiedBenefit: '95% reduction in email errors',
          realizationTimeframe: '1-2 weeks',
          measurementMethod: 'Monitor email delivery success rates'
        }
      ],
      integrationPoints: [
        {
          integrationType: 'trigger',
          description: 'Receive emails and trigger business workflows',
          technicalRequirements: ['IMAP access', 'Polling configuration'],
          businessValue: 'Respond to customer inquiries automatically',
          testingRequired: true
        },
        {
          integrationType: 'action',
          description: 'Send emails from business workflows',
          technicalRequirements: ['SMTP configuration', 'Template management'],
          businessValue: 'Automated customer communication',
          testingRequired: true
        }
      ],
      testingProcedure: {
        testSteps: [
          {
            stepId: 'test_connection',
            description: 'Test SMTP connection with app password',
            expectedResult: 'Successful authentication and connection',
            businessImportance: 'Verifies basic email sending capability',
            automatable: true,
            validationMethod: 'Send test email'
          },
          {
            stepId: 'test_send_email',
            description: 'Send a test email through the automation',
            expectedResult: 'Email delivered to specified recipient',
            businessImportance: 'Confirms end-to-end email delivery',
            automatable: true,
            validationMethod: 'Check recipient inbox'
          }
        ],
        successCriteria: [
          'SMTP connection established',
          'Test email delivered successfully',
          'No authentication errors in logs'
        ],
        failureScenarios: [
          {
            scenario: 'Authentication failure with app password',
            likelihood: 'medium',
            businessImpact: 'Complete email automation failure',
            detectionMethod: 'SMTP error logs',
            recoveryProcedure: ['Verify 2FA enabled', 'Regenerate app password', 'Update credentials']
          }
        ],
        automatedTests: [
          {
            testId: 'gmail_smtp_connection',
            testType: 'connection',
            description: 'Automated SMTP connection validation',
            automationLevel: 'full',
            frequency: 'periodic'
          }
        ],
        businessValidation: [
          {
            validationType: 'process_improvement',
            description: 'Measure email automation efficiency',
            measurementPeriod: '30 days',
            expectedOutcome: 'Reduced manual email processing time',
            validationMethod: 'Compare before/after metrics'
          }
        ]
      },
      maintenanceInfo: {
        maintenanceSchedule: [
          {
            taskType: 'credential_refresh',
            frequency: 'Every 6 months',
            estimatedTime: '5 minutes',
            businessImpact: 'minimal',
            automatable: false
          },
          {
            taskType: 'connection_test',
            frequency: 'Weekly',
            estimatedTime: '2 minutes',
            businessImpact: 'none',
            automatable: true
          }
        ],
        monitoringRequirements: [
          {
            metric: 'Email delivery success rate',
            threshold: 95,
            alerting: true,
            businessRelevance: 'Critical for customer communication',
            actionRequired: 'Investigate delivery failures'
          }
        ],
        updateProcedure: {
          updateTypes: [
            {
              type: 'credential_rotation',
              frequency: 'As needed',
              businessImpact: 'Brief interruption in email automation',
              automatable: false,
              criticalityLevel: 'high'
            }
          ],
          testingRequired: true,
          rollbackPossible: true,
          businessApprovalRequired: false,
          downtime: '5-10 minutes'
        },
        businessContinuity: {
          backupOptions: [
            {
              optionType: 'manual_process',
              description: 'Manual email sending during outages',
              activationTime: 'Immediate',
              businessLimitations: ['No automation', 'Manual monitoring required'],
              cost: 'none'
            }
          ],
          failoverProcedure: {
            automated: false,
            steps: ['Switch to manual email monitoring', 'Notify relevant staff', 'Track issues for resolution'],
            estimatedTime: '15 minutes',
            businessImpact: 'Temporary manual process required',
            recoverySteps: ['Test automation', 'Resume automated monitoring', 'Review missed items']
          },
          recoveryTime: '30 minutes',
          businessImpactAssessment: 'Moderate - manual processes can maintain basic functionality',
          communicationPlan: {
            stakeholders: [
              {
                role: 'IT Administrator',
                contactInfo: {
                  type: 'email',
                  contact: 'it@company.com',
                  name: 'IT Team',
                  role: 'Technical Support',
                  availability: {
                    timezone: 'UTC',
                    schedule: [],
                    holidays: [],
                    emergencyOverride: true
                  }
                },
                notificationLevel: 'critical',
                businessImpact: 'Technical resolution required'
              }
            ],
            communicationMethods: ['Email', 'Slack', 'Phone'],
            updateFrequency: 'Every 30 minutes during outage',
            escalationCriteria: ['Outage exceeds 2 hours', 'Customer complaints received']
          }
        }
      }
    };

    this.setupGuides.set('gmail', guide);
  }

  private async createSlackSetupGuide(): Promise<void> {
    // Similar implementation for Slack setup guide
    const guide: ServiceSetupGuide = {
      serviceId: 'slack',
      serviceName: 'Slack',
      version: '1.1.0',
      lastUpdated: new Date(),
      difficulty: 'beginner',
      prerequisites: [
        {
          type: 'permission',
          title: 'Slack Workspace Admin Access',
          description: 'Admin or owner permissions in the target Slack workspace',
          checkable: true,
          businessReason: 'Required to install apps and manage bot permissions',
          alternativeOptions: ['Request admin to install app for you']
        }
      ],
      setupSteps: [], // Would contain Slack-specific setup steps
      commonIssues: [],
      businessBenefits: [],
      integrationPoints: [],
      testingProcedure: {
        testSteps: [],
        successCriteria: [],
        failureScenarios: [],
        automatedTests: [],
        businessValidation: []
      },
      maintenanceInfo: {
        maintenanceSchedule: [],
        monitoringRequirements: [],
        updateProcedure: {
          updateTypes: [],
          testingRequired: false,
          rollbackPossible: false,
          businessApprovalRequired: false,
          downtime: ''
        },
        businessContinuity: {
          backupOptions: [],
          failoverProcedure: {
            automated: false,
            steps: [],
            estimatedTime: '',
            businessImpact: '',
            recoverySteps: []
          },
          recoveryTime: '',
          businessImpactAssessment: '',
          communicationPlan: {
            stakeholders: [],
            communicationMethods: [],
            updateFrequency: '',
            escalationCriteria: []
          }
        }
      }
    };

    this.setupGuides.set('slack', guide);
  }

  private async createCustomApiSetupGuide(): Promise<void> {
    // Implementation for custom API setup guide
    const guide: ServiceSetupGuide = {
      serviceId: 'custom_api',
      serviceName: 'Custom API',
      version: '1.0.0',
      lastUpdated: new Date(),
      difficulty: 'advanced',
      prerequisites: [
        {
          type: 'technical',
          title: 'API Documentation',
          description: 'Access to comprehensive API documentation',
          checkable: false,
          businessReason: 'Required to understand endpoints, authentication, and data formats',
          alternativeOptions: ['API provider support contact', 'Community documentation']
        }
      ],
      setupSteps: [], // Would contain API-specific setup steps
      commonIssues: [],
      businessBenefits: [],
      integrationPoints: [],
      testingProcedure: {
        testSteps: [],
        successCriteria: [],
        failureScenarios: [],
        automatedTests: [],
        businessValidation: []
      },
      maintenanceInfo: {
        maintenanceSchedule: [],
        monitoringRequirements: [],
        updateProcedure: {
          updateTypes: [],
          testingRequired: false,
          rollbackPossible: false,
          businessApprovalRequired: false,
          downtime: ''
        },
        businessContinuity: {
          backupOptions: [],
          failoverProcedure: {
            automated: false,
            steps: [],
            estimatedTime: '',
            businessImpact: '',
            recoverySteps: []
          },
          recoveryTime: '',
          businessImpactAssessment: '',
          communicationPlan: {
            stakeholders: [],
            communicationMethods: [],
            updateFrequency: '',
            escalationCriteria: []
          }
        }
      }
    };

    this.setupGuides.set('custom_api', guide);
  }

  private async loadSetupGuideFromFile(serviceId: string): Promise<ServiceSetupGuide | null> {
    try {
      const filePath = path.join(this.guidesDirectory, `${serviceId}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent) as ServiceSetupGuide;
    } catch (error) {
      return null;
    }
  }

  private async saveSetupGuideToFile(guide: ServiceSetupGuide): Promise<void> {
    const filePath = path.join(this.guidesDirectory, `${guide.serviceId}.json`);
    await fs.mkdir(this.guidesDirectory, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(guide, null, 2));
  }

  private validateSetupGuide(guide: ServiceSetupGuide): SetupValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate required fields
    if (!guide.serviceId) errors.push('Service ID is required');
    if (!guide.serviceName) errors.push('Service name is required');
    if (!guide.setupSteps || guide.setupSteps.length === 0) {
      errors.push('At least one setup step is required');
    }

    // Validate step dependencies
    const stepIds = new Set(guide.setupSteps.map(step => step.stepId));
    for (const step of guide.setupSteps) {
      for (const dependency of step.dependencies) {
        if (!stepIds.has(dependency)) {
          errors.push(`Step ${step.stepId} depends on non-existent step ${dependency}`);
        }
      }
    }

    // Suggestions for improvement
    if (guide.setupSteps.length > 10) {
      suggestions.push('Consider breaking down complex setups into smaller guides');
    }

    if (!guide.testingProcedure.automatedTests.length) {
      suggestions.push('Add automated tests to improve setup reliability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private async generatePrerequisites(
    serviceId: string,
    customization?: any
  ): Promise<Prerequisite[]> {
    // Generate service-specific prerequisites
    const basePrerequisites: Prerequisite[] = [
      {
        type: 'account',
        title: `${serviceId} Account`,
        description: `Active account with ${serviceId} service`,
        checkable: true,
        businessReason: 'Required for service integration',
        alternativeOptions: []
      }
    ];

    return basePrerequisites;
  }

  private async generateSetupSteps(serviceId: string, customization?: any): Promise<SetupStep[]> {
    // Generate basic setup steps template
    return [];
  }

  private async generateCommonIssues(serviceId: string): Promise<CommonIssue[]> {
    // Generate common issues based on service type
    return [];
  }

  private async generateBusinessBenefits(
    serviceId: string,
    customization?: any
  ): Promise<BusinessBenefit[]> {
    // Generate business benefits based on service and customization
    return [];
  }

  private async generateIntegrationPoints(serviceId: string): Promise<any[]> {
    return [];
  }

  private async generateTestingProcedure(serviceId: string): Promise<TestingProcedure> {
    return {
      testSteps: [],
      successCriteria: [],
      failureScenarios: [],
      automatedTests: [],
      businessValidation: []
    };
  }

  private async generateMaintenanceInfo(serviceId: string): Promise<any> {
    return {
      maintenanceSchedule: [],
      monitoringRequirements: [],
      updateProcedure: {
        updateTypes: [],
        testingRequired: false,
        rollbackPossible: false,
        businessApprovalRequired: false,
        downtime: ''
      },
      businessContinuity: {
        backupOptions: [],
        failoverProcedure: {
          automated: false,
          steps: [],
          estimatedTime: '',
          businessImpact: '',
          recoverySteps: []
        },
        recoveryTime: '',
        businessImpactAssessment: '',
        communicationPlan: {
          stakeholders: [],
          communicationMethods: [],
          updateFrequency: '',
          escalationCriteria: []
        }
      }
    };
  }

  private async performServiceSpecificValidation(
    serviceId: string,
    setupData: Record<string, any>
  ): Promise<{ errors: string[]; warnings: string[]; suggestions: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Service-specific validation logic
    switch (serviceId) {
      case 'gmail':
        if (!setupData.appPassword) {
          errors.push('Gmail app password is required');
        }
        if (!setupData.twoFactorEnabled) {
          errors.push('Two-factor authentication must be enabled');
        }
        break;

      case 'slack':
        if (!setupData.botToken) {
          errors.push('Slack bot token is required');
        }
        if (!setupData.workspacePermissions) {
          warnings.push('Workspace permissions should be verified');
        }
        break;

      case 'custom_api':
        if (!setupData.apiKey && !setupData.oauthToken) {
          errors.push('Either API key or OAuth token is required');
        }
        if (!setupData.baseUrl) {
          errors.push('API base URL is required');
        }
        break;
    }

    return { errors, warnings, suggestions };
  }
}

class AssetManager implements SetupAssetManager {
  constructor(private assetsDirectory: string) {}

  getScreenshotPath(serviceId: string, screenshotId: string): string {
    return path.join(this.assetsDirectory, serviceId, `${screenshotId}.png`);
  }

  async saveScreenshot(serviceId: string, screenshotId: string, imageData: Buffer): Promise<string> {
    const screenshotPath = this.getScreenshotPath(serviceId, screenshotId);
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await fs.writeFile(screenshotPath, imageData);
    return screenshotPath;
  }

  async getInstructionTemplate(serviceId: string, stepType: string): Promise<string> {
    try {
      const templatePath = path.join(this.assetsDirectory, 'templates', serviceId, `${stepType}.md`);
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      return `# ${stepType} Instructions\n\nPlease follow the steps below...`;
    }
  }
}

// Export singleton instance
export const setupGuideService = new SetupGuideService();