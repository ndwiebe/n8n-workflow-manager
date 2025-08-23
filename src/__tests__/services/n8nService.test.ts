import { n8nService, n8nUtils } from '../../services/n8nService';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods to avoid test output pollution
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock data
const mockWorkflow = {
  id: 'workflow-1',
  name: 'Test Workflow',
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  nodes: [
    { type: 'n8n-nodes-base.webhook', name: 'Webhook' },
    { type: 'n8n-nodes-base.gmail', name: 'Gmail' }
  ],
  connections: {
    'Webhook': {
      'main': [
        [{ 'node': 'Gmail', 'type': 'main', 'index': 0 }]
      ]
    }
  },
  settings: {},
  staticData: {},
  tags: ['test', 'automation']
};

const mockExecution = {
  id: 'execution-1',
  workflowId: 'workflow-1',
  mode: 'manual' as const,
  startedAt: '2024-01-15T10:00:00Z',
  stoppedAt: '2024-01-15T10:02:00Z',
  status: 'success' as const,
  data: { result: 'test' }
};

describe('N8nService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Configuration', () => {
    test('uses environment variables for configuration', () => {
      // Test that service uses environment configuration
      expect((n8nService as any).baseUrl).toBeDefined();
      expect((n8nService as any).apiKey).toBeDefined();
    });

    test('falls back to default values when env vars not set', () => {
      // The service should have fallback values
      const baseUrl = (n8nService as any).baseUrl;
      const apiKey = (n8nService as any).apiKey;
      
      expect(typeof baseUrl).toBe('string');
      expect(typeof apiKey).toBe('string');
    });
  });

  describe('makeRequest', () => {
    test('makes successful API request', async () => {
      const mockResponse = { data: [mockWorkflow] };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await (n8nService as any).makeRequest('/workflows');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/workflows'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test('includes API key in headers when available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      } as Response);

      await (n8nService as any).makeRequest('/workflows');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-N8N-API-KEY': expect.any(String)
          })
        })
      );
    });

    test('handles HTTP error responses', async () => {
      const errorResponse = { message: 'Unauthorized' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve(errorResponse)
      } as Response);

      await expect((n8nService as any).makeRequest('/workflows'))
        .rejects.toThrow('Unauthorized');
    });

    test('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect((n8nService as any).makeRequest('/workflows'))
        .rejects.toThrow('Network error');
    });

    test('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response);

      await expect((n8nService as any).makeRequest('/workflows'))
        .rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('getWorkflows', () => {
    test('fetches all workflows with pagination', async () => {
      const page1Response = {
        data: [mockWorkflow],
        nextCursor: 'cursor123'
      };
      
      const page2Response = {
        data: [{ ...mockWorkflow, id: 'workflow-2', name: 'Second Workflow' }],
        nextCursor: undefined
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1Response)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2Response)
        } as Response);

      const workflows = await n8nService.getWorkflows();

      expect(workflows).toHaveLength(2);
      expect(workflows[0].id).toBe('workflow-1');
      expect(workflows[1].id).toBe('workflow-2');
      
      // Should make two paginated requests
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('handles single page response', async () => {
      const singlePageResponse = {
        data: [mockWorkflow]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(singlePageResponse)
      } as Response);

      const workflows = await n8nService.getWorkflows();

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toEqual(mockWorkflow);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('handles empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      } as Response);

      const workflows = await n8nService.getWorkflows();

      expect(workflows).toEqual([]);
    });

    test('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const workflows = await n8nService.getWorkflows();

      expect(workflows).toEqual([]);
    });
  });

  describe('getActiveWorkflows', () => {
    test('filters active workflows', async () => {
      const workflows = [
        mockWorkflow,
        { ...mockWorkflow, id: 'workflow-2', active: false }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: workflows })
      } as Response);

      const activeWorkflows = await n8nService.getActiveWorkflows();

      expect(activeWorkflows).toHaveLength(1);
      expect(activeWorkflows[0].active).toBe(true);
    });
  });

  describe('getWorkflow', () => {
    test('fetches single workflow by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWorkflow)
      } as Response);

      const workflow = await n8nService.getWorkflow('workflow-1');

      expect(workflow).toEqual(mockWorkflow);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/workflow-1'),
        expect.any(Object)
      );
    });

    test('returns null for non-existent workflow', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));

      const workflow = await n8nService.getWorkflow('non-existent');

      expect(workflow).toBeNull();
    });
  });

  describe('setWorkflowActive', () => {
    test('activates workflow', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      const result = await n8nService.setWorkflowActive('workflow-1', true);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/workflow-1/activate'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('deactivates workflow', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      const result = await n8nService.setWorkflowActive('workflow-1', false);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/workflow-1/deactivate'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('handles activation errors', async () => {
      mockFetch.mockRejectedValue(new Error('Activation failed'));

      const result = await n8nService.setWorkflowActive('workflow-1', true);

      expect(result).toBe(false);
    });
  });

  describe('getExecutions', () => {
    test('fetches executions with parameters', async () => {
      const executions = [mockExecution];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: executions })
      } as Response);

      const result = await n8nService.getExecutions('workflow-1', 10);

      expect(result).toEqual(executions);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/executions\?.*limit=10.*workflowId=workflow-1/),
        expect.any(Object)
      );
    });

    test('fetches executions without workflow filter', async () => {
      const executions = [mockExecution];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: executions })
      } as Response);

      const result = await n8nService.getExecutions();

      expect(result).toEqual(executions);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/executions\?.*limit=20/),
        expect.any(Object)
      );
    });

    test('handles execution fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      const result = await n8nService.getExecutions();

      expect(result).toEqual([]);
    });
  });

  describe('getExecution', () => {
    test('fetches single execution by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockExecution)
      } as Response);

      const execution = await n8nService.getExecution('execution-1');

      expect(execution).toEqual(mockExecution);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/executions/execution-1'),
        expect.any(Object)
      );
    });

    test('returns null for non-existent execution', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));

      const execution = await n8nService.getExecution('non-existent');

      expect(execution).toBeNull();
    });
  });

  describe('updateWorkflow', () => {
    test('updates workflow with new data', async () => {
      const updates = { name: 'Updated Workflow', tags: ['updated'] };
      const updatedWorkflow = { ...mockWorkflow, ...updates };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedWorkflow)
      } as Response);

      const result = await n8nService.updateWorkflow('workflow-1', updates);

      expect(result).toEqual(updatedWorkflow);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/workflow-1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      );
    });

    test('handles update errors', async () => {
      mockFetch.mockRejectedValue(new Error('Update failed'));

      await expect(n8nService.updateWorkflow('workflow-1', {}))
        .rejects.toThrow('Failed to update workflow workflow-1');
    });
  });

  describe('testConnection', () => {
    test('returns true for successful connection test', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      } as Response);

      const result = await n8nService.testConnection();

      expect(result).toBe(true);
    });

    test('returns false for failed connection test', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await n8nService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getHealthInfo', () => {
    test('fetches health information', async () => {
      const healthInfo = { status: 'ok', version: '1.0.0' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(healthInfo)
      } as Response);

      const result = await n8nService.getHealthInfo();

      expect(result).toEqual(healthInfo);
    });

    test('returns null on health check failure', async () => {
      mockFetch.mockRejectedValue(new Error('Health check failed'));

      const result = await n8nService.getHealthInfo();

      expect(result).toBeNull();
    });
  });

  describe('getBusinessMetrics', () => {
    beforeEach(() => {
      // Mock workflows response
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/workflows')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                mockWorkflow,
                { ...mockWorkflow, id: 'workflow-2', active: false }
              ]
            })
          } as Response);
        }
        
        if (url.toString().includes('/executions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                mockExecution,
                { ...mockExecution, id: 'execution-2', status: 'error' as const }
              ]
            })
          } as Response);
        }

        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    test('calculates business metrics correctly', async () => {
      const metrics = await n8nService.getBusinessMetrics();

      expect(metrics.totalWorkflows).toBe(2);
      expect(metrics.activeWorkflows).toBe(1);
      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.errorRate).toBe(50);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
    });

    test('handles empty data gracefully', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        } as Response)
      );

      const metrics = await n8nService.getBusinessMetrics();

      expect(metrics.totalWorkflows).toBe(0);
      expect(metrics.activeWorkflows).toBe(0);
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });

    test('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const metrics = await n8nService.getBusinessMetrics();

      expect(metrics).toEqual({
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        errorRate: 0,
        averageExecutionTime: 0
      });
    });
  });

  describe('getEnhancedBusinessMetrics', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/workflows')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                { ...mockWorkflow, tags: ['sales', 'department:Sales'] },
                { ...mockWorkflow, id: 'workflow-2', tags: ['marketing', 'department:Marketing'] }
              ]
            })
          } as Response);
        }
        
        if (url.toString().includes('/executions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [mockExecution]
            })
          } as Response);
        }

        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    test('calculates enhanced metrics with ROI analysis', async () => {
      const metrics = await n8nService.getEnhancedBusinessMetrics();

      expect(metrics.summary).toBeDefined();
      expect(metrics.summary.totalWorkflows).toBe(2);
      expect(metrics.summary.totalMonthlySavings).toBeGreaterThan(0);
      expect(metrics.summary.totalMonthlyROI).toBeGreaterThan(0);
      
      expect(metrics.workflows).toBeInstanceOf(Array);
      expect(metrics.workflows.length).toBe(2);
      
      expect(metrics.trends).toBeDefined();
      expect(metrics.trends.savingsOverTime).toBeInstanceOf(Array);
      expect(metrics.trends.roiByCategory).toBeInstanceOf(Array);
      
      expect(metrics.recommendations).toBeInstanceOf(Array);
    });

    test('categorizes workflows correctly', async () => {
      const metrics = await n8nService.getEnhancedBusinessMetrics();

      const workflows = metrics.workflows;
      expect(workflows.some(w => w.category === 'Sales')).toBe(true);
      expect(workflows.some(w => w.category === 'Marketing')).toBe(true);
    });

    test('generates recommendations based on performance', async () => {
      // Mock low-performing workflow
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/workflows')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [mockWorkflow]
            })
          } as Response);
        }
        
        if (url.toString().includes('/executions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                { ...mockExecution, status: 'error' as const },
                { ...mockExecution, id: 'execution-2', status: 'error' as const }
              ]
            })
          } as Response);
        }

        return Promise.reject(new Error('Unknown endpoint'));
      });

      const metrics = await n8nService.getEnhancedBusinessMetrics();

      expect(metrics.recommendations.length).toBeGreaterThan(0);
      expect(metrics.recommendations.some(r => r.type === 'optimization')).toBe(true);
    });
  });

  describe('getWorkflowStats', () => {
    beforeEach(() => {
      const now = new Date();
      const executions = [
        { ...mockExecution, startedAt: now.toISOString() },
        { ...mockExecution, id: 'execution-2', status: 'error' as const, startedAt: now.toISOString() }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: executions })
      } as Response);
    });

    test('calculates workflow statistics', async () => {
      const stats = await n8nService.getWorkflowStats('workflow-1');

      expect(stats.totalExecutions).toBe(2);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(1);
      expect(stats.errorRate).toBe(50);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.executionsThisMonth).toBe(2);
    });

    test('handles empty execution data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      } as Response);

      const stats = await n8nService.getWorkflowStats('workflow-1');

      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.executionsThisMonth).toBe(0);
    });

    test('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const stats = await n8nService.getWorkflowStats('workflow-1');

      expect(stats).toEqual({
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        executionsThisMonth: 0,
        errorRate: 0
      });
    });
  });

  describe('Private Helper Methods', () => {
    test('estimateWorkflowROI calculates reasonable values', () => {
      const workflow = mockWorkflow;
      const executions = [mockExecution, mockExecution]; // 2 executions

      const roi = (n8nService as any).estimateWorkflowROI(workflow, executions);

      expect(roi.monthlySavings).toBeGreaterThan(0);
      expect(roi.roiPercentage).toBeGreaterThanOrEqual(0);
      expect(roi.hoursPerMonth).toBeGreaterThan(0);
    });

    test('categorizeWorkflow identifies categories correctly', () => {
      const salesWorkflow = { ...mockWorkflow, name: 'Sales CRM Integration' };
      const marketingWorkflow = { ...mockWorkflow, name: 'Email Marketing Campaign' };
      const financeWorkflow = { ...mockWorkflow, name: 'Invoice Processing System' };

      expect((n8nService as any).categorizeWorkflow(salesWorkflow)).toBe('Sales');
      expect((n8nService as any).categorizeWorkflow(marketingWorkflow)).toBe('Marketing');
      expect((n8nService as any).categorizeWorkflow(financeWorkflow)).toBe('Finance');
    });

    test('calculateAveragePaybackPeriod computes reasonable periods', () => {
      const workflows = [
        { monthlySavings: 1000, roiPercentage: 200 },
        { monthlySavings: 500, roiPercentage: 100 },
        { monthlySavings: 0, roiPercentage: 0 } // Should be excluded
      ];

      const period = (n8nService as any).calculateAveragePaybackPeriod(workflows);

      expect(period).toBeGreaterThan(0);
      expect(period).toBeLessThan(24); // Should be reasonable
    });

    test('generateSavingsTrends creates progressive trend data', () => {
      const trends = (n8nService as any).generateSavingsTrends(1000);

      expect(trends).toHaveLength(6);
      expect(trends[0].totalSavings).toBeLessThan(trends[5].totalSavings);
      expect(trends.every(t => t.totalSavings > 0)).toBe(true);
      expect(trends.every(t => t.timesSaved > 0)).toBe(true);
    });

    test('generateROIByCategory aggregates categories correctly', () => {
      const workflows = [
        { category: 'Sales', roiPercentage: 100 },
        { category: 'Sales', roiPercentage: 200 },
        { category: 'Marketing', roiPercentage: 150 }
      ];

      const categoryROI = (n8nService as any).generateROIByCategory(workflows);

      const salesCategory = categoryROI.find(c => c.category === 'Sales');
      const marketingCategory = categoryROI.find(c => c.category === 'Marketing');

      expect(salesCategory?.workflows).toBe(2);
      expect(salesCategory?.totalROI).toBe(300);
      expect(salesCategory?.avgROI).toBe(150);

      expect(marketingCategory?.workflows).toBe(1);
      expect(marketingCategory?.avgROI).toBe(150);
    });

    test('generateRecommendations creates relevant suggestions', () => {
      const lowPerformingWorkflows = [
        { status: 'active', roiPercentage: 50, monthlySavings: 100, uptime: 70 }
      ];
      const summary = { activeWorkflows: 1, totalMonthlySavings: 100 };

      const recommendations = (n8nService as any).generateRecommendations(
        lowPerformingWorkflows,
        summary
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'optimization')).toBe(true);
    });
  });
});

describe('n8nUtils', () => {
  describe('formatExecutionTime', () => {
    test('formats milliseconds correctly', () => {
      expect(n8nUtils.formatExecutionTime(500)).toBe('500ms');
      expect(n8nUtils.formatExecutionTime(1500)).toBe('2s');
      expect(n8nUtils.formatExecutionTime(65000)).toBe('1m');
      expect(n8nUtils.formatExecutionTime(120000)).toBe('2m');
    });
  });

  describe('getStatusColor', () => {
    test('returns correct colors for statuses', () => {
      expect(n8nUtils.getStatusColor('success')).toBe('success');
      expect(n8nUtils.getStatusColor('error')).toBe('error');
      expect(n8nUtils.getStatusColor('waiting')).toBe('warning');
      expect(n8nUtils.getStatusColor('running')).toBe('warning');
      expect(n8nUtils.getStatusColor('unknown')).toBe('info');
    });
  });

  describe('calculateROI', () => {
    test('calculates ROI correctly', () => {
      const roi = n8nUtils.calculateROI(5, 10, 30);

      expect(roi.weeklySavings).toBe(1500); // 5 * 10 * 30
      expect(roi.monthlySavings).toBe(6495); // 1500 * 4.33
      expect(roi.yearlySavings).toBe(77940); // 6495 * 12
    });

    test('uses default values when not provided', () => {
      const roi = n8nUtils.calculateROI(2);

      expect(roi.weeklySavings).toBe(400); // 2 * 8 * 25
      expect(roi.monthlySavings).toBe(1732); // 400 * 4.33
      expect(roi.yearlySavings).toBe(20784); // 1732 * 12
    });
  });
});

describe('Error Scenarios', () => {
  test('handles network timeouts', async () => {
    mockFetch.mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );

    const workflows = await n8nService.getWorkflows();
    expect(workflows).toEqual([]);
  });

  test('handles malformed API responses', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ invalid: 'structure' })
    } as Response);

    const workflows = await n8nService.getWorkflows();
    expect(workflows).toEqual([]);
  });

  test('handles missing data fields gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null)
    } as Response);

    const workflow = await n8nService.getWorkflow('test');
    expect(workflow).toBeNull();
  });
});

describe('Performance', () => {
  test('handles large workflow datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      ...mockWorkflow,
      id: `workflow-${i}`
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: largeDataset })
    } as Response);

    const startTime = performance.now();
    const workflows = await n8nService.getWorkflows();
    const endTime = performance.now();

    expect(workflows).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  test('handles concurrent requests efficiently', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWorkflow)
    } as Response);

    const promises = Array.from({ length: 10 }, (_, i) => 
      n8nService.getWorkflow(`workflow-${i}`)
    );

    const startTime = performance.now();
    const results = await Promise.all(promises);
    const endTime = performance.now();

    expect(results).toHaveLength(10);
    expect(results.every(r => r !== null)).toBe(true);
    expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
  });
});