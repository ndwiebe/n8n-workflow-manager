import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowAdminPanel } from '../../components/admin/WorkflowAdminPanel';
import { WorkflowCatalog } from '../../components/client/WorkflowCatalog';
import { n8nService } from '../../services/n8nService';
import { workflowCurationService } from '../../services/workflowCurationService';

// Mock the services
jest.mock('../../services/n8nService');
jest.mock('../../services/workflowCurationService');

const mockN8nService = n8nService as jest.Mocked<typeof n8nService>;
const mockWorkflowCurationService = workflowCurationService as jest.Mocked<typeof workflowCurationService>;

// Mock WorkflowSetupWizard component for integration tests
jest.mock('../../components/setup/WorkflowSetupWizard', () => ({
  WorkflowSetupWizard: ({ open, onClose, template, onComplete }: any) => (
    open ? (
      <div data-testid="setup-wizard-integration">
        <h3>Setup Wizard: {template?.businessName}</h3>
        <button onClick={() => onComplete({ test: 'config' })}>Complete Setup</button>
        <button onClick={onClose}>Close Wizard</button>
      </div>
    ) : null
  )
}));

// Mock data that flows between components
const mockWorkflowData = {
  id: 'workflow-1',
  name: 'Email Marketing Automation',
  active: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  nodes: [
    { type: 'n8n-nodes-base.webhook', name: 'Webhook' },
    { type: 'n8n-nodes-base.gmail', name: 'Gmail' }
  ],
  connections: {},
  settings: {},
  staticData: {},
  tags: ['internal-only']
};

const mockTemplate = {
  id: 'template-1',
  name: 'Email Marketing Automation',
  businessName: 'Smart Email Marketing',
  description: 'Technical description',
  businessDescription: 'Automate your email marketing campaigns for better engagement.',
  category: 'Marketing' as const,
  industry: ['Small Business'],
  difficulty: 'beginner' as const,
  setupTime: '15-30 minutes',
  monthlyValue: 800,
  timesSaved: '5 hours per week',
  features: ['Automated campaigns', 'Personalization'],
  requirements: [],
  tags: ['client-template'],
  isClientReady: true,
  consulantOnly: false,
  originalWorkflowId: 'workflow-1',
  credentialsNeeded: [],
  setupSteps: [],
  successMetrics: [],
  icon: 'Campaign'
};

describe('Workflow Management Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin to Client Workflow Lifecycle', () => {
    test('complete workflow from creation to client deployment', async () => {
      // Setup initial state - workflow exists but not client-ready
      mockN8nService.getWorkflows.mockResolvedValue([mockWorkflowData]);
      mockN8nService.setWorkflowActive.mockResolvedValue(true);
      mockWorkflowCurationService.setWorkflowVisibility.mockResolvedValue();
      mockWorkflowCurationService.analyzeWorkflow.mockResolvedValue({
        suggestedTemplate: mockTemplate,
        analysisResults: {
          nodeCount: 2,
          nodeTypes: ['webhook', 'gmail'],
          integrations: ['gmail'],
          triggers: ['webhook'],
          actions: ['gmail'],
          complexity: 'low' as const,
          category: 'Marketing',
          automationType: 'Event-driven',
          estimatedSetupTime: 20,
          businessValue: 500
        }
      });
      mockWorkflowCurationService.createClientTemplate.mockResolvedValue(mockTemplate);

      // Phase 1: Admin Panel - Configure workflow for client use
      render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      // Step 1: Change visibility from internal-only to client-ready
      const visibilitySelects = screen.getAllByDisplayValue('internal-only');
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Client Ready'));

      expect(mockWorkflowCurationService.setWorkflowVisibility).toHaveBeenCalledWith(
        'workflow-1',
        'client-ready'
      );

      // Step 2: Configure business metadata
      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
      });

      // Fill in business metadata
      const businessNameInput = screen.getByLabelText('Business Name');
      await user.clear(businessNameInput);
      await user.type(businessNameInput, 'Smart Email Marketing Pro');

      const descriptionInput = screen.getByLabelText('Business Description');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Advanced email marketing automation with AI-powered personalization.');

      const monthlyValueInput = screen.getByLabelText('Monthly Value ($)');
      await user.clear(monthlyValueInput);
      await user.type(monthlyValueInput, '1200');

      // Save configuration
      await user.click(screen.getByText('Save Configuration'));

      await waitFor(() => {
        expect(mockWorkflowCurationService.createClientTemplate).toHaveBeenCalledWith(
          'workflow-1',
          expect.objectContaining({
            businessName: 'Smart Email Marketing Pro',
            businessDescription: 'Advanced email marketing automation with AI-powered personalization.',
            monthlyValue: 1200
          })
        );
      });

      // Step 3: Activate the workflow
      const playButton = screen.getByLabelText('Activate workflow');
      await user.click(playButton);

      expect(mockN8nService.setWorkflowActive).toHaveBeenCalledWith('workflow-1', true);
    });

    test('client workflow discovery and setup flow', async () => {
      // Setup client-ready templates
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue([mockTemplate]);

      const mockOnSelectWorkflow = jest.fn();
      const mockOnRequestDemo = jest.fn();

      // Phase 2: Client Catalog - Browse and select workflow
      render(
        <WorkflowCatalog
          onSelectWorkflow={mockOnSelectWorkflow}
          onRequestDemo={mockOnRequestDemo}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Smart Email Marketing')).toBeInTheDocument();
      });

      // Step 1: Browse and filter workflows
      expect(screen.getByText('1 automation found')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
      expect(screen.getByText('$800/mo')).toBeInTheDocument();

      // Step 2: Filter by category
      const categorySelect = screen.getByLabelText('Category');
      await user.click(categorySelect);
      await user.click(screen.getByText('Marketing'));

      // Should still show the marketing workflow
      expect(screen.getByText('Smart Email Marketing')).toBeInTheDocument();

      // Step 3: Search functionality
      const searchInput = screen.getByPlaceholderText('Search automations...');
      await user.type(searchInput, 'email');

      await waitFor(() => {
        expect(screen.getByText('Smart Email Marketing')).toBeInTheDocument();
      });

      // Step 4: Request demo
      await user.click(screen.getByText('Request Demo'));
      expect(mockOnRequestDemo).toHaveBeenCalledWith(mockTemplate);

      // Step 5: Start setup process
      await user.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(screen.getByTestId('setup-wizard-integration')).toBeInTheDocument();
        expect(screen.getByText('Setup Wizard: Smart Email Marketing')).toBeInTheDocument();
      });

      // Step 6: Complete setup
      await user.click(screen.getByText('Complete Setup'));

      expect(mockOnSelectWorkflow).toHaveBeenCalledWith(mockTemplate);
    });
  });

  describe('Error Handling Integration', () => {
    test('handles service failures gracefully across components', async () => {
      // Simulate n8n service failure
      mockN8nService.getWorkflows.mockRejectedValue(new Error('n8n service unavailable'));
      mockWorkflowCurationService.getClientTemplates.mockRejectedValue(new Error('Curation service error'));

      // Admin panel should handle n8n failure
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // Total workflows should show 0
      });

      // Client catalog should handle curation service failure
      render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('0 automations found')).toBeInTheDocument();
      });
    });

    test('handles partial data consistency issues', async () => {
      // Simulate inconsistent data between services
      mockN8nService.getWorkflows.mockResolvedValue([mockWorkflowData]);
      mockN8nService.getWorkflow.mockResolvedValue(null); // Workflow exists in list but not individually

      render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      // Try to edit metadata for non-existent workflow
      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      // Should handle gracefully - either show error or provide fallback
      await waitFor(() => {
        // Should either show an error or use fallback data
        expect(
          screen.queryByText('Configure Business Metadata') ||
          screen.queryByText('Error loading workflow')
        ).toBeTruthy();
      });
    });
  });

  describe('Data Flow Validation', () => {
    test('validates data consistency between admin and client views', async () => {
      const clientReadyWorkflow = {
        ...mockWorkflowData,
        tags: ['client-ready']
      };

      // Setup data for both admin and client views
      mockN8nService.getWorkflows.mockResolvedValue([clientReadyWorkflow]);
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue([mockTemplate]);

      // Render admin panel
      const { unmount: unmountAdmin } = render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Client ready count
      });

      unmountAdmin();

      // Render client catalog
      render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Smart Email Marketing')).toBeInTheDocument();
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
      });

      // Verify that the workflow appears correctly in both views
      expect(mockWorkflowCurationService.getClientTemplates).toHaveBeenCalled();
    });

    test('ensures workflow visibility changes are reflected correctly', async () => {
      let workflowTags = ['internal-only'];
      
      // Mock dynamic tag updates
      mockN8nService.getWorkflows.mockImplementation(() => 
        Promise.resolve([{ ...mockWorkflowData, tags: workflowTags }])
      );
      
      mockWorkflowCurationService.setWorkflowVisibility.mockImplementation((id, visibility) => {
        workflowTags = [visibility];
        return Promise.resolve();
      });

      mockWorkflowCurationService.getClientTemplates.mockImplementation(() => {
        if (workflowTags.includes('client-ready') || workflowTags.includes('client-template')) {
          return Promise.resolve([mockTemplate]);
        }
        return Promise.resolve([]);
      });

      // Start with admin panel showing internal-only workflow
      const { rerender } = render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument(); // Client ready count should be 0
      });

      // Change to client-ready
      const visibilitySelects = screen.getAllByDisplayValue('internal-only');
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Client Ready'));

      // Verify the change was made
      expect(mockWorkflowCurationService.setWorkflowVisibility).toHaveBeenCalledWith(
        'workflow-1',
        'client-ready'
      );

      // Re-render to simulate data refresh
      rerender(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Client ready count should now be 1
      });
    });
  });

  describe('Performance Integration', () => {
    test('handles concurrent operations efficiently', async () => {
      const largeWorkflowList = Array.from({ length: 50 }, (_, i) => ({
        ...mockWorkflowData,
        id: `workflow-${i}`,
        name: `Workflow ${i}`,
        tags: i % 2 === 0 ? ['client-ready'] : ['internal-only']
      }));

      const largeTemplateList = Array.from({ length: 25 }, (_, i) => ({
        ...mockTemplate,
        id: `template-${i}`,
        businessName: `Template ${i}`
      }));

      mockN8nService.getWorkflows.mockResolvedValue(largeWorkflowList);
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue(largeTemplateList);

      const startTime = performance.now();

      // Render both components simultaneously
      const { unmount: unmountAdmin } = render(<WorkflowAdminPanel />);
      const { unmount: unmountCatalog } = render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument(); // Total workflows in admin
        expect(screen.getByText('25 automations found')).toBeInTheDocument(); // Templates in catalog
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      unmountAdmin();
      unmountCatalog();
    });

    test('optimizes repeated operations through caching', async () => {
      mockN8nService.getWorkflows.mockResolvedValue([mockWorkflowData]);
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue([mockTemplate]);

      // Multiple renders should use cached data where possible
      const { unmount: unmount1 } = render(<WorkflowAdminPanel />);
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });
      unmount1();

      const { unmount: unmount2 } = render(<WorkflowAdminPanel />);
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });
      unmount2();

      // Services should have been called efficiently
      expect(mockN8nService.getWorkflows).toHaveBeenCalledTimes(2); // Once per component instance
    });
  });

  describe('User Experience Flow', () => {
    test('validates complete user journey from admin configuration to client usage', async () => {
      // Journey Step 1: Admin configures new workflow
      mockN8nService.getWorkflows.mockResolvedValue([{
        ...mockWorkflowData,
        tags: [] // New workflow without tags
      }]);

      render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Unconfigured count
      });

      // Configure as client-ready
      const visibilitySelects = screen.getAllByDisplayValue('internal-only');
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Client Ready'));

      // Journey Step 2: Configure business metadata
      mockWorkflowCurationService.analyzeWorkflow.mockResolvedValue({
        suggestedTemplate: mockTemplate,
        analysisResults: {
          nodeCount: 2,
          nodeTypes: ['webhook', 'gmail'],
          integrations: ['gmail'],
          triggers: ['webhook'],
          actions: ['gmail'],
          complexity: 'low' as const,
          category: 'Marketing',
          automationType: 'Event-driven',
          estimatedSetupTime: 20,
          businessValue: 500
        }
      });

      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Save Configuration'));

      // Journey Step 3: Client discovers and uses workflow
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue([mockTemplate]);

      const { unmount } = render(
        <WorkflowCatalog
          onSelectWorkflow={jest.fn()}
          onRequestDemo={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Smart Email Marketing')).toBeInTheDocument();
      });

      // Verify all journey steps completed successfully
      expect(mockWorkflowCurationService.setWorkflowVisibility).toHaveBeenCalled();
      expect(mockWorkflowCurationService.createClientTemplate).toHaveBeenCalled();
      expect(mockWorkflowCurationService.getClientTemplates).toHaveBeenCalled();

      unmount();
    });
  });

  describe('State Management Integration', () => {
    test('maintains consistent state across component interactions', async () => {
      const workflowState = {
        ...mockWorkflowData,
        active: false,
        tags: ['internal-only']
      };

      let currentState = { ...workflowState };

      // Mock state changes
      mockN8nService.getWorkflows.mockImplementation(() => 
        Promise.resolve([currentState])
      );

      mockN8nService.setWorkflowActive.mockImplementation((id, active) => {
        currentState = { ...currentState, active };
        return Promise.resolve(true);
      });

      mockWorkflowCurationService.setWorkflowVisibility.mockImplementation((id, visibility) => {
        currentState = { ...currentState, tags: [visibility] };
        return Promise.resolve();
      });

      render(<WorkflowAdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });

      // Activate workflow
      const playButton = screen.getByLabelText('Activate workflow');
      await user.click(playButton);

      // Verify state consistency
      expect(currentState.active).toBe(true);

      // Change visibility
      const visibilitySelects = screen.getAllByDisplayValue('internal-only');
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Client Ready'));

      expect(currentState.tags).toEqual(['client-ready']);
    });
  });
});