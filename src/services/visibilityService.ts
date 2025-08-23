/**
 * Frontend Visibility Service
 * Handles client vs admin mode detection and visibility parameter management
 */

export interface VisibilityContext {
  isClientMode: boolean;
  isAdminMode: boolean;
  visibilityLevel: 'all' | 'client-ready' | 'internal-only' | 'consultant-demo';
  shouldFilter: boolean;
}

export class VisibilityService {
  /**
   * Detect if we're in client mode based on current URL
   */
  static isClientMode(): boolean {
    const pathname = window.location.pathname;
    
    // Admin mode indicators
    const adminPaths = ['/admin', '/admin/', '/admin-panel'];
    const isAdmin = adminPaths.some(path => pathname.includes(path));
    
    // Consultant mode indicators  
    const consultantPaths = ['/consultant', '/demo'];
    const isConsultant = consultantPaths.some(path => pathname.includes(path));
    
    // Default to client mode unless explicitly admin or consultant
    return !isAdmin && !isConsultant;
  }

  /**
   * Get visibility level based on current context
   */
  static getContextualVisibilityLevel(): 'all' | 'client-ready' | 'internal-only' | 'consultant-demo' {
    if (this.isClientMode()) {
      return 'client-ready'; // Clients only see client-ready workflows
    }
    
    // Admin mode - check stored preference or default to all
    const storedLevel = localStorage.getItem('admin-visibility-filter');
    return (storedLevel as any) || 'all';
  }

  /**
   * Get complete visibility context
   */
  static getVisibilityContext(): VisibilityContext {
    const isClientMode = this.isClientMode();
    const isAdminMode = !isClientMode;
    const visibilityLevel = this.getContextualVisibilityLevel();
    const shouldFilter = isClientMode || visibilityLevel !== 'all';

    console.log('🔍 Visibility Context:', {
      isClientMode,
      isAdminMode, 
      visibilityLevel,
      shouldFilter,
      pathname: window.location.pathname
    });

    return {
      isClientMode,
      isAdminMode,
      visibilityLevel,
      shouldFilter
    };
  }

  /**
   * Get unified workflow API options with visibility parameters
   */
  static getUnifiedWorkflowOptions(additionalParams?: Record<string, any>): Record<string, any> {
    const context = this.getVisibilityContext();
    const visibilitySettings = this.getVisibilitySettings();

    const options: Record<string, any> = {
      ...additionalParams
    };

    // Add visibility parameters if filtering is needed
    if (context.shouldFilter) {
      options.visibilityLevel = context.visibilityLevel;
      options.clientMode = context.isClientMode;
      options.adminMode = context.isAdminMode;
      
      // Include stored visibility settings if available
      if (Object.keys(visibilitySettings).length > 0) {
        options.visibilitySettings = JSON.stringify(visibilitySettings);
      }
    }

    console.log('📡 API Options with visibility:', options);
    return options;
  }

  /**
   * Get stored visibility settings from localStorage
   */
  static getVisibilitySettings(): Record<string, any> {
    try {
      const stored = localStorage.getItem('n8n-workflow-metadata');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to parse visibility settings from localStorage:', error);
      return {};
    }
  }

  /**
   * Check if a workflow should be shown based on current context (client-side filtering)
   */
  static shouldShowWorkflow(workflowId: string, workflowTags?: string[]): boolean {
    const context = this.getVisibilityContext();
    
    if (!context.shouldFilter) {
      return true; // Show all workflows if no filtering needed
    }

    const visibilitySettings = this.getVisibilitySettings();
    const stored = visibilitySettings[workflowId];
    
    let workflowVisibility: string;
    
    if (stored?.visibility) {
      workflowVisibility = stored.visibility;
    } else if (workflowTags?.includes('client-template') || workflowTags?.includes('client-ready')) {
      workflowVisibility = 'client-ready';
    } else if (workflowTags?.includes('consultant-demo')) {
      workflowVisibility = 'consultant-demo';  
    } else {
      workflowVisibility = 'internal-only';
    }

    // Client mode - only show client-ready
    if (context.isClientMode) {
      return workflowVisibility === 'client-ready';
    }

    // Admin mode - apply selected filter level
    switch (context.visibilityLevel) {
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

  /**
   * Save admin visibility filter preference
   */
  static setAdminVisibilityFilter(level: 'all' | 'client-ready' | 'internal-only' | 'consultant-demo'): void {
    localStorage.setItem('admin-visibility-filter', level);
    console.log('💾 Saved admin visibility filter:', level);
  }

  /**
   * Debug current visibility context
   */
  static debugVisibilityContext(): void {
    const context = this.getVisibilityContext();
    const visibilitySettings = this.getVisibilitySettings();
    
    console.log('🔍 === Visibility Debug ===');
    console.log('Context:', context);
    console.log('URL:', window.location.pathname);
    console.log('Stored Settings Count:', Object.keys(visibilitySettings).length);
    console.log('Settings Sample:', Object.entries(visibilitySettings).slice(0, 3));
    console.log('=========================');
  }
}