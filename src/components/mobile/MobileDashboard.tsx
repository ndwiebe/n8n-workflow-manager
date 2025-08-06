import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  PlayArrow,
  Pause,
  Error as ErrorIcon,
  CheckCircle,
  Schedule,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  NotificationsActive,
  AttachMoney,
  Speed,
  Business,
  CloudDone,
  Warning
} from '@mui/icons-material';

interface WorkflowSummary {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastRun: string;
  successRate: number;
  executionsToday: number;
}

interface BusinessMetric {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  color: string;
}

interface RecentActivity {
  id: string;
  workflow: string;
  action: string;
  timestamp: string;
  status: 'success' | 'error' | 'running';
  impact?: string;
}

const MobileDashboard: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulated data - replace with actual API calls
      setWorkflows([
        {
          id: '1',
          name: 'Customer Onboarding',
          status: 'active',
          lastRun: '2 min ago',
          successRate: 98.5,
          executionsToday: 24
        },
        {
          id: '2',
          name: 'Invoice Processing',
          status: 'active',
          lastRun: '5 min ago',
          successRate: 95.2,
          executionsToday: 45
        },
        {
          id: '3',
          name: 'Lead Qualification',
          status: 'error',
          lastRun: '1 hour ago',
          successRate: 87.3,
          executionsToday: 12
        }
      ]);

      setMetrics([
        {
          title: 'Revenue Impact',
          value: '$12,450',
          change: 15.3,
          trend: 'up',
          icon: <AttachMoney />,
          color: '#4caf50'
        },
        {
          title: 'Time Saved',
          value: '8.5 hrs',
          change: 23.1,
          trend: 'up',
          icon: <Speed />,
          color: '#2196f3'
        },
        {
          title: 'Success Rate',
          value: '94.2%',
          change: -2.1,
          trend: 'down',
          icon: <CheckCircle />,
          color: '#ff9800'
        },
        {
          title: 'Active Workflows',
          value: '15',
          change: 12.5,
          trend: 'up',
          icon: <Business />,
          color: '#9c27b0'
        }
      ]);

      setActivities([
        {
          id: '1',
          workflow: 'Customer Onboarding',
          action: 'New customer processed',
          timestamp: '2 min ago',
          status: 'success',
          impact: '+$850 potential revenue'
        },
        {
          id: '2',
          workflow: 'Invoice Processing',
          action: 'Invoice sent to client',
          timestamp: '5 min ago',
          status: 'success',
          impact: '$2,340 invoice'
        },
        {
          id: '3',
          workflow: 'Lead Qualification',
          action: 'Workflow failed',
          timestamp: '1 hour ago',
          status: 'error',
          impact: 'Lost potential lead'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setSnackbarMessage('Failed to load dashboard data');
      setSnackbarOpen(true);
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setSnackbarMessage(`${action} action triggered`);
    setSnackbarOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'error': return '#f44336';
      case 'inactive': return '#9e9e9e';
      default: return '#2196f3';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'error': return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'running': return <Schedule sx={{ color: '#ff9800' }} />;
      default: return <CheckCircle />;
    }
  };

  const speedDialActions = [
    { icon: <AddIcon />, name: 'New Workflow', action: 'create' },
    { icon: <RefreshIcon />, name: 'Refresh Data', action: 'refresh' },
    { icon: <SettingsIcon />, name: 'Settings', action: 'settings' }
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading your business dashboard...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 10, px: { xs: 1, sm: 2 } }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your business automation is running smoothly
        </Typography>
      </Box>

      {/* Business Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${metric.color}15, ${metric.color}05)`,
                border: `1px solid ${metric.color}30`
              }}
            >
              <CardContent sx={{ pb: '16px !important', textAlign: 'center' }}>
                <Box sx={{ color: metric.color, mb: 1 }}>
                  {metric.icon}
                </Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                  {metric.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {metric.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {metric.trend === 'up' ? (
                    <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                  ) : (
                    <TrendingDown sx={{ color: '#f44336', fontSize: 16, mr: 0.5 }} />
                  )}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: metric.trend === 'up' ? '#4caf50' : '#f44336',
                      fontWeight: 500
                    }}
                  >
                    {Math.abs(metric.change)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Active Workflows */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Active Workflows
          </Typography>
          {workflows.map((workflow) => (
            <Box key={workflow.id} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  {workflow.name}
                </Typography>
                <Chip 
                  label={workflow.status}
                  size="small"
                  sx={{ 
                    backgroundColor: getStatusColor(workflow.status),
                    color: 'white',
                    fontWeight: 500
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Last run: {workflow.lastRun}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {workflow.executionsToday} executions today
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                  Success Rate:
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={workflow.successRate} 
                  sx={{ 
                    flexGrow: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: workflow.successRate > 90 ? '#4caf50' : workflow.successRate > 80 ? '#ff9800' : '#f44336'
                    }
                  }}
                />
                <Typography variant="body2" sx={{ minWidth: 'fit-content', fontWeight: 500 }}>
                  {workflow.successRate}%
                </Typography>
              </Box>
              {workflow.id !== workflows[workflows.length - 1].id && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Recent Activity
          </Typography>
          <List dense>
            {activities.map((activity) => (
              <ListItem key={activity.id} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {getStatusIcon(activity.status)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {activity.workflow}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {activity.action}
                      </Typography>
                      {activity.impact && (
                        <Typography variant="caption" color="primary">
                          {activity.impact}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Typography variant="caption" color="text.secondary">
                    {activity.timestamp}
                  </Typography>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => handleQuickAction(action.action)}
          />
        ))}
      </SpeedDial>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default MobileDashboard;