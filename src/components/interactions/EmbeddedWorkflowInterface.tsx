/**
 * EmbeddedWorkflowInterface Component
 * Smart component that renders appropriate interaction interface based on workflow type
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent,
  Fade,
  useTheme
} from '@mui/material';

// Import interaction components
import { WorkflowFormInterface } from './WorkflowFormInterface';
import { WorkflowChatInterface } from './WorkflowChatInterface';
import { WorkflowExecutionMonitor } from './WorkflowExecutionMonitor';
import { WorkflowHybridInterface } from './WorkflowHybridInterface';

// Import types and services
import { UnifiedWorkflowData } from '../../services/unifiedWorkflowService';

export interface WorkflowInteractionMetadata {
  workflowId: string;
  interactionType: 'form' | 'chat' | 'monitor' | 'hybrid' | 'none';
  capabilities: {
    hasFormInput: boolean;
    hasWebhook: boolean;
    hasChatInterface: boolean;
    hasRealTimeData: boolean;
    hasAIProcessing: boolean;
    requiresUserInput: boolean;
  };
  formSchema?: FormFieldSchema[];
  chatConfiguration?: ChatInterfaceConfig;
  monitoringConfiguration?: MonitoringConfig;
  webhookUrl?: string;
  executionMode: 'webhook' | 'manual' | 'scheduled' | 'mixed';
}

export interface FormFieldSchema {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface ChatInterfaceConfig {
  supportsContext: boolean;
  messageTypes: ('text' | 'image' | 'file' | 'voice')[];
  suggestedActions: string[];
  responseFormat: 'text' | 'json' | 'structured';
}

export interface MonitoringConfig {
  updateFrequency: 'realtime' | 'periodic' | 'manual';
  dataTypes: ('metrics' | 'analytics' | 'alerts' | 'progress')[];
  visualizations: ('chart' | 'table' | 'card' | 'list')[];
  alertThresholds?: Record<string, number>;
}

export interface InteractionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionId?: string;
}

export interface EmbeddedWorkflowInterfaceProps {
  workflow: UnifiedWorkflowData;
  isActive?: boolean;
  onInteractionComplete?: (result: InteractionResult) => void;
  onClose?: () => void;
  className?: string;
}

export const EmbeddedWorkflowInterface: React.FC<EmbeddedWorkflowInterfaceProps> = ({
  workflow,
  isActive = true,
  onInteractionComplete,
  onClose,
  className
}) => {
  const theme = useTheme();
  const [metadata, setMetadata] = useState<WorkflowInteractionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionHistory, setInteractionHistory] = useState<any[]>([]);

  useEffect(() => {
    analyzeWorkflowInteractions();
  }, [workflow.id]);

  /**
   * Analyze workflow to determine interaction requirements
   */
  const analyzeWorkflowInteractions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call backend to analyze workflow
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
      const response = await fetch(`${API_BASE_URL}/workflows/${workflow.id}/analyze-interactions`);
      
      if (!response.ok) {
        throw new Error('Failed to analyze workflow interactions');
      }

      const analysisResult = await response.json();
      setMetadata(analysisResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze workflow');
      
      // Fallback to basic analysis based on workflow data
      const fallbackMetadata = generateFallbackMetadata(workflow);
      setMetadata(fallbackMetadata);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate fallback metadata when backend analysis fails
   */
  const generateFallbackMetadata = (workflow: UnifiedWorkflowData): WorkflowInteractionMetadata => {
    const name = workflow.name.toLowerCase();
    const description = workflow.description.toLowerCase();

    // Simple heuristic-based analysis
    const hasForm = name.includes('form') || name.includes('feedback') || name.includes('input');
    const hasChat = name.includes('chat') || name.includes('assistant') || name.includes('ai') || 
                    name.includes('agent') || name.includes('jarvis') || name.includes('gpt') ||
                    name.includes('claude') || name.includes('bot') || name.includes('llm');
    const hasMonitor = name.includes('dashboard') || name.includes('analytics') || name.includes('monitor');
    const hasHybrid = name.includes('processor') || name.includes('smart') || name.includes('document');

    let interactionType: WorkflowInteractionMetadata['interactionType'] = 'none';
    if (hasHybrid) interactionType = 'hybrid';
    else if (hasForm) interactionType = 'form';
    else if (hasChat) interactionType = 'chat';
    else if (hasMonitor) interactionType = 'monitor';

    return {
      workflowId: workflow.id,
      interactionType,
      capabilities: {
        hasFormInput: hasForm || hasHybrid,
        hasWebhook: hasForm || hasHybrid,
        hasChatInterface: hasChat || hasHybrid,
        hasRealTimeData: hasMonitor || hasHybrid,
        hasAIProcessing: hasChat || hasHybrid,
        requiresUserInput: hasForm || hasChat || hasHybrid
      },
      executionMode: hasForm || hasHybrid ? 'webhook' : 'manual',
      formSchema: hasForm || hasHybrid ? generateDefaultFormSchema(workflow) : undefined,
      chatConfiguration: hasChat || hasHybrid ? generateDefaultChatConfig() : undefined,
      monitoringConfiguration: hasMonitor || hasHybrid ? generateDefaultMonitoringConfig() : undefined
    };
  };

  /**
   * Generate default form schema
   */
  const generateDefaultFormSchema = (workflow: UnifiedWorkflowData): FormFieldSchema[] => {
    const name = workflow.name.toLowerCase();
    
    if (name.includes('feedback')) {
      return [
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter your name' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Enter your email' },
        { name: 'rating', label: 'Rating', type: 'number', required: true, validation: { min: 1, max: 5 } },
        { name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'Enter your feedback' },
        { name: 'category', label: 'Category', type: 'select', required: false, options: [
          { value: 'general', label: 'General' },
          { value: 'bug', label: 'Bug Report' },
          { value: 'feature', label: 'Feature Request' }
        ]}
      ];
    }

    return [
      { name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'Enter your message' }
    ];
  };

  /**
   * Generate default chat configuration
   */
  const generateDefaultChatConfig = (): ChatInterfaceConfig => ({
    supportsContext: true,
    messageTypes: ['text'],
    suggestedActions: ['Ask a question', 'Get help', 'View examples'],
    responseFormat: 'json'
  });

  /**
   * Generate default monitoring configuration
   */
  const generateDefaultMonitoringConfig = (): MonitoringConfig => ({
    updateFrequency: 'periodic',
    dataTypes: ['metrics', 'analytics'],
    visualizations: ['card', 'chart']
  });

  /**
   * Handle interaction completion
   */
  const handleInteractionComplete = (result: InteractionResult) => {
    // Add to interaction history
    setInteractionHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      type: metadata?.interactionType,
      result
    }]);

    // Call parent callback
    if (onInteractionComplete) {
      onInteractionComplete(result);
    }
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress size={32} sx={{ mr: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Analyzing workflow interaction requirements...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render error state
   */
  if (error && !metadata) {
    return (
      <Card className={className}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to analyze workflow: {error}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            This workflow may not support embedded interactions.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render no interaction available
   */
  if (!metadata || metadata.interactionType === 'none') {
    return (
      <Card className={className}>
        <CardContent>
          <Box textAlign="center" py={3}>
            <Typography variant="h6" gutterBottom>
              No Interaction Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This workflow doesn't support embedded interactions. 
              Use the workflow controls to manage execution.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render appropriate interaction interface
   */
  const renderInteractionInterface = () => {
    if (!isActive) {
      return (
        <Box textAlign="center" py={3}>
          <Typography variant="body2" color="text.secondary">
            Workflow interaction is inactive. Activate the workflow to enable interactions.
          </Typography>
        </Box>
      );
    }

    const commonProps = {
      workflow,
      metadata,
      onComplete: handleInteractionComplete,
      onClose
    };

    switch (metadata.interactionType) {
      case 'form':
        return (
          <WorkflowFormInterface
            {...commonProps}
            formSchema={metadata.formSchema || []}
            webhookUrl={metadata.webhookUrl}
          />
        );

      case 'chat':
        return (
          <WorkflowChatInterface
            {...commonProps}
            chatConfig={metadata.chatConfiguration}
            interactionHistory={interactionHistory}
          />
        );

      case 'monitor':
        return (
          <WorkflowExecutionMonitor
            {...commonProps}
            monitoringConfig={metadata.monitoringConfiguration}
            updateFrequency={metadata.monitoringConfiguration?.updateFrequency || 'manual'}
          />
        );

      case 'hybrid':
        return (
          <WorkflowHybridInterface
            {...commonProps}
            formSchema={metadata.formSchema}
            chatConfig={metadata.chatConfiguration}
            monitoringConfig={metadata.monitoringConfiguration}
            interactionHistory={interactionHistory}
          />
        );

      default:
        return (
          <Typography variant="body2" color="text.secondary">
            Unsupported interaction type: {metadata.interactionType}
          </Typography>
        );
    }
  };

  return (
    <Card className={className} sx={{ 
      bgcolor: theme.palette.background.default,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 2
    }}>
      <CardContent sx={{ p: 2 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} variant="outlined">
            Backend analysis failed, using fallback detection
          </Alert>
        )}
        
        <Fade in={!loading}>
          <Box>
            {renderInteractionInterface()}
          </Box>
        </Fade>
      </CardContent>
    </Card>
  );
};

export default EmbeddedWorkflowInterface;