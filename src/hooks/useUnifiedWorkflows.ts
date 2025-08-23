/**
 * Unified Workflows Hook
 * Manages state for the new unified workflow system
 */

import { useState, useEffect, useCallback } from 'react';
import { unifiedWorkflowService, UnifiedWorkflowData, WorkflowAnalytics } from '../services/unifiedWorkflowService';
import { VisibilityService } from '../services/visibilityService';

interface UseUnifiedWorkflowsOptions {
  clientId: string;
  category?: string;
  status?: string;
  includeInactive?: boolean;
}

interface UseUnifiedWorkflowsReturn {
  workflows: UnifiedWorkflowData[];
  templates: UnifiedWorkflowData[];
  analytics: WorkflowAnalytics | null;
  loading: boolean;
  error: string | null;
  metadata: any;
  refresh: () => Promise<void>;
  deployTemplate: (templateId: string, businessConfig: any) => Promise<void>;
  executeAction: (workflowId: string, action: string, options?: any) => Promise<{ success: boolean; message: string; businessImpact: string; }>;
}

export const useUnifiedWorkflows = (options: UseUnifiedWorkflowsOptions): UseUnifiedWorkflowsReturn => {
  const [workflows, setWorkflows] = useState<UnifiedWorkflowData[]>([]);
  const [templates, setTemplates] = useState<UnifiedWorkflowData[]>([]);
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const { clientId, category, status, includeInactive } = options;

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Debug visibility context
      console.log('🔍 Fetching unified workflows with visibility context:');
      VisibilityService.debugVisibilityContext();

      // Get unified workflow options with visibility context
      const workflowOptions = VisibilityService.getUnifiedWorkflowOptions({
        category,
        status,
        includeInactive
      });

      const templateOptions = VisibilityService.getUnifiedWorkflowOptions({
        category,
        // Templates should use the same visibility filtering as workflows
        status,
        includeInactive
      });

      // Fetch workflows and templates with visibility filtering
      const [workflowsResult, templatesResult] = await Promise.all([
        unifiedWorkflowService.getUnifiedWorkflows(clientId, workflowOptions),
        unifiedWorkflowService.getWorkflowTemplates(templateOptions)
      ]);

      setWorkflows(workflowsResult.data);
      setMetadata(workflowsResult.metadata);
      setTemplates(templatesResult.data);

      // Try to fetch analytics separately, but don't fail if it errors
      try {
        const analyticsResult = await unifiedWorkflowService.getWorkflowAnalytics(clientId);
        setAnalytics(analyticsResult);
      } catch (analyticsError) {
        console.warn('Failed to fetch analytics, using default values:', analyticsError);
        // Set default analytics when n8n is not connected
        setAnalytics({
          summary: {
            totalWorkflows: templatesResult.data.length,
            templateWorkflows: templatesResult.data.length,
            liveWorkflows: 0,
            activeWorkflows: 0,
            healthyWorkflows: 0,
            workflowsNeedingAttention: 0
          },
          businessMetrics: {
            totalMonthlySavings: 0,
            totalTimeSavedPerWeek: 0,
            averageROI: 0,
            potentialSavings: 12000
          },
          categories: {},
          healthDistribution: {}
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows');
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, category, status, includeInactive]);

  const refresh = useCallback(async () => {
    await fetchWorkflows();
  }, [fetchWorkflows]);

  const deployTemplate = useCallback(async (templateId: string, businessConfig: any) => {
    try {
      setError(null);
      const deployedWorkflow = await unifiedWorkflowService.deployTemplate(
        clientId,
        templateId,
        businessConfig
      );
      
      // Update workflows list with new deployment
      setWorkflows(prev => [...prev, deployedWorkflow]);
      
      // Refresh analytics
      const updatedAnalytics = await unifiedWorkflowService.getWorkflowAnalytics(clientId);
      setAnalytics(updatedAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy template');
      throw err;
    }
  }, [clientId]);

  const executeAction = useCallback(async (workflowId: string, action: string, options?: any) => {
    try {
      setError(null);
      const result = await unifiedWorkflowService.executeWorkflowAction(
        clientId,
        workflowId,
        action,
        options
      );
      
      if (result.success) {
        // Refresh the specific workflow to get updated status
        await refresh();
      } else {
        throw new Error(result.message);
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute action');
      throw err;
    }
  }, [clientId, refresh]);

  useEffect(() => {
    if (clientId) {
      fetchWorkflows();
    }
  }, [fetchWorkflows, clientId]);

  return {
    workflows,
    templates,
    analytics,
    loading,
    error,
    metadata,
    refresh,
    deployTemplate,
    executeAction
  };
};

// Hook for getting a specific workflow
export const useUnifiedWorkflow = (clientId: string, workflowId: string) => {
  const [workflow, setWorkflow] = useState<UnifiedWorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await unifiedWorkflowService.getUnifiedWorkflow(clientId, workflowId);
        setWorkflow(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch workflow');
      } finally {
        setLoading(false);
      }
    };

    if (clientId && workflowId) {
      fetchWorkflow();
    }
  }, [clientId, workflowId]);

  return { workflow, loading, error };
};