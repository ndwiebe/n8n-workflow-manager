/**
 * Connection Test Results Component
 * Display comprehensive connection test results with business context
 * Phase 2: OAuth Excellence System
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Build as BuildIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  ChecklistRtl as ChecklistRtlIcon
} from '@mui/icons-material';

import { 
  ConnectionTestExecution,
  ServiceHealthStatus,
  connectionTestingService
} from '../../services/connectionTestingService';
import { 
  ServiceConnectionCard, 
  OAuthServiceConnectionCard 
} from '../../types/smartCredentials';

interface ConnectionTestResultsProps {
  open: boolean;
  onClose: () => void;
  service: ServiceConnectionCard | OAuthServiceConnectionCard;
  execution?: ConnectionTestExecution;
  onRetestConnection: () => void;
  workflowId: string;
  userId: string;
}

export const ConnectionTestResults: React.FC<ConnectionTestResultsProps> = ({
  open,
  onClose,
  service,
  execution: initialExecution,
  onRetestConnection,
  workflowId,
  userId
}) => {
  const [execution, setExecution] = useState<ConnectionTestExecution | undefined>(initialExecution);
  const [healthStatus, setHealthStatus] = useState<ServiceHealthStatus | null>(null);
  const [isRetesting, setIsRetesting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  useEffect(() => {
    if (open) {
      // Load health status
      const status = connectionTestingService.getHealthStatus(service.serviceId);
      setHealthStatus(status);

      // Check for running tests
      const runningTest = connectionTestingService.getRunningTest(service.serviceId);
      if (runningTest) {
        setExecution(runningTest);
        // Poll for updates
        const pollInterval = setInterval(() => {
          const updatedTest = connectionTestingService.getRunningTest(service.serviceId);
          if (updatedTest) {
            setExecution(updatedTest);
          } else {
            // Test completed, get latest execution
            const history = connectionTestingService.getTestHistory(service.serviceId);
            if (history.length > 0) {
              setExecution(history[0]);
            }
            clearInterval(pollInterval);
            setIsRetesting(false);
          }
        }, 1000);

        return () => clearInterval(pollInterval);
      }
    }
  }, [open, service.serviceId]);

  const handleRetestConnection = async () => {
    setIsRetesting(true);
    onRetestConnection();
    
    // Start polling for the new test
    const pollInterval = setInterval(() => {
      const runningTest = connectionTestingService.getRunningTest(service.serviceId);
      if (runningTest) {
        setExecution(runningTest);
      } else {
        const history = connectionTestingService.getTestHistory(service.serviceId);
        if (history.length > 0) {
          setExecution(history[0]);
        }
        clearInterval(pollInterval);
        setIsRetesting(false);
      }
    }, 1000);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'success';
      case 'good': return 'success';
      case 'limited': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (passed: boolean, category: string) => {
    if (passed) {
      return <CheckCircleIcon color="success" />;
    }
    
    switch (category) {
      case 'connectivity':
        return <ErrorIcon color="error" />;
      case 'permissions':
        return <SecurityIcon color="error" />;
      case 'functionality':
        return <BuildIcon color="error" />;
      case 'performance':
        return <SpeedIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'connectivity':
        return <TimelineIcon />;
      case 'permissions':
        return <SecurityIcon />;
      case 'functionality':
        return <BuildIcon />;
      case 'performance':
        return <SpeedIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (!execution) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Connection Test Results</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <InfoIcon color="action" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Test Results Available
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Run a connection test to see detailed results and recommendations.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button 
            variant="contained" 
            onClick={handleRetestConnection}
            disabled={isRetesting}
          >
            Run Connection Test
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  const isRunning = execution.status === 'running';
  const progress = execution.results.length / execution.summary.totalTests * 100;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="between">
          <Box display="flex" alignItems="center" gap={2}>
            <ChecklistRtlIcon />
            <Box>
              <Typography variant="h6">
                Connection Test Results - {service.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {execution.status === 'running' ? 'Testing in progress...' : 
                 execution.status === 'completed' ? 'Testing completed' :
                 execution.status === 'failed' ? 'Testing failed' : 'Testing cancelled'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Progress Bar for Running Tests */}
        {isRunning && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Testing {execution.results.length + 1} of {execution.summary.totalTests} checks...
            </Typography>
          </Box>
        )}

        {/* Overall Summary */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Test Summary
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color={getHealthColor(execution.summary.connectionHealth)}>
                    {execution.summary.passedTests}/{execution.summary.totalTests}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tests Passed
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Chip 
                    label={execution.summary.connectionHealth.toUpperCase()} 
                    color={getHealthColor(execution.summary.connectionHealth) as any}
                    size="medium"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Connection Health
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Chip 
                    label={execution.summary.businessReadiness.replace('_', ' ').toUpperCase()} 
                    color={execution.summary.businessReadiness === 'ready' ? 'success' : 
                           execution.summary.businessReadiness === 'limited' ? 'warning' : 'error'}
                    size="medium"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Business Readiness
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4">
                    {formatExecutionTime(execution.summary.averageResponseTime)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Test Results by Category */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Detailed Test Results
          </Typography>

          {(['connectivity', 'permissions', 'functionality', 'performance'] as const).map(category => {
            const categoryTests = execution.results.filter(result => {
              // This would need proper test metadata to categorize correctly
              // For demo, we'll distribute tests among categories
              const testIndex = execution.results.indexOf(result);
              const categoryIndex = testIndex % 4;
              const categories = ['connectivity', 'permissions', 'functionality', 'performance'];
              return categories[categoryIndex] === category;
            });

            if (categoryTests.length === 0) return null;

            const categoryPassed = categoryTests.filter(t => t.passed).length;
            const categoryTotal = categoryTests.length;

            return (
              <Accordion 
                key={category}
                expanded={expandedSection === category}
                onChange={() => setExpandedSection(expandedSection === category ? '' : category)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    {getCategoryIcon(category)}
                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', flex: 1 }}>
                      {category}
                    </Typography>
                    <Chip 
                      label={`${categoryPassed}/${categoryTotal}`}
                      color={categoryPassed === categoryTotal ? 'success' : 
                             categoryPassed > 0 ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {categoryTests.map((result, index) => (
                      <ListItem key={result.testId}>
                        <ListItemIcon>
                          {getStatusIcon(result.passed, category)}
                        </ListItemIcon>
                        <ListItemText
                          primary={result.testId}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.primary">
                                {result.businessMessage}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Execution time: {formatExecutionTime(result.executionTime)}
                              </Typography>
                              {result.error && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                  {result.error}
                                </Alert>
                              )}
                              {result.recommendations && result.recommendations.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" color="primary">
                                    Recommendations:
                                  </Typography>
                                  <List dense>
                                    {result.recommendations.map((rec, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.5, pl: 2 }}>
                                        <ListItemText 
                                          primary={rec}
                                          primaryTypographyProps={{ variant: 'caption' }}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        {/* Recommendations */}
        {execution.recommendations && execution.recommendations.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Recommendations
              </Typography>
              <List>
                {execution.recommendations.map((recommendation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InfoIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {execution.nextSteps && execution.nextSteps.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Next Steps
              </Typography>
              <List>
                {execution.nextSteps.map((step, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Health Status */}
        {healthStatus && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💊 Service Health Status
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Connectivity</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={healthStatus.connectivity.status}
                      color={healthStatus.connectivity.status === 'connected' ? 'success' : 'error'}
                      size="small"
                    />
                    <Typography variant="body2">
                      {formatExecutionTime(healthStatus.connectivity.responseTime)} avg
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Permissions</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={healthStatus.permissions.status}
                      color={healthStatus.permissions.status === 'full' ? 'success' : 
                             healthStatus.permissions.status === 'partial' ? 'warning' : 'error'}
                      size="small"
                    />
                    {healthStatus.permissions.criticalMissing && (
                      <Chip label="Critical Issues" color="error" size="small" />
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Business Context</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip 
                      label="Send Data" 
                      color={healthStatus.businessContext.canSendData ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label="Receive Data" 
                      color={healthStatus.businessContext.canReceiveData ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label="Process Workflows" 
                      color={healthStatus.businessContext.canProcessWorkflows ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Close</Button>
        <Button 
          variant="contained" 
          onClick={handleRetestConnection}
          disabled={isRetesting || isRunning}
          startIcon={isRetesting ? <CircularProgress size={20} /> : <RefreshIcon />}
        >
          {isRetesting ? 'Testing...' : 'Retest Connection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};