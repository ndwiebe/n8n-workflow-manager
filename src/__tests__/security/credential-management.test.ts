import { workflowCurationService } from '../../services/workflowCurationService';
import { n8nService } from '../../services/n8nService';

// Mock the services
jest.mock('../../services/n8nService');

const mockN8nService = n8nService as jest.Mocked<typeof n8nService>;

// Mock sensitive data scenarios
const mockWorkflowWithCredentials = {
  id: 'workflow-secure-1',
  name: 'Secure Email Integration',
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  nodes: [
    { 
      type: 'n8n-nodes-base.gmail',
      name: 'Gmail',
      credentials: {
        gmail: 'gmail-credential-id'
      }
    },
    {
      type: 'n8n-nodes-base.webhook',
      name: 'Webhook',
      webhookId: 'secret-webhook-id-12345'
    },
    {
      type: 'n8n-nodes-base.postgres',
      name: 'Database',
      credentials: {
        postgres: 'db-credential-id'
      }
    }
  ],
  connections: {},
  settings: {
    environment: 'production',
    timezone: 'UTC'
  },
  staticData: {
    apiKeys: {
      secret: 'this-should-not-be-exposed'
    }
  },
  tags: ['sensitive', 'production']
};

describe('Credential Management Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (workflowCurationService as any).templateCache.clear();
  });

  describe('Data Sanitization', () => {
    test('removes sensitive data from workflow analysis', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      const analysis = await workflowCurationService.analyzeWorkflow('workflow-secure-1');

      // Verify sensitive data is not exposed in analysis results
      expect(JSON.stringify(analysis)).not.toContain('gmail-credential-id');
      expect(JSON.stringify(analysis)).not.toContain('db-credential-id');
      expect(JSON.stringify(analysis)).not.toContain('secret-webhook-id-12345');
      expect(JSON.stringify(analysis)).not.toContain('this-should-not-be-exposed');
    });

    test('sanitizes credential requirements for client templates', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      // Verify credential requirements don't expose internal IDs
      template.credentialsNeeded.forEach(cred => {
        expect(cred.service).not.toMatch(/-credential-id$/);
        expect(cred.description).not.toContain('credential-id');
        expect(cred.setupInstructions.join(' ')).not.toContain('credential-id');
      });
    });

    test('excludes sensitive workflow settings from templates', async () => {
      const sensitiveWorkflow = {
        ...mockWorkflowWithCredentials,
        settings: {
          ...mockWorkflowWithCredentials.settings,
          apiKey: 'secret-api-key-123',
          databaseUrl: 'postgresql://user:pass@host:5432/db',
          encryptionKey: 'super-secret-key'
        }
      };

      mockN8nService.getWorkflow.mockResolvedValue(sensitiveWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      // Verify sensitive settings are not included
      const templateString = JSON.stringify(template);
      expect(templateString).not.toContain('secret-api-key-123');
      expect(templateString).not.toContain('postgresql://user:pass');
      expect(templateString).not.toContain('super-secret-key');
    });
  });

  describe('OAuth Flow Security', () => {
    test('generates secure OAuth credential requirements', async () => {
      const oauthWorkflow = {
        ...mockWorkflowWithCredentials,
        nodes: [
          { type: 'n8n-nodes-base.google', name: 'Google Drive' },
          { type: 'n8n-nodes-base.microsoft', name: 'Microsoft 365' },
          { type: 'n8n-nodes-base.slack', name: 'Slack' }
        ]
      };

      mockN8nService.getWorkflow.mockResolvedValue(oauthWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      const oauthCredentials = template.credentialsNeeded.filter(c => c.type === 'oauth');

      oauthCredentials.forEach(cred => {
        // Verify OAuth credentials have proper security instructions
        expect(cred.setupInstructions).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/OAuth|API settings|permissions/i)
          ])
        );
        
        // Verify they're marked as testable for security validation
        expect(cred.testable).toBe(true);
        
        // Verify proper service naming (no internal references)
        expect(cred.service).not.toContain('nodes-base');
        expect(cred.displayName).toBeTruthy();
      });
    });

    test('validates OAuth scope requirements', async () => {
      const scopedWorkflow = {
        ...mockWorkflowWithCredentials,
        nodes: [
          { 
            type: 'n8n-nodes-base.gmail',
            name: 'Gmail Read',
            parameters: {
              operation: 'read'
            }
          },
          {
            type: 'n8n-nodes-base.gmail',
            name: 'Gmail Send',
            parameters: {
              operation: 'send'
            }
          }
        ]
      };

      mockN8nService.getWorkflow.mockResolvedValue(scopedWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      const gmailCred = template.credentialsNeeded.find(c => c.service === 'gmail');
      expect(gmailCred).toBeDefined();
      expect(gmailCred?.description).toContain('Gmail account');
      
      // Should mention permissions appropriately without exposing technical scope details
      expect(gmailCred?.description).not.toContain('scope:');
      expect(gmailCred?.description).not.toContain('googleapis.com');
    });
  });

  describe('API Key Security', () => {
    test('provides secure API key handling instructions', async () => {
      const apiKeyWorkflow = {
        ...mockWorkflowWithCredentials,
        nodes: [
          { type: 'n8n-nodes-base.mailchimp', name: 'Mailchimp' },
          { type: 'n8n-nodes-base.sendgrid', name: 'SendGrid' },
          { type: 'n8n-nodes-base.stripe', name: 'Stripe' }
        ]
      };

      mockN8nService.getWorkflow.mockResolvedValue(apiKeyWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      const apiKeyCredentials = template.credentialsNeeded.filter(c => c.type === 'api_key');

      apiKeyCredentials.forEach(cred => {
        // Verify security-focused setup instructions
        expect(cred.setupInstructions).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/API.*(key|settings)/i)
          ])
        );
        
        // Should not contain example keys or vulnerable instructions
        const instructionsText = cred.setupInstructions.join(' ');
        expect(instructionsText).not.toMatch(/sk_test_|pk_test_|test.*key/i);
        expect(instructionsText).not.toContain('copy');
        expect(instructionsText).not.toContain('paste');
      });
    });

    test('masks sensitive configuration examples', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {
        businessDescription: 'Configure your API key: sk_test_12345 for testing'
      });

      // Verify sensitive examples are removed or masked
      expect(template.businessDescription).not.toContain('sk_test_12345');
      expect(template.features.join(' ')).not.toMatch(/sk_|pk_|api_key_/);
    });
  });

  describe('Database Credential Security', () => {
    test('provides secure database connection guidance', async () => {
      const dbWorkflow = {
        ...mockWorkflowWithCredentials,
        nodes: [
          { type: 'n8n-nodes-base.postgres', name: 'PostgreSQL' },
          { type: 'n8n-nodes-base.mysql', name: 'MySQL' },
          { type: 'n8n-nodes-base.mongodb', name: 'MongoDB' }
        ]
      };

      mockN8nService.getWorkflow.mockResolvedValue(dbWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      const dbCredentials = template.credentialsNeeded.filter(c => 
        c.type === 'username_password' && 
        ['postgres', 'mysql', 'mongodb'].includes(c.service)
      );

      dbCredentials.forEach(cred => {
        // Verify security-conscious instructions
        const instructionsText = cred.setupInstructions.join(' ');
        expect(instructionsText).toMatch(/connection|access|network/i);
        
        // Should not contain insecure examples
        expect(instructionsText).not.toContain('root');
        expect(instructionsText).not.toContain('admin');
        expect(instructionsText).not.toContain('password123');
        expect(instructionsText).not.toContain('localhost');
      });
    });
  });

  describe('Input Validation Security', () => {
    test('validates and sanitizes business metadata input', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      const maliciousMetadata = {
        businessName: '<script>alert("xss")</script>Workflow',
        businessDescription: 'Description with <img src="x" onerror="alert(1)">',
        features: [
          'Normal feature',
          'javascript:alert("xss")',
          '<svg onload="alert(1)">Feature</svg>'
        ]
      };

      const template = await workflowCurationService.createClientTemplate(
        'workflow-secure-1',
        maliciousMetadata
      );

      // Verify XSS attempts are neutralized
      expect(template.businessName).not.toContain('<script>');
      expect(template.businessName).not.toContain('alert');
      expect(template.businessDescription).not.toContain('<img');
      expect(template.businessDescription).not.toContain('onerror');
      
      template.features.forEach(feature => {
        expect(feature).not.toContain('javascript:');
        expect(feature).not.toContain('<svg');
        expect(feature).not.toContain('onload');
      });
    });

    test('prevents SQL injection in workflow queries', async () => {
      const maliciousWorkflowId = "1'; DROP TABLE workflows; --";

      // Should handle malicious input gracefully
      await expect(workflowCurationService.analyzeWorkflow(maliciousWorkflowId))
        .rejects.toThrow(); // Should reject, not execute malicious code

      expect(mockN8nService.getWorkflow).toHaveBeenCalledWith(maliciousWorkflowId);
    });

    test('validates workflow visibility changes', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);
      mockN8nService.updateWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      // Test with invalid visibility values
      const invalidVisibilityValues = [
        'malicious-script',
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '../../../etc/passwd'
      ];

      for (const invalidValue of invalidVisibilityValues) {
        await expect(
          workflowCurationService.setWorkflowVisibility('workflow-1', invalidValue as any)
        ).rejects.toThrow();
      }
    });
  });

  describe('Access Control Security', () => {
    test('enforces workflow visibility segregation', async () => {
      const sensitiveWorkflows = [
        { ...mockWorkflowWithCredentials, tags: ['internal-only', 'sensitive'] },
        { ...mockWorkflowWithCredentials, id: 'workflow-2', tags: ['consultant-demo'] },
        { ...mockWorkflowWithCredentials, id: 'workflow-3', tags: ['client-ready'] }
      ];

      mockN8nService.getWorkflows.mockResolvedValue(sensitiveWorkflows);

      // Only client-ready workflows should be accessible via client templates
      const clientTemplates = await workflowCurationService.getClientTemplates();

      // Should only return workflows explicitly marked as client-ready
      expect(clientTemplates.length).toBe(1);
      expect(clientTemplates[0].originalWorkflowId).toBe('workflow-3');
    });

    test('prevents unauthorized access to sensitive workflow data', async () => {
      const internalWorkflow = {
        ...mockWorkflowWithCredentials,
        tags: ['internal-only', 'production', 'sensitive']
      };

      mockN8nService.getWorkflows.mockResolvedValue([internalWorkflow]);

      const clientTemplates = await workflowCurationService.getClientTemplates();

      // Internal-only workflows should not be accessible via client interface
      expect(clientTemplates).toEqual([]);
    });

    test('validates consultant-only workflow access', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      const consultantTemplate = await workflowCurationService.createClientTemplate(
        'workflow-secure-1',
        { consulantOnly: true }
      );

      expect(consultantTemplate.consulantOnly).toBe(true);
      
      // Consultant-only templates should have different access patterns
      expect(consultantTemplate.requirements).toBeDefined();
    });
  });

  describe('Data Exposure Prevention', () => {
    test('prevents exposure of internal workflow structure', async () => {
      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      // Verify internal node structure is not exposed
      expect(template).not.toHaveProperty('nodes');
      expect(template).not.toHaveProperty('connections');
      expect(template).not.toHaveProperty('staticData');
      
      // Should only expose business-relevant information
      expect(template.businessName).toBeDefined();
      expect(template.businessDescription).toBeDefined();
      expect(template.features).toBeDefined();
      expect(template.credentialsNeeded).toBeDefined();
    });

    test('sanitizes error messages to prevent information disclosure', async () => {
      // Mock detailed technical error
      mockN8nService.getWorkflow.mockRejectedValue(
        new Error('Database connection failed: postgres://user:pass@internal-db:5432/workflows')
      );

      await expect(workflowCurationService.analyzeWorkflow('workflow-1'))
        .rejects.toThrow(); // Should still throw, but...

      // Error should not contain sensitive connection details
      try {
        await workflowCurationService.analyzeWorkflow('workflow-1');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('postgres://user:pass');
        expect(errorMessage).not.toContain('internal-db');
      }
    });

    test('prevents credential enumeration through error responses', async () => {
      // Different error patterns should not reveal whether credentials exist
      const testCases = [
        'valid-workflow-id',
        'invalid-workflow-id',
        'non-existent-workflow'
      ];

      const errorTypes = new Set();

      for (const workflowId of testCases) {
        try {
          mockN8nService.getWorkflow.mockResolvedValue(null);
          await workflowCurationService.analyzeWorkflow(workflowId);
        } catch (error) {
          errorTypes.add(error.constructor.name);
        }
      }

      // All test cases should produce similar error types
      expect(errorTypes.size).toBeLessThanOrEqual(1);
    });
  });

  describe('Audit and Logging Security', () => {
    test('logs security-relevant operations appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockN8nService.getWorkflow.mockResolvedValue(mockWorkflowWithCredentials);

      // Operations that should be logged
      await workflowCurationService.analyzeWorkflow('workflow-secure-1');
      await workflowCurationService.setWorkflowVisibility('workflow-secure-1', 'client-ready');

      // Verify appropriate logging occurred (without sensitive data)
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat()
      ].join(' ');

      // Should not log sensitive data
      expect(allLogs).not.toContain('gmail-credential-id');
      expect(allLogs).not.toContain('secret-webhook-id');
      expect(allLogs).not.toContain('this-should-not-be-exposed');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Encryption and Secrets Management', () => {
    test('handles encrypted workflow data appropriately', async () => {
      const encryptedWorkflow = {
        ...mockWorkflowWithCredentials,
        staticData: {
          encrypted: true,
          data: 'encrypted_data_blob_here'
        }
      };

      mockN8nService.getWorkflow.mockResolvedValue(encryptedWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      // Should not expose encrypted data
      const templateString = JSON.stringify(template);
      expect(templateString).not.toContain('encrypted_data_blob_here');
      expect(templateString).not.toContain('encrypted: true');
    });

    test('validates environment-specific security configurations', async () => {
      const productionWorkflow = {
        ...mockWorkflowWithCredentials,
        settings: {
          environment: 'production',
          securityLevel: 'high',
          encryptionEnabled: true
        }
      };

      mockN8nService.getWorkflow.mockResolvedValue(productionWorkflow);

      const template = await workflowCurationService.createClientTemplate('workflow-secure-1', {});

      // Production workflows should have additional security considerations
      expect(template.requirements.length).toBeGreaterThan(0);
      
      // Should not expose internal security settings
      const templateString = JSON.stringify(template);
      expect(templateString).not.toContain('securityLevel');
      expect(templateString).not.toContain('encryptionEnabled');
    });
  });
});