import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BusinessMetrics } from '../../../components/metrics/BusinessMetrics';
import { BusinessMetricsProvider } from '../../../store/BusinessMetricsStore';
import { QueryClient, QueryClientProvider } from 'react-query';

// Mock data for business metrics
const mockBusinessData = {
  monthlyRevenue: 150000,
  quarterlyRevenue: 450000,
  annualRevenue: 1800000,
  monthlyExpenses: 90000,
  grossProfit: 60000,
  netProfit: 45000,
  profitMargin: 30,
  customerCount: 250,
  averageOrderValue: 600,
  churnRate: 5.2,
  customerLifetimeValue: 7200,
  workflowMetrics: {
    totalAutomations: 8,
    activeWorkflows: 6,
    timeSaved: 120,
    costSavings: 15000,
    errorReduction: 85,
  }
};

const mockTrendData = [
  { month: 'Jan', revenue: 140000, expenses: 85000, profit: 55000 },
  { month: 'Feb', revenue: 145000, expenses: 87000, profit: 58000 },
  { month: 'Mar', revenue: 150000, expenses: 90000, profit: 60000 },
  { month: 'Apr', revenue: 155000, expenses: 88000, profit: 67000 },
  { month: 'May', revenue: 148000, expenses: 89000, profit: 59000 },
  { month: 'Jun', revenue: 162000, expenses: 92000, profit: 70000 },
];

// Mock the business metrics store
const mockMetricsStore = {
  ...mockBusinessData,
  trendData: mockTrendData,
  isLoading: false,
  error: null,
  refreshMetrics: jest.fn(),
  updateDateRange: jest.fn(),
  exportMetrics: jest.fn(),
  getComparisonData: jest.fn().mockReturnValue({
    revenueGrowth: 12.5,
    expenseGrowth: 8.2,
    profitGrowth: 18.9,
  }),
};

jest.mock('../../../store/BusinessMetricsStore', () => ({
  useBusinessMetrics: () => mockMetricsStore,
  BusinessMetricsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock chart components
jest.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => <div data-testid="line-chart" {...props}>{children}</div>,
  Line: (props: any) => <div data-testid="line" {...props} />,
  XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, ...props }: any) => <div data-testid="bar-chart" {...props}>{children}</div>,
  Bar: (props: any) => <div data-testid="bar" {...props} />,
  PieChart: ({ children, ...props }: any) => <div data-testid="pie-chart" {...props}>{children}</div>,
  Pie: (props: any) => <div data-testid="pie" {...props} />,
  Cell: (props: any) => <div data-testid="cell" {...props} />,
}));

describe('BusinessMetrics Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let queryClient: QueryClient;

  beforeEach(() => {
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderBusinessMetrics = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BusinessMetricsProvider>
          <BusinessMetrics {...props} />
        </BusinessMetricsProvider>
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    it('renders all key performance indicators', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/monthly revenue/i)).toBeInTheDocument();
      expect(screen.getByText(/\$150,000/)).toBeInTheDocument();
      expect(screen.getByText(/net profit/i)).toBeInTheDocument();
      expect(screen.getByText(/\$45,000/)).toBeInTheDocument();
      expect(screen.getByText(/customer count/i)).toBeInTheDocument();
      expect(screen.getByText(/250/)).toBeInTheDocument();
    });

    it('displays workflow automation metrics', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/total automations/i)).toBeInTheDocument();
      expect(screen.getByText(/8/)).toBeInTheDocument();
      expect(screen.getByText(/time saved/i)).toBeInTheDocument();
      expect(screen.getByText(/120 hours/i)).toBeInTheDocument();
      expect(screen.getByText(/cost savings/i)).toBeInTheDocument();
      expect(screen.getByText(/\$15,000/)).toBeInTheDocument();
    });

    it('renders trend charts', () => {
      renderBusinessMetrics();

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('shows date range selector', () => {
      renderBusinessMetrics();

      expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/last 6 months/i)).toBeInTheDocument();
    });
  });

  describe('Data Loading States', () => {
    it('shows loading skeleton when data is loading', () => {
      mockMetricsStore.isLoading = true;
      renderBusinessMetrics();

      expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
      expect(screen.queryByText(/monthly revenue/i)).not.toBeInTheDocument();
    });

    it('displays error message when data fails to load', () => {
      mockMetricsStore.error = 'Failed to load metrics data';
      mockMetricsStore.isLoading = false;
      renderBusinessMetrics();

      expect(screen.getByText(/failed to load metrics data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('retries data loading when retry button is clicked', async () => {
      mockMetricsStore.error = 'Network error';
      mockMetricsStore.isLoading = false;
      renderBusinessMetrics();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockMetricsStore.refreshMetrics).toHaveBeenCalled();
    });
  });

  describe('Date Range Selection', () => {
    it('updates date range when selector changes', async () => {
      renderBusinessMetrics();

      const dateSelector = screen.getByLabelText(/date range/i);
      await user.selectOptions(dateSelector, 'last-12-months');

      expect(mockMetricsStore.updateDateRange).toHaveBeenCalledWith('last-12-months');
    });

    it('shows custom date picker when custom range is selected', async () => {
      renderBusinessMetrics();

      const dateSelector = screen.getByLabelText(/date range/i);
      await user.selectOptions(dateSelector, 'custom');

      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('validates custom date range', async () => {
      renderBusinessMetrics();

      const dateSelector = screen.getByLabelText(/date range/i);
      await user.selectOptions(dateSelector, 'custom');

      const startDate = screen.getByLabelText(/start date/i);
      const endDate = screen.getByLabelText(/end date/i);

      await user.type(startDate, '2024-06-01');
      await user.type(endDate, '2024-05-01'); // End before start

      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
    });
  });

  describe('KPI Cards', () => {
    it('displays percentage changes with correct colors', () => {
      renderBusinessMetrics();

      const growthIndicators = screen.getAllByTestId('growth-indicator');
      expect(growthIndicators[0]).toHaveClass('positive-growth'); // Revenue growth
      expect(growthIndicators[1]).toHaveClass('positive-growth'); // Profit growth
    });

    it('shows trend arrows for positive and negative changes', () => {
      renderBusinessMetrics();

      expect(screen.getByTestId('trend-up-arrow')).toBeInTheDocument();
      expect(screen.queryByTestId('trend-down-arrow')).not.toBeInTheDocument();
    });

    it('formats currency values correctly', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/\$150,000/)).toBeInTheDocument(); // Monthly revenue
      expect(screen.getByText(/\$450,000/)).toBeInTheDocument(); // Quarterly revenue
      expect(screen.getByText(/\$1,800,000/)).toBeInTheDocument(); // Annual revenue
    });

    it('displays percentages with proper formatting', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/30%/)).toBeInTheDocument(); // Profit margin
      expect(screen.getByText(/5.2%/)).toBeInTheDocument(); // Churn rate
    });
  });

  describe('Charts and Visualizations', () => {
    it('renders revenue trend chart with correct data', () => {
      renderBusinessMetrics();

      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toHaveAttribute('data', JSON.stringify(mockTrendData));
    });

    it('shows different chart types based on selected view', async () => {
      renderBusinessMetrics();

      const chartTypeSelector = screen.getByLabelText(/chart type/i);
      await user.selectOptions(chartTypeSelector, 'bar');

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('displays chart tooltips on hover', async () => {
      renderBusinessMetrics();

      const chartArea = screen.getByTestId('line-chart');
      await user.hover(chartArea);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('supports chart data export', async () => {
      renderBusinessMetrics();

      const exportButton = screen.getByRole('button', { name: /export chart/i });
      await user.click(exportButton);

      expect(mockMetricsStore.exportMetrics).toHaveBeenCalledWith({
        type: 'chart',
        format: 'png',
        data: mockTrendData,
      });
    });
  });

  describe('Workflow Automation Metrics', () => {
    it('displays automation efficiency metrics', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/active workflows/i)).toBeInTheDocument();
      expect(screen.getByText(/6/)).toBeInTheDocument();
      expect(screen.getByText(/error reduction/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });

    it('shows time savings visualization', () => {
      renderBusinessMetrics();

      expect(screen.getByTestId('time-savings-chart')).toBeInTheDocument();
      expect(screen.getByText(/120 hours saved/i)).toBeInTheDocument();
    });

    it('displays cost savings breakdown', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/labor cost savings/i)).toBeInTheDocument();
      expect(screen.getByText(/operational savings/i)).toBeInTheDocument();
      expect(screen.getByText(/efficiency gains/i)).toBeInTheDocument();
    });
  });

  describe('Customer Metrics', () => {
    it('displays customer acquisition and retention metrics', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/customer lifetime value/i)).toBeInTheDocument();
      expect(screen.getByText(/\$7,200/)).toBeInTheDocument();
      expect(screen.getByText(/average order value/i)).toBeInTheDocument();
      expect(screen.getByText(/\$600/)).toBeInTheDocument();
    });

    it('shows churn rate with proper warning colors', () => {
      renderBusinessMetrics();

      const churnElement = screen.getByText(/5.2%/);
      expect(churnElement).toHaveClass('metric-warning'); // High churn rate
    });
  });

  describe('Data Refresh', () => {
    it('refreshes data when refresh button is clicked', async () => {
      renderBusinessMetrics();

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockMetricsStore.refreshMetrics).toHaveBeenCalled();
    });

    it('shows last updated timestamp', () => {
      renderBusinessMetrics();

      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
    });

    it('auto-refreshes data at specified intervals', async () => {
      jest.useFakeTimers();
      renderBusinessMetrics({ autoRefresh: true, refreshInterval: 300000 }); // 5 minutes

      jest.advanceTimersByTime(300000);

      expect(mockMetricsStore.refreshMetrics).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Export Functionality', () => {
    it('exports metrics data as CSV', async () => {
      renderBusinessMetrics();

      const exportButton = screen.getByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const csvOption = screen.getByText(/csv/i);
      await user.click(csvOption);

      expect(mockMetricsStore.exportMetrics).toHaveBeenCalledWith({
        format: 'csv',
        data: expect.objectContaining(mockBusinessData),
      });
    });

    it('exports comprehensive PDF report', async () => {
      renderBusinessMetrics();

      const exportButton = screen.getByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const pdfOption = screen.getByText(/pdf report/i);
      await user.click(pdfOption);

      expect(mockMetricsStore.exportMetrics).toHaveBeenCalledWith({
        format: 'pdf',
        includeCharts: true,
        data: expect.objectContaining(mockBusinessData),
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for tablet screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderBusinessMetrics();

      const container = screen.getByTestId('metrics-container');
      expect(container).toHaveClass('tablet-layout');
    });

    it('stacks KPI cards on mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderBusinessMetrics();

      const kpiGrid = screen.getByTestId('kpi-grid');
      expect(kpiGrid).toHaveClass('mobile-stack');
    });

    it('adjusts chart dimensions for different screen sizes', () => {
      renderBusinessMetrics();

      const responsiveContainer = screen.getByTestId('responsive-container');
      expect(responsiveContainer).toHaveAttribute('width', '100%');
      expect(responsiveContainer).toHaveAttribute('height', '400');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for metrics', () => {
      renderBusinessMetrics();

      expect(screen.getByLabelText(/monthly revenue: \$150,000/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/net profit: \$45,000/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation through charts', async () => {
      renderBusinessMetrics();

      const chartContainer = screen.getByTestId('line-chart');
      chartContainer.focus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('announces data updates to screen readers', async () => {
      renderBusinessMetrics();

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(screen.getByRole('status')).toHaveTextContent(/metrics updated/i);
    });
  });

  describe('Performance', () => {
    it('memoizes chart components to prevent unnecessary re-renders', () => {
      const { rerender } = renderBusinessMetrics();
      
      const initialChart = screen.getByTestId('line-chart');
      
      rerender(
        <QueryClientProvider client={queryClient}>
          <BusinessMetricsProvider>
            <BusinessMetrics />
          </BusinessMetricsProvider>
        </QueryClientProvider>
      );

      const updatedChart = screen.getByTestId('line-chart');
      expect(updatedChart).toBe(initialChart); // Same instance due to memoization
    });

    it('lazy loads chart data for better performance', async () => {
      renderBusinessMetrics({ lazyLoadCharts: true });

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();

      const chartsTab = screen.getByRole('tab', { name: /charts/i });
      await user.click(chartsTab);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });
});