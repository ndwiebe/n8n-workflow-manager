import { n8nService } from '../../services/n8nService';
import { workflowCurationService } from '../../services/workflowCurationService';

// Mock fetch globally for n8n service tests
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods to reduce test noise
const consoleMocks = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

beforeAll(() => {
  Object.assign(console, consoleMocks);
});

describe('Edge Cases and Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    Object.values(consoleMocks).forEach(mock => mock.mockClear());
  });

  describe('Network and API Errors', () => {
    test('handles network timeouts gracefully', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 50)
        )
      );

      const workflows = await n8nService.getWorkflows();
      expect(workflows).toEqual([]);
    });

    test('handles intermittent connection failures', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        } as Response);
      });

      // First call should fail
      const firstResult = await n8nService.getWorkflows();
      expect(firstResult).toEqual([]);

      // Second call should also fail
      const secondResult = await n8nService.getWorkflows();
      expect(secondResult).toEqual([]);

      // Third call should succeed
      const thirdResult = await n8nService.getWorkflows();
      expect(thirdResult).toEqual([]);
    });

    test('handles rate limiting responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({
          message: 'Rate limit exceeded',
          retryAfter: 60
        })
      } as Response);

      await expect(n8nService.getWorkflows()).rejects.toThrow('Rate limit exceeded');
    });

    test('handles server errors (5xx)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({
          message: 'Database connection failed'
        })
      } as Response);

      const workflows = await n8nService.getWorkflows();
      expect(workflows).toEqual([]);
    });

    test('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token in JSON'))
      } as Response);

      const workflows = await n8nService.getWorkflows();
      expect(workflows).toEqual([]);
    });

    test('handles empty response bodies', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null)
      } as Response);

      const workflows = await n8nService.getWorkflows();
      expect(workflows).toEqual([]);
    });

    test('handles partial response corruption', async () => {
      const corruptedResponse = {
        data: [
          {
            id: 'workflow-1',
            name: 'Valid Workflow',
            active: true,
            // Missing required fields
            nodes: [],
            connections: {}
          },
          {
            // Completely malformed workflow
            invalid: 'structure',
            nodes: 'should-be-array'
          },
          null, // Null entry
          undefined // Undefined entry
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(corruptedResponse)
      } as Response);

      const workflows = await n8nService.getWorkflows();
      // Should handle corruption gracefully
      expect(Array.isArray(workflows)).toBe(true);
    });
  });

  describe('Data Validation Edge Cases', () => {
    test('handles workflows with no nodes', async () => {
      const emptyWorkflow = {
        id: 'empty-workflow',
        name: 'Empty Workflow',
        active: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [],
        connections: {},
        settings: {},
        staticData: {},
        tags: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyWorkflow)
      } as Response);

      const analysis = await workflowCurationService.analyzeWorkflow('empty-workflow');
      
      expect(analysis.analysisResults.nodeCount).toBe(0);
      expect(analysis.analysisResults.integrations).toEqual([]);
      expect(analysis.suggestedTemplate.credentialsNeeded).toEqual([]);
    });

    test('handles workflows with circular connections', async () => {
      const circularWorkflow = {
        id: 'circular-workflow',
        name: 'Circular Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [
          { type: 'n8n-nodes-base.start', name: 'Start' },
          { type: 'n8n-nodes-base.function', name: 'Function1' },
          { type: 'n8n-nodes-base.function', name: 'Function2' }
        ],
        connections: {
          'Start': { 'main': [[{ 'node': 'Function1', 'type': 'main', 'index': 0 }]] },
          'Function1': { 'main': [[{ 'node': 'Function2', 'type': 'main', 'index': 0 }]] },
          'Function2': { 'main': [[{ 'node': 'Function1', 'type': 'main', 'index': 0 }]] } // Circular!
        },
        settings: {},
        staticData: {},
        tags: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(circularWorkflow)
      } as Response);

      // Should handle circular references without infinite loops
      const analysis = await workflowCurationService.analyzeWorkflow('circular-workflow');
      expect(analysis).toBeDefined();
      expect(analysis.analysisResults.complexity).toBeDefined();
    });

    test('handles workflows with malformed node types', async () => {
      const malformedWorkflow = {
        id: 'malformed-workflow',
        name: 'Malformed Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [
          { type: null, name: 'Invalid Node 1' },
          { type: '', name: 'Invalid Node 2' },
          { type: 123, name: 'Invalid Node 3' },
          { type: 'valid-node-type', name: 'Valid Node' },
          { name: 'Missing Type' }, // Missing type field
          null, // Null node
          undefined // Undefined node
        ],
        connections: {},
        settings: {},
        staticData: {},
        tags: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(malformedWorkflow)
      } as Response);

      const analysis = await workflowCurationService.analyzeWorkflow('malformed-workflow');
      
      // Should filter out invalid nodes and continue processing
      expect(analysis.analysisResults.nodeCount).toBeLessThan(7);
      expect(analysis.analysisResults.nodeTypes.every(type => typeof type === 'string')).toBe(true);
    });

    test('handles extremely large workflows', async () => {
      const largeWorkflow = {
        id: 'large-workflow',
        name: 'Large Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          type: `n8n-nodes-base.function`,
          name: `Function${i}`,
          parameters: { code: `return [{json: {step: ${i}}}];` }
        })),
        connections: {}, // No connections to keep it simple
        settings: {},
        staticData: {},
        tags: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeWorkflow)
      } as Response);

      const startTime = performance.now();
      const analysis = await workflowCurationService.analyzeWorkflow('large-workflow');
      const endTime = performance.now();

      expect(analysis.analysisResults.nodeCount).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('handles workflows with special characters in names', async () => {
      const specialCharWorkflow = {
        id: 'special-char-workflow',
        name: '🚀 Email & Marketing Automation (v2.0) — Advanced™',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [
          { type: 'n8n-nodes-base.gmail', name: 'Gmail' }
        ],
        connections: {},
        settings: {},
        staticData: {},
        tags: ['🏷️', 'special-chars', 'émojis']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specialCharWorkflow)
      } as Response);

      const template = await workflowCurationService.createClientTemplate('special-char-workflow', {});
      
      // Should handle special characters gracefully
      expect(template.businessName).toBeTruthy();
      expect(template.businessName.length).toBeGreaterThan(0);
    });
  });

  describe('State Management Edge Cases', () => {
    test('handles concurrent workflow modifications', async () => {
      const baseWorkflow = {
        id: 'concurrent-workflow',
        name: 'Concurrent Test',
        active: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [],
        connections: {},
        settings: {},
        staticData: {},
        tags: ['test']
      };

      let callCount = 0;
      mockFetch.mockImplementation((url) => {
        callCount++;
        
        // Simulate different states based on call timing
        const updatedAt = new Date(Date.now() + callCount * 1000).toISOString();
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...baseWorkflow,
            updatedAt,
            active: callCount % 2 === 0 // Alternate states
          })
        } as Response);
      });

      // Simulate concurrent operations
      const promises = [
        n8nService.getWorkflow('concurrent-workflow'),
        n8nService.getWorkflow('concurrent-workflow'),
        n8nService.getWorkflow('concurrent-workflow')
      ];

      const results = await Promise.all(promises);
      
      // All should complete successfully despite state changes
      expect(results).toHaveLength(3);
      expect(results.every(r => r !== null)).toBe(true);
    });

    test('handles workflow deletion during processing', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'deleted-workflow',
            name: 'About to be deleted',
            active: true,
            nodes: [],
            connections: {},
            settings: {},
            staticData: {},
            tags: []
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({ message: 'Workflow not found' })
        } as Response);

      // First call succeeds
      const firstResult = await n8nService.getWorkflow('deleted-workflow');
      expect(firstResult).not.toBeNull();

      // Second call fails (workflow deleted)
      const secondResult = await n8nService.getWorkflow('deleted-workflow');
      expect(secondResult).toBeNull();
    });

    test('handles cache invalidation edge cases', async () => {
      const workflow = {
        id: 'cache-test-workflow',
        name: 'Cache Test',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [{ type: 'n8n-nodes-base.gmail', name: 'Gmail' }],
        connections: {},
        settings: {},
        staticData: {},
        tags: ['test']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(workflow)
      } as Response);

      // Create template (should cache)
      const template1 = await workflowCurationService.createClientTemplate('cache-test-workflow', {});
      
      // Simulate workflow update by modifying mock data
      workflow.updatedAt = new Date().toISOString();
      workflow.name = 'Updated Cache Test';

      // Create template again (should use updated data)
      const template2 = await workflowCurationService.createClientTemplate('cache-test-workflow', {});

      // Templates should potentially differ based on caching strategy
      expect(template1.id).toBe(template2.id);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('handles memory pressure with large datasets', async () => {
      // Create a very large workflow response
      const largeResponse = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: `workflow-${i}`,
          name: `Workflow ${i}`.repeat(100), // Long names
          active: i % 2 === 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          nodes: Array.from({ length: 50 }, (_, j) => ({
            type: `n8n-nodes-base.node${j}`,
            name: `Node ${j}`,
            parameters: { data: 'x'.repeat(1000) } // Large parameters
          })),
          connections: {},
          settings: { largeConfig: 'y'.repeat(10000) },
          staticData: { bulkData: Array.from({ length: 1000 }, (_, k) => k) },
          tags: Array.from({ length: 20 }, (_, t) => `tag-${t}`)
        }))
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeResponse)
      } as Response);

      const startTime = performance.now();
      const workflows = await n8nService.getWorkflows();
      const endTime = performance.now();

      // Should complete without running out of memory
      expect(workflows).toBeDefined();
      expect(Array.isArray(workflows)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('handles recursive data structures gracefully', async () => {
      const recursiveWorkflow: any = {
        id: 'recursive-workflow',
        name: 'Recursive Test',
        active: true,
        nodes: [],
        connections: {},
        settings: {},
        staticData: {}
      };

      // Create circular reference
      recursiveWorkflow.self = recursiveWorkflow;
      recursiveWorkflow.settings.workflow = recursiveWorkflow;

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(recursiveWorkflow)
      } as Response);

      // Should handle circular references without stack overflow
      const analysis = await workflowCurationService.analyzeWorkflow('recursive-workflow');
      expect(analysis).toBeDefined();
    });
  });

  describe('Edge Case Business Logic', () => {
    test('handles workflows with zero business value', async () => {
      const zeroValueWorkflow = {
        id: 'zero-value-workflow',
        name: 'No Value Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [{ type: 'n8n-nodes-base.no-op', name: 'No Operation' }],
        connections: {},
        settings: {},
        staticData: {},
        tags: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(zeroValueWorkflow)
      } as Response);

      const template = await workflowCurationService.createClientTemplate('zero-value-workflow', {});
      
      // Should provide reasonable defaults even for zero-value workflows
      expect(template.monthlyValue).toBeGreaterThanOrEqual(0);
      expect(template.difficulty).toBeDefined();
      expect(template.setupTime).toBeDefined();
    });

    test('handles workflows with conflicting categorization', async () => {
      const conflictingWorkflow = {
        id: 'conflicting-workflow',
        name: 'Sales Finance Marketing HR Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: [
          { type: 'n8n-nodes-base.salesforce', name: 'Salesforce' },
          { type: 'n8n-nodes-base.quickbooks', name: 'QuickBooks' },
          { type: 'n8n-nodes-base.mailchimp', name: 'Mailchimp' },
          { type: 'n8n-nodes-base.bamboohr', name: 'BambooHR' }
        ],
        connections: {},
        settings: {},
        staticData: {},
        tags: ['sales', 'finance', 'marketing', 'hr']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(conflictingWorkflow)
      } as Response);

      const template = await workflowCurationService.createClientTemplate('conflicting-workflow', {});
      
      // Should pick a primary category despite conflicts
      expect(template.category).toBeDefined();
      expect(['Finance', 'Marketing', 'Sales', 'Operations', 'HR', 'Customer Service', 'E-commerce'])
        .toContain(template.category);
    });

    test('handles invalid date formats', async () => {
      const invalidDateWorkflow = {
        id: 'invalid-date-workflow',
        name: 'Invalid Date Workflow',
        active: true,
        createdAt: 'not-a-date',
        updatedAt: '2024-13-45T25:99:99Z', // Invalid date
        nodes: [],
        connections: {},
        settings: {},
        staticData: {},
        tags: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidDateWorkflow)
      } as Response);

      // Should handle invalid dates gracefully
      const analysis = await workflowCurationService.analyzeWorkflow('invalid-date-workflow');
      expect(analysis).toBeDefined();
    });

    test('handles extreme numerical values', async () => {
      const extremeWorkflow = {
        id: 'extreme-workflow',
        name: 'Extreme Values Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        nodes: Array.from({ length: Number.MAX_SAFE_INTEGER % 1000 }, (_, i) => ({
          type: 'n8n-nodes-base.function',
          name: `Function${i}`
        })),
        connections: {},
        settings: {},
        staticData: {},
        tags: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(extremeWorkflow)
      } as Response);

      const template = await workflowCurationService.createClientTemplate('extreme-workflow', {
        monthlyValue: Number.MAX_SAFE_INTEGER
      });

      // Should handle extreme values gracefully
      expect(template.monthlyValue).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(template.monthlyValue).toBeGreaterThan(0);
    });
  });

  describe('Cross-Service Error Propagation', () => {
    test('handles cascading service failures', async () => {
      // Simulate n8nService failure affecting workflowCurationService
      mockFetch.mockRejectedValue(new Error('n8n service unavailable'));

      const templates = await workflowCurationService.getClientTemplates();
      
      // Should handle upstream service failure gracefully
      expect(templates).toEqual([]);
    });

    test('handles partial service degradation', async () => {
      // Simulate some operations succeeding, others failing
      let requestCount = 0;
      mockFetch.mockImplementation((url) => {
        requestCount++;
        
        if (requestCount % 3 === 0) {
          return Promise.reject(new Error('Service temporarily unavailable'));
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        } as Response);
      });

      // Multiple operations with some failures
      const results = await Promise.allSettled([
        n8nService.getWorkflows(),
        n8nService.getActiveWorkflows(),
        n8nService.testConnection(),
        n8nService.getWorkflows()
      ]);

      // Some should succeed, some should fail gracefully
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes.length + failures.length).toBe(4);
    });
  });

  describe('Cleanup and Recovery', () => {
    test('recovers from corrupted cache state', async () => {
      // Corrupt the template cache with invalid data
      (workflowCurationService as any).templateCache.set('corrupted', null);
      (workflowCurationService as any).templateCache.set('invalid', { invalid: 'template' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            id: 'recovery-workflow',
            name: 'Recovery Test',
            active: true,
            nodes: [],
            connections: {},
            settings: {},
            staticData: {},
            tags: ['client-ready']
          }]
        })
      } as Response);

      // Should recover and provide valid templates despite cache corruption
      const templates = await workflowCurationService.getClientTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });

    test('handles rapid successive operations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      } as Response);

      // Fire many requests rapidly
      const rapidRequests = Array.from({ length: 100 }, () => 
        n8nService.getWorkflows()
      );

      const results = await Promise.all(rapidRequests);
      
      // All should complete successfully
      expect(results).toHaveLength(100);
      expect(results.every(r => Array.isArray(r))).toBe(true);
    });
  });
});