/// <reference types="cypress" />

describe('SMB Workflow Management - Complete User Journey', () => {
  let testCompany: any;
  let testUser: any;

  before(() => {
    // Setup test company and user
    cy.task('db:seed').then((data: any) => {
      testCompany = data.company;
      testUser = data.user;
    });
  });

  beforeEach(() => {
    // Reset database state and login
    cy.task('db:reset');
    cy.intercept('GET', '/api/metrics/**').as('getMetrics');
    cy.intercept('POST', '/api/workflows/**').as('postWorkflow');
    cy.intercept('GET', '/api/workflows/**').as('getWorkflows');
    
    cy.visit('/login');
    cy.login(testUser.email, 'password123');
    cy.url().should('include', '/dashboard');
  });

  describe('SMB Onboarding Flow', () => {
    it('completes the SMB onboarding process', () => {
      // First-time user should see onboarding
      cy.get('[data-cy=onboarding-welcome]').should('be.visible');
      cy.get('[data-cy=company-setup-step]').should('have.class', 'active');

      // Step 1: Company Information
      cy.get('[data-cy=company-name-input]').type('Test Manufacturing Co.');
      cy.get('[data-cy=industry-select]').select('Manufacturing');
      cy.get('[data-cy=company-size-select]').select('25-50 employees');
      cy.get('[data-cy=monthly-revenue-input]').type('150000');
      cy.get('[data-cy=next-step-btn]').click();

      // Step 2: Business Goals
      cy.get('[data-cy=business-goals-step]').should('have.class', 'active');
      cy.get('[data-cy=goal-reduce-manual-work]').check();
      cy.get('[data-cy=goal-improve-accuracy]').check();
      cy.get('[data-cy=goal-increase-revenue]').check();
      cy.get('[data-cy=next-step-btn]').click();

      // Step 3: Workflow Selection
      cy.get('[data-cy=workflow-selection-step]').should('have.class', 'active');
      cy.get('[data-cy=workflow-invoice-processing]').check();
      cy.get('[data-cy=workflow-email-automation]').check();
      cy.get('[data-cy=workflow-inventory-sync]').check();

      // View ROI preview
      cy.get('[data-cy=roi-preview]').should('be.visible');
      cy.get('[data-cy=estimated-monthly-savings]').should('contain', '$');
      cy.get('[data-cy=estimated-time-savings]').should('contain', 'hours');

      cy.get('[data-cy=complete-onboarding-btn]').click();

      // Should redirect to dashboard with selected workflows
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=workflow-card]').should('have.length', 3);
      cy.get('[data-cy=onboarding-success-toast]').should('be.visible');
    });

    it('allows skipping onboarding for experienced users', () => {
      cy.get('[data-cy=skip-onboarding-btn]').click();
      cy.get('[data-cy=skip-confirmation-modal]').should('be.visible');
      cy.get('[data-cy=confirm-skip-btn]').click();

      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=empty-state]').should('be.visible');
      cy.get('[data-cy=add-first-workflow-btn]').should('be.visible');
    });
  });

  describe('Business Metrics Dashboard', () => {
    beforeEach(() => {
      cy.setupWorkflows(['invoice-processing', 'email-automation']);
      cy.visit('/dashboard/metrics');
    });

    it('displays comprehensive business metrics', () => {
      cy.wait('@getMetrics');

      // Revenue metrics
      cy.get('[data-cy=monthly-revenue-card]').should('be.visible');
      cy.get('[data-cy=revenue-amount]').should('contain', '$150,000');
      cy.get('[data-cy=revenue-growth]').should('contain', '%');

      // Profit metrics
      cy.get('[data-cy=net-profit-card]').should('be.visible');
      cy.get('[data-cy=profit-amount]').should('contain', '$');
      cy.get('[data-cy=profit-margin]').should('contain', '%');

      // Customer metrics
      cy.get('[data-cy=customer-count-card]').should('be.visible');
      cy.get('[data-cy=customer-count]').should('contain.text', '250');
      cy.get('[data-cy=customer-growth]').should('be.visible');

      // Workflow automation metrics
      cy.get('[data-cy=automation-metrics-section]').should('be.visible');
      cy.get('[data-cy=time-saved-metric]').should('contain', 'hours');
      cy.get('[data-cy=cost-savings-metric]').should('contain', '$');
      cy.get('[data-cy=error-reduction-metric]').should('contain', '%');
    });

    it('allows filtering metrics by date range', () => {
      cy.get('[data-cy=date-range-selector]').select('Last 12 months');
      cy.wait('@getMetrics');

      cy.get('[data-cy=date-range-display]').should('contain', '12 months');
      
      // Custom date range
      cy.get('[data-cy=date-range-selector]').select('Custom');
      cy.get('[data-cy=custom-date-modal]').should('be.visible');
      
      cy.get('[data-cy=start-date-input]').type('2024-01-01');
      cy.get('[data-cy=end-date-input]').type('2024-06-30');
      cy.get('[data-cy=apply-date-range-btn]').click();

      cy.wait('@getMetrics');
      cy.get('[data-cy=date-range-display]').should('contain', 'Jan 1 - Jun 30, 2024');
    });

    it('displays interactive trend charts', () => {
      cy.get('[data-cy=revenue-trend-chart]').should('be.visible');
      
      // Hover over chart points
      cy.get('[data-cy=revenue-trend-chart] .recharts-line-curve').trigger('mouseover');
      cy.get('[data-cy=chart-tooltip]').should('be.visible');
      cy.get('[data-cy=tooltip-revenue]').should('contain', '$');
      cy.get('[data-cy=tooltip-date]').should('be.visible');

      // Switch chart types
      cy.get('[data-cy=chart-type-selector]').select('Bar Chart');
      cy.get('[data-cy=revenue-trend-chart] .recharts-bar').should('be.visible');

      // Toggle metrics visibility
      cy.get('[data-cy=toggle-expenses-line]').click();
      cy.get('[data-cy=expenses-line]').should('not.be.visible');
    });

    it('exports metrics data', () => {
      cy.get('[data-cy=export-metrics-btn]').click();
      cy.get('[data-cy=export-options-menu]').should('be.visible');

      // Export as CSV
      cy.get('[data-cy=export-csv-option]').click();
      cy.get('[data-cy=csv-export-modal]').should('be.visible');
      cy.get('[data-cy=confirm-csv-export]').click();
      
      // Check that download was triggered
      cy.readFile('cypress/downloads/business-metrics.csv').should('exist');

      // Export as PDF report
      cy.get('[data-cy=export-metrics-btn]').click();
      cy.get('[data-cy=export-pdf-option]').click();
      cy.get('[data-cy=pdf-export-modal]').should('be.visible');
      cy.get('[data-cy=include-charts-checkbox]').check();
      cy.get('[data-cy=confirm-pdf-export]').click();

      cy.readFile('cypress/downloads/business-metrics-report.pdf').should('exist');
    });
  });

  describe('ROI Calculator', () => {
    beforeEach(() => {
      cy.visit('/dashboard/roi-calculator');
    });

    it('calculates ROI for selected workflows', () => {
      // Enter business data
      cy.get('[data-cy=monthly-revenue-input]').clear().type('200000');
      cy.get('[data-cy=monthly-expenses-input]').clear().type('120000');
      cy.get('[data-cy=employee-count-input]').clear().type('30');

      // Select workflows
      cy.get('[data-cy=workflow-invoice-processing]').check();
      cy.get('[data-cy=workflow-email-automation]').check();
      cy.get('[data-cy=workflow-ai-support]').check();

      // Verify workflow details appear
      cy.get('[data-cy=workflow-details-section]').should('be.visible');
      cy.get('[data-cy=invoice-processing-details]').should('contain', 'Time savings: 25 hours/month');
      cy.get('[data-cy=email-automation-details]').should('contain', 'Efficiency gain: 40%');

      // Calculate ROI
      cy.get('[data-cy=calculate-roi-btn]').click();
      cy.get('[data-cy=roi-calculation-loading]').should('be.visible');

      cy.wait('@postWorkflow');

      // Verify results
      cy.get('[data-cy=roi-results-section]').should('be.visible');
      cy.get('[data-cy=monthly-roi-amount]').should('contain', '$');
      cy.get('[data-cy=annual-roi-amount]').should('contain', '$');
      cy.get('[data-cy=payback-period]').should('contain', 'months');
      cy.get('[data-cy=efficiency-gains]').should('contain', '%');

      // Verify cost savings breakdown
      cy.get('[data-cy=cost-savings-breakdown]').should('be.visible');
      cy.get('[data-cy=time-savings-amount]').should('contain', 'hours');
      cy.get('[data-cy=labor-cost-savings]').should('contain', '$');
      cy.get('[data-cy=operational-savings]').should('contain', '$');

      // Verify visualization charts
      cy.get('[data-cy=efficiency-gains-chart]').should('be.visible');
      cy.get('[data-cy=before-after-comparison]').should('be.visible');
    });

    it('handles dynamic workflow cost adjustments', () => {
      cy.get('[data-cy=workflow-invoice-processing]').check();
      
      // Expand advanced options
      cy.get('[data-cy=advanced-options-toggle]').click();
      cy.get('[data-cy=advanced-options-panel]').should('be.visible');

      // Adjust setup cost
      cy.get('[data-cy=invoice-setup-cost-input]').clear().type('8000');
      
      // Adjust monthly cost
      cy.get('[data-cy=invoice-monthly-cost-input]').clear().type('750');

      // Calculate ROI with custom costs
      cy.get('[data-cy=calculate-roi-btn]').click();
      cy.wait('@postWorkflow');

      // ROI should reflect custom costs
      cy.get('[data-cy=total-investment-cost]').should('contain', '$8,000');
      cy.get('[data-cy=monthly-operational-cost]').should('contain', '$750');
      cy.get('[data-cy=adjusted-payback-period]').should('be.visible');
    });

    it('exports ROI report for stakeholders', () => {
      // Setup and calculate ROI first
      cy.get('[data-cy=workflow-invoice-processing]').check();
      cy.get('[data-cy=workflow-email-automation]').check();
      cy.get('[data-cy=calculate-roi-btn]').click();
      cy.wait('@postWorkflow');

      // Export detailed report
      cy.get('[data-cy=export-roi-report-btn]').click();
      cy.get('[data-cy=roi-export-modal]').should('be.visible');

      // Customize report
      cy.get('[data-cy=include-assumptions-checkbox]').check();
      cy.get('[data-cy=include-timeline-checkbox]').check();
      cy.get('[data-cy=report-recipient-input]').type('stakeholder@company.com');

      cy.get('[data-cy=generate-report-btn]').click();
      
      cy.get('[data-cy=report-generation-success]').should('be.visible');
      cy.readFile('cypress/downloads/roi-analysis-report.pdf').should('exist');
    });
  });

  describe('Workflow Configuration and Management', () => {
    it('configures invoice processing workflow', () => {
      cy.visit('/dashboard/workflows');
      cy.get('[data-cy=add-workflow-btn]').click();

      // Select invoice processing
      cy.get('[data-cy=workflow-template-invoice]').click();
      cy.get('[data-cy=continue-with-template-btn]').click();

      // Configuration wizard
      cy.get('[data-cy=workflow-config-wizard]').should('be.visible');
      
      // Step 1: Basic Settings
      cy.get('[data-cy=workflow-name-input]').type('Company Invoice Processing');
      cy.get('[data-cy=workflow-description-input]').type('Automated processing of incoming invoices');
      cy.get('[data-cy=workflow-priority-select]').select('High');
      cy.get('[data-cy=next-config-step-btn]').click();

      // Step 2: Data Sources
      cy.get('[data-cy=email-source-checkbox]').check();
      cy.get('[data-cy=email-server-input]').type('imap.company.com');
      cy.get('[data-cy=email-username-input]').type('invoices@company.com');
      cy.get('[data-cy=email-password-input]').type('secure-password');
      
      cy.get('[data-cy=ftp-source-checkbox]').check();
      cy.get('[data-cy=ftp-server-input]').type('ftp.vendor.com');
      cy.get('[data-cy=next-config-step-btn]').click();

      // Step 3: Processing Rules
      cy.get('[data-cy=extraction-rules-section]').should('be.visible');
      cy.get('[data-cy=extract-vendor-checkbox]').check();
      cy.get('[data-cy=extract-amount-checkbox]').check();
      cy.get('[data-cy=extract-date-checkbox]').check();
      
      cy.get('[data-cy=validation-rules-section]').should('be.visible');
      cy.get('[data-cy=amount-validation-min]').type('0');
      cy.get('[data-cy=amount-validation-max]').type('50000');
      cy.get('[data-cy=next-config-step-btn]').click();

      // Step 4: Integration Settings
      cy.get('[data-cy=accounting-integration-select]').select('QuickBooks');
      cy.get('[data-cy=quickbooks-api-key-input]').type('qb-api-key-123');
      cy.get('[data-cy=approval-workflow-checkbox]').check();
      cy.get('[data-cy=approval-threshold-input]').type('1000');
      cy.get('[data-cy=finish-config-btn]').click();

      // Verify workflow created
      cy.get('[data-cy=workflow-creation-success]').should('be.visible');
      cy.get('[data-cy=workflow-card-company-invoice]').should('be.visible');
      cy.get('[data-cy=workflow-status]').should('contain', 'Configured');
    });

    it('tests workflow configuration before activation', () => {
      cy.setupWorkflow('invoice-processing-test');
      cy.visit('/dashboard/workflows');

      cy.get('[data-cy=workflow-card-invoice-test]').within(() => {
        cy.get('[data-cy=test-workflow-btn]').click();
      });

      cy.get('[data-cy=test-workflow-modal]').should('be.visible');
      
      // Upload test file
      cy.get('[data-cy=test-file-upload]').selectFile('cypress/fixtures/sample-invoice.pdf');
      cy.get('[data-cy=run-test-btn]').click();

      // Monitor test execution
      cy.get('[data-cy=test-execution-progress]').should('be.visible');
      cy.get('[data-cy=test-step-1]').should('have.class', 'completed');
      cy.get('[data-cy=test-step-2]').should('have.class', 'completed');
      cy.get('[data-cy=test-step-3]').should('have.class', 'completed');

      // View test results
      cy.get('[data-cy=test-results-section]').should('be.visible');
      cy.get('[data-cy=extracted-vendor]').should('contain', 'ACME Corp');
      cy.get('[data-cy=extracted-amount]').should('contain', '$1,234.56');
      cy.get('[data-cy=extracted-date]').should('contain', '2024');

      cy.get('[data-cy=test-success-indicator]').should('be.visible');
      cy.get('[data-cy=activate-workflow-btn]').should('be.enabled');
    });

    it('activates and monitors workflow execution', () => {
      cy.setupWorkflow('invoice-processing-configured');
      cy.visit('/dashboard/workflows');

      // Activate workflow
      cy.get('[data-cy=workflow-card-invoice-configured]').within(() => {
        cy.get('[data-cy=activate-workflow-btn]').click();
      });

      cy.get('[data-cy=activation-confirmation-modal]').should('be.visible');
      cy.get('[data-cy=confirm-activation-btn]').click();

      // Verify activation
      cy.get('[data-cy=workflow-status]').should('contain', 'Active');
      cy.get('[data-cy=activation-success-toast]').should('be.visible');

      // Monitor real-time execution
      cy.get('[data-cy=workflow-card-invoice-configured]').click();
      cy.get('[data-cy=workflow-details-page]').should('be.visible');

      // Execution metrics
      cy.get('[data-cy=executions-today]').should('be.visible');
      cy.get('[data-cy=success-rate]').should('contain', '%');
      cy.get('[data-cy=average-execution-time]').should('contain', 'seconds');

      // Recent executions list
      cy.get('[data-cy=recent-executions-list]').should('be.visible');
      cy.get('[data-cy=execution-item]').first().click();
      
      // Execution details
      cy.get('[data-cy=execution-details-modal]').should('be.visible');
      cy.get('[data-cy=execution-timeline]').should('be.visible');
      cy.get('[data-cy=execution-data]').should('be.visible');
      cy.get('[data-cy=execution-logs]').should('be.visible');
    });
  });

  describe('Real-time Notifications', () => {
    beforeEach(() => {
      cy.setupWorkflows(['invoice-processing', 'email-automation']);
      cy.visit('/dashboard');
    });

    it('receives and displays workflow notifications', () => {
      // Simulate workflow execution completion
      cy.task('simulate:workflowCompletion', {
        workflowId: 'invoice-processing',
        executionId: 'exec-123',
        status: 'success',
        itemsProcessed: 5,
        timeTaken: 45
      });

      // Check notification appears
      cy.get('[data-cy=notification-toast]').should('be.visible');
      cy.get('[data-cy=notification-title]').should('contain', 'Workflow Completed');
      cy.get('[data-cy=notification-message]').should('contain', '5 invoices processed');

      // Notification should appear in notification center
      cy.get('[data-cy=notification-bell]').click();
      cy.get('[data-cy=notification-center]').should('be.visible');
      cy.get('[data-cy=notification-item]').should('have.length.gte', 1);
    });

    it('handles workflow error notifications', () => {
      // Simulate workflow error
      cy.task('simulate:workflowError', {
        workflowId: 'email-automation',
        executionId: 'exec-124',
        error: 'SMTP connection failed',
        timestamp: new Date().toISOString()
      });

      // Error notification should appear
      cy.get('[data-cy=error-notification-toast]').should('be.visible');
      cy.get('[data-cy=notification-title]').should('contain', 'Workflow Failed');
      cy.get('[data-cy=error-message]').should('contain', 'SMTP connection failed');

      // Click to view details
      cy.get('[data-cy=view-error-details-btn]').click();
      cy.get('[data-cy=error-details-modal]').should('be.visible');
      cy.get('[data-cy=error-troubleshooting-guide]').should('be.visible');
      cy.get('[data-cy=retry-workflow-btn]').should('be.visible');
    });

    it('manages notification preferences', () => {
      cy.visit('/dashboard/settings/notifications');

      // Configure notification types
      cy.get('[data-cy=workflow-success-notifications]').uncheck();
      cy.get('[data-cy=workflow-error-notifications]').should('be.checked');
      cy.get('[data-cy=workflow-progress-notifications]').check();

      // Configure delivery methods
      cy.get('[data-cy=browser-notifications-toggle]').check();
      cy.get('[data-cy=email-notifications-toggle]').check();
      cy.get('[data-cy=slack-notifications-toggle]').check();
      
      // Slack webhook configuration
      cy.get('[data-cy=slack-webhook-input]').type('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX');

      // Save preferences
      cy.get('[data-cy=save-notification-settings-btn]').click();
      cy.get('[data-cy=settings-saved-toast]').should('be.visible');

      // Test notification delivery
      cy.get('[data-cy=test-notifications-btn]').click();
      cy.get('[data-cy=test-notification-sent]').should('be.visible');
    });
  });

  describe('Business Analytics and Reporting', () => {
    beforeEach(() => {
      cy.setupAnalyticsData();
      cy.visit('/dashboard/analytics');
    });

    it('displays comprehensive workflow analytics', () => {
      // Overview metrics
      cy.get('[data-cy=total-automations-metric]').should('be.visible');
      cy.get('[data-cy=total-time-saved-metric]').should('contain', 'hours');
      cy.get('[data-cy=total-cost-savings-metric]').should('contain', '$');
      cy.get('[data-cy=error-rate-metric]').should('contain', '%');

      // Workflow performance comparison
      cy.get('[data-cy=workflow-performance-chart]').should('be.visible');
      cy.get('[data-cy=chart-legend]').should('be.visible');

      // Top performing workflows
      cy.get('[data-cy=top-workflows-section]').should('be.visible');
      cy.get('[data-cy=workflow-ranking-list] li').should('have.length.gte', 3);

      // Efficiency trends
      cy.get('[data-cy=efficiency-trend-chart]').should('be.visible');
      cy.get('[data-cy=trend-analysis]').should('contain', 'improvement');
    });

    it('generates executive summary reports', () => {
      cy.get('[data-cy=generate-executive-report-btn]').click();
      cy.get('[data-cy=executive-report-modal]').should('be.visible');

      // Report configuration
      cy.get('[data-cy=report-period-select]').select('Quarterly');
      cy.get('[data-cy=include-roi-analysis]').check();
      cy.get('[data-cy=include-cost-breakdown]').check();
      cy.get('[data-cy=include-recommendations]').check();

      // Executive summary customization
      cy.get('[data-cy=executive-summary-template]').select('Board Presentation');
      cy.get('[data-cy=company-logo-upload]').selectFile('cypress/fixtures/company-logo.png');

      cy.get('[data-cy=generate-report-btn]').click();
      
      // Report generation progress
      cy.get('[data-cy=report-generation-progress]').should('be.visible');
      cy.get('[data-cy=report-ready-notification]').should('be.visible', { timeout: 30000 });

      // Download and preview options
      cy.get('[data-cy=download-report-btn]').should('be.visible');
      cy.get('[data-cy=preview-report-btn]').click();
      
      cy.get('[data-cy=report-preview-modal]').should('be.visible');
      cy.get('[data-cy=report-preview-content]').should('be.visible');
    });

    it('sets up automated reporting schedules', () => {
      cy.get('[data-cy=scheduled-reports-tab]').click();
      cy.get('[data-cy=add-scheduled-report-btn]').click();

      cy.get('[data-cy=report-schedule-modal]').should('be.visible');

      // Report configuration
      cy.get('[data-cy=report-name-input]').type('Monthly Business Review');
      cy.get('[data-cy=report-type-select]').select('Business Metrics Summary');
      
      // Schedule settings
      cy.get('[data-cy=frequency-select]').select('Monthly');
      cy.get('[data-cy=delivery-date-select]').select('1st of month');
      cy.get('[data-cy=delivery-time-input]').type('09:00');

      // Recipients
      cy.get('[data-cy=recipient-email-input]').type('ceo@company.com');
      cy.get('[data-cy=add-recipient-btn]').click();
      cy.get('[data-cy=recipient-email-input]').clear().type('cfo@company.com');
      cy.get('[data-cy=add-recipient-btn]').click();

      // Additional settings
      cy.get('[data-cy=include-charts-checkbox]').check();
      cy.get('[data-cy=pdf-format-radio]').check();

      cy.get('[data-cy=save-schedule-btn]').click();
      
      // Verify schedule created
      cy.get('[data-cy=scheduled-reports-list]').should('contain', 'Monthly Business Review');
      cy.get('[data-cy=schedule-success-toast]').should('be.visible');
    });
  });

  describe('System Integration and Health Monitoring', () => {
    it('monitors system health and performance', () => {
      cy.visit('/dashboard/system/health');

      // System status overview
      cy.get('[data-cy=system-status-overall]').should('contain', 'Healthy');
      cy.get('[data-cy=api-status-indicator]').should('have.class', 'status-green');
      cy.get('[data-cy=database-status-indicator]').should('have.class', 'status-green');
      cy.get('[data-cy=workflow-engine-status]').should('have.class', 'status-green');

      // Performance metrics
      cy.get('[data-cy=response-time-metric]').should('contain', 'ms');
      cy.get('[data-cy=throughput-metric]').should('contain', 'req/min');
      cy.get('[data-cy=error-rate-metric]').should('contain', '%');

      // Resource utilization
      cy.get('[data-cy=cpu-usage-chart]').should('be.visible');
      cy.get('[data-cy=memory-usage-chart]').should('be.visible');
      cy.get('[data-cy=disk-usage-chart]').should('be.visible');

      // Recent alerts
      cy.get('[data-cy=system-alerts-section]').should('be.visible');
      cy.get('[data-cy=no-critical-alerts]').should('be.visible');
    });

    it('configures integration connections', () => {
      cy.visit('/dashboard/integrations');

      // Available integrations
      cy.get('[data-cy=integrations-catalog]').should('be.visible');
      cy.get('[data-cy=integration-quickbooks]').should('be.visible');
      cy.get('[data-cy=integration-salesforce]').should('be.visible');
      cy.get('[data-cy=integration-slack]').should('be.visible');

      // Configure QuickBooks integration
      cy.get('[data-cy=integration-quickbooks]').click();
      cy.get('[data-cy=quickbooks-setup-modal]').should('be.visible');

      cy.get('[data-cy=qb-company-id-input]').type('123456789');
      cy.get('[data-cy=qb-api-key-input]').type('qb-api-key-xyz');
      cy.get('[data-cy=qb-api-secret-input]').type('qb-api-secret-abc');

      // Test connection
      cy.get('[data-cy=test-connection-btn]').click();
      cy.get('[data-cy=connection-test-loading]').should('be.visible');
      cy.get('[data-cy=connection-test-success]').should('be.visible');

      cy.get('[data-cy=save-integration-btn]').click();
      cy.get('[data-cy=integration-saved-toast]').should('be.visible');

      // Verify integration appears in active list
      cy.get('[data-cy=active-integrations-list]').should('contain', 'QuickBooks');
      cy.get('[data-cy=quickbooks-status]').should('contain', 'Connected');
    });

    it('manages data backup and recovery', () => {
      cy.visit('/dashboard/system/backup');

      // Backup overview
      cy.get('[data-cy=last-backup-date]').should('be.visible');
      cy.get('[data-cy=backup-size]').should('contain', 'MB');
      cy.get('[data-cy=backup-status]').should('contain', 'Successful');

      // Manual backup
      cy.get('[data-cy=create-backup-btn]').click();
      cy.get('[data-cy=backup-creation-modal]').should('be.visible');

      cy.get('[data-cy=backup-name-input]').type('Pre-deployment-backup');
      cy.get('[data-cy=include-configurations]').check();
      cy.get('[data-cy=include-execution-history]').check();
      cy.get('[data-cy=include-business-data]').check();

      cy.get('[data-cy=start-backup-btn]').click();
      cy.get('[data-cy=backup-progress]').should('be.visible');
      cy.get('[data-cy=backup-completed-notification]').should('be.visible', { timeout: 60000 });

      // Backup schedule configuration
      cy.get('[data-cy=backup-schedule-tab]').click();
      cy.get('[data-cy=auto-backup-toggle]').check();
      cy.get('[data-cy=backup-frequency-select]').select('Daily');
      cy.get('[data-cy=backup-time-input]').type('02:00');
      cy.get('[data-cy=retention-period-select]').select('30 days');

      cy.get('[data-cy=save-backup-schedule-btn]').click();
      cy.get('[data-cy=schedule-saved-toast]').should('be.visible');
    });
  });

  describe('User Management and Security', () => {
    it('manages team members and permissions', () => {
      cy.visit('/dashboard/team');

      // Current team members
      cy.get('[data-cy=team-members-list]').should('be.visible');
      cy.get('[data-cy=current-user-item]').should('be.visible');

      // Add new team member
      cy.get('[data-cy=invite-member-btn]').click();
      cy.get('[data-cy=invite-member-modal]').should('be.visible');

      cy.get('[data-cy=member-email-input]').type('colleague@company.com');
      cy.get('[data-cy=member-role-select]').select('Workflow Manager');
      cy.get('[data-cy=member-permissions-section]').should('be.visible');

      // Configure permissions
      cy.get('[data-cy=permission-view-metrics]').check();
      cy.get('[data-cy=permission-manage-workflows]').check();
      cy.get('[data-cy=permission-export-data]').check();
      cy.get('[data-cy=permission-admin-access]').should('not.be.checked');

      cy.get('[data-cy=send-invitation-btn]').click();
      cy.get('[data-cy=invitation-sent-toast]').should('be.visible');

      // Verify pending invitation
      cy.get('[data-cy=pending-invitations-section]').should('be.visible');
      cy.get('[data-cy=pending-invitation-item]').should('contain', 'colleague@company.com');
    });

    it('configures security settings', () => {
      cy.visit('/dashboard/settings/security');

      // Password policy
      cy.get('[data-cy=password-policy-section]').should('be.visible');
      cy.get('[data-cy=min-password-length]').clear().type('12');
      cy.get('[data-cy=require-special-chars]').check();
      cy.get('[data-cy=require-numbers]').check();
      cy.get('[data-cy=password-expiry-days]').clear().type('90');

      // Two-factor authentication
      cy.get('[data-cy=2fa-section]').should('be.visible');
      cy.get('[data-cy=enable-2fa-toggle]').check();
      cy.get('[data-cy=2fa-method-select]').select('Authenticator App');

      // Session management
      cy.get('[data-cy=session-timeout-select]').select('4 hours');
      cy.get('[data-cy=concurrent-sessions-limit]').clear().type('3');

      // API security
      cy.get('[data-cy=api-rate-limiting-toggle]').check();
      cy.get('[data-cy=api-requests-per-minute]').clear().type('100');

      cy.get('[data-cy=save-security-settings-btn]').click();
      cy.get('[data-cy=security-settings-saved-toast]').should('be.visible');
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('displays responsive dashboard on mobile', () => {
      cy.visit('/dashboard');

      // Mobile navigation
      cy.get('[data-cy=mobile-menu-toggle]').should('be.visible');
      cy.get('[data-cy=desktop-sidebar]').should('not.be.visible');

      // Mobile dashboard layout
      cy.get('[data-cy=mobile-dashboard-grid]').should('be.visible');
      cy.get('[data-cy=workflow-card]').should('have.css', 'width', '100%');

      // Mobile metrics cards
      cy.get('[data-cy=metrics-carousel]').should('be.visible');
      cy.get('[data-cy=metrics-card]').should('be.visible');

      // Swipe through metrics
      cy.get('[data-cy=metrics-carousel]').swipe('left');
      cy.get('[data-cy=metrics-card]').should('contain', 'Revenue');
    });

    it('handles mobile workflow configuration', () => {
      cy.visit('/dashboard/workflows');

      cy.get('[data-cy=mobile-add-workflow-fab]').should('be.visible');
      cy.get('[data-cy=mobile-add-workflow-fab]').click();

      // Mobile workflow wizard
      cy.get('[data-cy=mobile-workflow-wizard]').should('be.visible');
      cy.get('[data-cy=workflow-template-grid]').should('have.class', 'mobile-grid');

      cy.get('[data-cy=workflow-template-invoice]').click();
      cy.get('[data-cy=mobile-config-stepper]').should('be.visible');

      // Mobile form inputs
      cy.get('[data-cy=workflow-name-input]').should('have.attr', 'autocomplete', 'off');
      cy.get('[data-cy=mobile-keyboard-done-btn]').should('be.visible');
    });
  });

  describe('Performance and Load Testing', () => {
    it('handles large dataset visualization', () => {
      cy.setupLargeDataset();
      cy.visit('/dashboard/metrics');

      // Should load within reasonable time
      cy.get('[data-cy=revenue-trend-chart]', { timeout: 10000 }).should('be.visible');
      
      // Chart should be responsive with large dataset
      cy.get('[data-cy=chart-loading-indicator]').should('not.exist');
      cy.get('[data-cy=data-points-count]').should('contain', '1000+');

      // Pagination for large tables
      cy.get('[data-cy=executions-table]').should('be.visible');
      cy.get('[data-cy=table-pagination]').should('be.visible');
      cy.get('[data-cy=items-per-page-select]').select('50');
    });

    it('maintains performance with multiple active workflows', () => {
      cy.setupMultipleWorkflows(10);
      cy.visit('/dashboard');

      // Dashboard should load efficiently
      cy.get('[data-cy=workflow-cards-container]').should('be.visible');
      cy.get('[data-cy=workflow-card]').should('have.length', 10);

      // Real-time updates should not impact performance
      cy.task('simulate:multipleWorkflowExecutions');
      
      // UI should remain responsive
      cy.get('[data-cy=notification-counter]').should('be.visible');
      cy.get('[data-cy=page-load-time]').should('have.attr', 'data-load-time').then((loadTime) => {
        expect(parseInt(loadTime as string)).to.be.lessThan(3000); // Less than 3 seconds
      });
    });
  });

  after(() => {
    // Cleanup test data
    cy.task('db:cleanup');
  });
});

// Custom Cypress commands for SMB workflow testing
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      setupWorkflows(workflowIds: string[]): Chainable<void>;
      setupWorkflow(workflowId: string): Chainable<void>;
      setupAnalyticsData(): Chainable<void>;
      setupLargeDataset(): Chainable<void>;
      setupMultipleWorkflows(count: number): Chainable<void>;
      swipe(direction: 'left' | 'right' | 'up' | 'down'): Chainable<void>;
    }
  }
}