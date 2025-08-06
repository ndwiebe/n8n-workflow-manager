import { 
  BusinessMetrics, 
  WorkflowROICalculation, 
  BusinessDashboardData, 
  BusinessMetricsAggregation,
  BusinessAlert,
  ROICalculationRequest
} from '../types/business';
import { N8nService } from './n8nService';
import { logger } from '../utils/logger';

export class BusinessMetricsService {
  private n8nService: N8nService;
  private metricsCache: Map<string, { data: BusinessMetrics; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.n8nService = new N8nService();
  }

  /**
   * Calculate ROI for a workflow based on user inputs
   */
  async calculateWorkflowROI(request: ROICalculationRequest): Promise<WorkflowROICalculation> {
    const {
      workflowId,
      manualTimePerTask,
      taskFrequency,
      tasksPerPeriod,
      employeeHourlyRate,
      implementationTimeHours = 8, // default 1 day setup
      implementationHourlyRate = employeeHourlyRate
    } = request;

    try {
      // Get workflow stats from n8n
      const workflowStats = await this.n8nService.getWorkflowStats(workflowId);
      
      // Convert time per task to hours
      const hoursPerTask = manualTimePerTask / 60;
      
      // Calculate monthly frequency
      let tasksPerMonth: number;
      switch (taskFrequency) {
        case 'daily':
          tasksPerMonth = tasksPerPeriod * 30; // Approximate month
          break;
        case 'weekly':
          tasksPerMonth = tasksPerPeriod * 4.33; // Weeks per month
          break;
        case 'monthly':
          tasksPerMonth = tasksPerPeriod;
          break;
      }
      
      // Calculate savings
      const hoursPerMonth = hoursPerTask * tasksPerMonth;
      const monthlySavings = hoursPerMonth * employeeHourlyRate;
      
      // Calculate costs
      const implementationCost = implementationTimeHours * implementationHourlyRate;
      const monthlyOperatingCost = this.estimateMonthlyOperatingCost(workflowStats.totalExecutions);
      
      // Calculate ROI metrics
      const monthlyNetSavings = monthlySavings - monthlyOperatingCost;
      const paybackPeriod = monthlyNetSavings > 0 ? implementationCost / monthlyNetSavings : Infinity;
      const annualROI = monthlyNetSavings > 0 ? ((monthlyNetSavings * 12 - implementationCost) / implementationCost) * 100 : -100;
      const threeYearROI = monthlyNetSavings > 0 ? (monthlyNetSavings * 36) - implementationCost : -implementationCost;
      
      // Time to value (assuming workflow is ready immediately after implementation)
      const timeToValue = Math.ceil(implementationTimeHours / 8); // Convert hours to days
      const breakEvenMonth = Math.ceil(paybackPeriod);

      const calculation: WorkflowROICalculation = {
        workflowId,
        inputs: {
          manualTimePerTask,
          taskFrequency,
          tasksPerPeriod,
          employeeHourlyRate,
          implementationTimeHours,
          implementationHourlyRate,
          monthlyN8nCost: this.estimateN8nCost(),
          monthlyThirdPartyCosts: this.estimateThirdPartyCosts(),
          monthlyMaintenanceCost: monthlySavings * 0.05 // Assume 5% of savings for maintenance
        },
        results: {
          hoursPerTask,
          tasksPerMonth,
          hoursPerMonth,
          monthlySavings,
          implementationCost,
          monthlyOperatingCost,
          monthlyNetSavings,
          paybackPeriod,
          annualROI,
          threeYearROI,
          timeToValue,
          breakEvenMonth
        },
        calculatedAt: new Date().toISOString()
      };

      logger.info('ROI calculation completed:', {
        workflowId,
        monthlySavings,
        paybackPeriod: Math.round(paybackPeriod * 100) / 100,
        annualROI: Math.round(annualROI * 100) / 100
      });

      return calculation;
    } catch (error) {
      logger.error('ROI calculation failed:', error);
      throw new Error('Failed to calculate workflow ROI');
    }
  }

  /**
   * Get comprehensive business metrics for a workflow
   */
  async getWorkflowBusinessMetrics(
    workflowId: string, 
    roiCalculation?: WorkflowROICalculation
  ): Promise<BusinessMetrics> {
    // Check cache first
    const cached = this.metricsCache.get(workflowId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Get workflow and stats from n8n
      const [workflow, stats] = await Promise.all([
        this.n8nService.getWorkflow(workflowId),
        this.n8nService.getWorkflowStats(workflowId)
      ]);

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Use provided ROI calculation or create a basic one
      let roi;
      if (roiCalculation) {
        roi = {
          timeToValue: roiCalculation.results.timeToValue,
          monthlySavings: roiCalculation.results.monthlySavings,
          implementationCost: roiCalculation.results.implementationCost,
          monthlyOperatingCost: roiCalculation.results.monthlyOperatingCost,
          roiPercentage: roiCalculation.results.annualROI,
          paybackPeriod: roiCalculation.results.paybackPeriod
        };
      } else {
        // Default ROI estimates for workflows without calculations
        roi = this.estimateDefaultROI(stats);
      }

      // Estimate time savings based on execution frequency
      const timeSavings = this.estimateTimeSavings(stats);
      
      // Calculate costs
      const costs = this.calculateWorkflowCosts(stats);
      
      // Assess business impact
      const impact = this.assessBusinessImpact(workflow, stats);

      const businessMetrics: BusinessMetrics = {
        workflowId,
        workflowName: workflow.name,
        businessCategory: this.categorizeWorkflow(workflow),
        roi,
        timeSavings,
        performance: {
          totalExecutions: stats.totalExecutions,
          successfulExecutions: stats.successfulExecutions,
          failedExecutions: stats.failedExecutions,
          averageExecutionTime: stats.averageExecutionTime,
          uptime: stats.totalExecutions > 0 ? (stats.successfulExecutions / stats.totalExecutions) * 100 : 0,
          lastExecution: stats.lastExecution
        },
        costs,
        impact,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      };

      // Cache the result
      this.metricsCache.set(workflowId, {
        data: businessMetrics,
        timestamp: Date.now()
      });

      return businessMetrics;
    } catch (error) {
      logger.error(`Failed to get business metrics for workflow ${workflowId}:`, error);
      throw new Error('Failed to retrieve workflow business metrics');
    }
  }

  /**
   * Get dashboard data for business overview
   */
  async getBusinessDashboard(userId?: string): Promise<BusinessDashboardData> {
    try {
      // Get all workflows
      const workflows = await this.n8nService.getWorkflows();
      const activeWorkflows = workflows.filter(w => w.active);

      // Get metrics for all workflows
      const workflowMetrics = await Promise.all(
        workflows.map(w => this.getWorkflowBusinessMetrics(w.id).catch(() => null))
      );

      const validMetrics = workflowMetrics.filter(m => m !== null) as BusinessMetrics[];

      // Calculate summary
      const summary = {
        totalWorkflows: workflows.length,
        activeWorkflows: activeWorkflows.length,
        totalMonthlySavings: validMetrics.reduce((sum, m) => sum + m.roi.monthlySavings, 0),
        totalMonthlyROI: validMetrics.length > 0 
          ? validMetrics.reduce((sum, m) => sum + m.roi.roiPercentage, 0) / validMetrics.length 
          : 0,
        averagePaybackPeriod: validMetrics.length > 0
          ? validMetrics.reduce((sum, m) => sum + m.roi.paybackPeriod, 0) / validMetrics.length
          : 0,
        totalHoursSavedPerMonth: validMetrics.reduce((sum, m) => sum + m.timeSavings.totalMonthlySavings, 0)
      };

      // Prepare workflow list
      const workflowList = validMetrics.map(m => ({
        id: m.workflowId,
        name: m.workflowName,
        category: m.businessCategory,
        status: (m.performance.uptime > 95 ? 'active' : 
                 m.performance.uptime > 80 ? 'inactive' : 'error') as 'active' | 'inactive' | 'error',
        monthlySavings: m.roi.monthlySavings,
        roiPercentage: m.roi.roiPercentage,
        hoursPerMonth: m.timeSavings.totalMonthlySavings,
        uptime: m.performance.uptime
      }));

      // Generate trends (simplified for now)
      const savingsOverTime = this.generateSavingsTrends(validMetrics);
      const roiByCategory = this.generateROIByCategory(validMetrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(validMetrics);

      return {
        summary,
        workflows: workflowList,
        trends: {
          savingsOverTime,
          roiByCategory
        },
        recommendations
      };
    } catch (error) {
      logger.error('Failed to get business dashboard:', error);
      throw new Error('Failed to generate business dashboard');
    }
  }

  /**
   * Generate business alerts based on metrics
   */
  async generateBusinessAlerts(userId?: string): Promise<BusinessAlert[]> {
    try {
      const dashboardData = await this.getBusinessDashboard(userId);
      const alerts: BusinessAlert[] = [];

      // Check for failing workflows
      dashboardData.workflows.forEach(workflow => {
        if (workflow.status === 'error') {
          alerts.push({
            id: `workflow_failure_${workflow.id}`,
            type: 'workflow_failure',
            severity: 'high',
            title: `Workflow Failure: ${workflow.name}`,
            description: `Workflow "${workflow.name}" has low uptime (${workflow.uptime.toFixed(1)}%) and may be failing regularly.`,
            workflowId: workflow.id,
            data: {
              currentValue: workflow.uptime,
              expectedValue: 95,
              threshold: 80,
              impact: 'cost'
            },
            actions: [
              { type: 'view', label: 'View Workflow', url: `/workflows/${workflow.id}` },
              { type: 'fix', label: 'Troubleshoot', url: `/workflows/${workflow.id}/logs` }
            ],
            createdAt: new Date().toISOString()
          });
        }

        // Check for low ROI
        if (workflow.roiPercentage < 50 && workflow.monthlySavings > 0) {
          alerts.push({
            id: `low_roi_${workflow.id}`,
            type: 'roi_drop',
            severity: 'medium',
            title: `Low ROI: ${workflow.name}`,
            description: `Workflow "${workflow.name}" has ROI of only ${workflow.roiPercentage.toFixed(1)}%. Consider optimization.`,
            workflowId: workflow.id,
            data: {
              currentValue: workflow.roiPercentage,
              expectedValue: 100,
              threshold: 50,
              impact: 'revenue'
            },
            actions: [
              { type: 'optimize', label: 'Optimize Workflow' },
              { type: 'view', label: 'View Details', url: `/workflows/${workflow.id}/metrics` }
            ],
            createdAt: new Date().toISOString()
          });
        }
      });

      // Check for opportunities
      if (dashboardData.summary.totalWorkflows < 5 && dashboardData.summary.totalMonthlySavings > 1000) {
        alerts.push({
          id: 'expansion_opportunity',
          type: 'opportunity',
          severity: 'low',
          title: 'Automation Expansion Opportunity',
          description: `You're saving $${dashboardData.summary.totalMonthlySavings.toFixed(0)}/month with ${dashboardData.summary.totalWorkflows} workflows. Consider adding more automations.`,
          data: {
            currentValue: dashboardData.summary.totalWorkflows,
            impact: 'revenue'
          },
          actions: [
            { type: 'view', label: 'Browse Templates', url: '/templates' }
          ],
          createdAt: new Date().toISOString()
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Failed to generate business alerts:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private estimateN8nCost(): number {
    // Estimate based on typical n8n pricing (simplified)
    return 20; // $20/month for starter plan
  }

  private estimateThirdPartyCosts(): number {
    // Estimate third-party integration costs
    return 50; // $50/month average for API costs
  }

  private estimateMonthlyOperatingCost(executions: number): number {
    // Base n8n cost + estimated third-party costs + maintenance
    const baseN8nCost = this.estimateN8nCost();
    const thirdPartyCosts = this.estimateThirdPartyCosts();
    const maintenanceCost = Math.max(10, executions * 0.01); // Minimum $10, or $0.01 per execution
    
    return baseN8nCost + thirdPartyCosts + maintenanceCost;
  }

  private estimateDefaultROI(stats: any): BusinessMetrics['roi'] {
    // Default estimates for workflows without detailed calculations
    const estimatedMonthlySavings = Math.max(100, stats.totalExecutions * 5); // $5 per execution minimum
    const estimatedImplementationCost = 500; // $500 default implementation
    const monthlyOperatingCost = this.estimateMonthlyOperatingCost(stats.totalExecutions);
    
    const netSavings = estimatedMonthlySavings - monthlyOperatingCost;
    const paybackPeriod = netSavings > 0 ? estimatedImplementationCost / netSavings : 12;
    const roiPercentage = netSavings > 0 ? ((netSavings * 12 - estimatedImplementationCost) / estimatedImplementationCost) * 100 : 0;
    
    return {
      timeToValue: 7, // 1 week default
      monthlySavings: estimatedMonthlySavings,
      implementationCost: estimatedImplementationCost,
      monthlyOperatingCost,
      roiPercentage,
      paybackPeriod
    };
  }

  private estimateTimeSavings(stats: any): BusinessMetrics['timeSavings'] {
    // Estimate time savings based on executions
    const estimatedTimePerTask = 15; // 15 minutes per task
    const tasksPerMonth = Math.max(1, stats.totalExecutions / 3); // Assume 3 months of data
    const totalMonthlySavings = (estimatedTimePerTask * tasksPerMonth) / 60; // Convert to hours
    
    return {
      manualTimePerTask: estimatedTimePerTask,
      automatedTimePerTask: 1, // 1 minute for automated task
      taskFrequency: 'monthly',
      tasksPerPeriod: tasksPerMonth,
      totalMonthlySavings,
      hourlyRate: 25 // $25/hour default
    };
  }

  private calculateWorkflowCosts(stats: any): BusinessMetrics['costs'] {
    const monthlyN8nCost = this.estimateN8nCost();
    const monthlyIntegrationCosts = this.estimateThirdPartyCosts();
    const monthlyMaintenanceCost = Math.max(10, stats.totalExecutions * 0.01);
    
    return {
      monthlyN8nCost,
      monthlyIntegrationCosts,
      monthlyMaintenanceCost,
      totalMonthlyCost: monthlyN8nCost + monthlyIntegrationCosts + monthlyMaintenanceCost
    };
  }

  private assessBusinessImpact(workflow: any, stats: any): BusinessMetrics['impact'] {
    // Analyze workflow nodes to estimate impact
    const nodeTypes = workflow.nodes?.map((n: any) => n.type) || [];
    
    let employeesAffected = 1;
    let departmentsAffected = ['operations'];
    let processesAutomated = 1;
    
    // Estimate based on integrations
    if (nodeTypes.some((t: string) => t.includes('slack') || t.includes('teams'))) {
      employeesAffected += 5;
      departmentsAffected.push('communication');
    }
    
    if (nodeTypes.some((t: string) => t.includes('email') || t.includes('gmail'))) {
      employeesAffected += 3;
      departmentsAffected.push('marketing', 'sales');
    }
    
    if (nodeTypes.some((t: string) => t.includes('crm') || t.includes('salesforce'))) {
      employeesAffected += 2;
      departmentsAffected.push('sales');
    }
    
    return {
      employeesAffected,
      departmentsAffected: [...new Set(departmentsAffected)],
      processesAutomated,
      errorReduction: stats.totalExecutions > 0 ? (stats.successfulExecutions / stats.totalExecutions) * 10 : 5 // 5-10% error reduction
    };
  }

  private categorizeWorkflow(workflow: any): BusinessMetrics['businessCategory'] {
    const name = workflow.name?.toLowerCase() || '';
    const nodeTypes = workflow.nodes?.map((n: any) => n.type.toLowerCase()) || [];
    
    // Categorize based on name and node types
    if (name.includes('sales') || name.includes('crm') || nodeTypes.some(t => t.includes('salesforce') || t.includes('hubspot'))) {
      return 'sales';
    }
    
    if (name.includes('marketing') || name.includes('email') || nodeTypes.some(t => t.includes('mailchimp') || t.includes('gmail'))) {
      return 'marketing';
    }
    
    if (name.includes('support') || name.includes('ticket') || nodeTypes.some(t => t.includes('zendesk') || t.includes('freshdesk'))) {
      return 'support';
    }
    
    if (name.includes('hr') || name.includes('employee')) {
      return 'hr';
    }
    
    if (name.includes('finance') || name.includes('invoice') || name.includes('payment')) {
      return 'finance';
    }
    
    if (name.includes('inventory') || name.includes('stock') || name.includes('product')) {
      return 'inventory';
    }
    
    return 'operations';
  }

  private generateSavingsTrends(metrics: BusinessMetrics[]): any[] {
    // Generate simplified trends for the last 6 months
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Simulate trend data (in real implementation, this would come from historical data)
      const totalSavings = metrics.reduce((sum, m) => sum + m.roi.monthlySavings, 0) * (0.7 + (i * 0.1));
      const timesSaved = metrics.reduce((sum, m) => sum + m.timeSavings.totalMonthlySavings, 0) * (0.7 + (i * 0.1));
      
      months.push({
        month: monthName,
        totalSavings: Math.round(totalSavings),
        timesSaved: Math.round(timesSaved)
      });
    }
    
    return months;
  }

  private generateROIByCategory(metrics: BusinessMetrics[]): any[] {
    const categoryMap = new Map<string, { workflows: number; totalROI: number }>();
    
    metrics.forEach(m => {
      const existing = categoryMap.get(m.businessCategory) || { workflows: 0, totalROI: 0 };
      categoryMap.set(m.businessCategory, {
        workflows: existing.workflows + 1,
        totalROI: existing.totalROI + m.roi.roiPercentage
      });
    });
    
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category: category as BusinessMetrics['businessCategory'],
      workflows: data.workflows,
      totalROI: data.totalROI,
      avgROI: data.workflows > 0 ? data.totalROI / data.workflows : 0
    }));
  }

  private generateRecommendations(metrics: BusinessMetrics[]): any[] {
    const recommendations = [];
    
    // Low performing workflows
    const lowPerformingWorkflows = metrics.filter(m => m.performance.uptime < 90);
    if (lowPerformingWorkflows.length > 0) {
      recommendations.push({
        type: 'optimization',
        title: 'Optimize Failing Workflows',
        description: `${lowPerformingWorkflows.length} workflows have uptime below 90%. Fixing these could save additional costs.`,
        potentialSavings: lowPerformingWorkflows.reduce((sum, w) => sum + w.roi.monthlySavings * 0.1, 0),
        priority: 'high'
      });
    }
    
    // High ROI opportunities
    const highRoiWorkflows = metrics.filter(m => m.roi.roiPercentage > 200);
    if (highRoiWorkflows.length > 0) {
      recommendations.push({
        type: 'new_workflow',
        title: 'Expand High-ROI Automations',
        description: `You have ${highRoiWorkflows.length} workflows with >200% ROI. Consider creating similar automations.`,
        potentialSavings: highRoiWorkflows[0]?.roi.monthlySavings || 500,
        priority: 'medium'
      });
    }
    
    // Cost reduction
    const highCostWorkflows = metrics.filter(m => m.costs.totalMonthlyCost > m.roi.monthlySavings * 0.3);
    if (highCostWorkflows.length > 0) {
      recommendations.push({
        type: 'cost_reduction',
        title: 'Reduce Operating Costs',
        description: `${highCostWorkflows.length} workflows have high operating costs. Review integrations and usage.`,
        potentialSavings: highCostWorkflows.reduce((sum, w) => sum + w.costs.totalMonthlyCost * 0.2, 0),
        priority: 'low'
      });
    }
    
    return recommendations;
  }
}

export const businessMetricsService = new BusinessMetricsService();