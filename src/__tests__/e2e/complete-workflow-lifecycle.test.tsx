import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowAdminPanel } from '../../components/admin/WorkflowAdminPanel';
import { WorkflowCatalog } from '../../components/client/WorkflowCatalog';
import { WorkflowSetupWizard } from '../../components/setup/WorkflowSetupWizard';
import { n8nService } from '../../services/n8nService';
import { workflowCurationService } from '../../services/workflowCurationService';

// Mock the services with realistic implementations
jest.mock('../../services/n8nService');
jest.mock('../../services/workflowCurationService');

const mockN8nService = n8nService as jest.Mocked<typeof n8nService>;
const mockWorkflowCurationService = workflowCurationService as jest.Mocked<typeof workflowCurationService>;

// Comprehensive test data representing realistic workflow scenarios
const mockRawWorkflow = {
  id: 'workflow-email-automation',
  name: 'Advanced Email Marketing System',
  active: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  nodes: [
    { 
      type: 'n8n-nodes-base.webhook',
      name: 'Contact Form Trigger',
      position: [100, 100]
    },
    {
      type: 'n8n-nodes-base.gmail',
      name: 'Send Welcome Email',
      position: [300, 100]
    },
    {
      type: 'n8n-nodes-base.airtable',
      name: 'Store Contact',
      position: [300, 250]
    },
    {
      type: 'n8n-nodes-base.delay',
      name: 'Wait 24 Hours',
      position: [500, 100]
    },
    {
      type: 'n8n-nodes-base.gmail',
      name: 'Send Follow-up',
      position: [700, 100]
    }
  ],
  connections: {
    'Contact Form Trigger': {
      main: [
        [
          { node: 'Send Welcome Email', type: 'main', index: 0 },
          { node: 'Store Contact', type: 'main', index: 0 }
        ]
      ]
    },
    'Send Welcome Email': {
      main: [
        [{ node: 'Wait 24 Hours', type: 'main', index: 0 }]
      ]
    },
    'Wait 24 Hours': {
      main: [
        [{ node: 'Send Follow-up', type: 'main', index: 0 }]
      ]
    }
  },
  settings: {
    executionOrder: 'v1',
    timezone: 'America/New_York'
  },
  staticData: {},
  tags: [] // Initially no tags - will be configured by admin
};

const mockProcessedTemplate = {
  id: 'template-email-automation',
  name: 'Advanced Email Marketing System',
  businessName: 'Smart Lead Nurturing Automation',
  description: 'Advanced Email Marketing System',
  businessDescription: 'Automatically capture leads from your website and nurture them with personalized email sequences that convert visitors into customers.',
  category: 'Marketing' as const,
  industry: ['Small Business', 'E-commerce', 'Professional Services'],
  difficulty: 'intermediate' as const,
  setupTime: '30-45 minutes',
  monthlyValue: 1500,
  timesSaved: '8 hours per week',
  features: [
    'Instant lead capture',
    'Automated welcome emails',
    'Contact database management',
    'Timed follow-up sequences',
    'Conversion tracking'
  ],
  requirements: [
    {
      type: 'service' as const,
      name: 'Gmail',
      description: 'Active Gmail account for sending emails',
      required: true,
      helpText: 'You\'ll need a Gmail account with 2FA enabled'
    },
    {
      type: 'service' as const,
      name: 'Airtable',
      description: 'Airtable base for contact management',
      required: true,
      helpText: 'Free Airtable account is sufficient'
    }
  ],
  tags: ['client-template', 'marketing', 'automation'],
  isClientReady: true,
  consulantOnly: false,
  originalWorkflowId: 'workflow-email-automation',
  credentialsNeeded: [
    {
      service: 'gmail',
      type: 'oauth' as const,
      displayName: 'Gmail Account',
      description: 'Connect your Gmail account to send automated emails',
      setupInstructions: [
        'Go to Google Cloud Console',
        'Enable Gmail API for your project',
        'Create OAuth 2.0 credentials',
        'Configure authorized domains'
      ],
      testable: true,
      required: true
    },
    {
      service: 'airtable',
      type: 'api_key' as const,
      displayName: 'Airtable',
      description: 'Connect to your Airtable base for contact storage',
      setupInstructions: [
        'Log into your Airtable account',
        'Go to Account Settings',
        'Generate a personal access token',
        'Set appropriate scopes'
      ],
      testable: true,
      required: true
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Connect Gmail',
      description: 'Authorize access to your Gmail account',
      action: 'configure_credential' as const,
      estimatedTime: '5-10 minutes',
      helpText: 'Make sure 2-factor authentication is enabled'
    },
    {
      step: 2,
      title: 'Connect Airtable',
      description: 'Set up your contact database',
      action: 'configure_credential' as const,
      estimatedTime: '10-15 minutes'
    },
    {
      step: 3,
      title: 'Test Connections',
      description: 'Verify all integrations work correctly',
      action: 'test_connection' as const,
      estimatedTime: '5 minutes'
    },
    {
      step: 4,
      title: 'Customize Settings',
      description: 'Configure email templates and timing',
      action: 'customize_settings' as const,
      estimatedTime: '10-15 minutes'
    },
    {
      step: 5,
      title: 'Review & Activate',
      description: 'Final review and automation activation',
      action: 'review_and_activate' as const,
      estimatedTime: '5 minutes'
    }
  ],
  successMetrics: [
    'Leads captured per week',
    'Email open rates',
    'Click-through rates',
    'Conversion to customers'
  ],
  icon: 'Campaign',
  previewImages: []
};

describe('Complete Workflow Lifecycle E2E Test', () => {
  const user = userEvent.setup();
  let workflowState = { ...mockRawWorkflow };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset workflow state
    workflowState = { ...mockRawWorkflow, tags: [] };
    
    // Setup realistic service mocks
    setupServiceMocks();
  });

  const setupServiceMocks = () => {
    // Mock n8nService with stateful behavior
    mockN8nService.getWorkflows.mockImplementation(() => 
      Promise.resolve([workflowState])
    );
    
    mockN8nService.getWorkflow.mockImplementation((id) => 
      Promise.resolve(id === workflowState.id ? workflowState : null)
    );
    
    mockN8nService.setWorkflowActive.mockImplementation((id, active) => {
      if (id === workflowState.id) {
        workflowState.active = active;
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });
    
    mockN8nService.updateWorkflow.mockImplementation((id, updates) => {
      if (id === workflowState.id) {
        workflowState = { ...workflowState, ...updates };
        return Promise.resolve(workflowState);
      }
      return Promise.reject(new Error('Workflow not found'));
    });

    // Mock workflowCurationService
    mockWorkflowCurationService.setWorkflowVisibility.mockImplementation((id, visibility) => {
      if (id === workflowState.id) {
        const visibilityTags = ['client-ready', 'client-template', 'internal-only', 'consultant-demo'];
        workflowState.tags = workflowState.tags.filter(tag => !visibilityTags.includes(tag));
        workflowState.tags.push(visibility);
      }
      return Promise.resolve();
    });

    mockWorkflowCurationService.analyzeWorkflow.mockResolvedValue({
      suggestedTemplate: {
        businessName: mockProcessedTemplate.businessName,
        businessDescription: mockProcessedTemplate.businessDescription,
        category: mockProcessedTemplate.category,
        industry: mockProcessedTemplate.industry,
        difficulty: mockProcessedTemplate.difficulty,
        setupTime: mockProcessedTemplate.setupTime,
        monthlyValue: mockProcessedTemplate.monthlyValue,
        timesSaved: mockProcessedTemplate.timesSaved,
        features: mockProcessedTemplate.features,
        consulantOnly: false
      },
      analysisResults: {
        nodeCount: 5,
        nodeTypes: ['webhook', 'gmail', 'airtable', 'delay'],
        integrations: ['gmail', 'airtable'],
        triggers: ['webhook'],
        actions: ['gmail', 'airtable', 'delay'],
        complexity: 'medium' as const,
        category: 'Marketing',
        automationType: 'Event-driven',
        estimatedSetupTime: 35,
        businessValue: 1500
      }
    });

    mockWorkflowCurationService.createClientTemplate.mockResolvedValue(mockProcessedTemplate);

    mockWorkflowCurationService.getClientTemplates.mockImplementation(() => {
      if (workflowState.tags.includes('client-ready') || workflowState.tags.includes('client-template')) {
        return Promise.resolve([mockProcessedTemplate]);
      }
      return Promise.resolve([]);
    });
  };

  describe('Complete Workflow Lifecycle', () => {
    test('admin creates and configures workflow for client use', async () => {
      // Phase 1: Admin Panel - Initial State
      render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Advanced Email Marketing System')).toBeInTheDocument();
      });

      // Verify initial state
      expect(screen.getByText('1')).toBeInTheDocument(); // Total workflows
      expect(screen.getByText('0')).toBeInTheDocument(); // Active workflows
      expect(screen.getByText('0')).toBeInTheDocument(); // Client ready
      expect(screen.getByText('1')).toBeInTheDocument(); // Unconfigured

      // Step 1: Change workflow visibility to client-ready
      const visibilitySelect = screen.getByDisplayValue('internal-only');
      await user.click(visibilitySelect);
      await user.click(screen.getByText('Client Ready'));

      expect(mockWorkflowCurationService.setWorkflowVisibility).toHaveBeenCalledWith(
        'workflow-email-automation',
        'client-ready'
      );

      // Step 2: Configure business metadata
      const editButton = screen.getByLabelText('Edit business metadata');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
        expect(screen.getByText('Advanced Email Marketing System')).toBeInTheDocument();
      });

      // Verify pre-populated data from analysis
      expect(screen.getByDisplayValue('Smart Lead Nurturing Automation')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Marketing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('intermediate')).toBeInTheDocument();

      // Customize the metadata
      const monthlyValueInput = screen.getByLabelText('Monthly Value ($)');
      await user.clear(monthlyValueInput);
      await user.type(monthlyValueInput, '2000');

      const timeSavedInput = screen.getByLabelText('Time Saved');
      await user.clear(timeSavedInput);
      await user.type(timeSavedInput, '10 hours per week');

      const featuresInput = screen.getByLabelText('Business Description');
      await user.clear(featuresInput);
      await user.type(featuresInput, 'Capture leads from your website and convert them into paying customers with automated email sequences. Perfect for small businesses looking to scale their marketing efforts.');

      // Save configuration
      await user.click(screen.getByText('Save Configuration'));

      await waitFor(() => {
        expect(mockWorkflowCurationService.createClientTemplate).toHaveBeenCalledWith(
          'workflow-email-automation',
          expect.objectContaining({
            monthlyValue: 2000,
            timesSaved: '10 hours per week'
          })
        );
      });

      // Step 3: Activate the workflow
      const playButton = screen.getByLabelText('Activate workflow');
      await user.click(playButton);

      expect(mockN8nService.setWorkflowActive).toHaveBeenCalledWith(
        'workflow-email-automation',
        true
      );
    });

    test('client discovers and sets up the workflow', async () => {
      // Setup: Workflow is now client-ready
      workflowState.tags = ['client-ready'];
      workflowState.active = true;

      const mockOnSelectWorkflow = jest.fn();
      const mockOnRequestDemo = jest.fn();

      // Phase 2: Client Catalog
      render(
        <WorkflowCatalog
          onSelectWorkflow={mockOnSelectWorkflow}
          onRequestDemo={mockOnRequestDemo}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Smart Lead Nurturing Automation')).toBeInTheDocument();
      });

      // Verify workflow information is displayed correctly
      expect(screen.getByText('1 automation found')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
      expect(screen.getByText('$1.5k/mo')).toBeInTheDocument(); // Formatted value
      expect(screen.getByText('intermediate')).toBeInTheDocument();
      expect(screen.getByText('30-45 minutes')).toBeInTheDocument();
      expect(screen.getByText('8 hours per week')).toBeInTheDocument();

      // Check features
      expect(screen.getByText('Instant lead capture')).toBeInTheDocument();
      expect(screen.getByText('Automated welcome emails')).toBeInTheDocument();
      expect(screen.getByText('Contact database management')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument(); // Collapsed features

      // Check industry tags
      expect(screen.getByText('Small Business')).toBeInTheDocument();
      expect(screen.getByText('E-commerce')).toBeInTheDocument();

      // Test filtering functionality
      const searchInput = screen.getByPlaceholderText('Search automations...');
      await user.type(searchInput, 'email');

      await waitFor(() => {
        expect(screen.getByText('Smart Lead Nurturing Automation')).toBeInTheDocument();
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
      });

      // Clear search and test category filter
      await user.clear(searchInput);
      
      const categorySelect = screen.getByLabelText('Category');
      await user.click(categorySelect);
      await user.click(screen.getByText('Marketing'));

      expect(screen.getByText('Smart Lead Nurturing Automation')).toBeInTheDocument();

      // Test demo request
      await user.click(screen.getByText('Request Demo'));
      expect(mockOnRequestDemo).toHaveBeenCalledWith(mockProcessedTemplate);

      // Start setup process
      await user.click(screen.getByText('Get Started'));

      // Should trigger onSelectWorkflow
      await waitFor(() => {
        expect(mockOnSelectWorkflow).toHaveBeenCalledWith(mockProcessedTemplate);
      });
    });

    test('client completes full setup wizard', async () => {
      const mockOnComplete = jest.fn();
      const mockOnClose = jest.fn();

      // Phase 3: Setup Wizard
      render(
        <WorkflowSetupWizard
          open={true}
          onClose={mockOnClose}
          template={mockProcessedTemplate}
          onComplete={mockOnComplete}
        />
      );

      // Step 1: Overview
      expect(screen.getByText('Setup Automation Wizard')).toBeInTheDocument();
      expect(screen.getByText('Smart Lead Nurturing Automation')).toBeInTheDocument();
      expect(screen.getByText(/Automatically capture leads from your website/)).toBeInTheDocument();

      // Verify setup summary
      expect(screen.getByText('30-45 minutes')).toBeInTheDocument();
      expect(screen.getByText('$1500')).toBeInTheDocument();
      expect(screen.getByText('8 hours per week')).toBeInTheDocument();
      expect(screen.getByText('intermediate')).toBeInTheDocument();

      // Check key features
      expect(screen.getByText('Instant lead capture')).toBeInTheDocument();
      expect(screen.getByText('Automated welcome emails')).toBeInTheDocument();

      await user.click(screen.getByText('Continue'));

      // Step 2: Credentials
      await waitFor(() => {
        expect(screen.getByText('Connect Your Accounts')).toBeInTheDocument();
      });

      // Verify credential requirements
      expect(screen.getByText('Gmail Account')).toBeInTheDocument();
      expect(screen.getByText('Airtable')).toBeInTheDocument();
      
      // Check setup instructions
      expect(screen.getByText('Go to Google Cloud Console')).toBeInTheDocument();
      expect(screen.getByText('Enable Gmail API for your project')).toBeInTheDocument();

      // OAuth credential (Gmail) should show OAuth button
      const gmailSection = screen.getByText('Gmail Account').closest('.MuiCardContent-root');
      expect(within(gmailSection!).getByText('Connect with OAuth')).toBeInTheDocument();
      expect(within(gmailSection!).getByText('Required')).toBeInTheDocument();

      // API key credential (Airtable) should show input field
      const airtableSection = screen.getByText('Airtable').closest('.MuiCardContent-root');
      expect(within(airtableSection!).getByLabelText('API Key')).toBeInTheDocument();
      expect(within(airtableSection!).getByText('Required')).toBeInTheDocument();

      // Fill in Airtable API key (simulate user input)
      const apiKeyInput = within(airtableSection!).getByLabelText('API Key');
      await user.type(apiKeyInput, 'keyXXXXXXXXXXXXXX.YYYYYYYYYYYYYYY');

      await user.click(screen.getByText('Continue'));

      // Step 3: Configuration
      await waitFor(() => {
        expect(screen.getByText('Customize Settings')).toBeInTheDocument();
      });

      // Enable scheduling
      const scheduleToggle = screen.getByLabelText('Enable automatic scheduling');
      await user.click(scheduleToggle);

      await waitFor(() => {
        expect(screen.getByLabelText('Schedule Pattern')).toBeInTheDocument();
      });

      // Change schedule pattern
      const patternSelect = screen.getByLabelText('Schedule Pattern');
      await user.click(patternSelect);
      await user.click(screen.getByText('Daily at 9 AM'));

      await user.click(screen.getByText('Continue'));

      // Step 4: Testing
      await waitFor(() => {
        expect(screen.getByText('Test Connections')).toBeInTheDocument();
      });

      // Test each credential
      const testButtons = screen.getAllByText('Test');
      
      // Test Gmail (should be disabled initially as it's OAuth)
      expect(testButtons[0]).toBeDisabled();
      
      // Test Airtable
      await user.click(testButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('Testing...')).toBeInTheDocument();
      });

      // Simulate test completion (using fake timers)
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000);
      jest.useRealTimers();

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Mock successful OAuth test for Gmail
      const gmailTestButton = testButtons[0];
      fireEvent.click(gmailTestButton);

      await user.click(screen.getByText('Continue'));

      // Step 5: Monitoring
      await waitFor(() => {
        expect(screen.getByText('Set Up Monitoring')).toBeInTheDocument();
      });

      // Monitoring should be enabled by default
      const monitoringToggle = screen.getByLabelText('Enable monitoring and alerts');
      expect(monitoringToggle).toBeChecked();

      // Configure alert email
      const emailInput = screen.getByLabelText('Alert Email');
      await user.type(emailInput, 'admin@example.com');

      // Change reporting frequency
      const frequencySelect = screen.getByLabelText('Report Frequency');
      await user.click(frequencySelect);
      await user.click(screen.getByText('Daily'));

      await user.click(screen.getByText('Continue'));

      // Step 6: Launch
      await waitFor(() => {
        expect(screen.getByText('🎉 Ready to Launch!')).toBeInTheDocument();
      });

      expect(screen.getByText(/Your automation is configured and ready to go/)).toBeInTheDocument();

      // Verify deployment steps
      expect(screen.getByText('Deploy Automation')).toBeInTheDocument();
      expect(screen.getByText('Start Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Begin Automation')).toBeInTheDocument();

      // Complete setup
      await user.click(screen.getByText('Launch Automation'));

      // Verify completion callback
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-email-automation',
          credentials: expect.objectContaining({
            airtable: expect.objectContaining({
              apiKey: 'keyXXXXXXXXXXXXXX.YYYYYYYYYYYYYYY'
            })
          }),
          settings: expect.any(Object),
          schedule: expect.objectContaining({
            enabled: true,
            pattern: '0 9 * * *'
          }),
          monitoring: expect.objectContaining({
            enabled: true,
            alertEmail: 'admin@example.com',
            reportingFrequency: 'daily'
          })
        })
      );

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('handles complete error recovery scenarios', async () => {
      // Simulate various error conditions throughout the lifecycle

      // Phase 1: Network error during admin configuration
      mockN8nService.getWorkflows.mockRejectedValueOnce(new Error('Network timeout'));
      
      render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // Should show 0 workflows gracefully
      });

      // Recover with successful data
      mockN8nService.getWorkflows.mockResolvedValue([workflowState]);
      
      // Simulate page refresh/reload
      const { rerender } = render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Advanced Email Marketing System')).toBeInTheDocument();
      });

      // Phase 2: Service error during template creation
      mockWorkflowCurationService.createClientTemplate.mockRejectedValueOnce(
        new Error('Template creation failed')
      );

      const editButton = screen.getByLabelText('Edit business metadata');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
      });

      // Try to save (should fail)
      await user.click(screen.getByText('Save Configuration'));

      // Dialog should remain open
      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
      });

      // Recover with successful save
      mockWorkflowCurationService.createClientTemplate.mockResolvedValue(mockProcessedTemplate);
      await user.click(screen.getByText('Save Configuration'));

      await waitFor(() => {
        expect(screen.queryByText('Configure Business Metadata')).not.toBeInTheDocument();
      });

      // Phase 3: Client catalog error recovery
      workflowState.tags = ['client-ready'];

      mockWorkflowCurationService.getClientTemplates.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('0 automations found')).toBeInTheDocument();
      });

      // Recovery
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue([mockProcessedTemplate]);
      
      // Simulate retry mechanism
      rerender(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Smart Lead Nurturing Automation')).toBeInTheDocument();
      });
    });

    test('validates data consistency across the entire flow', async () => {
      // Track data flow through the entire system
      const dataFlow: any[] = [];

      // Instrument service calls to track data transformation
      mockWorkflowCurationService.analyzeWorkflow.mockImplementation((id) => {
        dataFlow.push({ step: 'analyze', workflowId: id });
        return Promise.resolve({
          suggestedTemplate: mockProcessedTemplate,
          analysisResults: {
            nodeCount: 5,
            nodeTypes: ['webhook', 'gmail', 'airtable', 'delay'],
            integrations: ['gmail', 'airtable'],
            triggers: ['webhook'],
            actions: ['gmail', 'airtable', 'delay'],
            complexity: 'medium' as const,
            category: 'Marketing',
            automationType: 'Event-driven',
            estimatedSetupTime: 35,
            businessValue: 1500
          }
        });
      });

      mockWorkflowCurationService.createClientTemplate.mockImplementation((id, metadata) => {
        dataFlow.push({ step: 'create_template', workflowId: id, metadata });
        return Promise.resolve(mockProcessedTemplate);
      });

      mockWorkflowCurationService.getClientTemplates.mockImplementation(() => {
        dataFlow.push({ step: 'get_templates' });
        return Promise.resolve([mockProcessedTemplate]);
      });

      // Run through complete flow
      // 1. Admin configures workflow
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Advanced Email Marketing System')).toBeInTheDocument();
      });

      const editButton = screen.getByLabelText('Edit business metadata');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Save Configuration'));

      // 2. Client views catalog
      workflowState.tags = ['client-ready'];
      
      const { unmount } = render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Smart Lead Nurturing Automation')).toBeInTheDocument();
      });

      unmount();

      // Validate data flow consistency
      expect(dataFlow).toEqual([
        { step: 'analyze', workflowId: 'workflow-email-automation' },
        { 
          step: 'create_template', 
          workflowId: 'workflow-email-automation', 
          metadata: expect.any(Object) 
        },
        { step: 'get_templates' }
      ]);

      // Verify the same workflow ID flows through all steps
      const workflowIds = dataFlow
        .filter(step => step.workflowId)
        .map(step => step.workflowId);
      
      expect(workflowIds.every(id => id === 'workflow-email-automation')).toBe(true);
    });

    test('performance under realistic load conditions', async () => {
      // Simulate realistic performance scenarios
      
      // Multiple workflows in admin panel
      const multipleWorkflows = Array.from({ length: 20 }, (_, i) => ({
        ...mockRawWorkflow,
        id: `workflow-${i}`,
        name: `Workflow ${i}`,
        tags: i % 3 === 0 ? ['client-ready'] : []
      }));

      mockN8nService.getWorkflows.mockResolvedValue(multipleWorkflows);

      const startTime = performance.now();
      
      render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument(); // Total workflows
      });

      const adminLoadTime = performance.now() - startTime;

      // Client catalog with multiple templates
      const multipleTemplates = Array.from({ length: 7 }, (_, i) => ({
        ...mockProcessedTemplate,
        id: `template-${i}`,
        businessName: `Template ${i}`
      }));

      mockWorkflowCurationService.getClientTemplates.mockResolvedValue(multipleTemplates);

      const catalogStartTime = performance.now();

      const { unmount } = render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('7 automations found')).toBeInTheDocument();
      });

      const catalogLoadTime = performance.now() - catalogStartTime;

      unmount();

      // Performance assertions
      expect(adminLoadTime).toBeLessThan(2000); // Admin panel loads within 2s
      expect(catalogLoadTime).toBeLessThan(1500); // Catalog loads within 1.5s

      // Test interaction performance
      const interactionStartTime = performance.now();

      render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('7 automations found')).toBeInTheDocument();
      });

      // Test search performance
      const searchInput = screen.getByPlaceholderText('Search automations...');
      await user.type(searchInput, 'Template 3');

      await waitFor(() => {
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
      });

      const interactionTime = performance.now() - interactionStartTime;
      expect(interactionTime).toBeLessThan(1000); // Interactions complete within 1s
    });
  });
});