/**
 * WorkflowHybridInterface Component
 * Combines multiple interaction types for complex workflows
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Badge,
  Alert,
  Button,
  Fade,
  useTheme,
  Divider,
  Chip
} from '@mui/material';
import {
  Assignment as FormIcon,
  Chat as ChatIcon,
  Dashboard as MonitorIcon,
  AutoMode as HybridIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon
} from '@mui/icons-material';

// Import individual interface components
import { WorkflowFormInterface } from './WorkflowFormInterface';
import { WorkflowChatInterface } from './WorkflowChatInterface';
import { WorkflowExecutionMonitor } from './WorkflowExecutionMonitor';

import { 
  FormFieldSchema, 
  ChatInterfaceConfig, 
  MonitoringConfig, 
  WorkflowInteractionMetadata, 
  InteractionResult 
} from './EmbeddedWorkflowInterface';
import { UnifiedWorkflowData } from '../../services/unifiedWorkflowService';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'form' | 'chat' | 'monitor' | 'processing';
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
  optional: boolean;
  description: string;
}

export interface WorkflowHybridInterfaceProps {
  workflow: UnifiedWorkflowData;
  metadata: WorkflowInteractionMetadata;
  formSchema?: FormFieldSchema[];
  chatConfig?: ChatInterfaceConfig;
  monitoringConfig?: MonitoringConfig;
  interactionHistory?: any[];
  onComplete: (result: InteractionResult) => void;
  onClose?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`hybrid-tabpanel-${index}`}
    aria-labelledby={`hybrid-tab-${index}`}
    {...other}
  >
    {value === index && (
      <Fade in={true}>
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      </Fade>
    )}
  </div>
);

export const WorkflowHybridInterface: React.FC<WorkflowHybridInterfaceProps> = ({
  workflow,
  metadata,
  formSchema,
  chatConfig,
  monitoringConfig,
  interactionHistory,
  onComplete,
  onClose
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentStepData, setCurrentStepData] = useState<Record<string, any>>({});
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    initializeWorkflowSteps();
  }, [workflow, metadata]);

  useEffect(() => {
    updateProgress();
  }, [completedSteps, workflowSteps]);

  /**
   * Initialize workflow steps based on metadata
   */
  const initializeWorkflowSteps = () => {
    const steps: WorkflowStep[] = [];

    // Add form step if form input is required
    if (metadata.capabilities.hasFormInput && formSchema && formSchema.length > 0) {
      steps.push({
        id: 'form-input',
        name: 'Form Input',
        type: 'form',
        icon: <FormIcon />,
        completed: false,
        active: steps.length === 0,
        optional: false,
        description: 'Fill out the required form fields'
      });
    }

    // Add chat step if AI processing is available
    if (metadata.capabilities.hasChatInterface) {
      steps.push({
        id: 'ai-interaction',
        name: 'AI Interaction',
        type: 'chat',
        icon: <ChatIcon />,
        completed: false,
        active: steps.length === 0,
        optional: !metadata.capabilities.requiresUserInput,
        description: 'Interact with the AI assistant'
      });
    }

    // Add processing step (virtual step for workflow execution)
    if (metadata.capabilities.hasAIProcessing) {
      steps.push({
        id: 'processing',
        name: 'Processing',
        type: 'processing',
        icon: <HybridIcon />,
        completed: false,
        active: false,
        optional: false,
        description: 'Workflow is processing your data'
      });
    }

    // Add monitoring step if real-time data is available
    if (metadata.capabilities.hasRealTimeData) {
      steps.push({
        id: 'monitoring',
        name: 'Results',
        type: 'monitor',
        icon: <MonitorIcon />,
        completed: false,
        active: false,
        optional: false,
        description: 'View workflow results and analytics'
      });
    }

    setWorkflowSteps(steps);

    // Set initial active tab to first available step
    if (steps.length > 0) {
      setActiveTab(0);
    }
  };

  /**
   * Update overall progress based on completed steps
   */
  const updateProgress = () => {
    if (workflowSteps.length === 0) return;

    const requiredSteps = workflowSteps.filter(step => !step.optional);
    const completedRequiredSteps = requiredSteps.filter(step => completedSteps.has(step.id));
    const progress = requiredSteps.length > 0 ? (completedRequiredSteps.length / requiredSteps.length) * 100 : 0;
    
    setOverallProgress(progress);
  };

  /**
   * Handle step completion
   */
  const handleStepComplete = (stepId: string, result: InteractionResult) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(stepId);
      return newSet;
    });
    setCurrentStepData(prev => ({
      ...prev,
      [stepId]: result
    }));

    // Move to next uncompleted step or monitoring if available
    const currentStepIndex = workflowSteps.findIndex(step => step.id === stepId);
    const nextStep = workflowSteps.find((step, index) => index > currentStepIndex && !completedSteps.has(step.id));
    
    if (nextStep) {
      const nextTabIndex = workflowSteps.indexOf(nextStep);
      setActiveTab(nextTabIndex);
    }

    // If this is the final required step, trigger overall completion
    const requiredSteps = workflowSteps.filter(step => !step.optional);
    const allRequiredCompleted = requiredSteps.every(step => 
      completedSteps.has(step.id) || step.id === stepId
    );

    if (allRequiredCompleted) {
      onComplete({
        success: true,
        data: {
          workflowType: 'hybrid',
          completedSteps: Array.from(completedSteps).concat(stepId),
          stepData: { ...currentStepData, [stepId]: result },
          overallProgress: 100
        },
        executionId: result.executionId
      });
    }
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  /**
   * Get step status color
   */
  const getStepStatusColor = (step: WorkflowStep) => {
    if (completedSteps.has(step.id)) return theme.palette.success.main;
    if (step.active || activeTab === workflowSteps.indexOf(step)) return theme.palette.primary.main;
    return theme.palette.grey[400];
  };

  /**
   * Render step indicator
   */
  const renderStepIndicator = (step: WorkflowStep, index: number) => {
    const isCompleted = completedSteps.has(step.id);
    const isActive = activeTab === index;

    return (
      <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `2px solid ${getStepStatusColor(step)}`,
            bgcolor: isCompleted ? theme.palette.success.main : 
                     isActive ? theme.palette.primary.main : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isCompleted || isActive ? 'white' : getStepStatusColor(step),
            transition: 'all 0.3s ease'
          }}
        >
          {isCompleted ? <CompletedIcon /> : step.icon}
        </Box>
        
        <Box sx={{ ml: 1, minWidth: 0, flex: 1 }}>
          <Typography variant="caption" fontWeight={isActive ? 'bold' : 'normal'}>
            {step.name}
            {step.optional && (
              <Chip size="small" label="Optional" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
            {step.description}
          </Typography>
        </Box>
      </Box>
    );
  };

  /**
   * Render workflow progress header
   */
  const renderProgressHeader = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ py: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {workflow.businessName}
          </Typography>
          <Badge badgeContent={`${Math.round(overallProgress)}%`} color="primary">
            <HybridIcon />
          </Badge>
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={2}>
          {workflow.description}
        </Typography>

        {/* Step indicators */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', overflowX: 'auto', pb: 1 }}>
          {workflowSteps.map((step, index) => (
            <React.Fragment key={step.id}>
              {renderStepIndicator(step, index)}
              {index < workflowSteps.length - 1 && (
                <Box
                  sx={{
                    width: 24,
                    height: 2,
                    bgcolor: completedSteps.has(step.id) ? 
                      theme.palette.success.main : theme.palette.grey[300],
                    flexShrink: 0
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  /**
   * Render interface content based on active step
   */
  const renderStepContent = (step: WorkflowStep, index: number) => {
    const commonProps = {
      workflow,
      metadata,
      onComplete: (result: InteractionResult) => handleStepComplete(step.id, result),
      onClose
    };

    switch (step.type) {
      case 'form':
        return (
          <WorkflowFormInterface
            {...commonProps}
            formSchema={formSchema || []}
            webhookUrl={metadata.webhookUrl}
          />
        );

      case 'chat':
        return (
          <WorkflowChatInterface
            {...commonProps}
            chatConfig={chatConfig}
            interactionHistory={interactionHistory}
          />
        );

      case 'monitor':
        return (
          <WorkflowExecutionMonitor
            {...commonProps}
            monitoringConfig={monitoringConfig}
            updateFrequency={monitoringConfig?.updateFrequency || 'manual'}
          />
        );

      case 'processing':
        return (
          <Box textAlign="center" py={4}>
            <HybridIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Processing Your Request
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              The workflow is processing your data using AI and automated systems.
            </Typography>
            <Alert severity="info" sx={{ maxWidth: 400, mx: 'auto' }}>
              This step runs automatically. You can monitor progress in the Results tab.
            </Alert>
          </Box>
        );

      default:
        return (
          <Typography variant="body2" color="text.secondary">
            Unknown step type: {step.type}
          </Typography>
        );
    }
  };

  if (workflowSteps.length === 0) {
    return (
      <Alert severity="warning">
        No workflow steps could be determined for this hybrid workflow.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Progress Header */}
      {renderProgressHeader()}

      {/* Main Interface */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            {workflowSteps.map((step, index) => (
              <Tab
                key={step.id}
                icon={
                  <Badge
                    color="success"
                    variant="dot"
                    invisible={!completedSteps.has(step.id)}
                  >
                    {step.icon}
                  </Badge>
                }
                label={step.name}
                id={`hybrid-tab-${index}`}
                aria-controls={`hybrid-tabpanel-${index}`}
                disabled={step.type === 'processing'}
                sx={{
                  textTransform: 'none',
                  minHeight: 'auto',
                  py: 1,
                  opacity: completedSteps.has(step.id) ? 1 : 
                          (step.optional ? 0.7 : 1)
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {workflowSteps.map((step, index) => (
          <TabPanel key={step.id} value={activeTab} index={index}>
            {renderStepContent(step, index)}
          </TabPanel>
        ))}
      </Card>

      {/* Completion Summary */}
      {overallProgress === 100 && (
        <Fade in={true}>
          <Alert severity="success" sx={{ mt: 2 }} icon={<CompletedIcon />}>
            <Typography variant="subtitle2" gutterBottom>
              Workflow Completed Successfully!
            </Typography>
            <Typography variant="body2">
              All required steps have been completed. You can review the results in the monitoring tab.
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Action buttons */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Step {activeTab + 1} of {workflowSteps.length} • {completedSteps.size} completed
        </Typography>
        
        <Box display="flex" gap={2}>
          {onClose && (
            <Button variant="text" onClick={onClose}>
              Close
            </Button>
          )}
          
          <Button
            variant="outlined"
            onClick={() => {
              const monitoringStep = workflowSteps.find(step => step.type === 'monitor');
              if (monitoringStep) {
                const monitoringIndex = workflowSteps.indexOf(monitoringStep);
                setActiveTab(monitoringIndex);
              }
            }}
            disabled={!workflowSteps.some(step => step.type === 'monitor')}
          >
            View Results
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default WorkflowHybridInterface;