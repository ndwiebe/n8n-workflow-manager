import { n8nService } from './n8nService';

// Type definitions for business metrics
export interface BusinessMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  errorRate: number;
  averageExecutionTime: number;
}
export interface BusinessDashboardData {
  summary: {
    totalWorkflows: number;
    activeWorkflows: number;
    totalMonthlySavings: number;
    totalMonthlyROI: number;
    averagePaybackPeriod: number;
    totalHoursSavedPerMonth: number;
    // Enhanced metrics
    totalMonthlyCosts: number;
    netMonthlySavings: number;
    efficiencyScore: number;
    automationMaturity: 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
    complianceScore: number;
    riskScore: number;
  };
  workflows: Array<{
    id: string;
    name: string;
    category: string;
    status: 'active' | 'inactive' | 'error';
    monthlySavings: number;
    roiPercentage: number;
    hoursPerMonth: number;
    uptime: number;
  }>;
  trends: {
    savingsOverTime: Array<{
      month: string;
      totalSavings: number;
      timesSaved: number;
      // Enhanced trend data
      costs: number;
      netSavings: number;
      efficiency: number;
      workflowsAdded: number;
      errorRate: number;
    }>;
    roiByCategory: Array<{
      category: string;
      workflows: number;
      totalROI: number;
      avgROI: number;
      // Enhanced category analytics
      totalSavings: number;
      totalCosts: number;
      maturityLevel: number;
      growthRate: number;
      riskFactor: number;
    }>;
    // New trend analytics
    performanceMetrics: Array<{
      metric: string;
      current: number;
      previous: number;
      change: number;
      trend: 'up' | 'down' | 'stable';
      target: number;
      benchmark: number;
    }>;
    costAnalysis: {
      breakdown: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
      savings: Array<{
        source: string;
        amount: number;
        confidence: number;
      }>;
    };
  };
  recommendations: Array<{
    type: 'optimization' | 'new_workflow' | 'cost_reduction' | 'risk_mitigation' | 'compliance';
    title: string;
    description: string;
    potentialSavings?: number;
    priority: 'high' | 'medium' | 'low';
    // Enhanced recommendation data
    category: string;
    implementationEffort: 'low' | 'medium' | 'high';
    timeToValue: number; // days
    confidence: number; // 0-100
    dependencies: string[];
    metrics: {
      costSavings: number;
      timeSavings: number;
      riskReduction: number;
      efficiencyGain: number;
    };
    actionPlan: Array<{
      step: number;
      description: string;
      duration: number; // days
      resources: string[];
    }>;
  }>;
  // New data sections
  alerts: Array<{
    id: string;
    type: 'performance' | 'cost' | 'security' | 'compliance';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    workflowId?: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  benchmarks: {
    industry: {
      averageROI: number;
      averagePayback: number;
      averageEfficiency: number;
    };
    peers: {
      topPerformer: number;
      median: number;
      bottomQuartile: number;
    };
  };
}

export interface WorkflowBusinessMetrics {
  workflowId: string;
  workflowName: string;
  businessCategory: string;
  roi: {
    timeToValue: number;
    monthlySavings: number;
    implementationCost: number;
    monthlyOperatingCost: number;
    roiPercentage: number;
    paybackPeriod: number;
  };
  timeSavings: {
    manualTimePerTask: number;
    automatedTimePerTask: number;
    taskFrequency: string;
    tasksPerPeriod: number;
    totalMonthlySavings: number;
    hourlyRate: number;
  };
  performance: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    uptime: number;
    lastExecution?: string;
  };
  costs: {
    monthlyN8nCost: number;
    monthlyIntegrationCosts: number;
    monthlyMaintenanceCost: number;
    totalMonthlyCost: number;
  };
  impact: {
    employeesAffected: number;
    departmentsAffected: string[];
    processesAutomated: number;
    errorReduction: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BusinessAlert {
  id: string;
  type: 'workflow_failure' | 'roi_drop' | 'opportunity' | 'cost_spike';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  workflowId?: string;
  data: {
    currentValue: number;
    expectedValue?: number;
    threshold?: number;
    impact: 'cost' | 'revenue' | 'efficiency';
  };
  actions: Array<{
    type: 'view' | 'fix' | 'optimize' | 'dismiss';
    label: string;
    url?: string;
  }>;
  createdAt: string;
}

export interface ROICalculationRequest {
  workflowId: string;
  manualTimePerTask: number; // minutes
  taskFrequency: 'daily' | 'weekly' | 'monthly';
  tasksPerPeriod: number;
  employeeHourlyRate: number;
  implementationTimeHours?: number;
  implementationHourlyRate?: number;
}

export interface WorkflowROICalculation {
  workflowId: string;
  inputs: {
    manualTimePerTask: number;
    taskFrequency: string;
    tasksPerPeriod: number;
    employeeHourlyRate: number;
    implementationTimeHours: number;
    implementationHourlyRate: number;
    monthlyN8nCost: number;
    monthlyThirdPartyCosts: number;
    monthlyMaintenanceCost: number;
  };
  results: {
    hoursPerTask: number;
    tasksPerMonth: number;
    hoursPerMonth: number;
    monthlySavings: number;
    implementationCost: number;
    monthlyOperatingCost: number;
    monthlyNetSavings: number;
    paybackPeriod: number;
    annualROI: number;
    threeYearROI: number;
    timeToValue: number;
    breakEvenMonth: number;
  };
  calculatedAt: string;
}

/**
 * Enhanced Business Metrics Service
 * Provides comprehensive business analytics, ROI calculations, and real-time insights
 */
class BusinessMetricsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  private realTimeUpdateInterval?: NodeJS.Timeout;
  private historicalData: Map<string, any[]> = new Map();
  
  // Enhanced configuration
  private readonly config = {
    industryBenchmarks: {
      averageROI: 180,
      averagePayback: 8.5,
      averageEfficiency: 75
    },
    riskThresholds: {
      high: 80,
      medium: 60,
      low: 40
    },
    maturityLevels: {
      basic: { workflows: 3, efficiency: 60, roi: 100 },
      intermediate: { workflows: 8, efficiency: 75, roi: 150 },
      advanced: { workflows: 15, efficiency: 85, roi: 200 },
      expert: { workflows: 25, efficiency: 95, roi: 300 }
    }
  };

  /**
   * Get enhanced business dashboard with advanced analytics
   */
  async getBusinessDashboard(): Promise<BusinessDashboardData> {
    const cacheKey = 'business-dashboard';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const baseData = await n8nService.getEnhancedBusinessMetrics();
      const enhancedData = await this.enhanceBusinessData(baseData);
      
      this.setCache(cacheKey, enhancedData);
      this.notifySubscribers(cacheKey, enhancedData);
      this.storeHistoricalData(enhancedData);
      
      return enhancedData;
    } catch (error) {
      console.error('Failed to load business dashboard:', error);
      throw new Error('Unable to load business dashboard data');
    }
  }

  /**
   * Get detailed business metrics for a specific workflow
   */
  async getWorkflowBusinessMetrics(workflowId: string): Promise<WorkflowBusinessMetrics | null> {
    const cacheKey = `workflow-metrics-${workflowId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const [workflow, stats] = await Promise.all([
        n8nService.getWorkflow(workflowId),
        n8nService.getWorkflowStats(workflowId)
      ]);

      if (!workflow) return null;

      const metrics: WorkflowBusinessMetrics = {
        workflowId,
        workflowName: workflow.name,
        businessCategory: this.categorizeWorkflow(workflow),
        roi: this.calculateWorkflowROI(stats),
        timeSavings: this.estimateTimeSavings(stats),
        performance: {
          totalExecutions: stats.totalExecutions,
          successfulExecutions: stats.successfulExecutions,
          failedExecutions: stats.failedExecutions,
          averageExecutionTime: stats.averageExecutionTime,
          uptime: stats.totalExecutions > 0 ? 
            (stats.successfulExecutions / stats.totalExecutions) * 100 : 100,
          lastExecution: stats.lastExecution
        },
        costs: this.calculateWorkflowCosts(stats),
        impact: this.assessBusinessImpact(workflow, stats),
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error(`Failed to get workflow business metrics for ${workflowId}:`, error);
      return null;
    }
  }

  /**
   * Calculate custom ROI based on user inputs
   */
  async calculateCustomROI(request: ROICalculationRequest): Promise<WorkflowROICalculation> {
    const {
      workflowId,
      manualTimePerTask,
      taskFrequency,
      tasksPerPeriod,
      employeeHourlyRate,
      implementationTimeHours = 8,
      implementationHourlyRate = employeeHourlyRate
    } = request;

    try {
      const stats = await n8nService.getWorkflowStats(workflowId);
      
      // Convert time per task to hours
      const hoursPerTask = manualTimePerTask / 60;
      
      // Calculate monthly frequency
      let tasksPerMonth: number;
      switch (taskFrequency) {
        case 'daily':
          tasksPerMonth = tasksPerPeriod * 30;
          break;
        case 'weekly':
          tasksPerMonth = tasksPerPeriod * 4.33;
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
      const monthlyOperatingCost = this.estimateMonthlyOperatingCost(stats.totalExecutions);
      
      // Calculate ROI metrics
      const monthlyNetSavings = monthlySavings - monthlyOperatingCost;
      const paybackPeriod = monthlyNetSavings > 0 ? implementationCost / monthlyNetSavings : Infinity;
      const annualROI = monthlyNetSavings > 0 ? 
        ((monthlyNetSavings * 12 - implementationCost) / implementationCost) * 100 : -100;
      const threeYearROI = monthlyNetSavings > 0 ? 
        (monthlyNetSavings * 36) - implementationCost : -implementationCost;
      
      const timeToValue = Math.ceil(implementationTimeHours / 8);
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
          monthlyMaintenanceCost: monthlySavings * 0.05
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

      return calculation;
    } catch (error) {
      console.error('ROI calculation failed:', error);
      throw new Error('Failed to calculate workflow ROI');
    }
  }

  /**
   * Generate business alerts and recommendations
   */
  async getBusinessAlerts(): Promise<BusinessAlert[]> {
    try {
      const dashboardData = await this.getBusinessDashboard();
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
      console.error('Failed to generate business alerts:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time updates with enhanced features
   */
  subscribe(dataType: string, callback: (data: any) => void, options: {
    realTime?: boolean;
    historicalData?: boolean;
    alertsOnly?: boolean;
  } = {}): () => void {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, []);
    }
    this.subscribers.get(dataType)!.push(callback);

    // Setup real-time updates if requested
    if (options.realTime && !this.realTimeUpdateInterval) {
      this.startRealTimeUpdates();
    }

    // Return enhanced unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(dataType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        
        // Stop real-time updates if no more subscribers for any data type
        const hasSubscribers = Array.from(this.subscribers.values()).some(callbacks => callbacks.length > 0);
        if (!hasSubscribers && this.realTimeUpdateInterval) {
          this.stopRealTimeUpdates();
        }
      }
    };
  }

  /**
   * Force refresh of cached data
   */
  async refreshData(dataType?: string): Promise<void> {
    if (dataType) {
      this.cache.delete(dataType);
    } else {
      this.cache.clear();
    }

    // Reload dashboard data
    try {
      const data = await this.getBusinessDashboard();
      this.notifySubscribers('business-dashboard', data);
    } catch (error) {
      console.error('Failed to refresh business data:', error);
    }
  }

  /**
   * Export comprehensive business report with multiple format support
   */
  async exportReport(format: 'json' | 'csv' | 'excel' | 'pdf', options: {
    includeCharts?: boolean;
    includeRecommendations?: boolean;
    timeRange?: string;
    clientName?: string;
    template?: string;
  } = {}): Promise<string | Blob> {
    try {
      const data = await this.getBusinessDashboard();
      const historicalData = this.getHistoricalData();
      
      const exportData = {
        ...data,
        historical: historicalData,
        metadata: {
          exportDate: new Date().toISOString(),
          timeRange: options.timeRange || '12M',
          clientName: options.clientName || 'Client',
          version: '2.0'
        }
      };
      
      switch (format) {
        case 'json':
          return JSON.stringify(exportData, null, 2);
        case 'csv':
          return this.convertToEnhancedCSV(exportData);
        case 'excel':
          return await this.convertToExcel(exportData, options);
        case 'pdf':
          return await this.convertToPDF(exportData, options);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      throw new Error('Failed to export business report');
    }
  }

  // Private helper methods
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private notifySubscribers(dataType: string, data: any): void {
    const callbacks = this.subscribers.get(dataType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  private categorizeWorkflow(workflow: any): string {
    const name = workflow.name?.toLowerCase() || '';
    const tags = workflow.tags?.map((t: any) => t.toLowerCase()) || [];
    
    if (name.includes('sales') || name.includes('crm') || tags.includes('sales')) {
      return 'Sales';
    }
    if (name.includes('marketing') || name.includes('email') || tags.includes('marketing')) {
      return 'Marketing';
    }
    if (name.includes('support') || name.includes('ticket') || tags.includes('support')) {
      return 'Customer Service';
    }
    if (name.includes('hr') || name.includes('employee') || tags.includes('hr')) {
      return 'HR';
    }
    if (name.includes('finance') || name.includes('invoice') || tags.includes('finance')) {
      return 'Finance';
    }
    
    return 'Operations';
  }

  private calculateWorkflowROI(stats: any): WorkflowBusinessMetrics['roi'] {
    const estimatedMonthlySavings = Math.max(100, stats.totalExecutions * 5);
    const implementationCost = 500;
    const monthlyOperatingCost = this.estimateMonthlyOperatingCost(stats.totalExecutions);
    
    const netSavings = estimatedMonthlySavings - monthlyOperatingCost;
    const paybackPeriod = netSavings > 0 ? implementationCost / netSavings : 12;
    const roiPercentage = netSavings > 0 ? 
      ((netSavings * 12 - implementationCost) / implementationCost) * 100 : 0;
    
    return {
      timeToValue: 7,
      monthlySavings: estimatedMonthlySavings,
      implementationCost,
      monthlyOperatingCost,
      roiPercentage,
      paybackPeriod
    };
  }

  private estimateTimeSavings(stats: any): WorkflowBusinessMetrics['timeSavings'] {
    const estimatedTimePerTask = 15;
    const tasksPerMonth = Math.max(1, stats.totalExecutions / 3);
    const totalMonthlySavings = (estimatedTimePerTask * tasksPerMonth) / 60;
    
    return {
      manualTimePerTask: estimatedTimePerTask,
      automatedTimePerTask: 1,
      taskFrequency: 'monthly',
      tasksPerPeriod: tasksPerMonth,
      totalMonthlySavings,
      hourlyRate: 25
    };
  }

  private calculateWorkflowCosts(stats: any): WorkflowBusinessMetrics['costs'] {
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

  private assessBusinessImpact(workflow: any, stats: any): WorkflowBusinessMetrics['impact'] {
    return {
      employeesAffected: Math.min(1 + Math.floor(stats.totalExecutions / 100), 10),
      departmentsAffected: ['operations'],
      processesAutomated: 1,
      errorReduction: stats.totalExecutions > 0 ? 
        (stats.successfulExecutions / stats.totalExecutions) * 10 : 5
    };
  }

  private estimateN8nCost(): number {
    return 20; // $20/month for starter plan
  }

  private estimateThirdPartyCosts(): number {
    return 50; // $50/month average for API costs
  }

  private estimateMonthlyOperatingCost(executions: number): number {
    const baseN8nCost = this.estimateN8nCost();
    const thirdPartyCosts = this.estimateThirdPartyCosts();
    const maintenanceCost = Math.max(10, executions * 0.01);
    
    return baseN8nCost + thirdPartyCosts + maintenanceCost;
  }

  // Enhanced data processing methods
  private async enhanceBusinessData(baseData: any): Promise<BusinessDashboardData> {
    const enhanced = { ...baseData };
    
    // Calculate enhanced summary metrics
    enhanced.summary = {
      ...baseData.summary,
      totalMonthlyCosts: this.calculateTotalMonthlyCosts(baseData),
      netMonthlySavings: baseData.summary.totalMonthlySavings - this.calculateTotalMonthlyCosts(baseData),
      efficiencyScore: this.calculateEfficiencyScore(baseData),
      automationMaturity: this.determineMaturityLevel(baseData),
      complianceScore: this.calculateComplianceScore(baseData),
      riskScore: this.calculateRiskScore(baseData)
    };
    
    // Enhance trend data
    enhanced.trends = {
      ...baseData.trends,
      performanceMetrics: this.calculatePerformanceMetrics(baseData),
      costAnalysis: this.performCostAnalysis(baseData)
    };
    
    // Add enhanced recommendations
    enhanced.recommendations = this.generateEnhancedRecommendations(baseData);
    
    // Add alerts and benchmarks
    enhanced.alerts = await this.generateAlerts(baseData);
    enhanced.benchmarks = this.getBenchmarkData();
    
    return enhanced;
  }
  
  private calculateTotalMonthlyCosts(data: any): number {
    const baseCosts = data.workflows.length * 20; // Base n8n cost per workflow
    const integrationCosts = data.workflows.length * 15; // Third-party API costs
    const maintenanceCosts = data.summary.totalMonthlySavings * 0.05; // 5% of savings
    return baseCosts + integrationCosts + maintenanceCosts;
  }
  
  private calculateEfficiencyScore(data: any): number {
    const uptimeScore = data.workflows.reduce((sum: number, w: any) => sum + w.uptime, 0) / data.workflows.length;
    const roiScore = Math.min(100, data.summary.totalMonthlyROI / 2); // Cap at 200% ROI for 100 points
    const utilizationScore = (data.summary.activeWorkflows / data.summary.totalWorkflows) * 100;
    
    return Math.round((uptimeScore * 0.4 + roiScore * 0.4 + utilizationScore * 0.2));
  }
  
  private determineMaturityLevel(data: any): 'Basic' | 'Intermediate' | 'Advanced' | 'Expert' {
    const workflows = data.summary.activeWorkflows;
    const efficiency = this.calculateEfficiencyScore(data);
    const roi = data.summary.totalMonthlyROI;
    
    if (workflows >= this.config.maturityLevels.expert.workflows && 
        efficiency >= this.config.maturityLevels.expert.efficiency && 
        roi >= this.config.maturityLevels.expert.roi) {
      return 'Expert';
    } else if (workflows >= this.config.maturityLevels.advanced.workflows && 
               efficiency >= this.config.maturityLevels.advanced.efficiency && 
               roi >= this.config.maturityLevels.advanced.roi) {
      return 'Advanced';
    } else if (workflows >= this.config.maturityLevels.intermediate.workflows && 
               efficiency >= this.config.maturityLevels.intermediate.efficiency && 
               roi >= this.config.maturityLevels.intermediate.roi) {
      return 'Intermediate';
    }
    return 'Basic';
  }
  
  private calculateComplianceScore(data: any): number {
    // Simplified compliance scoring based on workflow health and documentation
    const uptimeCompliance = data.workflows.filter((w: any) => w.uptime > 95).length / data.workflows.length * 100;
    const documentationScore = 85; // Assume good documentation
    const monitoringScore = 90; // Assume good monitoring
    
    return Math.round((uptimeCompliance * 0.5 + documentationScore * 0.3 + monitoringScore * 0.2));
  }
  
  private calculateRiskScore(data: any): number {
    const failureRisk = data.workflows.filter((w: any) => w.uptime < 80).length / data.workflows.length * 100;
    const dependencyRisk = 30; // Assume moderate dependency risk
    const securityRisk = 15; // Assume low security risk
    
    return Math.round(failureRisk * 0.5 + dependencyRisk * 0.3 + securityRisk * 0.2);
  }
  
  private calculatePerformanceMetrics(data: any): Array<any> {
    return [
      {
        metric: 'Monthly Savings',
        current: data.summary.totalMonthlySavings,
        previous: data.summary.totalMonthlySavings * 0.85,
        change: 15,
        trend: 'up' as const,
        target: data.summary.totalMonthlySavings * 1.2,
        benchmark: this.config.industryBenchmarks.averageROI * 50
      },
      {
        metric: 'ROI Percentage',
        current: data.summary.totalMonthlyROI,
        previous: data.summary.totalMonthlyROI * 0.92,
        change: 8,
        trend: 'up' as const,
        target: 250,
        benchmark: this.config.industryBenchmarks.averageROI
      },
      {
        metric: 'Efficiency Score',
        current: this.calculateEfficiencyScore(data),
        previous: this.calculateEfficiencyScore(data) - 5,
        change: 5,
        trend: 'up' as const,
        target: 95,
        benchmark: this.config.industryBenchmarks.averageEfficiency
      }
    ];
  }
  
  private performCostAnalysis(data: any): any {
    const totalCosts = this.calculateTotalMonthlyCosts(data);
    
    return {
      breakdown: [
        { category: 'Platform Costs', amount: data.workflows.length * 20, percentage: 40 },
        { category: 'Integration Costs', amount: data.workflows.length * 15, percentage: 30 },
        { category: 'Maintenance', amount: totalCosts * 0.3, percentage: 30 }
      ],
      savings: [
        { source: 'Labor Automation', amount: data.summary.totalMonthlySavings * 0.7, confidence: 95 },
        { source: 'Error Reduction', amount: data.summary.totalMonthlySavings * 0.2, confidence: 85 },
        { source: 'Process Efficiency', amount: data.summary.totalMonthlySavings * 0.1, confidence: 75 }
      ]
    };
  }
  
  private generateEnhancedRecommendations(data: any): Array<any> {
    const recommendations = [];
    
    // Analyze performance gaps
    const lowPerformingWorkflows = data.workflows.filter((w: any) => w.uptime < 85);
    if (lowPerformingWorkflows.length > 0) {
      recommendations.push({
        type: 'optimization',
        title: 'Optimize Underperforming Workflows',
        description: `${lowPerformingWorkflows.length} workflows have reliability issues affecting overall efficiency.`,
        potentialSavings: lowPerformingWorkflows.reduce((sum: number, w: any) => sum + w.monthlySavings * 0.15, 0),
        priority: 'high',
        category: 'Performance',
        implementationEffort: 'medium',
        timeToValue: 14,
        confidence: 90,
        dependencies: ['Technical team', 'Workflow analysis'],
        metrics: {
          costSavings: 0,
          timeSavings: 5,
          riskReduction: 25,
          efficiencyGain: 15
        },
        actionPlan: [
          { step: 1, description: 'Analyze failure patterns', duration: 3, resources: ['Data analyst'] },
          { step: 2, description: 'Implement fixes', duration: 7, resources: ['Developer', 'QA'] },
          { step: 3, description: 'Monitor improvements', duration: 14, resources: ['Operations'] }
        ]
      });
    }
    
    // Growth opportunities
    if (data.summary.totalMonthlyROI > 200 && data.summary.activeWorkflows < 10) {
      recommendations.push({
        type: 'new_workflow',
        title: 'Scale High-Performance Automations',
        description: 'Excellent ROI performance indicates strong automation candidates for expansion.',
        potentialSavings: data.summary.totalMonthlySavings * 0.3,
        priority: 'medium',
        category: 'Growth',
        implementationEffort: 'high',
        timeToValue: 30,
        confidence: 80,
        dependencies: ['Business stakeholders', 'Process mapping'],
        metrics: {
          costSavings: data.summary.totalMonthlySavings * 0.3,
          timeSavings: 20,
          riskReduction: 0,
          efficiencyGain: 25
        },
        actionPlan: [
          { step: 1, description: 'Identify automation candidates', duration: 7, resources: ['Business analyst'] },
          { step: 2, description: 'Design new workflows', duration: 14, resources: ['Automation architect'] },
          { step: 3, description: 'Implement and test', duration: 21, resources: ['Development team'] }
        ]
      });
    }
    
    return recommendations;
  }
  
  private async generateAlerts(data: any): Promise<Array<any>> {
    const alerts = [];
    const now = new Date().toISOString();
    
    // Performance alerts
    data.workflows.forEach((workflow: any, index: number) => {
      if (workflow.uptime < 80) {
        alerts.push({
          id: `perf-${workflow.id}-${Date.now()}`,
          type: 'performance',
          severity: 'critical',
          message: `Workflow "${workflow.name}" has low uptime (${workflow.uptime.toFixed(1)}%)`,
          workflowId: workflow.id,
          timestamp: now,
          acknowledged: false
        });
      }
    });
    
    // Cost alerts
    const totalCosts = this.calculateTotalMonthlyCosts(data);
    if (totalCosts > data.summary.totalMonthlySavings * 0.3) {
      alerts.push({
        id: `cost-${Date.now()}`,
        type: 'cost',
        severity: 'warning',
        message: `Monthly costs (${totalCosts.toFixed(0)}) are high relative to savings`,
        timestamp: now,
        acknowledged: false
      });
    }
    
    return alerts;
  }
  
  private getBenchmarkData(): any {
    return {
      industry: this.config.industryBenchmarks,
      peers: {
        topPerformer: 350,
        median: 180,
        bottomQuartile: 120
      }
    };
  }
  
  private storeHistoricalData(data: BusinessDashboardData): void {
    const key = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const existing = this.historicalData.get('dashboard') || [];
    
    existing.push({
      date: key,
      summary: data.summary,
      alerts: data.alerts.length
    });
    
    // Keep only last 90 days
    const recent = existing.slice(-90);
    this.historicalData.set('dashboard', recent);
  }
  
  private getHistoricalData(): any[] {
    return this.historicalData.get('dashboard') || [];
  }
  
  private startRealTimeUpdates(): void {
    this.realTimeUpdateInterval = setInterval(async () => {
      try {
        const data = await this.getBusinessDashboard();
        this.notifySubscribers('real-time-update', data);
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, 30000); // 30 seconds
  }
  
  private stopRealTimeUpdates(): void {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
      this.realTimeUpdateInterval = undefined;
      console.log('✅ BusinessMetricsService: Stopped real-time updates');
    }
  }

  /**
   * Cleanup method to stop all intervals and clear resources
   */
  public destroy(): void {
    this.stopRealTimeUpdates();
    this.subscribers.clear();
    this.cache.clear();
    this.historicalData.clear();
    console.log('🧹 BusinessMetricsService: Cleaned up all resources');
  }
  
  private convertToEnhancedCSV(data: any): string {
    const headers = [
      'Date', 'Workflow Name', 'Category', 'Status', 'Monthly Savings',
      'ROI Percentage', 'Hours per Month', 'Uptime', 'Efficiency Score',
      'Risk Score', 'Compliance Score'
    ];

    const rows = data.workflows.map((workflow: any) => [
      new Date().toISOString().split('T')[0],
      workflow.name,
      workflow.category,
      workflow.status,
      workflow.monthlySavings.toString(),
      workflow.roiPercentage.toFixed(2),
      workflow.hoursPerMonth.toFixed(2),
      workflow.uptime.toFixed(2),
      data.summary.efficiencyScore.toString(),
      data.summary.riskScore.toString(),
      data.summary.complianceScore.toString()
    ]);

    return [headers, ...rows]
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');
  }
  
  private async convertToExcel(data: any, options: any): Promise<Blob> {
    // This would integrate with a library like xlsx or exceljs
    // For now, return a placeholder
    const csvData = this.convertToEnhancedCSV(data);
    return new Blob([csvData], { type: 'text/csv' });
  }
  
  private async convertToPDF(data: any, options: any): Promise<Blob> {
    // This would integrate with a library like jsPDF or puppeteer
    // For now, return a placeholder
    const jsonData = JSON.stringify(data, null, 2);
    return new Blob([jsonData], { type: 'application/json' });
  }
}

// Export class and singleton instance
export { BusinessMetricsService };
export const businessMetricsService = new BusinessMetricsService();