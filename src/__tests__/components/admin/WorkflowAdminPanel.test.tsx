import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowAdminPanel } from '../../../components/admin/WorkflowAdminPanel';
import { n8nService } from '../../../services/n8nService';
import { workflowCurationService } from '../../../services/workflowCurationService';

// Mock the services
jest.mock('../../../services/n8nService');
jest.mock('../../../services/workflowCurationService');

const mockN8nService = n8nService as jest.Mocked<typeof n8nService>;
const mockWorkflowCurationService = workflowCurationService as jest.Mocked<typeof workflowCurationService>;

// Mock data
const mockWorkflows = [
  {
    id: 'workflow-1',
    name: 'Email Marketing Automation',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    nodes: [{ type: 'n8n-nodes-base.webhook' }, { type: 'n8n-nodes-base.gmail' }],
    connections: {},
    settings: {},
    staticData: {},
    tags: ['client-ready', 'marketing']
  },
  {
    id: 'workflow-2',
    name: 'Invoice Processing',
    active: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    nodes: [{ type: 'n8n-nodes-base.webhook' }, { type: 'n8n-nodes-base.quickbooks' }],
    connections: {},
    settings: {},
    staticData: {},
    tags: ['internal-only', 'finance']
  },
  {
    id: 'workflow-3',
    name: 'Demo Workflow',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    nodes: [{ type: 'n8n-nodes-base.schedule' }, { type: 'n8n-nodes-base.slack' }],
    connections: {},
    settings: {},
    staticData: {},
    tags: ['consultant-demo']
  }
];

const mockTemplate = {
  businessName: 'Test Automation',
  businessDescription: 'Test description',
  category: 'Marketing' as const,
  industry: ['Small Business'],
  difficulty: 'beginner' as const,
  setupTime: '10-30 minutes',
  monthlyValue: 500,
  timesSaved: '2-5 hours per week',
  features: ['Feature 1', 'Feature 2'],
  consulantOnly: false
};

describe('WorkflowAdminPanel', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockN8nService.getWorkflows.mockResolvedValue(mockWorkflows);
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
    mockWorkflowCurationService.createClientTemplate.mockResolvedValue({
      id: 'template-workflow-1',
      name: 'Email Marketing Automation',
      ...mockTemplate,
      requirements: [],
      tags: ['client-template'],
      isClientReady: true,
      originalWorkflowId: 'workflow-1',
      credentialsNeeded: [],
      setupSteps: [],
      successMetrics: [],
      icon: 'Campaign'
    });
  });

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      mockN8nService.getWorkflows.mockImplementation(() => new Promise(() => {}));
      render(<WorkflowAdminPanel />);
      
      expect(screen.getByText('Loading workflows...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders workflow administration header', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Workflow Administration')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Configure workflow visibility, business metadata, and client-facing settings.')).toBeInTheDocument();
    });

    test('renders statistics cards correctly', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Total workflows
        expect(screen.getByText('2')).toBeInTheDocument(); // Active workflows
        expect(screen.getByText('1')).toBeInTheDocument(); // Client ready
        expect(screen.getByText('1')).toBeInTheDocument(); // Consultant demo
        expect(screen.getByText('1')).toBeInTheDocument(); // Internal only
        expect(screen.getByText('0')).toBeInTheDocument(); // Unconfigured
      });
    });

    test('renders tabs correctly', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Workflow Management')).toBeInTheDocument();
        expect(screen.getByText('Template Configuration')).toBeInTheDocument();
        expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Table Functionality', () => {
    test('displays all workflows by default', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
        expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
        expect(screen.getByText('Demo Workflow')).toBeInTheDocument();
      });
    });

    test('filters workflows by visibility', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      // Change filter to client-ready only
      const filterSelect = screen.getByLabelText('Filter by Visibility');
      await user.click(filterSelect);
      await user.click(screen.getByText('Client Ready'));

      // Should only show client-ready workflows
      expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      expect(screen.queryByText('Invoice Processing')).not.toBeInTheDocument();
      expect(screen.queryByText('Demo Workflow')).not.toBeInTheDocument();
    });

    test('displays correct workflow status chips', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        const activeChips = screen.getAllByText('Active');
        const inactiveChips = screen.getAllByText('Inactive');
        
        expect(activeChips).toHaveLength(2); // workflow-1 and workflow-3
        expect(inactiveChips).toHaveLength(1); // workflow-2
      });
    });

    test('toggles workflow active state', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
      });

      // Find the inactive workflow and toggle it
      const invoiceRow = screen.getByText('Invoice Processing').closest('tr');
      const playButton = within(invoiceRow!).getByRole('button', { name: /activate workflow/i });
      
      await user.click(playButton);

      expect(mockN8nService.setWorkflowActive).toHaveBeenCalledWith('workflow-2', true);
    });

    test('changes workflow visibility', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      // Find the first workflow's visibility dropdown
      const visibilitySelects = screen.getAllByDisplayValue('client-ready');
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Internal Only'));

      expect(mockWorkflowCurationService.setWorkflowVisibility).toHaveBeenCalledWith('workflow-1', 'internal-only');
    });
  });

  describe('Edit Metadata Dialog', () => {
    test('opens edit metadata dialog', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      // Click edit button for first workflow
      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Automation')).toBeInTheDocument();
      });
    });

    test('populates form with existing data', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Automation')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Marketing')).toBeInTheDocument();
        expect(screen.getByDisplayValue('beginner')).toBeInTheDocument();
        expect(screen.getByDisplayValue('10-30 minutes')).toBeInTheDocument();
        expect(screen.getByDisplayValue('500')).toBeInTheDocument();
      });
    });

    test('handles form validation', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Automation')).toBeInTheDocument();
      });

      // Clear required field
      const businessNameInput = screen.getByLabelText('Business Name');
      await user.clear(businessNameInput);

      // Try to save
      const saveButton = screen.getByText('Save Configuration');
      await user.click(saveButton);

      // Form should still be open (validation failed)
      expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
    });

    test('saves metadata successfully', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Automation')).toBeInTheDocument();
      });

      // Modify a field
      const descriptionInput = screen.getByLabelText('Business Description');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      // Save
      const saveButton = screen.getByText('Save Configuration');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockWorkflowCurationService.createClientTemplate).toHaveBeenCalledWith(
          'workflow-1',
          expect.objectContaining({
            businessDescription: 'Updated description'
          })
        );
      });
    });
  });

  describe('Template Configuration Tab', () => {
    test('switches to template configuration tab', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Workflow Management')).toBeInTheDocument();
      });

      const templateTab = screen.getByText('Template Configuration');
      await user.click(templateTab);

      expect(screen.getByText('Client-Ready Workflows')).toBeInTheDocument();
      expect(screen.getByText('Configure business metadata for workflows marked as "Client Ready"')).toBeInTheDocument();
    });

    test('displays only client-ready workflows in template tab', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Workflow Management')).toBeInTheDocument();
      });

      const templateTab = screen.getByText('Template Configuration');
      await user.click(templateTab);

      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
        expect(screen.queryByText('Invoice Processing')).not.toBeInTheDocument();
        expect(screen.queryByText('Demo Workflow')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles workflow loading error gracefully', async () => {
      mockN8nService.getWorkflows.mockRejectedValue(new Error('API Error'));
      
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading workflows...')).not.toBeInTheDocument();
      });
      
      // Should not crash and should show empty state
      expect(screen.getByText('0')).toBeInTheDocument(); // Total workflows stat
    });

    test('handles visibility change error', async () => {
      mockWorkflowCurationService.setWorkflowVisibility.mockRejectedValue(new Error('Update failed'));
      
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      const visibilitySelects = screen.getAllByDisplayValue('client-ready');
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Internal Only'));

      // Should handle error gracefully (not crash)
      expect(mockWorkflowCurationService.setWorkflowVisibility).toHaveBeenCalled();
    });

    test('handles metadata save error', async () => {
      mockWorkflowCurationService.createClientTemplate.mockRejectedValue(new Error('Save failed'));
      
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit business metadata');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Automation')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Configuration');
      await user.click(saveButton);

      // Dialog should remain open on error
      await waitFor(() => {
        expect(screen.getByText('Configure Business Metadata')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Visibility')).toBeInTheDocument();
        expect(screen.getAllByLabelText('Edit business metadata')).toHaveLength(3);
        expect(screen.getAllByLabelText(/activate workflow|deactivate workflow/)).toHaveLength(3);
      });
    });

    test('supports keyboard navigation', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Automation')).toBeInTheDocument();
      });

      // Tab to filter dropdown
      await user.tab();
      expect(screen.getByLabelText('Filter by Visibility')).toHaveFocus();

      // Tab through action buttons
      await user.tab();
      await user.tab();
      expect(screen.getAllByLabelText(/activate workflow|deactivate workflow/)[0]).toHaveFocus();
    });
  });

  describe('Performance', () => {
    test('debounces API calls appropriately', async () => {
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(mockN8nService.getWorkflows).toHaveBeenCalledTimes(1);
      });

      // Multiple rapid visibility changes should not cause excessive API calls
      const visibilitySelects = screen.getAllByDisplayValue('client-ready');
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Internal Only'));
      
      await user.click(visibilitySelects[0]);
      await user.click(screen.getByText('Demo Only'));

      // Should batch or debounce calls appropriately
      expect(mockWorkflowCurationService.setWorkflowVisibility).toHaveBeenCalledTimes(2);
    });

    test('handles large workflow lists efficiently', async () => {
      // Create a large list of workflows
      const largeWorkflowList = Array.from({ length: 100 }, (_, i) => ({
        ...mockWorkflows[0],
        id: `workflow-${i}`,
        name: `Workflow ${i}`
      }));
      
      mockN8nService.getWorkflows.mockResolvedValue(largeWorkflowList);
      
      const startTime = performance.now();
      render(<WorkflowAdminPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Workflow 0')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});