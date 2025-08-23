import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowSetupWizard } from '../../../components/setup/WorkflowSetupWizard';

// Mock data
const mockTemplate = {
  id: 'template-1',
  name: 'Email Marketing Automation',
  businessName: 'Email Marketing Pro',
  description: 'Technical description',
  businessDescription: 'Automate your email marketing campaigns and boost engagement.',
  category: 'Marketing' as const,
  industry: ['Small Business', 'E-commerce'],
  difficulty: 'beginner' as const,
  setupTime: '15-30 minutes',
  monthlyValue: 800,
  timesSaved: '5 hours per week',
  features: ['Automated campaigns', 'Personalization', 'Analytics tracking', 'A/B testing'],
  requirements: [],
  tags: ['client-template'],
  isClientReady: true,
  consulantOnly: false,
  originalWorkflowId: 'workflow-1',
  credentialsNeeded: [
    {
      service: 'gmail',
      type: 'oauth' as const,
      displayName: 'Gmail',
      description: 'Connect your Gmail account for email sending',
      setupInstructions: [
        'Go to Google Cloud Console',
        'Enable Gmail API',
        'Create OAuth credentials'
      ],
      testable: true,
      required: true
    },
    {
      service: 'mailchimp',
      type: 'api_key' as const,
      displayName: 'Mailchimp',
      description: 'Connect your Mailchimp account for list management',
      setupInstructions: [
        'Log into Mailchimp',
        'Go to Account Settings',
        'Generate API key'
      ],
      testable: true,
      required: false
    },
    {
      service: 'database',
      type: 'username_password' as const,
      displayName: 'Database',
      description: 'Connect to your customer database',
      setupInstructions: [
        'Get database connection details',
        'Ensure network access is configured',
        'Test connection'
      ],
      testable: true,
      required: true
    }
  ],
  setupSteps: [],
  successMetrics: [],
  icon: 'Campaign'
};

describe('WorkflowSetupWizard', () => {
  const user = userEvent.setup();
  const mockOnClose = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    template: mockTemplate,
    onComplete: mockOnComplete
  };

  describe('Component Rendering', () => {
    test('renders when open', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      expect(screen.getByText('Setup Automation Wizard')).toBeInTheDocument();
      expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<WorkflowSetupWizard {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Setup Automation Wizard')).not.toBeInTheDocument();
    });

    test('handles null template', () => {
      render(<WorkflowSetupWizard {...defaultProps} template={null} />);
      
      expect(screen.getByText('Setup Automation Wizard')).toBeInTheDocument();
      // Should not crash with null template
    });
  });

  describe('Stepper Navigation', () => {
    test('displays all wizard steps', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Credentials')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Launch')).toBeInTheDocument();
    });

    test('starts on overview step', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      expect(screen.getByText(/Automate your email marketing campaigns/)).toBeInTheDocument();
    });

    test('navigates forward through steps', async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Step 1: Overview
      expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      
      const continueButton = screen.getByText('Continue');
      await user.click(continueButton);
      
      // Step 2: Credentials
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
    });

    test('navigates backward through steps', async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Go to step 2
      await user.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
      
      // Go back to step 1
      await user.click(screen.getByText('Back'));
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });
    });

    test('disables back button on first step', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      const backButton = screen.getByText('Back');
      expect(backButton).toBeDisabled();
    });
  });

  describe('Overview Step', () => {
    test('displays template information', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      expect(screen.getByText(/Automate your email marketing campaigns/)).toBeInTheDocument();
      expect(screen.getByText('15-30 minutes')).toBeInTheDocument();
      expect(screen.getByText('$800')).toBeInTheDocument();
      expect(screen.getByText('5 hours per week')).toBeInTheDocument();
      expect(screen.getByText('beginner')).toBeInTheDocument();
    });

    test('displays key features', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      expect(screen.getByText('Automated campaigns')).toBeInTheDocument();
      expect(screen.getByText('Personalization')).toBeInTheDocument();
      expect(screen.getByText('Analytics tracking')).toBeInTheDocument();
      expect(screen.getByText('A/B testing')).toBeInTheDocument();
    });
  });

  describe('Credentials Step', () => {
    beforeEach(async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      await user.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
    });

    test('displays all credential requirements', () => {
      expect(screen.getByText('Gmail')).toBeInTheDocument();
      expect(screen.getByText('Mailchimp')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    test('shows required vs optional credentials', () => {
      const gmailSection = screen.getByText('Gmail').closest('.MuiCardContent-root');
      const mailchimpSection = screen.getByText('Mailchimp').closest('.MuiCardContent-root');
      
      expect(within(gmailSection!).getByText('Required')).toBeInTheDocument();
      expect(within(mailchimpSection!).getByText('Optional')).toBeInTheDocument();
    });

    test('displays OAuth credential type', () => {
      const gmailSection = screen.getByText('Gmail').closest('.MuiCardContent-root');
      expect(within(gmailSection!).getByText('Connect with OAuth')).toBeInTheDocument();
    });

    test('displays API key credential type', () => {
      const mailchimpSection = screen.getByText('Mailchimp').closest('.MuiCardContent-root');
      expect(within(mailchimpSection!).getByLabelText('API Key')).toBeInTheDocument();
    });

    test('displays username/password credential type', () => {
      const databaseSection = screen.getByText('Database').closest('.MuiCardContent-root');
      expect(within(databaseSection!).getByLabelText('Username')).toBeInTheDocument();
      expect(within(databaseSection!).getByLabelText('Password')).toBeInTheDocument();
    });

    test('handles credential input changes', async () => {
      const apiKeyInput = screen.getByLabelText('API Key');
      await user.type(apiKeyInput, 'test-api-key');
      
      expect(apiKeyInput).toHaveValue('test-api-key');
    });

    test('toggles password visibility', async () => {
      const passwordInput = screen.getByLabelText('Password');
      const visibilityButton = screen.getAllByRole('button').find(
        button => button.querySelector('[data-testid="VisibilityIcon"], [data-testid="VisibilityOffIcon"]')
      );
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      if (visibilityButton) {
        await user.click(visibilityButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
      }
    });

    test('displays setup instructions', () => {
      expect(screen.getByText('Go to Google Cloud Console')).toBeInTheDocument();
      expect(screen.getByText('Enable Gmail API')).toBeInTheDocument();
      expect(screen.getByText('Create OAuth credentials')).toBeInTheDocument();
    });

    test('validates required credentials', async () => {
      // Try to continue without filling required credentials
      await user.click(screen.getByText('Continue'));
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Gmail is required/)).toBeInTheDocument();
        expect(screen.getByText(/Database is required/)).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Step', () => {
    beforeEach(async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Navigate to credentials step and fill required fields
      await user.click(screen.getByText('Continue'));
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
      
      // Fill required username/password
      await user.type(screen.getByLabelText('Username'), 'testuser');
      await user.type(screen.getByLabelText('Password'), 'testpass');
      
      // Continue to configuration
      await user.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText('Customize Settings')).toBeInTheDocument();
      });
    });

    test('displays schedule configuration', () => {
      expect(screen.getByText('Schedule Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable automatic scheduling')).toBeInTheDocument();
    });

    test('enables schedule configuration', async () => {
      const scheduleToggle = screen.getByLabelText('Enable automatic scheduling');
      await user.click(scheduleToggle);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Schedule Pattern')).toBeInTheDocument();
        expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
      });
    });

    test('configures schedule pattern', async () => {
      const scheduleToggle = screen.getByLabelText('Enable automatic scheduling');
      await user.click(scheduleToggle);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Weekdays at 9 AM')).toBeInTheDocument();
      });
      
      const patternSelect = screen.getByLabelText('Schedule Pattern');
      await user.click(patternSelect);
      await user.click(screen.getByText('Daily at 9 AM'));
      
      expect(screen.getByDisplayValue('Daily at 9 AM')).toBeInTheDocument();
    });
  });

  describe('Testing Step', () => {
    beforeEach(async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Navigate through steps
      await user.click(screen.getByText('Continue')); // Overview -> Credentials
      
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
      
      // Fill required credentials
      await user.type(screen.getByLabelText('Username'), 'testuser');
      await user.type(screen.getByLabelText('Password'), 'testpass');
      
      await user.click(screen.getByText('Continue')); // Credentials -> Configuration
      
      await waitFor(() => {
        expect(screen.getByText('Customize Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Continue')); // Configuration -> Testing
      
      await waitFor(() => {
        expect(screen.getByText('Test Connections')).toBeInTheDocument();
      });
    });

    test('displays credential test interface', () => {
      expect(screen.getByText('Test Connections')).toBeInTheDocument();
      expect(screen.getAllByText('Test')).toHaveLength(3); // One for each credential
    });

    test('tests credentials', async () => {
      const testButtons = screen.getAllByText('Test');
      
      // Test first credential
      await user.click(testButtons[0]);
      
      // Should show testing state
      await waitFor(() => {
        expect(screen.getByText('Testing...')).toBeInTheDocument();
      });
      
      // Simulate test completion
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    test('handles test failures', async () => {
      // Mock Math.random to force failure
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.2); // Force failure (< 0.3)
      
      const testButtons = screen.getAllByText('Test');
      await user.click(testButtons[0]);
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
      
      Math.random = originalRandom;
    });

    test('validates all required credentials are tested', async () => {
      // Try to continue without testing all required credentials
      await user.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText(/All required credentials must be tested successfully/)).toBeInTheDocument();
      });
    });
  });

  describe('Monitoring Step', () => {
    beforeEach(async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Navigate to monitoring step (skipping full validation for speed)
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByText('Continue'));
        await waitFor(() => {}, { timeout: 100 });
      }
    });

    test('displays monitoring configuration', async () => {
      await waitFor(() => {
        expect(screen.getByText('Set Up Monitoring')).toBeInTheDocument();
        expect(screen.getByLabelText('Enable monitoring and alerts')).toBeInTheDocument();
      });
    });

    test('enables monitoring configuration', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText('Enable monitoring and alerts')).toBeInTheDocument();
      });
      
      const monitoringToggle = screen.getByLabelText('Enable monitoring and alerts');
      
      // Should be enabled by default
      expect(monitoringToggle).toBeChecked();
      
      // Should show email and frequency fields
      expect(screen.getByLabelText('Alert Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Report Frequency')).toBeInTheDocument();
    });

    test('validates alert email when monitoring enabled', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText('Alert Email')).toBeInTheDocument();
      });
      
      // Clear the email field
      const emailInput = screen.getByLabelText('Alert Email');
      await user.clear(emailInput);
      
      // Try to continue
      await user.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText(/Alert email is required when monitoring is enabled/)).toBeInTheDocument();
      });
    });

    test('configures report frequency', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText('Report Frequency')).toBeInTheDocument();
      });
      
      const frequencySelect = screen.getByLabelText('Report Frequency');
      await user.click(frequencySelect);
      await user.click(screen.getByText('Daily'));
      
      expect(screen.getByDisplayValue('Daily')).toBeInTheDocument();
    });
  });

  describe('Launch Step', () => {
    beforeEach(async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Navigate to launch step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByText('Continue'));
        await waitFor(() => {}, { timeout: 100 });
      }
    });

    test('displays launch confirmation', async () => {
      await waitFor(() => {
        expect(screen.getByText('🎉 Ready to Launch!')).toBeInTheDocument();
        expect(screen.getByText(/Your automation is configured and ready to go/)).toBeInTheDocument();
      });
    });

    test('shows deployment steps', async () => {
      await waitFor(() => {
        expect(screen.getByText('Deploy Automation')).toBeInTheDocument();
        expect(screen.getByText('Start Monitoring')).toBeInTheDocument();
        expect(screen.getByText('Begin Automation')).toBeInTheDocument();
      });
    });

    test('completes setup', async () => {
      await waitFor(() => {
        expect(screen.getByText('Launch Automation')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Launch Automation'));
      
      expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
        templateId: 'template-1',
        credentials: expect.any(Object),
        settings: expect.any(Object),
        monitoring: expect.objectContaining({
          enabled: true,
          reportingFrequency: 'weekly'
        })
      }));
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Dialog Actions', () => {
    test('closes wizard on cancel', async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      await user.click(screen.getByText('Cancel'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('shows help button', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      expect(screen.getByLabelText('Get help with setup')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles step validation errors', async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Go to credentials step
      await user.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
      
      // Try to continue without filling required fields
      await user.click(screen.getByText('Continue'));
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Gmail is required/)).toBeInTheDocument();
      });
      
      // Should remain on same step
      expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
    });

    test('handles missing template gracefully', () => {
      render(<WorkflowSetupWizard {...defaultProps} template={null} />);
      
      // Should not crash
      expect(screen.getByText('Setup Automation Wizard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Get help with setup')).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Should be able to tab through interactive elements
      await user.tab();
      expect(screen.getByText('Continue')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Back')).toHaveFocus();
    });

    test('displays step errors clearly', async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Navigate to credentials and trigger validation error
      await user.click(screen.getByText('Continue'));
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveClass('MuiAlert-colorError');
      });
    });
  });

  describe('State Management', () => {
    test('preserves configuration across steps', async () => {
      render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Navigate to credentials step
      await user.click(screen.getByText('Continue'));
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });
      
      // Fill in credential
      const apiKeyInput = screen.getByLabelText('API Key');
      await user.type(apiKeyInput, 'test-key');
      
      // Go forward and back
      await user.click(screen.getByText('Continue'));
      await user.click(screen.getByText('Back'));
      
      // Value should be preserved
      expect(screen.getByDisplayValue('test-key')).toBeInTheDocument();
    });

    test('resets state when template changes', () => {
      const { rerender } = render(<WorkflowSetupWizard {...defaultProps} />);
      
      // Change template
      const newTemplate = { ...mockTemplate, id: 'template-2', businessName: 'New Template' };
      rerender(<WorkflowSetupWizard {...defaultProps} template={newTemplate} />);
      
      // Should show new template
      expect(screen.getByText('New Template')).toBeInTheDocument();
    });
  });
});