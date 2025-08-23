/**
 * OAuth Flow Manager Component
 * Visual OAuth initiation interface with popup management and progress tracking
 * Phase 2: OAuth Excellence System
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';

import { oauthFlowManager } from '../../services/oauthFlowManager';
import {
  OAuthProvider,
  OAuthConnectionResult,
  OAuthEventType,
  OAuthEvent,
  OAuthScope,
  BusinessPermission
} from '../../types/smartCredentials';

interface OAuthFlowManagerProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
  serviceId: string;
  providerId: string;
  userId: string;
  onConnectionComplete: (result: OAuthConnectionResult) => void;
  customScopes?: string[];
  showAdvanced?: boolean;
}

interface FlowStep {
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  errorMessage?: string;
}

export const OAuthFlowManager: React.FC<OAuthFlowManagerProps> = ({
  open,
  onClose,
  workflowId,
  serviceId,
  providerId,
  userId,
  onConnectionComplete,
  customScopes,
  showAdvanced = false
}) => {
  const [provider, setProvider] = useState<OAuthProvider | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<OAuthConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScopeDetails, setShowScopeDetails] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Initialize provider and flow steps
  useEffect(() => {
    if (open && providerId) {
      const providerConfig = oauthFlowManager.getProvider(providerId);
      setProvider(providerConfig);
      
      if (providerConfig) {
        const requiredScopes = customScopes || providerConfig.scopes.filter(s => s.required).map(s => s.scope);
        setSelectedScopes(requiredScopes);
        
        setFlowSteps([
          {
            label: 'Prepare Authorization',
            description: 'Setting up secure connection parameters',
            status: 'pending'
          },
          {
            label: 'User Authorization',
            description: `Connect to ${providerConfig.displayName}`,
            status: 'pending'
          },
          {
            label: 'Exchange Tokens',
            description: 'Securely exchanging authorization for access tokens',
            status: 'pending'
          },
          {
            label: 'Verify Connection',
            description: 'Testing connection and retrieving account information',
            status: 'pending'
          },
          {
            label: 'Complete Setup',
            description: 'Finalizing secure connection',
            status: 'pending'
          }
        ]);
      }
    }
  }, [open, providerId, customScopes]);

  // Set up event listeners
  useEffect(() => {
    const handleOAuthEvent = (event: OAuthEvent) => {
      if (event.workflowId === workflowId && event.serviceId === serviceId) {
        switch (event.type) {
          case OAuthEventType.AUTHORIZATION_STARTED:
            setCurrentStep(1);
            updateStepStatus(0, 'completed');
            updateStepStatus(1, 'active');
            setProgress(20);
            break;
          case OAuthEventType.AUTHORIZATION_SUCCESS:
            setCurrentStep(4);
            updateStepStatus(1, 'completed');
            updateStepStatus(2, 'completed');
            updateStepStatus(3, 'completed');
            updateStepStatus(4, 'completed');
            setProgress(100);
            break;
          case OAuthEventType.AUTHORIZATION_FAILED:
            updateStepStatus(currentStep, 'error', event.oauthData.error);
            setError(event.oauthData.error || 'Authorization failed');
            setIsConnecting(false);
            break;
        }
      }
    };

    oauthFlowManager.addEventListener(OAuthEventType.AUTHORIZATION_STARTED, handleOAuthEvent);
    oauthFlowManager.addEventListener(OAuthEventType.AUTHORIZATION_SUCCESS, handleOAuthEvent);
    oauthFlowManager.addEventListener(OAuthEventType.AUTHORIZATION_FAILED, handleOAuthEvent);

    return () => {
      oauthFlowManager.removeEventListener(OAuthEventType.AUTHORIZATION_STARTED, handleOAuthEvent);
      oauthFlowManager.removeEventListener(OAuthEventType.AUTHORIZATION_SUCCESS, handleOAuthEvent);
      oauthFlowManager.removeEventListener(OAuthEventType.AUTHORIZATION_FAILED, handleOAuthEvent);
    };
  }, [workflowId, serviceId, currentStep]);

  const updateStepStatus = useCallback((stepIndex: number, status: FlowStep['status'], errorMessage?: string) => {
    setFlowSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status, errorMessage } : step
    ));
  }, []);

  const handleStartOAuth = async () => {
    if (!provider) return;

    setIsConnecting(true);
    setError(null);
    setCurrentStep(0);
    setProgress(10);

    // Update first step
    updateStepStatus(0, 'active');

    try {
      const result = await oauthFlowManager.startOAuthFlow(
        workflowId,
        serviceId,
        providerId,
        userId,
        selectedScopes
      );

      if (result.success && result.data) {
        setConnectionResult(result.data);
        onConnectionComplete(result.data);
        
        // Auto-close on success if configured
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        throw new Error(result.error?.userMessage || 'Connection failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
      updateStepStatus(0, 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setConnectionResult(null);
    setCurrentStep(0);
    setProgress(0);
    setFlowSteps(prev => prev.map(step => ({ ...step, status: 'pending', errorMessage: undefined })));
    handleStartOAuth();
  };

  const handleClose = () => {
    if (!isConnecting) {
      setError(null);
      setConnectionResult(null);
      setCurrentStep(0);
      setProgress(0);
      setFlowSteps(prev => prev.map(step => ({ ...step, status: 'pending', errorMessage: undefined })));
      onClose();
    }
  };

  const handleScopeToggle = (scope: string) => {
    if (!provider) return;
    
    const scopeConfig = provider.scopes.find(s => s.scope === scope);
    if (scopeConfig?.required) return; // Can't toggle required scopes

    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const getScopeIcon = (scope: OAuthScope) => {
    if (scope.sensitive) return <LockIcon fontSize="small" />;
    if (scope.required) return <VerifiedIcon fontSize="small" />;
    return <VpnKeyIcon fontSize="small" />;
  };

  const getScopeChipColor = (scope: OAuthScope) => {
    if (scope.required) return 'primary';
    if (scope.sensitive) return 'error';
    return 'default';
  };

  if (!provider) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={isConnecting}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <SecurityIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                Connect to {provider.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {provider.metadata.businessDescription}
              </Typography>
            </Box>
          </Box>
          {!isConnecting && (
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Progress Bar */}
        {isConnecting && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {flowSteps[currentStep]?.description || 'Processing...'}
            </Typography>
          </Box>
        )}

        {/* Service Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                {React.createElement(require('@mui/icons-material')[provider.metadata.icon] || SecurityIcon)}
              </Avatar>
              <Box>
                <Typography variant="h6">{provider.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {provider.metadata.businessDescription}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" gap={1} mb={2}>
              <Chip 
                label={provider.metadata.setupComplexity} 
                size="small" 
                color={provider.metadata.setupComplexity === 'simple' ? 'success' : 'warning'}
              />
              <Chip 
                label={provider.metadata.estimatedSetupTime} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={provider.metadata.category.replace('_', ' ')} 
                size="small" 
                variant="outlined"
              />
            </Box>

            <Typography variant="body2" color="text.secondary">
              <strong>Supported Features:</strong> {provider.metadata.supportedFeatures.join(', ')}
            </Typography>
          </CardContent>
        </Card>

        {/* Permissions & Scopes */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <VpnKeyIcon />
                Permissions Required
              </Typography>
              <Tooltip title={showScopeDetails ? "Hide Details" : "Show Details"}>
                <IconButton 
                  size="small" 
                  onClick={() => setShowScopeDetails(!showScopeDetails)}
                >
                  {showScopeDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Tooltip>
            </Box>

            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {provider.scopes.map(scope => (
                <Chip
                  key={scope.scope}
                  icon={getScopeIcon(scope)}
                  label={scope.displayName}
                  color={getScopeChipColor(scope)}
                  variant={selectedScopes.includes(scope.scope) ? "filled" : "outlined"}
                  onClick={() => handleScopeToggle(scope.scope)}
                  disabled={scope.required || isConnecting}
                />
              ))}
            </Box>

            <Collapse in={showScopeDetails}>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                {provider.scopes.map(scope => (
                  <ListItem key={scope.scope}>
                    <ListItemIcon>
                      {getScopeIcon(scope)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {scope.displayName}
                          </Typography>
                          {scope.required && (
                            <Chip label="Required" size="small" color="primary" />
                          )}
                          {scope.sensitive && (
                            <Chip label="Sensitive" size="small" color="error" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {scope.description}
                          </Typography>
                          <Typography variant="caption" color="primary">
                            <strong>Business Purpose:</strong> {scope.businessPurpose}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>

        {/* Flow Steps */}
        {(isConnecting || connectionResult || error) && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connection Progress
              </Typography>
              <Stepper activeStep={currentStep} orientation="vertical">
                {flowSteps.map((step, index) => (
                  <Step key={step.label} completed={step.status === 'completed'}>
                    <StepLabel
                      error={step.status === 'error'}
                      icon={
                        step.status === 'active' ? (
                          <CircularProgress size={24} />
                        ) : step.status === 'completed' ? (
                          <CheckCircleIcon color="success" />
                        ) : step.status === 'error' ? (
                          <ErrorIcon color="error" />
                        ) : undefined
                      }
                    >
                      {step.label}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.errorMessage || step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        )}

        {/* Connection Result */}
        {connectionResult && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Successfully Connected to {connectionResult.providerInfo.displayName}!
              </Typography>
              {connectionResult.providerInfo.userInfo && (
                <Typography variant="body2">
                  Connected as: {connectionResult.providerInfo.userInfo.name || connectionResult.providerInfo.userInfo.email}
                </Typography>
              )}
              <Typography variant="body2">
                Permissions: {connectionResult.connectionDetails.permissions.join(', ')}
              </Typography>
              {connectionResult.connectionDetails.expiresAt && (
                <Typography variant="caption" color="text.secondary">
                  Access expires: {connectionResult.connectionDetails.expiresAt.toLocaleString()}
                </Typography>
              )}
            </Box>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Connection Failed
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Box>
          </Alert>
        )}

        {/* Security Notice */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Box display="flex" alignItems="start" gap={1}>
            <SecurityIcon fontSize="small" />
            <Box>
              <Typography variant="body2">
                <strong>Your security is our priority.</strong>
              </Typography>
              <Typography variant="body2">
                We use industry-standard OAuth 2.0 with PKCE for secure authorization. 
                Your credentials are encrypted and stored securely. You can revoke access at any time.
              </Typography>
            </Box>
          </Box>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleClose} 
          disabled={isConnecting}
          variant="outlined"
        >
          {connectionResult ? 'Close' : 'Cancel'}
        </Button>

        {error && (
          <Button
            onClick={handleRetry}
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
          >
            Try Again
          </Button>
        )}

        {!isConnecting && !connectionResult && !error && (
          <Button
            onClick={handleStartOAuth}
            variant="contained"
            color="primary"
            startIcon={<LaunchIcon />}
          >
            Connect to {provider.displayName}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};