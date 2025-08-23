import { workflowCurationService } from '../../services/workflowCurationService';
import { n8nService } from '../../services/n8nService';

// Mock the n8nService
jest.mock('../../services/n8nService');

const mockN8nService = n8nService as jest.Mocked<typeof n8nService>;

// Mock data
const mockWorkflow = {
  id: 'workflow-1',
  name: 'Email Marketing Automation',
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  nodes: [
    { type: 'n8n-nodes-base.webhook', name: 'Webhook' },
    { type: 'n8n-nodes-base.gmail', name: 'Gmail' },
    { type: 'n8n-nodes-base.sheets', name: 'Google Sheets' }
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
  tags: ['marketing', 'automation']
};

const mockComplexWorkflow = {
  id: 'workflow-2',
  name: 'Advanced CRM Integration',
  active: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-10T00:00:00Z',
  nodes: Array.from({ length: 20 }, (_, i) => ({
    type: `n8n-nodes-base.node${i}`,
    name: `Node ${i}`
  })),
  connections: {},
  settings: {},
  staticData: {},
  tags: ['crm', 'sales', 'integration']
};

const mockClientReadyWorkflows = [
  {
    ...mockWorkflow,
    tags: ['client-ready', 'marketing']
  },
  {
    id: 'workflow-3',
    name: 'Invoice Processing',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    nodes: [
      { type: 'n8n-nodes-base.webhook', name: 'Webhook' },
      { type: 'n8n-nodes-base.quickbooks', name: 'QuickBooks' }
    ],
    connections: {},
    settings: {},
    staticData: {},
    tags: ['client-template', 'finance']
  }
];

describe('WorkflowCurationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset any cached templates
    (workflowCurationService as any).templateCache.clear();
  });

  describe('analyzeWorkflow', () => {
    beforeEach(() => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflow);
    });

    test('analyzes workflow and generates suggestions', async () => {
      const result = await workflowCurationService.analyzeWorkflow('workflow-1');
      
      expect(mockN8nService.getWorkflow).toHaveBeenCalledWith('workflow-1');
      expect(result).toHaveProperty('suggestedTemplate');
      expect(result).toHaveProperty('analysisResults');
      
      expect(result.analysisResults.nodeCount).toBe(3);
      expect(result.analysisResults.nodeTypes).toEqual([
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.gmail',
        'n8n-nodes-base.sheets'
      ]);
      expect(result.analysisResults.integrations).toContain('gmail');
      expect(result.analysisResults.integrations).toContain('sheets');
    });

    test('handles non-existent workflow', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(null);
      
      await expect(workflowCurationService.analyzeWorkflow('non-existent'))
        .rejects.toThrow('Workflow non-existent not found');
    });

    test('infers correct category from integrations', async () => {
      const result = await workflowCurationService.analyzeWorkflow('workflow-1');
      
      // Should infer Marketing category from gmail integration
      expect(result.suggestedTemplate.category).toBe('Marketing');
    });

    test('calculates complexity correctly', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockComplexWorkflow);
      
      const result = await workflowCurationService.analyzeWorkflow('workflow-2');
      
      expect(result.analysisResults.complexity).toBe('high'); // 20 nodes should be high complexity
    });

    test('extracts integrations correctly', async () => {
      const result = await workflowCurationService.analyzeWorkflow('workflow-1');
      
      expect(result.analysisResults.integrations).toEqual(['gmail', 'sheets']);
    });

    test('identifies triggers and actions', async () => {
      const result = await workflowCurationService.analyzeWorkflow('workflow-1');
      
      expect(result.analysisResults.triggers).toContain('n8n-nodes-base.webhook');
      expect(result.analysisResults.actions).toContain('n8n-nodes-base.gmail');
      expect(result.analysisResults.actions).toContain('n8n-nodes-base.sheets');
    });
  });

  describe('createClientTemplate', () => {
    beforeEach(() => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflow);
    });

    test('creates client template with provided metadata', async () => {
      const businessMetadata = {
        businessName: 'Custom Email Automation',
        businessDescription: 'Custom description for email automation',
        category: 'Marketing' as const,
        industry: ['Technology', 'E-commerce'],
        difficulty: 'intermediate' as const,
        setupTime: '20-40 minutes',
        monthlyValue: 1000,
        timesSaved: '6 hours per week',
        features: ['Custom feature 1', 'Custom feature 2'],
        consulantOnly: true
      };

      const template = await workflowCurationService.createClientTemplate(
        'workflow-1',
        businessMetadata
      );

      expect(template.businessName).toBe('Custom Email Automation');
      expect(template.businessDescription).toBe('Custom description for email automation');
      expect(template.category).toBe('Marketing');
      expect(template.industry).toEqual(['Technology', 'E-commerce']);
      expect(template.difficulty).toBe('intermediate');
      expect(template.setupTime).toBe('20-40 minutes');
      expect(template.monthlyValue).toBe(1000);
      expect(template.timesSaved).toBe('6 hours per week');
      expect(template.features).toEqual(['Custom feature 1', 'Custom feature 2']);
      expect(template.consulantOnly).toBe(true);
    });

    test('generates default metadata when not provided', async () => {
      const template = await workflowCurationService.createClientTemplate('workflow-1', {});

      expect(template.businessName).toBeTruthy();
      expect(template.businessDescription).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(template.industry).toBeTruthy();
      expect(template.difficulty).toBeTruthy();
      expect(template.setupTime).toBeTruthy();
      expect(template.monthlyValue).toBeGreaterThan(0);
      expect(template.timesSaved).toBeTruthy();
      expect(template.features).toBeInstanceOf(Array);
    });

    test('generates credential requirements', async () => {
      const template = await workflowCurationService.createClientTemplate('workflow-1', {});

      expect(template.credentialsNeeded).toBeInstanceOf(Array);
      expect(template.credentialsNeeded.length).toBeGreaterThan(0);
      
      const gmailCred = template.credentialsNeeded.find(c => c.service === 'gmail');
      expect(gmailCred).toBeDefined();
      expect(gmailCred?.type).toBe('oauth'); // Gmail should use OAuth
      expect(gmailCred?.required).toBe(true);
      expect(gmailCred?.testable).toBe(true);
    });

    test('generates setup steps', async () => {
      const template = await workflowCurationService.createClientTemplate('workflow-1', {});

      expect(template.setupSteps).toBeInstanceOf(Array);
      expect(template.setupSteps.length).toBeGreaterThan(0);
      
      // Should have steps for each integration plus testing and activation
      const steps = template.setupSteps;
      expect(steps.some(s => s.action === 'configure_credential')).toBe(true);
      expect(steps.some(s => s.action === 'test_connection')).toBe(true);
      expect(steps.some(s => s.action === 'customize_settings')).toBe(true);
      expect(steps.some(s => s.action === 'review_and_activate')).toBe(true);
    });

    test('caches created template', async () => {
      const template = await workflowCurationService.createClientTemplate('workflow-1', {});

      expect((workflowCurationService as any).templateCache.get(template.id)).toBe(template);
    });

    test('handles non-existent workflow', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(null);

      await expect(workflowCurationService.createClientTemplate('non-existent', {}))
        .rejects.toThrow('Workflow non-existent not found');
    });
  });

  describe('getClientTemplates', () => {
    beforeEach(() => {
      mockN8nService.getWorkflows.mockResolvedValue(mockClientReadyWorkflows);
    });

    test('returns client-ready templates', async () => {
      const templates = await workflowCurationService.getClientTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBe(2);
      expect(templates.every(t => t.isClientReady)).toBe(true);
    });

    test('filters by category', async () => {
      const templates = await workflowCurationService.getClientTemplates({
        category: 'Finance'
      });

      expect(templates.length).toBe(1);
      expect(templates[0].category).toBe('Finance');
    });

    test('filters by industry', async () => {
      const templates = await workflowCurationService.getClientTemplates({
        industry: 'Technology'
      });

      // Should filter based on industry array
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.industry.includes('Technology'))).toBe(true);
    });

    test('filters by difficulty', async () => {
      const templates = await workflowCurationService.getClientTemplates({
        difficulty: 'beginner'
      });

      expect(templates.every(t => t.difficulty === 'beginner')).toBe(true);
    });

    test('combines multiple filters', async () => {
      const templates = await workflowCurationService.getClientTemplates({
        category: 'Finance',
        difficulty: 'intermediate'
      });

      expect(templates.every(t => 
        t.category === 'Finance' && t.difficulty === 'intermediate'
      )).toBe(true);
    });

    test('returns sorted templates', async () => {
      const templates = await workflowCurationService.getClientTemplates();

      // Should be sorted by business name
      for (let i = 1; i < templates.length; i++) {
        expect(templates[i].businessName.localeCompare(templates[i-1].businessName))
          .toBeGreaterThanOrEqual(0);
      }
    });

    test('generates templates on-demand for client-ready workflows', async () => {
      // Mock a workflow without cached template
      const newWorkflow = {
        ...mockWorkflow,
        id: 'workflow-new',
        name: 'New Workflow',
        tags: ['client-ready']
      };
      
      mockN8nService.getWorkflows.mockResolvedValue([newWorkflow]);
      mockN8nService.getWorkflow.mockResolvedValue(newWorkflow);

      const templates = await workflowCurationService.getClientTemplates();

      expect(templates.length).toBe(1);
      expect(templates[0].originalWorkflowId).toBe('workflow-new');
    });

    test('handles empty workflow list', async () => {
      mockN8nService.getWorkflows.mockResolvedValue([]);

      const templates = await workflowCurationService.getClientTemplates();

      expect(templates).toEqual([]);
    });

    test('uses cached templates when available', async () => {
      // First call to populate cache
      await workflowCurationService.getClientTemplates();
      
      // Second call should use cache
      await workflowCurationService.getClientTemplates();

      // Should only call getWorkflows once (caching workflows, not just templates)
      expect(mockN8nService.getWorkflows).toHaveBeenCalledTimes(2);
    });
  });

  describe('setWorkflowVisibility', () => {
    beforeEach(() => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockN8nService.updateWorkflow.mockResolvedValue(mockWorkflow);
    });

    test('sets workflow to client-ready', async () => {
      await workflowCurationService.setWorkflowVisibility('workflow-1', 'client-ready');

      expect(mockN8nService.updateWorkflow).toHaveBeenCalledWith('workflow-1', {
        tags: ['marketing', 'automation', 'client-ready']
      });
    });

    test('sets workflow to internal-only', async () => {
      await workflowCurationService.setWorkflowVisibility('workflow-1', 'internal-only');

      expect(mockN8nService.updateWorkflow).toHaveBeenCalledWith('workflow-1', {
        tags: ['marketing', 'automation', 'internal-only']
      });
    });

    test('sets workflow to consultant-demo', async () => {
      await workflowCurationService.setWorkflowVisibility('workflow-1', 'consultant-demo');

      expect(mockN8nService.updateWorkflow).toHaveBeenCalledWith('workflow-1', {
        tags: ['marketing', 'automation', 'consultant-demo']
      });
    });

    test('removes existing visibility tags', async () => {
      const workflowWithVisibilityTags = {
        ...mockWorkflow,
        tags: ['marketing', 'client-ready', 'automation']
      };
      
      mockN8nService.getWorkflow.mockResolvedValue(workflowWithVisibilityTags);

      await workflowCurationService.setWorkflowVisibility('workflow-1', 'internal-only');

      expect(mockN8nService.updateWorkflow).toHaveBeenCalledWith('workflow-1', {
        tags: ['marketing', 'automation', 'internal-only']
      });
    });

    test('handles workflow without existing tags', async () => {
      const workflowWithoutTags = {
        ...mockWorkflow,
        tags: []
      };
      
      mockN8nService.getWorkflow.mockResolvedValue(workflowWithoutTags);

      await workflowCurationService.setWorkflowVisibility('workflow-1', 'client-ready');

      expect(mockN8nService.updateWorkflow).toHaveBeenCalledWith('workflow-1', {
        tags: ['client-ready']
      });
    });

    test('handles non-existent workflow gracefully', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(null);

      // Should not throw error
      await expect(workflowCurationService.setWorkflowVisibility('non-existent', 'client-ready'))
        .resolves.not.toThrow();
      
      expect(mockN8nService.updateWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('Business Logic Functions', () => {
    test('generates business-friendly names', async () => {
      const workflows = [
        { ...mockWorkflow, name: 'invoice-automation-v2' },
        { ...mockWorkflow, name: 'email-marketing-system' },
        { ...mockWorkflow, name: 'slack-notifications' },
        { ...mockWorkflow, name: 'crm-integration' },
        { ...mockWorkflow, name: 'webhook-handler' }
      ];

      for (const workflow of workflows) {
        mockN8nService.getWorkflow.mockResolvedValue(workflow);
        const template = await workflowCurationService.createClientTemplate(workflow.id, {});
        
        // Business name should be more user-friendly than technical name
        expect(template.businessName).not.toBe(workflow.name);
        expect(template.businessName.toLowerCase()).not.toMatch(/^[a-z-]+$/); // Not just kebab-case
      }
    });

    test('estimates setup time based on complexity', async () => {
      // Simple workflow
      const simpleWorkflow = {
        ...mockWorkflow,
        nodes: [
          { type: 'n8n-nodes-base.webhook' },
          { type: 'n8n-nodes-base.gmail' }
        ]
      };

      // Complex workflow
      const complexWorkflow = {
        ...mockWorkflow,
        nodes: Array.from({ length: 15 }, (_, i) => ({ type: `node${i}` }))
      };

      mockN8nService.getWorkflow.mockResolvedValue(simpleWorkflow);
      const simpleTemplate = await workflowCurationService.createClientTemplate('simple', {});

      mockN8nService.getWorkflow.mockResolvedValue(complexWorkflow);
      const complexTemplate = await workflowCurationService.createClientTemplate('complex', {});

      // Complex workflow should have longer setup time
      const simpleTime = parseInt(simpleTemplate.setupTime);
      const complexTime = parseInt(complexTemplate.setupTime);
      
      expect(complexTime).toBeGreaterThan(simpleTime);
    });

    test('calculates business value based on integrations', async () => {
      // Workflow with many integrations
      const highValueWorkflow = {
        ...mockWorkflow,
        nodes: [
          { type: 'n8n-nodes-base.gmail' },
          { type: 'n8n-nodes-base.slack' },
          { type: 'n8n-nodes-base.sheets' },
          { type: 'n8n-nodes-base.quickbooks' },
          { type: 'n8n-nodes-base.hubspot' }
        ]
      };

      // Simple workflow with few integrations
      const lowValueWorkflow = {
        ...mockWorkflow,
        nodes: [
          { type: 'n8n-nodes-base.webhook' },
          { type: 'n8n-nodes-base.gmail' }
        ]
      };

      mockN8nService.getWorkflow.mockResolvedValue(highValueWorkflow);
      const highValueTemplate = await workflowCurationService.createClientTemplate('high-value', {});

      mockN8nService.getWorkflow.mockResolvedValue(lowValueWorkflow);
      const lowValueTemplate = await workflowCurationService.createClientTemplate('low-value', {});

      expect(highValueTemplate.monthlyValue).toBeGreaterThan(lowValueTemplate.monthlyValue);
    });

    test('infers correct industries from integrations', async () => {
      const ecommerceWorkflow = {
        ...mockWorkflow,
        nodes: [{ type: 'n8n-nodes-base.shopify' }]
      };

      const salesWorkflow = {
        ...mockWorkflow,
        nodes: [{ type: 'n8n-nodes-base.hubspot' }]
      };

      mockN8nService.getWorkflow.mockResolvedValue(ecommerceWorkflow);
      const ecommerceTemplate = await workflowCurationService.createClientTemplate('ecommerce', {});

      mockN8nService.getWorkflow.mockResolvedValue(salesWorkflow);
      const salesTemplate = await workflowCurationService.createClientTemplate('sales', {});

      expect(ecommerceTemplate.industry).toContain('E-commerce');
      expect(salesTemplate.industry).toContain('Sales');
    });

    test('determines correct credential types', async () => {
      const oauthServices = ['google', 'microsoft', 'shopify', 'slack'];
      const apiKeyServices = ['mailchimp', 'sendgrid', 'twilio'];

      for (const service of oauthServices) {
        const workflow = {
          ...mockWorkflow,
          nodes: [{ type: `n8n-nodes-base.${service}` }]
        };

        mockN8nService.getWorkflow.mockResolvedValue(workflow);
        const template = await workflowCurationService.createClientTemplate(service, {});

        const credential = template.credentialsNeeded.find(c => c.service === service);
        expect(credential?.type).toBe('oauth');
      }

      for (const service of apiKeyServices) {
        const workflow = {
          ...mockWorkflow,
          nodes: [{ type: `n8n-nodes-base.${service}` }]
        };

        mockN8nService.getWorkflow.mockResolvedValue(workflow);
        const template = await workflowCurationService.createClientTemplate(service, {});

        const credential = template.credentialsNeeded.find(c => c.service === service);
        expect(credential?.type).toBe('api_key');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles n8n service errors in analyzeWorkflow', async () => {
      mockN8nService.getWorkflow.mockRejectedValue(new Error('Network error'));

      await expect(workflowCurationService.analyzeWorkflow('workflow-1'))
        .rejects.toThrow('Network error');
    });

    test('handles n8n service errors in createClientTemplate', async () => {
      mockN8nService.getWorkflow.mockRejectedValue(new Error('Network error'));

      await expect(workflowCurationService.createClientTemplate('workflow-1', {}))
        .rejects.toThrow('Network error');
    });

    test('handles n8n service errors in getClientTemplates', async () => {
      mockN8nService.getWorkflows.mockRejectedValue(new Error('Network error'));

      await expect(workflowCurationService.getClientTemplates())
        .rejects.toThrow('Network error');
    });

    test('handles malformed workflow data', async () => {
      const malformedWorkflow = {
        id: 'malformed',
        name: 'Malformed Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
        nodes: null, // Malformed data
        connections: undefined, // Malformed data
        settings: {},
        staticData: {},
        tags: ['test']
      };

      mockN8nService.getWorkflow.mockResolvedValue(malformedWorkflow as any);

      // Should handle gracefully without crashing
      const template = await workflowCurationService.createClientTemplate('malformed', {});
      expect(template).toBeDefined();
      expect(template.businessName).toBeTruthy();
    });

    test('handles empty workflow nodes', async () => {
      const emptyWorkflow = {
        ...mockWorkflow,
        nodes: [],
        connections: {}
      };

      mockN8nService.getWorkflow.mockResolvedValue(emptyWorkflow);

      const template = await workflowCurationService.createClientTemplate('empty', {});
      expect(template).toBeDefined();
      expect(template.credentialsNeeded).toEqual([]);
    });
  });

  describe('Performance', () => {
    test('handles large workflow lists efficiently', async () => {
      const largeWorkflowList = Array.from({ length: 100 }, (_, i) => ({
        ...mockWorkflow,
        id: `workflow-${i}`,
        name: `Workflow ${i}`,
        tags: ['client-ready']
      }));

      mockN8nService.getWorkflows.mockResolvedValue(largeWorkflowList);
      mockN8nService.getWorkflow.mockImplementation((id) => 
        Promise.resolve(largeWorkflowList.find(w => w.id === id) || null)
      );

      const startTime = performance.now();
      const templates = await workflowCurationService.getClientTemplates();
      const endTime = performance.now();

      expect(templates.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('caches analysis results to avoid redundant processing', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflow);

      // First analysis
      await workflowCurationService.analyzeWorkflow('workflow-1');
      
      // Second analysis should use cached results
      await workflowCurationService.analyzeWorkflow('workflow-1');

      // Should only call getWorkflow once per unique workflow
      expect(mockN8nService.getWorkflow).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Validation', () => {
    test('validates template data structure', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-1', {});

      // Check required fields
      expect(template.id).toBeTruthy();
      expect(template.businessName).toBeTruthy();
      expect(template.businessDescription).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(template.industry).toBeInstanceOf(Array);
      expect(template.difficulty).toMatch(/^(beginner|intermediate|advanced)$/);
      expect(template.setupTime).toBeTruthy();
      expect(typeof template.monthlyValue).toBe('number');
      expect(template.timesSaved).toBeTruthy();
      expect(template.features).toBeInstanceOf(Array);
      expect(template.requirements).toBeInstanceOf(Array);
      expect(template.tags).toBeInstanceOf(Array);
      expect(typeof template.isClientReady).toBe('boolean');
      expect(typeof template.consulantOnly).toBe('boolean');
      expect(template.originalWorkflowId).toBeTruthy();
      expect(template.credentialsNeeded).toBeInstanceOf(Array);
      expect(template.setupSteps).toBeInstanceOf(Array);
      expect(template.successMetrics).toBeInstanceOf(Array);
      expect(template.icon).toBeTruthy();
    });

    test('validates credential requirement structure', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-1', {});

      template.credentialsNeeded.forEach(cred => {
        expect(cred.service).toBeTruthy();
        expect(cred.type).toMatch(/^(oauth|api_key|username_password)$/);
        expect(cred.displayName).toBeTruthy();
        expect(cred.description).toBeTruthy();
        expect(cred.setupInstructions).toBeInstanceOf(Array);
        expect(typeof cred.testable).toBe('boolean');
        expect(typeof cred.required).toBe('boolean');
      });
    });

    test('validates setup step structure', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-1', {});

      template.setupSteps.forEach(step => {
        expect(typeof step.step).toBe('number');
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.action).toMatch(/^(configure_credential|test_connection|customize_settings|review_and_activate)$/);
        expect(step.estimatedTime).toBeTruthy();
      });
    });
  });
});