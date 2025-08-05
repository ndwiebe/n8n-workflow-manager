import { BusinessMetricsService } from '../../services/BusinessMetricsService';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('BusinessMetricsService', () => {
  let service: BusinessMetricsService;

  beforeEach(() => {
    service = new BusinessMetricsService();
    jest.clearAllMocks();
  });

  describe('getBusinessMetrics', () => {
    const mockMetricsData = {
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

    it('fetches business metrics successfully', async () => {
      mockedApi.get.mockResolvedValue({
        data: mockMetricsData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.getBusinessMetrics();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/metrics/business');
      expect(result).toEqual(mockMetricsData);
    });

    it('handles API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch metrics';
      mockedApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(service.getBusinessMetrics()).rejects.toThrow(errorMessage);
    });

    it('filters metrics by date range', async () => {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-06-30'
      };

      mockedApi.get.mockResolvedValue({
        data: mockMetricsData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await service.getBusinessMetrics(dateRange);

      expect(mockedApi.get).toHaveBeenCalledWith('/api/metrics/business', {
        params: dateRange
      });
    });

    it('includes company ID in request when provided', async () => {
      const companyId = 'company-123';
      service.setCompanyId(companyId);

      mockedApi.get.mockResolvedValue({
        data: mockMetricsData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await service.getBusinessMetrics();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/metrics/business', {
        params: { companyId }
      });
    });
  });

  describe('getTrendData', () => {
    const mockTrendData = [
      { month: 'Jan', revenue: 140000, expenses: 85000, profit: 55000 },
      { month: 'Feb', revenue: 145000, expenses: 87000, profit: 58000 },
      { month: 'Mar', revenue: 150000, expenses: 90000, profit: 60000 },
      { month: 'Apr', revenue: 155000, expenses: 88000, profit: 67000 },
      { month: 'May', revenue: 148000, expenses: 89000, profit: 59000 },
      { month: 'Jun', revenue: 162000, expenses: 92000, profit: 70000 },
    ];

    it('fetches trend data for specified period', async () => {
      mockedApi.get.mockResolvedValue({
        data: mockTrendData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.getTrendData('6months');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/metrics/trends', {
        params: { period: '6months' }
      });
      expect(result).toEqual(mockTrendData);
    });

    it('supports custom date ranges for trends', async () => {
      const customRange = {
        startDate: '2024-01-01',
        endDate: '2024-06-30'
      };

      mockedApi.get.mockResolvedValue({
        data: mockTrendData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.getTrendData('custom', customRange);

      expect(mockedApi.get).toHaveBeenCalledWith('/api/metrics/trends', {
        params: { period: 'custom', ...customRange }
      });
      expect(result).toEqual(mockTrendData);
    });

    it('validates trend data structure', async () => {
      const invalidTrendData = [
        { month: 'Jan' }, // Missing required fields
        { revenue: 140000 }, // Missing month
      ];

      mockedApi.get.mockResolvedValue({
        data: invalidTrendData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(service.getTrendData('6months')).rejects.toThrow('Invalid trend data structure');
    });
  });

  describe('calculateROI', () => {
    const mockROIData = {
      monthlyROI: 5000,
      annualROI: 60000,
      paybackPeriod: 3.2,
      efficiencyGains: 25,
      investmentCost: 20000,
      monthlySavings: 4000,
    };

    it('calculates ROI for selected workflows', async () => {
      const selectedWorkflows = ['invoice-processing', 'email-automation'];
      const businessData = {
        monthlyRevenue: 150000,
        monthlyExpenses: 90000,
        employeeCount: 25,
      };

      mockedApi.post.mockResolvedValue({
        data: mockROIData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.calculateROI(selectedWorkflows, businessData);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/metrics/roi', {
        workflows: selectedWorkflows,
        businessData,
      });
      expect(result).toEqual(mockROIData);
    });

    it('handles empty workflow selection', async () => {
      const result = await service.calculateROI([], {
        monthlyRevenue: 150000,
        monthlyExpenses: 90000,
        employeeCount: 25,
      });

      expect(result).toEqual({
        monthlyROI: 0,
        annualROI: 0,
        paybackPeriod: Infinity,
        efficiencyGains: 0,
        investmentCost: 0,
        monthlySavings: 0,
      });
    });

    it('validates business data before calculation', async () => {
      const invalidBusinessData = {
        monthlyRevenue: -1000, // Invalid negative revenue
        monthlyExpenses: 90000,
        employeeCount: 25,
      };

      await expect(service.calculateROI(['invoice-processing'], invalidBusinessData))
        .rejects.toThrow('Invalid business data: revenue cannot be negative');
    });

    it('includes workflow configuration costs', async () => {
      const selectedWorkflows = ['invoice-processing'];
      const businessData = {
        monthlyRevenue: 150000,
        monthlyExpenses: 90000,
        employeeCount: 25,
      };
      const workflowCosts = {
        'invoice-processing': { setup: 5000, monthly: 500 }
      };

      mockedApi.post.mockResolvedValue({
        data: { ...mockROIData, workflowCosts },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.calculateROI(selectedWorkflows, businessData, workflowCosts);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/metrics/roi', {
        workflows: selectedWorkflows,
        businessData,
        workflowCosts,
      });
      expect(result.workflowCosts).toEqual(workflowCosts);
    });
  });

  describe('getCostSavings', () => {
    const mockCostSavings = {
      timeSavings: 40,
      laborCostSavings: 2500,
      operationalSavings: 1500,
      totalMonthlySavings: 4000,
      breakdown: {
        'invoice-processing': {
          timeSaved: 20,
          costSaved: 1200,
        },
        'email-automation': {
          timeSaved: 20,
          costSaved: 800,
        }
      }
    };

    it('calculates cost savings for workflows', async () => {
      const workflows = ['invoice-processing', 'email-automation'];

      mockedApi.post.mockResolvedValue({
        data: mockCostSavings,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.getCostSavings(workflows);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/metrics/cost-savings', {
        workflows,
      });
      expect(result).toEqual(mockCostSavings);
    });

    it('includes employee hourly rates in calculation', async () => {
      const workflows = ['invoice-processing'];
      const hourlyRate = 50;

      mockedApi.post.mockResolvedValue({
        data: mockCostSavings,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await service.getCostSavings(workflows, hourlyRate);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/metrics/cost-savings', {
        workflows,
        hourlyRate,
      });
    });
  });

  describe('exportMetrics', () => {
    it('exports metrics as CSV', async () => {
      const exportData = {
        format: 'csv',
        data: { monthlyRevenue: 150000, netProfit: 45000 },
      };

      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      mockedApi.post.mockResolvedValue({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/csv' },
      });

      const result = await service.exportMetrics(exportData);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/metrics/export', exportData, {
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });

    it('exports comprehensive PDF report', async () => {
      const exportData = {
        format: 'pdf',
        includeCharts: true,
        data: { monthlyRevenue: 150000, netProfit: 45000 },
      };

      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      mockedApi.post.mockResolvedValue({
        data: mockBlob,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await service.exportMetrics(exportData);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/metrics/export', exportData, {
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });

    it('handles export errors', async () => {
      const exportData = {
        format: 'csv',
        data: { monthlyRevenue: 150000 },
      };

      mockedApi.post.mockRejectedValue(new Error('Export failed'));

      await expect(service.exportMetrics(exportData)).rejects.toThrow('Export failed');
    });
  });

  describe('getWorkflowMetrics', () => {
    const mockWorkflowMetrics = {
      'invoice-processing': {
        executionCount: 150,
        successRate: 98.5,
        averageExecutionTime: 45,
        errorRate: 1.5,
        timeSaved: 30,
        costSavings: 1800,
      },
      'email-automation': {
        executionCount: 200,
        successRate: 99.2,
        averageExecutionTime: 20,
        errorRate: 0.8,
        timeSaved: 25,
        costSavings: 1200,
      }
    };

    it('fetches workflow-specific metrics', async () => {
      mockedApi.get.mockResolvedValue({
        data: mockWorkflowMetrics,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.getWorkflowMetrics();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/metrics/workflows');
      expect(result).toEqual(mockWorkflowMetrics);
    });

    it('filters metrics by workflow IDs', async () => {
      const workflowIds = ['invoice-processing'];
      const filteredMetrics = {
        'invoice-processing': mockWorkflowMetrics['invoice-processing']
      };

      mockedApi.get.mockResolvedValue({
        data: filteredMetrics,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.getWorkflowMetrics(workflowIds);

      expect(mockedApi.get).toHaveBeenCalledWith('/api/metrics/workflows', {
        params: { workflowIds: workflowIds.join(',') }
      });
      expect(result).toEqual(filteredMetrics);
    });
  });

  describe('caching and performance', () => {
    it('caches metrics data to reduce API calls', async () => {
      const mockData = { monthlyRevenue: 150000 };
      mockedApi.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      // First call
      await service.getBusinessMetrics();
      // Second call should use cache
      await service.getBusinessMetrics();

      expect(mockedApi.get).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache after specified TTL', async () => {
      const mockData = { monthlyRevenue: 150000 };
      mockedApi.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      jest.useFakeTimers();

      // First call
      await service.getBusinessMetrics();
      
      // Advance time beyond cache TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);
      
      // Second call should make new API request
      await service.getBusinessMetrics();

      expect(mockedApi.get).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });

    it('handles concurrent requests properly', async () => {
      const mockData = { monthlyRevenue: 150000 };
      mockedApi.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      // Make concurrent calls
      const promises = [
        service.getBusinessMetrics(),
        service.getBusinessMetrics(),
        service.getBusinessMetrics(),
      ];

      await Promise.all(promises);

      // Should only make one API call due to request deduplication
      expect(mockedApi.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling and retry logic', () => {
    it('retries failed requests with exponential backoff', async () => {
      let callCount = 0;
      mockedApi.get.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          data: { monthlyRevenue: 150000 },
          status: 200,
          statusText: 'OK',
          headers: {},
        });
      });

      const result = await service.getBusinessMetrics();

      expect(mockedApi.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ monthlyRevenue: 150000 });
    });

    it('fails after maximum retry attempts', async () => {
      mockedApi.get.mockRejectedValue(new Error('Persistent network error'));

      await expect(service.getBusinessMetrics()).rejects.toThrow('Persistent network error');
      
      // Should have tried 3 times (initial + 2 retries)
      expect(mockedApi.get).toHaveBeenCalledTimes(3);
    });

    it('handles rate limiting gracefully', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' }
        }
      };

      mockedApi.get.mockRejectedValueOnce(rateLimitError);
      mockedApi.get.mockResolvedValueOnce({
        data: { monthlyRevenue: 150000 },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      jest.useFakeTimers();

      const promise = service.getBusinessMetrics();
      
      // Advance time by retry-after seconds
      jest.advanceTimersByTime(60 * 1000);

      const result = await promise;

      expect(result).toEqual({ monthlyRevenue: 150000 });
      expect(mockedApi.get).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });
  });
});