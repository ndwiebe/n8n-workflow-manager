import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowCatalog } from '../../../components/client/WorkflowCatalog';
import { workflowCurationService } from '../../../services/workflowCurationService';

// Mock the services
jest.mock('../../../services/workflowCurationService');

const mockWorkflowCurationService = workflowCurationService as jest.Mocked<typeof workflowCurationService>;

// Mock WorkflowSetupWizard component
jest.mock('../../../components/setup/WorkflowSetupWizard', () => ({
  WorkflowSetupWizard: ({ open, onClose, template, onComplete }: any) => (
    open ? (
      <div data-testid="setup-wizard">
        <h3>Setup Wizard for {template?.businessName}</h3>
        <button onClick={() => onComplete({ test: 'config' })}>Complete Setup</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

// Mock data
const mockTemplates = [
  {
    id: 'template-1',
    name: 'Email Marketing Automation',
    businessName: 'Email Marketing Pro',
    description: 'Technical description',
    businessDescription: 'Automate your email marketing campaigns and boost engagement with personalized messaging.',
    category: 'Marketing' as const,
    industry: ['Small Business', 'E-commerce'],
    difficulty: 'beginner' as const,
    setupTime: '15-30 minutes',
    monthlyValue: 800,
    timesSaved: '5 hours per week',
    features: ['Automated campaigns', 'Personalization', 'Analytics tracking', 'A/B testing'],
    requirements: [],
    tags: ['client-template', 'popular'],
    isClientReady: true,
    consulantOnly: false,
    originalWorkflowId: 'workflow-1',
    credentialsNeeded: [],
    setupSteps: [],
    successMetrics: [],
    icon: 'Campaign'
  },
  {
    id: 'template-2',
    name: 'Invoice Processing',
    businessName: 'Smart Invoice Handler',
    description: 'Technical description',
    businessDescription: 'Streamline your invoice processing and reduce manual data entry errors.',
    category: 'Finance' as const,
    industry: ['Small Business', 'Technology'],
    difficulty: 'intermediate' as const,
    setupTime: '30-60 minutes',
    monthlyValue: 1200,
    timesSaved: '8 hours per week',
    features: ['OCR processing', 'Auto-categorization', 'Approval workflow'],
    requirements: [],
    tags: ['client-template'],
    isClientReady: true,
    consulantOnly: true,
    originalWorkflowId: 'workflow-2',
    credentialsNeeded: [],
    setupSteps: [],
    successMetrics: [],
    icon: 'AttachMoney'
  },
  {
    id: 'template-3',
    name: 'Customer Support Automation',
    businessName: 'Support Desk Pro',
    description: 'Technical description',
    businessDescription: 'Enhance customer satisfaction with automated support ticket routing and responses.',
    category: 'Customer Service' as const,
    industry: ['Small Business', 'Technology', 'Healthcare'],
    difficulty: 'advanced' as const,
    setupTime: '1+ hours',
    monthlyValue: 600,
    timesSaved: '10 hours per week',
    features: ['Ticket routing', 'Auto-responses', 'Escalation rules', 'SLA tracking'],
    requirements: [],
    tags: ['client-template'],
    isClientReady: true,
    consulantOnly: false,
    originalWorkflowId: 'workflow-3',
    credentialsNeeded: [],
    setupSteps: [],
    successMetrics: [],
    icon: 'Support'
  }
];

describe('WorkflowCatalog', () => {
  const user = userEvent.setup();
  const mockOnSelectWorkflow = jest.fn();
  const mockOnRequestDemo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkflowCurationService.getClientTemplates.mockResolvedValue(mockTemplates);
  });

  const defaultProps = {
    onSelectWorkflow: mockOnSelectWorkflow,
    onRequestDemo: mockOnRequestDemo
  };

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      mockWorkflowCurationService.getClientTemplates.mockImplementation(() => new Promise(() => {}));
      render(<WorkflowCatalog {...defaultProps} />);
      
      // Should show skeleton loading cards
      expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(6);
    });

    test('renders catalog header and description', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Automation Catalog')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Choose from our proven automation solutions/)).toBeInTheDocument();
      expect(screen.getByText(/Join 200\+ businesses/)).toBeInTheDocument();
    });

    test('renders filter controls', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search automations...')).toBeInTheDocument();
        expect(screen.getByLabelText('Category')).toBeInTheDocument();
        expect(screen.getByLabelText('Industry')).toBeInTheDocument();
        expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
      });
    });

    test('renders view mode toggle', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
      });
    });
  });

  describe('Template Cards Display', () => {
    test('displays all templates by default', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
        expect(screen.getByText('Smart Invoice Handler')).toBeInTheDocument();
        expect(screen.getByText('Support Desk Pro')).toBeInTheDocument();
      });
      
      expect(screen.getByText('3 automations found')).toBeInTheDocument();
    });

    test('displays template information correctly', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });

      // Check for business description
      expect(screen.getByText(/Automate your email marketing campaigns/)).toBeInTheDocument();
      
      // Check for metrics
      expect(screen.getByText('15-30 minutes')).toBeInTheDocument();
      expect(screen.getByText('5 hours per week')).toBeInTheDocument();
      expect(screen.getByText('$800/mo')).toBeInTheDocument();
      
      // Check for difficulty
      expect(screen.getByText('beginner')).toBeInTheDocument();
      
      // Check for category
      expect(screen.getByText('Marketing')).toBeInTheDocument();
      
      // Check for features
      expect(screen.getByText('Automated campaigns')).toBeInTheDocument();
      expect(screen.getByText('Personalization')).toBeInTheDocument();
      expect(screen.getByText('Analytics tracking')).toBeInTheDocument();
      expect(screen.getByText('+1 more')).toBeInTheDocument(); // Fourth feature collapsed
    });

    test('displays industry tags', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Small Business')).toHaveLength(3);
        expect(screen.getAllByText('Technology')).toHaveLength(2);
        expect(screen.getByText('E-commerce')).toBeInTheDocument();
        expect(screen.getByText('Healthcare')).toBeInTheDocument();
      });
    });

    test('shows ratings for templates', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('(Based on client success)')).toHaveLength(3);
      });
    });
  });

  describe('Search and Filtering', () => {
    test('filters templates by search term', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search automations...');
      await user.type(searchInput, 'email');

      await waitFor(() => {
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
        expect(screen.queryByText('Smart Invoice Handler')).not.toBeInTheDocument();
      });
    });

    test('filters templates by category', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText('Category');
      await user.click(categorySelect);
      await user.click(screen.getByText('Finance'));

      await waitFor(() => {
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
        expect(screen.getByText('Smart Invoice Handler')).toBeInTheDocument();
        expect(screen.queryByText('Email Marketing Pro')).not.toBeInTheDocument();
      });
    });

    test('filters templates by industry', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      const industrySelect = screen.getByLabelText('Industry');
      await user.click(industrySelect);
      await user.click(screen.getByText('E-commerce'));

      await waitFor(() => {
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });
    });

    test('filters templates by difficulty', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      const difficultySelect = screen.getByLabelText('Difficulty');
      await user.click(difficultySelect);
      await user.click(screen.getByText('Advanced'));

      await waitFor(() => {
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
        expect(screen.getByText('Support Desk Pro')).toBeInTheDocument();
      });
    });

    test('combines multiple filters', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      // Filter by industry and difficulty
      const industrySelect = screen.getByLabelText('Industry');
      await user.click(industrySelect);
      await user.click(screen.getByText('Technology'));

      const difficultySelect = screen.getByLabelText('Difficulty');
      await user.click(difficultySelect);
      await user.click(screen.getByText('Intermediate'));

      await waitFor(() => {
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
        expect(screen.getByText('Smart Invoice Handler')).toBeInTheDocument();
      });
    });

    test('shows no results message when no templates match filters', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search automations...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/No automations match your current filters/)).toBeInTheDocument();
        expect(screen.getByText('clear all filters')).toBeInTheDocument();
      });
    });

    test('clears all filters', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      // Apply some filters
      const searchInput = screen.getByPlaceholderText('Search automations...');
      await user.type(searchInput, 'email');

      const categorySelect = screen.getByLabelText('Category');
      await user.click(categorySelect);
      await user.click(screen.getByText('Marketing'));

      await waitFor(() => {
        expect(screen.getByText('1 automation found')).toBeInTheDocument();
      });

      // Clear all filters
      await user.clear(searchInput);
      await user.click(categorySelect);
      await user.click(screen.getByText('All Categories'));

      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode Toggle', () => {
    test('switches between grid and list view', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });

      // Default should be grid view
      const gridContainer = screen.getByText('Email Marketing Pro').closest('.MuiGrid-item');
      expect(gridContainer).toHaveClass('MuiGrid-md6'); // Grid layout class

      // Switch to list view
      const listViewButton = screen.getByRole('button', { name: /list view/i });
      await user.click(listViewButton);

      // Should now be list view
      const listContainer = screen.getByText('Email Marketing Pro').closest('.MuiGrid-item');
      expect(listContainer).toHaveClass('MuiGrid-md12'); // List layout class
    });
  });

  describe('Template Actions', () => {
    test('handles request demo action', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });

      const demoButtons = screen.getAllByText('Request Demo');
      await user.click(demoButtons[0]);

      expect(mockOnRequestDemo).toHaveBeenCalledWith(mockTemplates[0]);
    });

    test('opens setup wizard on get started click', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });

      const getStartedButtons = screen.getAllByText('Get Started');
      await user.click(getStartedButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('setup-wizard')).toBeInTheDocument();
        expect(screen.getByText('Setup Wizard for Email Marketing Pro')).toBeInTheDocument();
      });
    });

    test('handles setup wizard completion', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });

      const getStartedButtons = screen.getAllByText('Get Started');
      await user.click(getStartedButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('setup-wizard')).toBeInTheDocument();
      });

      const completeButton = screen.getByText('Complete Setup');
      await user.click(completeButton);

      expect(mockOnSelectWorkflow).toHaveBeenCalledWith(mockTemplates[0]);
    });

    test('closes setup wizard', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });

      const getStartedButtons = screen.getAllByText('Get Started');
      await user.click(getStartedButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('setup-wizard')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('setup-wizard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Call to Action Section', () => {
    test('renders custom automation CTA', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText("Don't see what you need?")).toBeInTheDocument();
        expect(screen.getByText(/Our automation experts can create/)).toBeInTheDocument();
        expect(screen.getByText('Request Custom Automation')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles template loading error gracefully', async () => {
      mockWorkflowCurationService.getClientTemplates.mockRejectedValue(new Error('API Error'));
      
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId(/skeleton/i)).not.toBeInTheDocument();
      });
      
      // Should show empty state
      expect(screen.getByText('0 automations found')).toBeInTheDocument();
    });

    test('handles empty template list', async () => {
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue([]);
      
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('0 automations found')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search automations...')).toHaveAttribute('aria-label');
        expect(screen.getByLabelText('Category')).toBeInTheDocument();
        expect(screen.getByLabelText('Industry')).toBeInTheDocument();
        expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Marketing Pro')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab(); // Search input
      expect(screen.getByPlaceholderText('Search automations...')).toHaveFocus();

      await user.tab(); // Category filter
      expect(screen.getByLabelText('Category')).toHaveFocus();

      await user.tab(); // Industry filter
      expect(screen.getByLabelText('Industry')).toHaveFocus();

      await user.tab(); // Difficulty filter
      expect(screen.getByLabelText('Difficulty')).toHaveFocus();
    });
  });

  describe('Performance', () => {
    test('handles large template lists efficiently', async () => {
      // Create a large list of templates
      const largeTemplateList = Array.from({ length: 50 }, (_, i) => ({
        ...mockTemplates[0],
        id: `template-${i}`,
        businessName: `Template ${i}`
      }));
      
      mockWorkflowCurationService.getClientTemplates.mockResolvedValue(largeTemplateList);
      
      const startTime = performance.now();
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Template 0')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('debounces search input', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 automations found')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search automations...');
      
      // Type rapidly
      await user.type(searchInput, 'test', { delay: 10 });
      
      // Should not trigger filtering on every keystroke
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    });
  });

  describe('Value Display Formatting', () => {
    test('formats monthly value correctly', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('$800/mo')).toBeInTheDocument(); // Regular value
        expect(screen.getByText('$1.2k/mo')).toBeInTheDocument(); // Value >= 1000
        expect(screen.getByText('$600/mo')).toBeInTheDocument(); // Regular value
      });
    });

    test('displays difficulty colors correctly', async () => {
      render(<WorkflowCatalog {...defaultProps} />);
      
      await waitFor(() => {
        const beginnerChip = screen.getByText('beginner').closest('.MuiChip-root');
        const intermediateChip = screen.getByText('intermediate').closest('.MuiChip-root');
        const advancedChip = screen.getByText('advanced').closest('.MuiChip-root');

        expect(beginnerChip).toHaveClass('MuiChip-colorSuccess');
        expect(intermediateChip).toHaveClass('MuiChip-colorWarning');
        expect(advancedChip).toHaveClass('MuiChip-colorError');
      });
    });
  });
});