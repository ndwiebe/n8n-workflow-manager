/**
 * WorkflowExecutionMonitor Component
 * Real-time monitoring interface for workflow execution and results
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

import { 
  MonitoringConfig, 
  WorkflowInteractionMetadata, 
  InteractionResult 
} from './EmbeddedWorkflowInterface';
import { UnifiedWorkflowData } from '../../services/unifiedWorkflowService';

export interface ExecutionData {
  id: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  data?: any;
  metrics?: {
    totalCustomers?: number;
    activeCustomers?: number;
    conversionRate?: number;
    totalPosts?: number;
    avgEngagement?: number;
    bounceRate?: number;
  };
  alerts?: string[];
}

export interface WorkflowExecutionMonitorProps {
  workflow: UnifiedWorkflowData;
  metadata: WorkflowInteractionMetadata;
  monitoringConfig?: MonitoringConfig;
  updateFrequency: 'realtime' | 'periodic' | 'manual';
  onComplete: (result: InteractionResult) => void;
  onClose?: () => void;
}

export const WorkflowExecutionMonitor: React.FC<WorkflowExecutionMonitorProps> = ({
  workflow,
  metadata,
  monitoringConfig,
  updateFrequency,
  onComplete,
  onClose
}) => {
  const theme = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [executions, setExecutions] = useState<ExecutionData[]>([]);
  const [currentExecution, setCurrentExecution] = useState<ExecutionData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(updateFrequency !== 'manual');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🔄 WorkflowExecutionMonitor: Starting monitoring', { autoRefresh, updateFrequency });
    // Start monitoring
    if (autoRefresh && updateFrequency === 'periodic') {
      startPeriodicUpdates();
    } else if (updateFrequency === 'realtime') {
      startRealtimeUpdates();
    }

    return () => {
      console.log('✅ WorkflowExecutionMonitor: Cleaning up intervals');
      stopUpdates();
    };
  }, [autoRefresh, updateFrequency]);

  /**
   * Start periodic updates
   */
  const startPeriodicUpdates = () => {
    const interval = 10000; // 10 seconds
    
    intervalRef.current = setInterval(() => {
      if (!isRunning) return;
      fetchExecutionData();
    }, interval);
    
    // Initial fetch
    fetchExecutionData();
  };

  /**
   * Start real-time updates (WebSocket simulation with polling)
   */
  const startRealtimeUpdates = () => {
    const interval = 3000; // 3 seconds for real-time feel
    
    intervalRef.current = setInterval(() => {
      fetchExecutionData();
    }, interval);
    
    // Initial fetch
    fetchExecutionData();
  };

  /**
   * Stop updates
   */
  const stopUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('✅ WorkflowExecutionMonitor: Cleared interval');
    }
  };

  /**
   * Execute workflow manually
   */
  const handleExecuteWorkflow = async () => {
    try {
      setIsRunning(true);
      setError(null);

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/workflows/${workflow.id}/execute-with-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interactionData: {},
          interactionType: 'manual'
        })
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      const newExecution: ExecutionData = {
        id: result.executionId || `exec-${Date.now()}`,
        status: 'running',
        startedAt: new Date(),
        data: result.data
      };

      setCurrentExecution(newExecution);
      setExecutions(prev => [newExecution, ...prev]);

      // Monitor execution progress
      monitorExecution(newExecution.id);

      onComplete({
        success: true,
        data: result.data,
        executionId: result.executionId
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Execution failed');
      setIsRunning(false);
      
      onComplete({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      });
    }
  };

  /**
   * Monitor specific execution
   */
  const monitorExecution = async (executionId: string) => {
    const checkStatus = async () => {
      try {
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/workflows/${workflow.id}/executions/${executionId}`);
        if (response.ok) {
          const executionData = await response.json();
          
          setCurrentExecution(prev => prev ? {
            ...prev,
            status: executionData.status,
            finishedAt: executionData.finishedAt ? new Date(executionData.finishedAt) : undefined,
            duration: executionData.executionTime,
            data: executionData.data,
            metrics: extractMetrics(executionData.data)
          } : null);

          if (executionData.status === 'success' || executionData.status === 'error') {
            setIsRunning(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check execution status:', err);
      }

      // Continue monitoring if still running
      setTimeout(checkStatus, 2000);
    };

    checkStatus();
  };

  /**
   * Fetch execution data and metrics
   */
  const fetchExecutionData = async () => {
    try {
      // Fetch recent executions
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const executionsResponse = await fetch(`${API_BASE_URL}/workflows/${workflow.id}/executions?limit=10`);
      if (executionsResponse.ok) {
        const executionsData = await executionsResponse.json();
        const formattedExecutions = executionsData.map((exec: any) => ({
          id: exec.id,
          status: exec.status,
          startedAt: new Date(exec.startedAt),
          finishedAt: exec.finishedAt ? new Date(exec.finishedAt) : undefined,
          duration: exec.executionTime,
          data: exec.data,
          metrics: extractMetrics(exec.data),
          alerts: generateAlerts(exec.data)
        }));

        setExecutions(formattedExecutions);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch execution data:', error);
    }
  };

  /**
   * Extract metrics from execution data
   */
  const extractMetrics = (data: any): ExecutionData['metrics'] => {
    if (!data) return undefined;

    // Handle different workflow types
    const workflowName = workflow.name.toLowerCase();
    
    if (workflowName.includes('analytics') || workflowName.includes('dashboard')) {
      return {
        totalCustomers: data.dashboard_data?.sales_metrics?.total_customers,
        activeCustomers: data.dashboard_data?.sales_metrics?.active_customers,
        conversionRate: data.dashboard_data?.sales_metrics?.conversion_rate,
        totalPosts: data.dashboard_data?.traffic_metrics?.total_posts,
        avgEngagement: data.dashboard_data?.traffic_metrics?.avg_engagement,
        bounceRate: data.dashboard_data?.traffic_metrics?.bounce_rate
      };
    }

    return undefined;
  };

  /**
   * Generate alerts from execution data
   */
  const generateAlerts = (data: any): string[] => {
    if (!data) return [];

    const alerts: string[] = [];
    
    if (data.dashboard_data?.alerts) {
      alerts.push(...data.dashboard_data.alerts);
    }

    return alerts;
  };

  /**
   * Format duration
   */
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return theme.palette.success.main;
      case 'error': return theme.palette.error.main;
      case 'running': return theme.palette.warning.main;
      case 'waiting': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon />;
      case 'error': return <ErrorIcon />;
      case 'running': return <CircularProgress size={20} />;
      case 'waiting': return <PauseIcon />;
      default: return <TimelineIcon />;
    }
  };

  /**
   * Render metrics cards
   */
  const renderMetrics = () => {
    if (!currentExecution?.metrics && executions.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No execution data available. Execute the workflow to see metrics.
        </Alert>
      );
    }

    const metrics = currentExecution?.metrics || executions[0]?.metrics;
    if (!metrics) return null;

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {Object.entries(metrics).map(([key, value]) => {
          if (value === undefined || value === null) return null;
          
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const isPercentage = key.includes('Rate') || key.includes('Percentage');
          const displayValue = isPercentage ? `${value}%` : value.toLocaleString();
          
          return (
            <Grid item xs={6} sm={4} md={3} key={key}>
              <Card variant="outlined">
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {displayValue}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  /**
   * Render execution history
   */
  const renderExecutionHistory = () => {
    if (executions.length === 0) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Executions
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions.slice(0, 5).map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(execution.status)}
                      <Chip
                        label={execution.status}
                        size="small"
                        sx={{ 
                          bgcolor: getStatusColor(execution.status),
                          color: 'white'
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {execution.startedAt.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {execution.duration ? formatDuration(execution.duration) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View details">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download results">
                      <IconButton size="small">
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {workflow.businessName} Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time execution monitoring and analytics
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant={autoRefresh ? 'outlined' : 'contained'}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
            startIcon={<TimelineIcon />}
          >
            {autoRefresh ? 'Stop' : 'Start'} Monitor
          </Button>
          
          <Button
            variant="contained"
            onClick={handleExecuteWorkflow}
            disabled={isRunning}
            startIcon={isRunning ? <CircularProgress size={16} /> : <PlayIcon />}
          >
            {isRunning ? 'Running...' : 'Execute'}
          </Button>
          
          <IconButton onClick={fetchExecutionData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Status */}
      {currentExecution && (
        <Alert
          severity={currentExecution.status === 'success' ? 'success' : 
                   currentExecution.status === 'error' ? 'error' : 'info'}
          sx={{ mb: 2 }}
          icon={getStatusIcon(currentExecution.status)}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
            <Typography variant="body2">
              Execution {currentExecution.status}
              {currentExecution.duration && ` in ${formatDuration(currentExecution.duration)}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {currentExecution.id}
            </Typography>
          </Box>
          {isRunning && (
            <LinearProgress sx={{ mt: 1 }} />
          )}
        </Alert>
      )}

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Alerts */}
      {(currentExecution?.alerts || executions[0]?.alerts) && (
        <Box sx={{ mb: 2 }}>
          {(currentExecution?.alerts || executions[0]?.alerts)?.map((alert, index) => (
            <Alert
              key={index}
              severity="warning"
              sx={{ mb: 1 }}
              icon={<WarningIcon />}
            >
              {alert}
            </Alert>
          ))}
        </Box>
      )}

      {/* Metrics */}
      {renderMetrics()}

      {/* Execution History */}
      {renderExecutionHistory()}

      {/* Last updated */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Last updated: {lastUpdate.toLocaleTimeString()}
          {autoRefresh && ` • Auto-refreshing every ${updateFrequency === 'realtime' ? '3' : '10'} seconds`}
        </Typography>
      </Box>
    </Box>
  );
};

export default WorkflowExecutionMonitor;