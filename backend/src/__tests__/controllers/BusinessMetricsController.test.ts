import request from 'supertest';
import { Express } from 'express';
import { BusinessMetricsController } from '../../controllers/BusinessMetricsController';
import { BusinessMetricsService } from '../../services/BusinessMetricsService';
import { createTestApp } from '../helpers/testApp';
import { createMockUser, createMockBusinessData } from '../helpers/mockData';

// Mock the business metrics service
jest.mock('../../services/BusinessMetricsService');
const MockedBusinessMetricsService = BusinessMetricsService as jest.MockedClass<typeof BusinessMetricsService>;

describe('BusinessMetricsController', () => {
  let app: Express;
  let mockService: jest.Mocked<BusinessMetricsService>;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();
    
    // Create a test user and get auth token
    const testUser = createMockUser();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  beforeEach(() => {
    mockService = new MockedBusinessMetricsService() as jest.Mocked<BusinessMetricsService>;
    jest.clearAllMocks();
  });

  describe('GET /api/metrics/business', () => {
    const mockBusinessMetrics = createMockBusinessData();

    it('returns business metrics for authenticated user', async () => {
      mockService.getBusinessMetrics.mockResolvedValue(mockBusinessMetrics);

      const response = await request(app)
        .get('/api/metrics/business')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockBusinessMetrics,
      });
      expect(mockService.getBusinessMetrics).toHaveBeenCalledWith(expect.any(String));
    });

    it('filters metrics by date range when provided', async () => {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-06-30'
      };

      mockService.getBusinessMetrics.mockResolvedValue(mockBusinessMetrics);

      const response = await request(app)
        .get('/api/metrics/business')
        .query(dateRange)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockService.getBusinessMetrics).toHaveBeenCalledWith(
        expect.any(String),
        dateRange
      );
    });

    it('returns 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/metrics/business')
        .expect(401);
    });

    it('handles service errors gracefully', async () => {
      mockService.getBusinessMetrics.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/business')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
      });
    });

    it('validates date range parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/business')
        .query({
          startDate: 'invalid-date',
          endDate: '2024-06-30'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Invalid date format');
    });

    it('ensures end date is after start date', async () => {
      const response = await request(app)
        .get('/api/metrics/business')
        .query({
          startDate: '2024-06-30',
          endDate: '2024-01-01'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('End date must be after start date');
    });
  });

  describe('GET /api/metrics/trends', () => {
    const mockTrendData = [
      { month: 'Jan', revenue: 140000, expenses: 85000, profit: 55000 },
      { month: 'Feb', revenue: 145000, expenses: 87000, profit: 58000 },
      { month: 'Mar', revenue: 150000, expenses: 90000, profit: 60000 },
    ];

    it('returns trend data for specified period', async () => {
      mockService.getTrendData.mockResolvedValue(mockTrendData);

      const response = await request(app)
        .get('/api/metrics/trends')
        .query({ period: '6months' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTrendData,
      });
      expect(mockService.getTrendData).toHaveBeenCalledWith('6months');
    });

    it('supports custom date ranges', async () => {
      const customRange = {
        period: 'custom',
        startDate: '2024-01-01',
        endDate: '2024-06-30'
      };

      mockService.getTrendData.mockResolvedValue(mockTrendData);

      const response = await request(app)
        .get('/api/metrics/trends')
        .query(customRange)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockService.getTrendData).toHaveBeenCalledWith(
        'custom',
        { startDate: '2024-01-01', endDate: '2024-06-30' }
      );
    });

    it('validates period parameter', async () => {
      const response = await request(app)
        .get('/api/metrics/trends')
        .query({ period: 'invalid-period' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Invalid period');
    });

    it('requires custom date range for custom period', async () => {
      const response = await request(app)
        .get('/api/metrics/trends')
        .query({ period: 'custom' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Custom period requires start and end dates');
    });
  });

  describe('POST /api/metrics/roi', () => {
    const mockROIData = {
      monthlyROI: 5000,
      annualROI: 60000,
      paybackPeriod: 3.2,
      efficiencyGains: 25,
    };

    const validRequestBody = {
      workflows: ['invoice-processing', 'email-automation'],
      businessData: {
        monthlyRevenue: 150000,
        monthlyExpenses: 90000,
        employeeCount: 25,
      }
    };

    it('calculates ROI for selected workflows', async () => {
      mockService.calculateROI.mockResolvedValue(mockROIData);

      const response = await request(app)
        .post('/api/metrics/roi')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validRequestBody)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockROIData,
      });
      expect(mockService.calculateROI).toHaveBeenCalledWith(
        validRequestBody.workflows,
        validRequestBody.businessData
      );
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/api/metrics/roi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: ['invoice-processing'],
          // Missing businessData
        })
        .expect(400);

      expect(response.body.error).toContain('Business data is required');
    });

    it('validates workflow array', async () => {
      const response = await request(app)
        .post('/api/metrics/roi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: 'not-an-array',
          businessData: validRequestBody.businessData,
        })
        .expect(400);

      expect(response.body.error).toContain('Workflows must be an array');
    });

    it('validates business data structure', async () => {
      const response = await request(app)
        .post('/api/metrics/roi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: ['invoice-processing'],
          businessData: {
            monthlyRevenue: -1000, // Invalid negative value
            monthlyExpenses: 90000,
            employeeCount: 25,
          }
        })
        .expect(400);

      expect(response.body.error).toContain('Monthly revenue must be positive');
    });

    it('handles empty workflows array', async () => {
      const emptyWorkflowsROI = {
        monthlyROI: 0,
        annualROI: 0,
        paybackPeriod: Infinity,
        efficiencyGains: 0,
      };

      mockService.calculateROI.mockResolvedValue(emptyWorkflowsROI);

      const response = await request(app)
        .post('/api/metrics/roi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: [],
          businessData: validRequestBody.businessData,
        })
        .expect(200);

      expect(response.body.data).toEqual(emptyWorkflowsROI);
    });
  });

  describe('POST /api/metrics/cost-savings', () => {
    const mockCostSavings = {
      timeSavings: 40,
      laborCostSavings: 2500,
      operationalSavings: 1500,
      totalMonthlySavings: 4000,
    };

    it('calculates cost savings for workflows', async () => {
      mockService.getCostSavings.mockResolvedValue(mockCostSavings);

      const response = await request(app)
        .post('/api/metrics/cost-savings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: ['invoice-processing', 'email-automation'],
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockCostSavings,
      });
    });

    it('includes hourly rate in calculation when provided', async () => {
      mockService.getCostSavings.mockResolvedValue(mockCostSavings);

      const response = await request(app)
        .post('/api/metrics/cost-savings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: ['invoice-processing'],
          hourlyRate: 50,
        })
        .expect(200);

      expect(mockService.getCostSavings).toHaveBeenCalledWith(
        ['invoice-processing'],
        50
      );
    });

    it('validates hourly rate is positive', async () => {
      const response = await request(app)
        .post('/api/metrics/cost-savings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: ['invoice-processing'],
          hourlyRate: -25,
        })
        .expect(400);

      expect(response.body.error).toContain('Hourly rate must be positive');
    });
  });

  describe('GET /api/metrics/workflows', () => {
    const mockWorkflowMetrics = {
      'invoice-processing': {
        executionCount: 150,
        successRate: 98.5,
        averageExecutionTime: 45,
        errorRate: 1.5,
      },
      'email-automation': {
        executionCount: 200,
        successRate: 99.2,
        averageExecutionTime: 20,
        errorRate: 0.8,
      }
    };

    it('returns metrics for all workflows', async () => {
      mockService.getWorkflowMetrics.mockResolvedValue(mockWorkflowMetrics);

      const response = await request(app)
        .get('/api/metrics/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockWorkflowMetrics,
      });
    });

    it('filters metrics by workflow IDs', async () => {
      const filteredMetrics = {
        'invoice-processing': mockWorkflowMetrics['invoice-processing']
      };

      mockService.getWorkflowMetrics.mockResolvedValue(filteredMetrics);

      const response = await request(app)
        .get('/api/metrics/workflows')
        .query({ workflowIds: 'invoice-processing' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockService.getWorkflowMetrics).toHaveBeenCalledWith(['invoice-processing']);
    });

    it('handles comma-separated workflow IDs', async () => {
      mockService.getWorkflowMetrics.mockResolvedValue(mockWorkflowMetrics);

      await request(app)
        .get('/api/metrics/workflows')
        .query({ workflowIds: 'invoice-processing,email-automation' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockService.getWorkflowMetrics).toHaveBeenCalledWith([
        'invoice-processing',
        'email-automation'
      ]);
    });
  });

  describe('POST /api/metrics/export', () => {
    it('exports metrics as CSV', async () => {
      const csvData = Buffer.from('month,revenue,expenses\nJan,150000,90000');
      mockService.exportMetrics.mockResolvedValue(csvData);

      const response = await request(app)
        .post('/api/metrics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          data: { monthlyRevenue: 150000 },
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('exports metrics as PDF', async () => {
      const pdfData = Buffer.from('PDF content');
      mockService.exportMetrics.mockResolvedValue(pdfData);

      const response = await request(app)
        .post('/api/metrics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'pdf',
          includeCharts: true,
          data: { monthlyRevenue: 150000 },
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('validates export format', async () => {
      const response = await request(app)
        .post('/api/metrics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'invalid-format',
          data: { monthlyRevenue: 150000 },
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid export format');
    });

    it('requires data to export', async () => {
      const response = await request(app)
        .post('/api/metrics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          // Missing data
        })
        .expect(400);

      expect(response.body.error).toContain('Data is required for export');
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits on expensive endpoints', async () => {
      // Make multiple rapid requests to ROI calculation endpoint
      const requests = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/metrics/roi')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            workflows: ['invoice-processing'],
            businessData: {
              monthlyRevenue: 150000,
              monthlyExpenses: 90000,
              employeeCount: 25,
            }
          })
      );

      const responses = await Promise.all(requests);

      // First 5 should succeed, 6th should be rate limited
      const rateLimitedResponse = responses[5];
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error).toContain('Too many requests');
    });
  });

  describe('Caching', () => {
    it('caches business metrics responses', async () => {
      mockService.getBusinessMetrics.mockResolvedValue(createMockBusinessData());

      // First request
      const response1 = await request(app)
        .get('/api/metrics/business')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should use cache
      const response2 = await request(app)
        .get('/api/metrics/business')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body).toEqual(response2.body);
      expect(response1.headers['x-cache-status']).toBe('miss');
      expect(response2.headers['x-cache-status']).toBe('hit');
    });

    it('invalidates cache when parameters change', async () => {
      mockService.getBusinessMetrics.mockResolvedValue(createMockBusinessData());

      // Request with first date range
      await request(app)
        .get('/api/metrics/business')
        .query({ startDate: '2024-01-01', endDate: '2024-06-30' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Request with different date range should not use cache
      const response2 = await request(app)
        .get('/api/metrics/business')
        .query({ startDate: '2024-07-01', endDate: '2024-12-31' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.headers['x-cache-status']).toBe('miss');
    });
  });

  describe('Error Handling', () => {
    it('handles database connection errors', async () => {
      mockService.getBusinessMetrics.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );

      const response = await request(app)
        .get('/api/metrics/business')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection error',
      });
    });

    it('handles timeout errors', async () => {
      mockService.calculateROI.mockRejectedValue(
        new Error('Operation timed out')
      );

      const response = await request(app)
        .post('/api/metrics/roi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflows: ['invoice-processing'],
          businessData: {
            monthlyRevenue: 150000,
            monthlyExpenses: 90000,
            employeeCount: 25,
          }
        })
        .expect(504);

      expect(response.body.error).toContain('Request timeout');
    });

    it('sanitizes error messages in production', async () => {
      process.env.NODE_ENV = 'production';

      mockService.getBusinessMetrics.mockRejectedValue(
        new Error('SELECT * FROM sensitive_table WHERE secret_key = "abc123"')
      );

      const response = await request(app)
        .get('/api/metrics/business')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.error).not.toContain('sensitive_table');

      process.env.NODE_ENV = 'test';
    });
  });

  describe('Security', () => {
    it('prevents SQL injection in date parameters', async () => {
      const maliciousDate = "2024-01-01'; DROP TABLE users; --";

      const response = await request(app)
        .get('/api/metrics/business')
        .query({
          startDate: maliciousDate,
          endDate: '2024-06-30'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Invalid date format');
    });

    it('validates user access to company data', async () => {
      // Create a different user's token
      const otherUser = createMockUser({ companyId: 'different-company' });
      const otherUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123'
        });

      const otherUserToken = otherUserLogin.body.token;

      mockService.getBusinessMetrics.mockRejectedValue(
        new Error('Access denied')
      );

      const response = await request(app)
        .get('/api/metrics/business')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });

    it('logs security events', async () => {
      const logSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(app)
        .get('/api/metrics/business')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid token attempt')
      );

      logSpy.mockRestore();
    });
  });
});