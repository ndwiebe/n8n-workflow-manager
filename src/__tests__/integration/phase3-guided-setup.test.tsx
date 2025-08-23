/**
 * Phase 3 Guided Setup Integration Tests
 * Tests the complete integration of all Phase 3 components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ServiceConnectionCard } from '../../components/credentials/ServiceConnectionCard';
import { setupAssistant } from '../../services/setupAssistant';
import { smartErrorHandler } from '../../services/smartErrorHandler';
import { autoHealing } from '../../services/autoHealing';
import { consultantEscalation } from '../../services/consultantEscalation';
import {
  ServiceConnectionCard as ServiceConnectionCardType,
  ConnectionStatus,
  ServiceCategory
} from '../../types/smartCredentials';

// Mock services
jest.mock('../../services/setupAssistant');
jest.mock('../../services/smartErrorHandler');
jest.mock('../../services/autoHealing');
jest.mock('../../services/consultantEscalation');

const mockSetupAssistant = setupAssistant as jest.Mocked<typeof setupAssistant>;
const mockSmartErrorHandler = smartErrorHandler as jest.Mocked<typeof smartErrorHandler>;
const mockAutoHealing = autoHealing as jest.Mocked<typeof autoHealing>;
const mockConsultantEscalation = consultantEscalation as jest.Mocked<typeof consultantEscalation>;

describe('Phase 3: Guided Setup Integration', () => {
  const mockService: ServiceConnectionCardType = {
    serviceId: 'gmail',
    displayName: 'Gmail',
    businessDescription: 'Professional email automation for your business',
    icon: 'EmailIcon',
    category: ServiceCategory.EMAIL_MARKETING,
    status: ConnectionStatus.DISCONNECTED,
    required: true,
    priority: 'high',
    setupComplexity: 'simple',
    estimatedSetupTime: '5 minutes',
    businessValue: 'Automate email responses and customer communication',
    connectionDetails: {
      connectionType: 'api_key',
      authenticationStatus: 'pending',
      connectionFields: [
        {
          fieldId: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'your.email@gmail.com',
          helpText: 'Your Gmail address',
          sensitive: false,
          businessDescription: 'The Gmail account for automation'
        },
        {
          fieldId: 'appPassword',
          label: 'App Password',
          type: 'password',
          required: true,
          placeholder: 'Enter app password',
          helpText: 'Generated from Google Account settings',
          sensitive: true,
          businessDescription: 'Secure password for automated access'
        }
      ]
    }
  };

  const defaultProps = {
    service: mockService,
    onConnect: jest.fn(),
    onTest: jest.fn(),
    onConfigure: jest.fn(),
    onShowHelp: jest.fn(),
    onSetupComplete: jest.fn(),
    onEscalate: jest.fn(),
    workflowId: 'test-workflow-123',
    userId: 'test-user-456',
    enableGuidedSetup: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock responses
    mockSetupAssistant.startGuidedSetup.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'session-123',
        workflowId: 'test-workflow-123',
        serviceId: 'gmail',
        userId: 'test-user-456',
        startedAt: new Date(),
        currentStepId: 'gmail_prerequisites',
        completedSteps: [],
        stepProgress: {
          'gmail_prerequisites': {
            stepId: 'gmail_prerequisites',
            status: 'not_started',
            attempts: 0,
            userData: {},
            timeSpent: 0
          }
        },
        sessionData: {},
        escalated: false,
        estimatedCompletion: new Date(Date.now() + 300000), // 5 minutes
        businessImpact: {
          expectedTimeSaving: '10 hours per month',
          expectedCostSaving: '$500 per month',
          businessGoalsAchieved: ['Automated email responses'],
          automationValue: 'Professional email automation',
          riskMitigation: ['Reduced human error']
        }
      }
    });

    mockSetupAssistant.getStepInstructions.mockResolvedValue({
      success: true,
      data: {
        stepId: 'gmail_prerequisites',
        title: 'Check Gmail Prerequisites',
        description: 'Ensure your Gmail account is ready for automation',
        businessReason: 'Proper setup ensures reliable email automation',
        estimatedTime: '2 minutes',
        type: 'verification',
        required: true,
        order: 1,
        dependencies: [],
        instruction: {
          type: 'screenshot',
          content: 'Let\'s verify your Gmail account is ready for business automation.',
          screenshots: [
            {
              id: 'gmail_settings',
              title: 'Gmail Settings',
              description: 'Navigate to Gmail settings',
              imageUrl: '/assets/screenshots/gmail/settings.png',
              annotations: [
                {
                  id: 'settings_gear',
                  type: 'highlight',
                  x: 85,
                  y: 15,
                  width: 5,
                  height: 5,
                  text: 'Click here',
                  color: '#ff4444',
                  style: 'solid'
                }
              ],
              alternativeText: 'Gmail settings gear icon',
              order: 1
            }
          ],
          businessContext: 'These settings enable secure business email automation.',
          commonMistakes: [
            'Forgetting to enable 2FA',
            'Using wrong password type'
          ],
          troubleshooting: [
            {
              problem: 'Cannot find settings',
              solution: 'Look for gear icon in top-right corner',
              businessImpact: 'Setup cannot proceed without access to settings',
              prevention: 'Ensure you\'re logged into the correct Gmail account',
              escalationTrigger: false
            }
          ]
        },
        helpResources: [
          {
            type: 'documentation',
            title: 'Gmail Setup Guide',
            description: 'Official Gmail API documentation',
            url: 'https://developers.google.com/gmail/api',
            available: true,
            cost: 'free'
          }
        ]
      }
    });
  });

  it('should render service card with guided setup option', () => {
    render(<ServiceConnectionCard {...defaultProps} />);
    
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Professional email automation for your business')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guided setup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual setup/i })).toBeInTheDocument();
  });

  it('should start guided setup when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    expect(mockSetupAssistant.startGuidedSetup).toHaveBeenCalledWith(
      'test-workflow-123',
      'gmail',
      'test-user-456',
      mockService
    );
  });

  it('should display guided setup wizard dialog', async () => {
    const user = userEvent.setup();
    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByText('Setup Guide: Gmail')).toBeInTheDocument();
    });

    expect(screen.getByText('Check Gmail Prerequisites')).toBeInTheDocument();
    expect(screen.getByText('Expected Business Impact')).toBeInTheDocument();
    expect(screen.getByText('10 hours per month saved per month')).toBeInTheDocument();
  });

  it('should show step instructions with screenshots', async () => {
    const user = userEvent.setup();
    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByText('Let\'s verify your Gmail account is ready for business automation.')).toBeInTheDocument();
    });

    expect(screen.getByText('Gmail Settings')).toBeInTheDocument();
    expect(screen.getByText('These settings enable secure business email automation.')).toBeInTheDocument();
  });

  it('should progress through setup steps', async () => {
    const user = userEvent.setup();
    
    mockSetupAssistant.progressToNextStep.mockResolvedValue({
      success: true,
      data: {
        nextStep: {
          stepId: 'gmail_app_password',
          title: 'Generate App Password',
          description: 'Create a secure app password',
          businessReason: 'App passwords provide secure automated access',
          estimatedTime: '3 minutes',
          type: 'form',
          required: true,
          order: 2,
          dependencies: ['gmail_prerequisites'],
          instruction: {
            type: 'screenshot',
            content: 'Now let\'s create an app password for secure access.',
            businessContext: 'App passwords allow automation without compromising security.',
            commonMistakes: ['Using regular password'],
            troubleshooting: []
          },
          helpResources: []
        },
        completed: false
      }
    });

    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    expect(mockSetupAssistant.progressToNextStep).toHaveBeenCalledWith(
      'session-123',
      'gmail_prerequisites',
      {}
    );

    await waitFor(() => {
      expect(screen.getByText('Generate App Password')).toBeInTheDocument();
    });
  });

  it('should handle setup completion', async () => {
    const user = userEvent.setup();
    
    mockSetupAssistant.progressToNextStep.mockResolvedValue({
      success: true,
      data: {
        completed: true
      }
    });

    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(defaultProps.onSetupComplete).toHaveBeenCalledWith('gmail', true);
    });
  });

  it('should handle escalation to consultant', async () => {
    const user = userEvent.setup();
    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /get help/i })).toBeInTheDocument();
    });

    const getHelpButton = screen.getByRole('button', { name: /get help/i });
    await user.click(getHelpButton);

    expect(defaultProps.onEscalate).toHaveBeenCalledWith(
      'gmail',
      'Assistance needed with step: Check Gmail Prerequisites'
    );
  });

  it('should show troubleshooting help when errors occur', async () => {
    const user = userEvent.setup();
    
    mockSetupAssistant.getTroubleshootingHelp.mockResolvedValue({
      success: true,
      data: [
        {
          problem: 'Cannot find settings',
          solution: 'Look for gear icon in top-right corner',
          businessImpact: 'Setup cannot proceed without access to settings',
          prevention: 'Ensure you\'re logged into the correct Gmail account',
          escalationTrigger: false
        }
      ]
    });

    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByText('Troubleshooting Tips')).toBeInTheDocument();
    });

    // Expand troubleshooting section
    const troubleshootingHeader = screen.getByText('Troubleshooting Tips');
    const expandButton = troubleshootingHeader.closest('div')?.querySelector('button');
    if (expandButton) {
      await user.click(expandButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Problem: Cannot find settings')).toBeInTheDocument();
      expect(screen.getByText('Solution: Look for gear icon in top-right corner')).toBeInTheDocument();
    });
  });

  it('should integrate with smart error handler for setup failures', async () => {
    const user = userEvent.setup();
    
    mockSetupAssistant.validateStep.mockResolvedValue({
      success: true,
      data: [
        {
          validationType: 'form_validation',
          passed: false,
          details: 'Invalid app password format',
          timestamp: new Date(),
          businessMessage: 'The app password format is incorrect. Please check and try again.',
          technicalDetails: { field: 'appPassword', error: 'invalid_format' }
        }
      ]
    });

    mockSmartErrorHandler.analyzeError.mockResolvedValue({
      success: true,
      data: {
        errorId: 'error-123',
        errorType: 'authentication',
        severity: 'high',
        userFriendlyMessage: 'Your Gmail app password appears to be incorrect.',
        technicalDetails: 'Invalid app password format',
        businessImpact: 'Email automation will not work without correct credentials.',
        suggestedFixes: [
          {
            suggestionId: 'fix-1',
            title: 'Regenerate App Password',
            description: 'Create a new app password in your Google Account settings',
            businessReason: 'Fresh credentials often resolve authentication issues',
            difficulty: 'easy',
            estimatedTime: '3 minutes',
            successProbability: 0.9,
            steps: [
              {
                stepId: 'step-1',
                instruction: 'Go to Google Account settings',
                type: 'user_action',
                automated: false
              }
            ],
            preventsFutureErrors: true
          }
        ],
        autoRecoveryOptions: [],
        escalationRequired: false,
        contextualHelp: {
          quickTips: ['Check app password format', 'Verify 2FA is enabled'],
          relatedIssues: [],
          expertConsultation: {
            available: true,
            estimatedWaitTime: '5 minutes',
            cost: 'Free',
            expertise: ['Gmail Integration'],
            bookingUrl: '/support'
          },
          communityResources: [],
          documentationLinks: []
        },
        timestamp: new Date(),
        serviceId: 'gmail',
        workflowId: 'test-workflow-123',
        userId: 'test-user-456'
      }
    });

    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    // Wait for the wizard to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    // Simulate form input and validation failure
    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('The app password format is incorrect. Please check and try again.')).toBeInTheDocument();
    });
  });

  it('should integrate with auto-healing system for connection monitoring', async () => {
    const user = userEvent.setup();
    
    mockAutoHealing.startMonitoring.mockResolvedValue({
      success: true,
      data: {
        serviceId: 'gmail',
        workflowId: 'test-workflow-123',
        status: 'healthy',
        lastHealthCheck: new Date(),
        responseTime: 200,
        errorRate: 0,
        availability: 1,
        healthMetrics: [],
        autoHealingAttempts: [],
        monitoringConfig: {
          enabled: true,
          checkInterval: 300,
          alertThresholds: [],
          autoHealingEnabled: true,
          escalationPolicy: {
            levels: [],
            maxAutoHealing: 3,
            requiresBusinessApproval: [],
            emergencyContact: {
              type: 'email',
              contact: 'support@company.com',
              name: 'Support Team',
              role: 'Technical Support',
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
            schedule: [],
            holidays: [],
            emergencyOverride: false
          }
        }
      }
    });

    // Simulate successful setup completion
    mockSetupAssistant.progressToNextStep.mockResolvedValue({
      success: true,
      data: { completed: true }
    });

    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    // Auto-healing should start monitoring after successful setup
    await waitFor(() => {
      expect(defaultProps.onSetupComplete).toHaveBeenCalledWith('gmail', true);
    });
  });

  it('should handle consultant escalation for complex issues', async () => {
    const user = userEvent.setup();
    
    mockConsultantEscalation.createEscalation.mockResolvedValue({
      success: true,
      data: {
        escalationId: 'esc-123',
        workflowId: 'test-workflow-123',
        serviceId: 'gmail',
        userId: 'test-user-456',
        createdAt: new Date(),
        priority: 'high',
        category: 'setup_assistance',
        description: 'Assistance needed with step: Check Gmail Prerequisites',
        businessImpact: 'User unable to complete email automation setup',
        detectedIssues: [
          {
            issueType: 'setup_complexity',
            description: 'User struggling with Gmail app password setup',
            severity: 'medium',
            automationFailed: false,
            userStuck: true,
            businessBlocker: true,
            timeSpentOnIssue: 10
          }
        ],
        status: 'pending',
        followUpRequired: true
      }
    });

    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /get help/i })).toBeInTheDocument();
    });

    const getHelpButton = screen.getByRole('button', { name: /get help/i });
    await user.click(getHelpButton);

    expect(defaultProps.onEscalate).toHaveBeenCalledWith(
      'gmail',
      'Assistance needed with step: Check Gmail Prerequisites'
    );
  });

  it('should show business impact and ROI information', async () => {
    const user = userEvent.setup();
    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByText('Expected Business Impact')).toBeInTheDocument();
      expect(screen.getByText('10 hours per month saved per month • $500 per month cost reduction')).toBeInTheDocument();
    });
  });

  it('should handle pause and resume functionality', async () => {
    const user = userEvent.setup();
    render(<ServiceConnectionCard {...defaultProps} />);
    
    const guidedSetupButton = screen.getByRole('button', { name: /guided setup/i });
    await user.click(guidedSetupButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    await user.click(pauseButton);

    // After pause, should show resume button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });
  });
});

describe('Phase 3: Service Integration', () => {
  it('should integrate all Phase 3 services correctly', () => {
    // Test that all services are properly instantiated and available
    expect(setupAssistant).toBeDefined();
    expect(smartErrorHandler).toBeDefined();
    expect(autoHealing).toBeDefined();
    expect(consultantEscalation).toBeDefined();
  });

  it('should have proper service method signatures', () => {
    // Verify that all services have the expected methods
    expect(typeof setupAssistant.startGuidedSetup).toBe('function');
    expect(typeof setupAssistant.getStepInstructions).toBe('function');
    expect(typeof setupAssistant.progressToNextStep).toBe('function');
    
    expect(typeof smartErrorHandler.analyzeError).toBe('function');
    expect(typeof smartErrorHandler.attemptAutoRecovery).toBe('function');
    
    expect(typeof autoHealing.startMonitoring).toBe('function');
    expect(typeof autoHealing.performHealthCheck).toBe('function');
    
    expect(typeof consultantEscalation.createEscalation).toBe('function');
    expect(typeof consultantEscalation.findAvailableConsultants).toBe('function');
  });
});