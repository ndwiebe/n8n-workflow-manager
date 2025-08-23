import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  CloudQueue as CloudIcon
} from '@mui/icons-material';
import { n8nService } from '../../services/n8nService';

export const N8nConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [metrics, setMetrics] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setErrorMessage('');
    
    try {
      // Test basic connection
      const isConnected = await n8nService.testConnection();
      
      if (!isConnected) {
        throw new Error('Failed to connect to n8n instance');
      }

      // Get business metrics
      const businessMetrics = await n8nService.getBusinessMetrics();
      setMetrics(businessMetrics);

      // Get workflows
      const workflowList = await n8nService.getWorkflows();
      setWorkflows(workflowList); // Show all workflows

      setConnectionStatus('success');
    } catch (error: any) {
      console.error('n8n connection error:', error);
      setErrorMessage(error.message || 'Failed to connect to n8n');
      setConnectionStatus('error');
    }
  };

  useEffect(() => {
    // Auto-test connection on mount
    testConnection();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'testing': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', my: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <CloudIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              n8n Connection Test
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={testConnection}
            disabled={connectionStatus === 'testing'}
          >
            Test Connection
          </Button>
        </Box>

        {/* Connection Status */}
        <Alert 
          severity={connectionStatus === 'success' ? 'success' : connectionStatus === 'error' ? 'error' : 'info'}
          icon={connectionStatus === 'success' ? <CheckCircleIcon /> : connectionStatus === 'error' ? <ErrorIcon /> : <CircularProgress size={20} />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body1" fontWeight={500}>
            {connectionStatus === 'idle' && 'Click "Test Connection" to verify n8n connectivity'}
            {connectionStatus === 'testing' && 'Testing connection to n8n instance...'}
            {connectionStatus === 'success' && 'Successfully connected to n8n!'}
            {connectionStatus === 'error' && `Connection failed: ${errorMessage}`}
          </Typography>
        </Alert>

        {/* Connection Details */}
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Connection Details
          </Typography>
          <Typography variant="body2">
            <strong>n8n URL:</strong> {process.env.REACT_APP_N8N_URL}
          </Typography>
          <Typography variant="body2">
            <strong>API Key:</strong> {process.env.REACT_APP_N8N_API_KEY ? '••••••••' + process.env.REACT_APP_N8N_API_KEY.slice(-4) : 'Not set'}
          </Typography>
        </Box>

        {/* Business Metrics */}
        {metrics && connectionStatus === 'success' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>
              Business Metrics from n8n
            </Typography>
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={2} mb={3}>
              <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={1}>
                <Typography variant="h4" color="primary.contrastText">
                  {metrics.totalWorkflows}
                </Typography>
                <Typography variant="caption" color="primary.contrastText">
                  Total Workflows
                </Typography>
              </Box>
              <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={1}>
                <Typography variant="h4" color="success.contrastText">
                  {metrics.activeWorkflows}
                </Typography>
                <Typography variant="caption" color="success.contrastText">
                  Active Workflows
                </Typography>
              </Box>
              <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={1}>
                <Typography variant="h4" color="info.contrastText">
                  {metrics.totalExecutions}
                </Typography>
                <Typography variant="caption" color="info.contrastText">
                  Total Executions
                </Typography>
              </Box>
              <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={1}>
                <Typography variant="h4" color="warning.contrastText">
                  {metrics.successfulExecutions}
                </Typography>
                <Typography variant="caption" color="warning.contrastText">
                  Successful
                </Typography>
              </Box>
            </Box>
          </>
        )}

        {/* Workflow List */}
        {workflows.length > 0 && connectionStatus === 'success' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>
              Your Workflows
            </Typography>
            <List>
              {workflows.map((workflow) => (
                <ListItem key={workflow.id} divider>
                  <ListItemIcon>
                    {workflow.active ? (
                      <PlayArrowIcon color="success" />
                    ) : (
                      <StopIcon color="disabled" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={workflow.name}
                    secondary={`ID: ${workflow.id} | Created: ${new Date(workflow.createdAt).toLocaleDateString()}`}
                  />
                  <Chip
                    label={workflow.active ? 'Active' : 'Inactive'}
                    color={workflow.active ? 'success' : 'default'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
};