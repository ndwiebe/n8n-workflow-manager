import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ROICalculator } from '../../../components/metrics/ROICalculator';
import { BusinessMetricsProvider } from '../../../store/BusinessMetricsStore';

// Mock the business metrics store
const mockMetricsStore = {
  monthlyRevenue: 50000,
  monthlyExpenses: 30000,
  employeeCount: 25,
  workflowEfficiencyGains: {},
  updateMetrics: jest.fn(),
  calculateROI: jest.fn().mockReturnValue({
    monthlyROI: 5000,
    annualROI: 60000,
    paybackPeriod: 3.2,
    efficiencyGains: 25,
  }),
  calculateCostSavings: jest.fn().mockReturnValue({
    timeSavings: 40,
    laborCostSavings: 2500,
    operationalSavings: 1500,
  }),
};

jest.mock('../../../store/BusinessMetricsStore', () => ({
  useBusinessMetrics: () => mockMetricsStore,
  BusinessMetricsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ROICalculator Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const renderROICalculator = (props = {}) => {
    return render(
      <BusinessMetricsProvider>
        <ROICalculator {...props} />
      </BusinessMetricsProvider>
    );
  };

  describe('Initial Render', () => {
    it('renders all input fields with correct labels', () => {
      renderROICalculator();

      expect(screen.getByLabelText(/monthly revenue/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/monthly expenses/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of employees/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /calculate roi/i })).toBeInTheDocument();
    });

    it('displays default values from store', () => {
      renderROICalculator();

      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });

    it('renders workflow selection checkboxes', () => {
      renderROICalculator();

      expect(screen.getByLabelText(/invoice processing automation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email campaign automation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ai customer support/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/inventory sync/i)).toBeInTheDocument();
    });
  });

  describe('User Input Handling', () => {
    it('updates monthly revenue when user types', async () => {
      renderROICalculator();
      
      const revenueInput = screen.getByLabelText(/monthly revenue/i);
      await user.clear(revenueInput);
      await user.type(revenueInput, '75000');

      expect(revenueInput).toHaveValue('75000');
    });

    it('handles invalid input gracefully', async () => {
      renderROICalculator();
      
      const revenueInput = screen.getByLabelText(/monthly revenue/i);
      await user.clear(revenueInput);
      await user.type(revenueInput, 'invalid');

      expect(revenueInput).toHaveValue('');
    });

    it('prevents negative values', async () => {
      renderROICalculator();
      
      const expensesInput = screen.getByLabelText(/monthly expenses/i);
      await user.clear(expensesInput);
      await user.type(expensesInput, '-1000');

      expect(expensesInput).toHaveValue('1000');
    });

    it('formats large numbers with commas', async () => {
      renderROICalculator();
      
      const revenueInput = screen.getByLabelText(/monthly revenue/i);
      await user.clear(revenueInput);
      await user.type(revenueInput, '1000000');

      expect(revenueInput).toHaveDisplayValue('1,000,000');
    });
  });

  describe('Workflow Selection', () => {
    it('selects workflow when checkbox is clicked', async () => {
      renderROICalculator();
      
      const invoiceCheckbox = screen.getByLabelText(/invoice processing automation/i);
      await user.click(invoiceCheckbox);

      expect(invoiceCheckbox).toBeChecked();
    });

    it('displays workflow details when selected', async () => {
      renderROICalculator();
      
      const emailCheckbox = screen.getByLabelText(/email campaign automation/i);
      await user.click(emailCheckbox);

      expect(screen.getByText(/estimated time savings: 30 hours\/month/i)).toBeInTheDocument();
      expect(screen.getByText(/efficiency gain: 40%/i)).toBeInTheDocument();
    });

    it('allows multiple workflow selections', async () => {
      renderROICalculator();
      
      const invoiceCheckbox = screen.getByLabelText(/invoice processing automation/i);
      const emailCheckbox = screen.getByLabelText(/email campaign automation/i);
      
      await user.click(invoiceCheckbox);
      await user.click(emailCheckbox);

      expect(invoiceCheckbox).toBeChecked();
      expect(emailCheckbox).toBeChecked();
    });
  });

  describe('ROI Calculation', () => {
    it('calculates ROI when button is clicked', async () => {
      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      expect(mockMetricsStore.calculateROI).toHaveBeenCalled();
    });

    it('displays calculation results', async () => {
      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/monthly roi: \$5,000/i)).toBeInTheDocument();
        expect(screen.getByText(/annual roi: \$60,000/i)).toBeInTheDocument();
        expect(screen.getByText(/payback period: 3.2 months/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during calculation', async () => {
      // Mock a delayed calculation
      mockMetricsStore.calculateROI.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          monthlyROI: 5000,
          annualROI: 60000,
          paybackPeriod: 3.2,
          efficiencyGains: 25,
        }), 100))
      );

      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(calculateButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(calculateButton).toBeEnabled();
      });
    });

    it('handles calculation errors gracefully', async () => {
      mockMetricsStore.calculateROI.mockRejectedValue(new Error('Calculation failed'));

      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/error calculating roi/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cost Savings Display', () => {
    it('displays cost savings breakdown', async () => {
      renderROICalculator();
      
      // Select a workflow first
      const invoiceCheckbox = screen.getByLabelText(/invoice processing automation/i);
      await user.click(invoiceCheckbox);

      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/time savings: 40 hours\/month/i)).toBeInTheDocument();
        expect(screen.getByText(/labor cost savings: \$2,500\/month/i)).toBeInTheDocument();
        expect(screen.getByText(/operational savings: \$1,500\/month/i)).toBeInTheDocument();
      });
    });

    it('updates savings when workflows change', async () => {
      renderROICalculator();
      
      const invoiceCheckbox = screen.getByLabelText(/invoice processing automation/i);
      const emailCheckbox = screen.getByLabelText(/email campaign automation/i);
      
      await user.click(invoiceCheckbox);
      await user.click(emailCheckbox);

      expect(mockMetricsStore.calculateCostSavings).toHaveBeenCalledWith(['invoice', 'email']);
    });
  });

  describe('Business Impact Visualization', () => {
    it('renders efficiency gains chart', async () => {
      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByTestId('efficiency-chart')).toBeInTheDocument();
      });
    });

    it('displays comparative metrics', async () => {
      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/before automation/i)).toBeInTheDocument();
        expect(screen.getByText(/after automation/i)).toBeInTheDocument();
        expect(screen.getByText(/improvement: 25%/i)).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('enables export button after calculation', async () => {
      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export report/i });
        expect(exportButton).toBeEnabled();
      });
    });

    it('exports ROI report as PDF', async () => {
      const mockExport = jest.fn();
      renderROICalculator({ onExport: mockExport });
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export report/i });
        return user.click(exportButton);
      });

      expect(mockExport).toHaveBeenCalledWith({
        format: 'pdf',
        data: expect.objectContaining({
          monthlyROI: 5000,
          annualROI: 60000,
        })
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for form controls', () => {
      renderROICalculator();

      expect(screen.getByLabelText(/monthly revenue/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/monthly expenses/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/number of employees/i)).toHaveAttribute('aria-required', 'true');
    });

    it('announces calculation results to screen readers', async () => {
      renderROICalculator();
      
      const calculateButton = screen.getByRole('button', { name: /calculate roi/i });
      await user.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /roi results/i })).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      renderROICalculator();
      
      const revenueInput = screen.getByLabelText(/monthly revenue/i);
      revenueInput.focus();

      await user.keyboard('{Tab}');
      expect(screen.getByLabelText(/monthly expenses/i)).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByLabelText(/number of employees/i)).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderROICalculator();

      const container = screen.getByTestId('roi-calculator-container');
      expect(container).toHaveClass('mobile-layout');
    });

    it('displays charts appropriately on different screen sizes', () => {
      renderROICalculator();

      const chartContainer = screen.getByTestId('chart-container');
      expect(chartContainer).toHaveAttribute('data-responsive', 'true');
    });
  });
});