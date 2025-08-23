/**
 * Workflow Visibility Service
 * Handles workflow visibility filtering for client vs admin contexts
 */

// import { WorkflowData } from '../types/workflow';

export interface VisibilityFilter {
  level: 'all' | 'client-ready' | 'internal-only' | 'consultant-demo';
  clientMode?: boolean;
  adminMode?: boolean;
  settings?: Record<string, any>;
}

export interface VisibilitySettings {
  [workflowId: string]: {
    visibility: 'client-ready' | 'internal-only' | 'consultant-demo';
    lastUpdated: string;
    workflowName?: string;
  };
}

export class VisibilityService {
  /**
   * Parse visibility settings from frontend localStorage data
   */
  static parseVisibilitySettings(settingsJson?: string): VisibilitySettings {
    if (!settingsJson) {
      return {};
    }

    try {
      const parsed = JSON.parse(settingsJson);
      console.log('🔍 Parsed visibility settings:', Object.keys(parsed).length, 'workflows');
      return parsed;
    } catch (error) {
      console.warn('Failed to parse visibility settings:', error);
      return {};
    }
  }

  /**
   * Get visibility level for a specific workflow
   */
  static getWorkflowVisibility(
    workflowId: string, 
    visibilitySettings: VisibilitySettings,
    workflowTags?: string[]
  ): 'client-ready' | 'internal-only' | 'consultant-demo' {
    // Check stored visibility settings first
    const stored = visibilitySettings[workflowId];
    if (stored?.visibility) {
      console.log(`📋 Workflow ${workflowId} has stored visibility: ${stored.visibility}`);
      return stored.visibility;
    }

    // Fallback to workflow tags
    if (workflowTags?.includes('client-template') || workflowTags?.includes('client-ready')) {
      console.log(`🏷️ Workflow ${workflowId} marked as client-ready via tags`);
      return 'client-ready';
    }

    if (workflowTags?.includes('consultant-demo')) {
      return 'consultant-demo';
    }

    // Default to internal-only
    console.log(`🔒 Workflow ${workflowId} defaulting to internal-only`);
    return 'internal-only';
  }

  /**
   * Check if a workflow should be visible based on filter
   */
  static isWorkflowVisible(
    workflowId: string,
    filter: VisibilityFilter,
    visibilitySettings: VisibilitySettings,
    workflowTags?: string[]
  ): boolean {
    const workflowVisibility = this.getWorkflowVisibility(workflowId, visibilitySettings, workflowTags);

    // Client mode - only show client-ready workflows
    if (filter.clientMode) {
      const visible = workflowVisibility === 'client-ready';
      if (!visible) {
        console.log(`🚫 Client mode: hiding ${workflowId} (${workflowVisibility})`);
      }
      return visible;
    }

    // Admin mode with specific filter level
    if (filter.adminMode) {
      switch (filter.level) {
        case 'all':
          return true;
        case 'client-ready':
          return workflowVisibility === 'client-ready';
        case 'internal-only':
          return workflowVisibility === 'internal-only';
        case 'consultant-demo':
          return workflowVisibility === 'consultant-demo';
        default:
          return true;
      }
    }

    // Default behavior - show all
    return true;
  }

  /**
   * Filter an array of workflows by visibility
   */
  static filterWorkflowsByVisibility<T extends { id: string; tags?: string[] }>(
    workflows: T[],
    filter: VisibilityFilter,
    visibilitySettings: VisibilitySettings
  ): T[] {
    console.log(`🔍 Filtering ${workflows.length} workflows with filter:`, filter);

    const filtered = workflows.filter(workflow => 
      this.isWorkflowVisible(workflow.id, filter, visibilitySettings, workflow.tags)
    );

    console.log(`✅ Visibility filtering: ${filtered.length}/${workflows.length} workflows visible`);
    
    if (filter.clientMode) {
      console.log(`👥 Client mode active - only showing client-ready workflows`);
    } else if (filter.adminMode) {
      console.log(`👨‍💼 Admin mode active - filter level: ${filter.level}`);
    }

    return filtered;
  }

  /**
   * Create a visibility filter from request parameters
   */
  static createVisibilityFilter(params: {
    visibilityLevel?: string;
    clientMode?: string | boolean;
    adminMode?: string | boolean;
    visibilitySettings?: string;
  }): VisibilityFilter | null {
    // Check if any visibility parameters are provided
    const hasVisibilityParams = params.visibilityLevel || params.clientMode || params.adminMode || params.visibilitySettings;
    
    if (!hasVisibilityParams) {
      return null; // No filtering requested
    }

    const level = (params.visibilityLevel as any) || 'all';
    const clientMode = params.clientMode === true || params.clientMode === 'true';
    const adminMode = params.adminMode === true || params.adminMode === 'true';
    const settings = this.parseVisibilitySettings(params.visibilitySettings);

    console.log(`🎯 Creating visibility filter: level=${level}, clientMode=${clientMode}, adminMode=${adminMode}`);

    return {
      level,
      clientMode,
      adminMode,
      settings
    };
  }

  /**
   * Log visibility filter debug information
   */
  static debugVisibilityFilter(filter: VisibilityFilter, workflowCount: number): void {
    console.log('🔍 Visibility Filter Debug:');
    console.log(`   Level: ${filter.level}`);
    console.log(`   Client Mode: ${filter.clientMode || false}`);
    console.log(`   Admin Mode: ${filter.adminMode || false}`);
    console.log(`   Settings Count: ${Object.keys(filter.settings || {}).length}`);
    console.log(`   Workflow Count: ${workflowCount}`);
    
    if (filter.settings && Object.keys(filter.settings).length > 0) {
      console.log('   Stored Visibility Settings:');
      Object.entries(filter.settings).forEach(([id, setting]) => {
        console.log(`     ${id}: ${(setting as any).visibility}`);
      });
    }
  }

  /**
   * Get default visibility filter for client context
   */
  static getClientVisibilityFilter(): VisibilityFilter {
    return {
      level: 'client-ready',
      clientMode: true,
      adminMode: false,
      settings: {}
    };
  }

  /**
   * Get default visibility filter for admin context
   */
  static getAdminVisibilityFilter(level: 'all' | 'client-ready' | 'internal-only' | 'consultant-demo' = 'all'): VisibilityFilter {
    return {
      level,
      clientMode: false,
      adminMode: true,
      settings: {}
    };
  }
}