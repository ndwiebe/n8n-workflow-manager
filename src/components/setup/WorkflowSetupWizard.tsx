import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  Help as HelpIcon,
  Launch as LaunchIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { ClientWorkflowTemplate, CredentialRequirement, SetupStep } from '../../services/workflowCurationService';
import { ServiceConnectionCard } from '../credentials/ServiceConnectionCard';
import { smartCredentialService } from '../../services/smartCredentialService';
import {
  SmartCredentialConfig,
  ConnectionStatus,
  ServiceConnectionCard as ServiceConnectionCardType
} from '../../types/smartCredentials';

interface WorkflowSetupWizardProps {
  open: boolean;
  onClose: () => void;
  template: ClientWorkflowTemplate | null;
  onComplete: (configuration: WorkflowConfiguration) => void;
}

interface WorkflowConfiguration {
  templateId: string;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  schedule?: {
    enabled: boolean;
    pattern: string;
    timezone: string;
  };
  monitoring: {
    enabled: boolean;
    alertEmail: string;
    reportingFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

interface StepValidation {
  isValid: boolean;
  errors: string[];
}

export const WorkflowSetupWizard: React.FC<WorkflowSetupWizardProps> = ({
  open,
  onClose,
  template,
  onComplete
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [configuration, setConfiguration] = useState<WorkflowConfiguration>({
    templateId: '',
    credentials: {},
    settings: {},
    monitoring: {
      enabled: true,
      alertEmail: '',
      reportingFrequency: 'weekly'
    }
  });
  const [validationStates, setValidationStates] = useState<Record<number, StepValidation>>({});
  const [testingCredentials, setTestingCredentials] = useState<Record<string, boolean>>({});
  const [credentialTestResults, setCredentialTestResults] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  
  // Smart Credential System State
  const [smartCredentialConfig, setSmartCredentialConfig] = useState<SmartCredentialConfig | null>(null);
  const [detectedServices, setDetectedServices] = useState<ServiceConnectionCardType[]>([]);
  const [loadingSmartCredentials, setLoadingSmartCredentials] = useState(false);
  const [useSmartCredentials, setUseSmartCredentials] = useState(true);

  useEffect(() => {
    if (template) {
      setConfiguration(prev => ({
        ...prev,
        templateId: template.id,
        credentials: {},
        settings: {}
      }));
      setActiveStep(0);
      setValidationStates({});
      setCredentialTestResults({});
      
      // Initialize smart credentials if enabled
      if (useSmartCredentials) {
        initializeSmartCredentials();
      }
    }
  }, [template, useSmartCredentials]);

  /**
   * Initialize smart credential detection
   */
  const initializeSmartCredentials = async () => {
    if (!template) return;
    
    setLoadingSmartCredentials(true);
    try {
      const result = await smartCredentialService.detectAndConfigureServices(template);
      
      if (result.success && result.data) {
        setSmartCredentialConfig(result.data);
        setDetectedServices(result.data.detectedServices);
      } else {
        console.error('Failed to detect services:', result.error);
        // Fall back to traditional credential system
        setUseSmartCredentials(false);
      }
    } catch (error) {
      console.error('Error initializing smart credentials:', error);
      setUseSmartCredentials(false);
    } finally {
      setLoadingSmartCredentials(false);
    }
  };

  const steps = [
    {
      label: 'Overview',
      description: 'Review automation details',
      icon: <InfoIcon />
    },
    {
      label: 'Credentials',
      description: 'Connect your accounts',
      icon: <SecurityIcon />
    },
    {
      label: 'Configuration',
      description: 'Customize settings',
      icon: <SettingsIcon />
    },
    {
      label: 'Testing',
      description: 'Test connections',
      icon: <PlayArrowIcon />
    },
    {
      label: 'Monitoring',
      description: 'Set up alerts',
      icon: <AnalyticsIcon />
    },
    {
      label: 'Launch',
      description: 'Activate automation',
      icon: <LaunchIcon />
    }
  ];

  const validateStep = (stepIndex: number): StepValidation => {
    const errors: string[] = [];
    let isValid = true;

    switch (stepIndex) {
      case 0: // Overview - always valid
        break;
      
      case 1: // Credentials
        if (template?.credentialsNeeded) {
          template.credentialsNeeded.forEach(cred => {
            if (cred.required && !configuration.credentials[cred.service]) {
              errors.push(`${cred.displayName} is required`);
              isValid = false;
            }
          });
        }
        break;
      
      case 2: // Configuration
        // Add custom validation based on template requirements
        break;
      
      case 3: // Testing
        if (template?.credentialsNeeded) {
          const requiredCreds = template.credentialsNeeded.filter(c => c.required);
          const testedCreds = Object.keys(credentialTestResults).filter(k => credentialTestResults[k]);
          if (testedCreds.length < requiredCreds.length) {
            errors.push('All required credentials must be tested successfully');
            isValid = false;
          }
        }
        break;
      
      case 4: // Monitoring
        if (configuration.monitoring.enabled && !configuration.monitoring.alertEmail) {
          errors.push('Alert email is required when monitoring is enabled');
          isValid = false;
        }
        break;
      
      case 5: // Launch - always valid if we got here
        break;
    }

    return { isValid, errors };
  };

  const handleNext = () => {
    const validation = validateStep(activeStep);
    setValidationStates(prev => ({ ...prev, [activeStep]: validation }));
    
    if (validation.isValid) {
      setActiveStep(prevStep => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  const handleCredentialChange = (service: string, field: string, value: any) => {
    setConfiguration(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [service]: {
          ...prev.credentials[service],
          [field]: value
        }
      }
    }));
  };

  const handleTestCredential = async (credential: CredentialRequirement) => {
    setTestingCredentials(prev => ({ ...prev, [credential.service]: true }));
    
    try {
      // Get credential data for this service
      const credentialData = configuration.credentials[credential.service];
      if (!credentialData) {
        setCredentialTestResults(prev => ({ ...prev, [credential.service]: false }));
        return;
      }

      // Use the actual credential testing service
      const { workflowCurationService } = await import('../../services/workflowCurationService');
      const result = await workflowCurationService.testCredential(credential, credentialData);
      
      setCredentialTestResults(prev => ({ ...prev, [credential.service]: result.success }));
      
      if (!result.success && result.error) {
        console.error(`Credential test failed for ${credential.service}:`, result.error);
        // You could show this error to the user in a more user-friendly way
      }
    } catch (error) {
      console.error('Error testing credential:', error);
      setCredentialTestResults(prev => ({ ...prev, [credential.service]: false }));
    } finally {
      setTestingCredentials(prev => ({ ...prev, [credential.service]: false }));
    }
  };

  const handleComplete = () => {
    onComplete(configuration);
    onClose();
  };

  // Smart Credential Handlers
  const handleServiceConnect = async (serviceId: string) => {
    if (!template) return;
    
    try {
      await smartCredentialService.updateServiceConnection(
        template.id,
        serviceId,
        ConnectionStatus.CONNECTING
      );
      
      // Update local state
      setDetectedServices(prev => 
        prev.map(service => 
          service.serviceId === serviceId 
            ? { ...service, status: ConnectionStatus.CONNECTING }
            : service
        )
      );
      
      // Simulate connection process (in real implementation, this would open OAuth flow or credential form)
      setTimeout(async () => {
        const success = Math.random() > 0.3; // 70% success rate for demo
        const newStatus = success ? ConnectionStatus.CONNECTED : ConnectionStatus.FAILED;
        
        await smartCredentialService.updateServiceConnection(
          template.id,
          serviceId,
          newStatus
        );
        
        setDetectedServices(prev => 
          prev.map(service => 
            service.serviceId === serviceId 
              ? { 
                  ...service, 
                  status: newStatus,
                  connectedAt: success ? new Date() : service.connectedAt
                }
              : service
          )
        );
      }, 2000);
      
    } catch (error) {
      console.error('Error connecting service:', error);
    }
  };

  const handleServiceTest = async (serviceId: string) => {
    if (!template) return;
    
    try {
      await smartCredentialService.testServiceConnection(
        template.id,
        serviceId,
        {} // In real implementation, get credentials from form
      );
      
      // Update local state will be handled by the service's internal state management
      const config = smartCredentialService.getConfiguration(template.id);
      if (config) {
        setDetectedServices(config.detectedServices);
      }
    } catch (error) {
      console.error('Error testing service:', error);
    }
  };

  const handleServiceConfigure = (serviceId: string) => {
    // In real implementation, open configuration modal/dialog
    console.log('Configure service:', serviceId);
  };

  const handleServiceHelp = (serviceId: string) => {
    // In real implementation, open help documentation
    console.log('Show help for service:', serviceId);
  };

  const getStepContent = (stepIndex: number) => {
    if (!template) return null;

    switch (stepIndex) {
      case 0: // Overview
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>{template.businessName}</Typography>
                <Typography variant="body1" paragraph>{template.businessDescription}</Typography>
                
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Key Benefits</Typography>
                <List dense>
                  {template.features.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={feature} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Setup Summary</Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Estimated Setup Time:</Typography>
                      <Typography variant="body2" fontWeight={500}>{template.setupTime}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Monthly Value:</Typography>
                      <Typography variant="body2" fontWeight={500} color="success.main">
                        ${template.monthlyValue}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Time Saved:</Typography>
                      <Typography variant="body2" fontWeight={500}>{template.timesSaved}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Difficulty:</Typography>
                      <Chip 
                        label={template.difficulty} 
                        size="small" 
                        color={template.difficulty === 'beginner' ? 'success' : template.difficulty === 'intermediate' ? 'warning' : 'error'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Credentials
        return (
          <Box>
            {/* Header with Smart/Traditional Toggle */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h6" gutterBottom>Connect Your Accounts</Typography>
                <Typography variant="body2" color="text.secondary">
                  We need to connect to your accounts to automate workflows. All credentials are encrypted and stored securely.
                </Typography>
              </Box>
              
              <Tooltip title={useSmartCredentials ? "Switch to traditional setup" : "Use smart credential detection"}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AutoAwesomeIcon color={useSmartCredentials ? "primary" : "disabled"} />
                  <Switch
                    checked={useSmartCredentials}
                    onChange={(e) => setUseSmartCredentials(e.target.checked)}
                    color="primary"
                  />
                </Box>
              </Tooltip>
            </Box>

            {/* Loading State */}
            {loadingSmartCredentials && (
              <Box sx={{ mb: 3 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Analyzing workflow and detecting required services...
                </Typography>
              </Box>
            )}

            {/* Smart Credential System */}
            {useSmartCredentials && !loadingSmartCredentials && (
              <Box>
                {smartCredentialConfig && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      Smart detection found {detectedServices.length} service{detectedServices.length !== 1 ? 's' : ''} 
                      {smartCredentialConfig.setupProgress.estimatedTimeRemaining && 
                        ` • Estimated setup time: ${smartCredentialConfig.setupProgress.estimatedTimeRemaining}`
                      }
                    </Typography>
                  </Alert>
                )}

                <Grid container spacing={2}>
                  {detectedServices.map((service) => (
                    <Grid item xs={12} md={6} key={service.serviceId}>
                      <ServiceConnectionCard
                        service={service}
                        onConnect={handleServiceConnect}
                        onTest={handleServiceTest}
                        onConfigure={handleServiceConfigure}
                        onShowHelp={handleServiceHelp}
                        isLoading={service.status === ConnectionStatus.CONNECTING || service.status === ConnectionStatus.TESTING}
                        showBusinessValue={true}
                        compact={false}
                      />
                    </Grid>
                  ))}
                </Grid>

                {detectedServices.length === 0 && !loadingSmartCredentials && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    No services detected for this workflow. You can switch to traditional setup or check the workflow configuration.
                  </Alert>
                )}
              </Box>
            )}

            {/* Traditional Credential System */}
            {!useSmartCredentials && (
              <Box>
                {template.credentialsNeeded.map((credential, index) => (
                  <Card key={credential.service} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">{credential.displayName}</Typography>
                        <Chip 
                          label={credential.required ? 'Required' : 'Optional'} 
                          color={credential.required ? 'error' : 'default'}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {credential.description}
                      </Typography>

                      {credential.type === 'oauth' ? (
                        <Button variant="contained" fullWidth>
                          Connect with OAuth
                        </Button>
                      ) : (
                        <Grid container spacing={2}>
                          {credential.type === 'api_key' && (
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="API Key"
                                type={showPassword[credential.service] ? 'text' : 'password'}
                                value={configuration.credentials[credential.service]?.apiKey || ''}
                                onChange={(e) => handleCredentialChange(credential.service, 'apiKey', e.target.value)}
                                InputProps={{
                                  endAdornment: (
                                    <IconButton
                                      onClick={() => setShowPassword(prev => ({ 
                                        ...prev, 
                                        [credential.service]: !prev[credential.service] 
                                      }))}
                                    >
                                      {showPassword[credential.service] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                  )
                                }}
                              />
                            </Grid>
                          )}
                          
                          {credential.type === 'username_password' && (
                            <>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Username"
                                  value={configuration.credentials[credential.service]?.username || ''}
                                  onChange={(e) => handleCredentialChange(credential.service, 'username', e.target.value)}
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Password"
                                  type={showPassword[credential.service] ? 'text' : 'password'}
                                  value={configuration.credentials[credential.service]?.password || ''}
                                  onChange={(e) => handleCredentialChange(credential.service, 'password', e.target.value)}
                                  InputProps={{
                                    endAdornment: (
                                      <IconButton
                                        onClick={() => setShowPassword(prev => ({ 
                                          ...prev, 
                                          [credential.service]: !prev[credential.service] 
                                        }))}
                                      >
                                        {showPassword[credential.service] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                      </IconButton>
                                    )
                                  }}
                                />
                              </Grid>
                            </>
                          )}
                        </Grid>
                      )}

                      <Box mt={2}>
                        <Typography variant="body2" color="text.secondary">
                          Setup Instructions:
                        </Typography>
                        <List dense>
                          {credential.setupInstructions.map((instruction, idx) => (
                            <ListItem key={idx}>
                              <ListItemIcon>
                                <Typography variant="body2" color="primary">{idx + 1}.</Typography>
                              </ListItemIcon>
                              <ListItemText primary={instruction} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        );

      case 2: // Configuration
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Customize Settings</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure the automation to match your business needs.
            </Typography>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Schedule Settings</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configuration.schedule?.enabled || false}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, enabled: e.target.checked, pattern: '0 9 * * 1-5', timezone: 'America/New_York' }
                      }))}
                    />
                  }
                  label="Enable automatic scheduling"
                />
                
                {configuration.schedule?.enabled && (
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Schedule Pattern</InputLabel>
                        <Select
                          value={configuration.schedule?.pattern || '0 9 * * 1-5'}
                          label="Schedule Pattern"
                          onChange={(e) => setConfiguration(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule!, pattern: e.target.value }
                          }))}
                        >
                          <MenuItem value="0 9 * * 1-5">Weekdays at 9 AM</MenuItem>
                          <MenuItem value="0 9 * * *">Daily at 9 AM</MenuItem>
                          <MenuItem value="0 9 * * 1">Weekly on Monday at 9 AM</MenuItem>
                          <MenuItem value="0 9 1 * *">Monthly on 1st at 9 AM</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Timezone"
                        value={configuration.schedule?.timezone || 'America/New_York'}
                        onChange={(e) => setConfiguration(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule!, timezone: e.target.value }
                        }))}
                      />
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 3: // Testing
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Test Connections</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Let's test all your connections to make sure everything is working properly.
            </Typography>

            {template.credentialsNeeded.map((credential) => (
              <Card key={credential.service} sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6">{credential.displayName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {credential.description}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      {testingCredentials[credential.service] && <LinearProgress sx={{ width: 100 }} />}
                      
                      {credentialTestResults[credential.service] === true && (
                        <Chip icon={<CheckCircleIcon />} label="Connected" color="success" size="small" />
                      )}
                      
                      {credentialTestResults[credential.service] === false && (
                        <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />
                      )}
                      
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleTestCredential(credential)}
                        disabled={testingCredentials[credential.service] || !configuration.credentials[credential.service]}
                      >
                        {testingCredentials[credential.service] ? 'Testing...' : 'Test'}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 4: // Monitoring
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Set Up Monitoring</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure alerts and reporting to stay informed about your automation performance.
            </Typography>

            <Card>
              <CardContent>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configuration.monitoring.enabled}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        monitoring: { ...prev.monitoring, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Enable monitoring and alerts"
                />

                {configuration.monitoring.enabled && (
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Alert Email"
                        type="email"
                        value={configuration.monitoring.alertEmail}
                        onChange={(e) => setConfiguration(prev => ({
                          ...prev,
                          monitoring: { ...prev.monitoring, alertEmail: e.target.value }
                        }))}
                        helperText="We'll send alerts about failures or issues"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Report Frequency</InputLabel>
                        <Select
                          value={configuration.monitoring.reportingFrequency}
                          label="Report Frequency"
                          onChange={(e) => setConfiguration(prev => ({
                            ...prev,
                            monitoring: { ...prev.monitoring, reportingFrequency: e.target.value as any }
                          }))}
                        >
                          <MenuItem value="daily">Daily</MenuItem>
                          <MenuItem value="weekly">Weekly</MenuItem>
                          <MenuItem value="monthly">Monthly</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 5: // Launch
        return (
          <Box textAlign="center">
            <Typography variant="h5" gutterBottom color="success.main">
              🎉 Ready to Launch!
            </Typography>
            <Typography variant="body1" paragraph>
              Your automation is configured and ready to go. Here's what will happen next:
            </Typography>

            <Paper sx={{ p: 3, mt: 3, textAlign: 'left' }}>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Deploy Automation" 
                    secondary="Your workflow will be activated in n8n"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Start Monitoring" 
                    secondary="We'll begin tracking performance and sending reports"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Begin Automation" 
                    secondary={configuration.schedule?.enabled ? 'Scheduled execution will begin' : 'Ready for manual triggers'}
                  />
                </ListItem>
              </List>
            </Paper>

            <Alert severity="info" sx={{ mt: 3 }}>
              You can modify these settings anytime from your dashboard.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Setup Automation Wizard
        {template && (
          <Typography variant="body2" color="text.secondary">
            {template.businessName}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                icon={step.icon}
                error={validationStates[index] && !validationStates[index].isValid}
              >
                <Typography variant="subtitle1">{step.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                {validationStates[index] && !validationStates[index].isValid && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {validationStates[index].errors.map((error, idx) => (
                      <Typography key={idx} variant="body2">{error}</Typography>
                    ))}
                  </Alert>
                )}
                
                {getStepContent(index)}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleComplete : handleNext}
                    sx={{ mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Launch Automation' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Tooltip title="Get help with setup">
          <IconButton color="primary">
            <HelpIcon />
          </IconButton>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};