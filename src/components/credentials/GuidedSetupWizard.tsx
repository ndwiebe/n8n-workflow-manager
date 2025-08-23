/**
 * Guided Setup Wizard Component
 * Interactive step-by-step interface for service setup with screenshot guides
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Box,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  SupportAgent as SupportAgentIcon,
  AutoFixHigh as AutoFixHighIcon,
  Lightbulb as LightbulbIcon,
  Chat as ChatIcon,
  VideoCall as VideoCallIcon
} from '@mui/icons-material';

import {
  ServiceConnectionCard,
  SetupStep,
  GuidedSetupSession,
  StepProgress,
  ValidationResult,
  TroubleshootingTip,
  HelpResource,
  InteractiveElement,
  ScreenshotGuide
} from '../../types/smartCredentials';
import { setupAssistant } from '../../services/setupAssistant';
import { ScreenshotGuide as ScreenshotGuideComponent } from './ScreenshotGuide';

interface GuidedSetupWizardProps {
  open: boolean;
  onClose: () => void;
  service: ServiceConnectionCard;
  workflowId: string;
  userId: string;
  onSetupComplete: (serviceId: string, success: boolean) => void;
  onEscalate?: (serviceId: string, reason: string) => void;
}

export const GuidedSetupWizard: React.FC<GuidedSetupWizardProps> = ({
  open,
  onClose,
  service,
  workflowId,
  userId,
  onSetupComplete,
  onEscalate
}) => {
  const [session, setSession] = useState<GuidedSetupSession | null>(null);
  const [currentStep, setCurrentStep] = useState<SetupStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [troubleshootingVisible, setTroubleshootingVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Initialize setup session
  useEffect(() => {
    if (open && !session) {
      initializeSession();
    }
  }, [open, service]);

  const initializeSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await setupAssistant.startGuidedSetup(
        workflowId,
        service.serviceId,
        userId,
        service
      );

      if (response.success && response.data) {
        setSession(response.data);
        await loadCurrentStep(response.data);
      } else {
        setError(response.error?.userMessage || 'Failed to start setup session');
      }
    } catch (err) {
      setError('Unable to start guided setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentStep = async (currentSession: GuidedSetupSession) => {
    if (!currentSession.currentStepId) return;

    try {
      const response = await setupAssistant.getStepInstructions(
        currentSession.sessionId,
        currentSession.currentStepId
      );

      if (response.success && response.data) {
        setCurrentStep(response.data);
      } else {
        setError(response.error?.userMessage || 'Failed to load step instructions');
      }
    } catch (err) {
      setError('Unable to load step instructions');
    }
  };

  const handleNextStep = async () => {
    if (!session || !currentStep) return;

    setLoading(true);
    setError(null);

    try {
      // Validate current step if validation is required
      if (currentStep.validation && Object.keys(stepData).length > 0) {
        const validationResponse = await setupAssistant.validateStep(
          session.sessionId,
          currentStep.stepId,
          stepData
        );

        if (validationResponse.success && validationResponse.data) {
          setValidationResults(validationResponse.data);
          
          const failed = validationResponse.data.some(result => !result.passed);
          if (failed) {
            setLoading(false);
            return;
          }
        }
      }

      // Progress to next step
      const response = await setupAssistant.progressToNextStep(
        session.sessionId,
        currentStep.stepId,
        stepData
      );

      if (response.success && response.data) {
        if (response.data.completed) {
          // Setup completed successfully
          onSetupComplete(service.serviceId, true);
          onClose();
        } else if (response.data.nextStep) {
          setCurrentStep(response.data.nextStep);
          setStepData({});
          setValidationResults([]);
          
          // Update session data
          const updatedSession = setupAssistant.getSessionStatus(session.sessionId);
          if (updatedSession) {
            setSession(updatedSession);
          }
        }
      } else {
        setError(response.error?.userMessage || 'Failed to progress to next step');
      }
    } catch (err) {
      setError('Unable to proceed to next step');
    } finally {
      setLoading(false);
    }
  };

  const handleStepBack = () => {
    if (!session || !currentStep) return;
    
    // Find previous step
    const currentStepIndex = session.completedSteps.length;
    if (currentStepIndex > 0) {
      // Implementation for going back would require updating the setupAssistant service
      console.log('Going back to previous step');
    }
  };

  const handlePauseResume = () => {
    if (!session) return;

    if (isPaused) {
      setupAssistant.resumeSession(session.sessionId);
      setIsPaused(false);
    } else {
      setupAssistant.pauseSession(session.sessionId);
      setIsPaused(true);
    }
  };

  const handleEscalate = () => {
    if (onEscalate && currentStep) {
      onEscalate(service.serviceId, `Assistance needed with step: ${currentStep.title}`);
    }
  };

  const handleInteractiveElement = (element: InteractiveElement) => {
    switch (element.type) {
      case 'test':
        // Trigger test action
        console.log('Testing connection:', element.action);
        break;
      case 'copy':
        // Copy to clipboard
        if (element.data?.text) {
          navigator.clipboard.writeText(element.data.text);
        }
        break;
      case 'button':
        // Custom button action
        console.log('Button action:', element.action);
        break;
    }
  };

  const handleTroubleshooting = async () => {
    if (!currentStep) return;

    try {
      const response = await setupAssistant.getTroubleshootingHelp(
        service.serviceId,
        currentStep.stepId,
        error || undefined
      );

      if (response.success) {
        setTroubleshootingVisible(true);
      }
    } catch (err) {
      console.error('Failed to load troubleshooting help:', err);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getStepProgress = () => {
    if (!session) return 0;
    return (session.completedSteps.length / Object.keys(session.stepProgress).length) * 100;
  };

  const getEstimatedTimeRemaining = () => {
    if (!session) return '';
    const now = new Date();
    const remaining = session.estimatedCompletion.getTime() - now.getTime();
    const minutes = Math.max(0, Math.ceil(remaining / 60000));
    return `${minutes} minutes remaining`;
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    return (
      <Box>
        {/* Step Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {currentStep.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {currentStep.description}
          </Typography>
          
          <Box display="flex" gap={1} mt={1}>
            <Chip
              icon={<ScheduleIcon />}
              label={currentStep.estimatedTime}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<BusinessIcon />}
              label={currentStep.type}
              size="small"
              color="secondary"
              variant="outlined"
            />
            {currentStep.required && (
              <Chip
                icon={<SecurityIcon />}
                label="Required"
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {/* Business Reason */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Why this matters:</strong> {currentStep.businessReason}
          </Typography>
        </Alert>

        {/* Step Instructions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Instructions
            </Typography>
            <Typography variant="body1" paragraph>
              {currentStep.instruction.content}
            </Typography>

            {/* Business Context */}
            {currentStep.instruction.businessContext && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {currentStep.instruction.businessContext}
              </Alert>
            )}

            {/* Screenshots */}
            {currentStep.instruction.screenshots && currentStep.instruction.screenshots.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Visual Guide
                </Typography>
                {currentStep.instruction.screenshots.map(screenshot => (
                  <ScreenshotGuideComponent
                    key={screenshot.id}
                    screenshot={screenshot}
                    onAnnotationClick={(annotation) => console.log('Clicked annotation:', annotation)}
                  />
                ))}
              </Box>
            )}

            {/* Interactive Elements */}
            {currentStep.instruction.interactiveElements && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Actions
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {currentStep.instruction.interactiveElements.map((element, index) => (
                    <Button
                      key={index}
                      variant={element.type === 'test' ? 'contained' : 'outlined'}
                      color={element.type === 'test' ? 'primary' : 'secondary'}
                      onClick={() => handleInteractiveElement(element)}
                      startIcon={
                        element.type === 'test' ? <PlayArrowIcon /> :
                        element.type === 'copy' ? <AutoFixHighIcon /> : null
                      }
                    >
                      {element.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            {/* Code Snippets */}
            {currentStep.instruction.codeSnippets && currentStep.instruction.codeSnippets.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Code Examples
                </Typography>
                {currentStep.instruction.codeSnippets.map((snippet, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 1, bgcolor: 'grey.100' }}>
                    <Typography variant="caption" color="primary">
                      {snippet.title}
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', mt: 1 }}>
                      {snippet.code}
                    </Typography>
                    {snippet.copyable && (
                      <Button
                        size="small"
                        onClick={() => navigator.clipboard.writeText(snippet.code)}
                        sx={{ mt: 1 }}
                      >
                        Copy Code
                      </Button>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Form Fields (for form type steps) */}
        {currentStep.type === 'form' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              <Grid container spacing={2}>
                {/* Dynamic form fields based on step configuration */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Key"
                    type="password"
                    value={stepData.apiKey || ''}
                    onChange={(e) => setStepData({...stepData, apiKey: e.target.value})}
                    helperText="Enter your secure API key"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Base URL"
                    value={stepData.baseUrl || ''}
                    onChange={(e) => setStepData({...stepData, baseUrl: e.target.value})}
                    helperText="API base URL (e.g., https://api.example.com)"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Validation Results */}
        {validationResults.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {validationResults.map((result, index) => (
              <Alert
                key={index}
                severity={result.passed ? 'success' : 'error'}
                sx={{ mb: 1 }}
              >
                {result.businessMessage}
              </Alert>
            ))}
          </Box>
        )}

        {/* Common Mistakes Warning */}
        {currentStep.instruction.commonMistakes && currentStep.instruction.commonMistakes.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <WarningIcon color="warning" />
                <Typography variant="h6">
                  Common Mistakes to Avoid
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => toggleSection('mistakes')}
                >
                  {expandedSections.has('mistakes') ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={expandedSections.has('mistakes')}>
                <List dense>
                  {currentStep.instruction.commonMistakes.map((mistake, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WarningIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={mistake} />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </CardContent>
          </Card>
        )}

        {/* Troubleshooting Section */}
        {currentStep.instruction.troubleshooting && currentStep.instruction.troubleshooting.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LightbulbIcon color="info" />
                <Typography variant="h6">
                  Troubleshooting Tips
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => toggleSection('troubleshooting')}
                >
                  {expandedSections.has('troubleshooting') ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={expandedSections.has('troubleshooting')}>
                <List dense>
                  {currentStep.instruction.troubleshooting.map((tip, index) => (
                    <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <ListItemText
                        primary={`Problem: ${tip.problem}`}
                        secondary={`Solution: ${tip.solution}`}
                      />
                      <Typography variant="caption" color="primary">
                        Business Impact: {tip.businessImpact}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </CardContent>
          </Card>
        )}

        {/* Help Resources */}
        {currentStep.helpResources && currentStep.helpResources.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <HelpIcon color="primary" />
                <Typography variant="h6">
                  Get Additional Help
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => toggleSection('help')}
                >
                  {expandedSections.has('help') ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={expandedSections.has('help')}>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {currentStep.helpResources.map((resource, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      size="small"
                      startIcon={
                        resource.type === 'video' ? <VideoCallIcon /> :
                        resource.type === 'support_chat' ? <ChatIcon /> :
                        resource.type === 'consultant' ? <SupportAgentIcon /> : <InfoIcon />
                      }
                      onClick={() => resource.url && window.open(resource.url, '_blank')}
                      disabled={!resource.available}
                    >
                      {resource.title}
                      {resource.cost && resource.cost !== 'free' && (
                        <Chip
                          label={resource.cost}
                          size="small"
                          sx={{ ml: 1 }}
                          color={resource.cost === 'premium' ? 'warning' : 'error'}
                        />
                      )}
                    </Button>
                  ))}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">
              Setup Guide: {service.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {session && getEstimatedTimeRemaining()}
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title={isPaused ? "Resume" : "Pause"}>
              <IconButton onClick={handlePauseResume} disabled={!session}>
                {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Get Help">
              <IconButton onClick={handleEscalate} color="primary">
                <SupportAgentIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <LinearProgress />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button
              color="inherit"
              size="small"
              onClick={handleTroubleshooting}
              sx={{ ml: 2 }}
            >
              Get Help
            </Button>
          </Alert>
        )}

        {session && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Progress: {session.completedSteps.length} of {Object.keys(session.stepProgress).length} steps completed
            </Typography>
            <LinearProgress
              variant="determinate"
              value={getStepProgress()}
              sx={{ height: 8, borderRadius: 4 }}
            />
            
            {/* Business Impact Summary */}
            <Card sx={{ mt: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent sx={{ py: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingUpIcon />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Expected Business Impact
                    </Typography>
                    <Typography variant="caption">
                      {session.businessImpact.expectedTimeSaving} saved per month • {session.businessImpact.expectedCostSaving} cost reduction
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Box>
            <Button
              onClick={onClose}
              color="inherit"
            >
              Cancel
            </Button>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              onClick={handleStepBack}
              disabled={!session || session.completedSteps.length === 0}
            >
              Back
            </Button>
            <Button
              onClick={handleNextStep}
              variant="contained"
              disabled={loading || isPaused}
              startIcon={loading ? <RefreshIcon className="spin" /> : <PlayArrowIcon />}
            >
              {loading ? 'Processing...' : 'Continue'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};