import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Alert,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  WorkspacePremium as WorkflowIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Mock data for dashboard
const dashboardData = {
  stats: {
    totalClients: 47,
    activeWorkflows: 142,
    monthlyRevenue: 12450,
    pendingSetups: 8
  },
  alerts: [
    { type: 'warning', message: '3 workflows pending activation for over 5 days', action: 'Review' },
    { type: 'error', message: '2 client configurations failed validation', action: 'Fix' },
    { type: 'info', message: 'New feature: Slack Integration now available', action: 'Announce' }
  ],
  recentClients: [
    { name: 'Emma Thompson', company: 'Design Studio', status: 'active', workflows: 2 },
    { name: 'Robert Kim', company: 'Tech Solutions', status: 'pending', workflows: 1 },
    { name: 'Maria Garcia', company: 'Retail Chain', status: 'active', workflows: 4 }
  ],
  systemHealth: {
    apiStatus: 'healthy',
    dbStatus: 'healthy',
    workflowEngine: 'healthy',
    queueStatus: 'warning'
  }
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    onClick 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color: string;
    onClick?: () => void;
  }) => (
    <Card sx={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <ScheduleIcon color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System overview and management center
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Alert Section */}
      {dashboardData.alerts.length > 0 && (
        <Box mb={3}>
          {dashboardData.alerts.map((alert, index) => (
            <Alert 
              key={index} 
              severity={alert.type as any} 
              action={
                <Button color="inherit" size="small">
                  {alert.action}
                </Button>
              }
              sx={{ mb: 1 }}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Stats Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Clients"
            value={dashboardData.stats.totalClients}
            icon={<PeopleIcon />}
            color="info"
            onClick={() => navigate('/admin/clients')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Workflows"
            value={dashboardData.stats.activeWorkflows}
            icon={<WorkflowIcon />}
            color="primary"
            onClick={() => navigate('/admin/workflows')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={`$${dashboardData.stats.monthlyRevenue.toLocaleString()}`}
            icon={<MoneyIcon />}
            color="success"
            onClick={() => navigate('/admin/analytics')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Setups"
            value={dashboardData.stats.pendingSetups}
            icon={<ScheduleIcon />}
            color="warning"
            onClick={() => navigate('/admin/clients')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="System Health" 
              subheader="Real-time system status"
              action={
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
              }
            />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(dashboardData.systemHealth.apiStatus)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="API Server"
                    secondary="All endpoints responding normally"
                  />
                  <Chip 
                    label={dashboardData.systemHealth.apiStatus} 
                    color={getStatusColor(dashboardData.systemHealth.apiStatus) as any}
                    size="small"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(dashboardData.systemHealth.dbStatus)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Database"
                    secondary="Connection stable, 2ms latency"
                  />
                  <Chip 
                    label={dashboardData.systemHealth.dbStatus} 
                    color={getStatusColor(dashboardData.systemHealth.dbStatus) as any}
                    size="small"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(dashboardData.systemHealth.workflowEngine)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Workflow Engine"
                    secondary="Processing 142 active workflows"
                  />
                  <Chip 
                    label={dashboardData.systemHealth.workflowEngine} 
                    color={getStatusColor(dashboardData.systemHealth.workflowEngine) as any}
                    size="small"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(dashboardData.systemHealth.queueStatus)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Job Queue"
                    secondary="8 pending activations in queue"
                  />
                  <Chip 
                    label={dashboardData.systemHealth.queueStatus} 
                    color={getStatusColor(dashboardData.systemHealth.queueStatus) as any}
                    size="small"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Recent Clients" 
              subheader="Latest registrations and activity"
              action={
                <Button 
                  size="small" 
                  endIcon={<LaunchIcon />}
                  onClick={() => navigate('/admin/clients')}
                >
                  View All
                </Button>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Workflows</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.recentClients.map((client, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {client.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {client.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {client.company}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={client.status} 
                            color={client.status === 'active' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">{client.workflows}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Quick Actions" subheader="Common administrative tasks" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate('/admin/workflows')}
                  >
                    <WorkflowIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h6" mt={1}>
                      Manage Workflows
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create, edit, and configure workflow modules
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate('/admin/clients')}
                  >
                    <PeopleIcon color="info" sx={{ fontSize: 40 }} />
                    <Typography variant="h6" mt={1}>
                      Client Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monitor client accounts and configurations
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate('/admin/analytics')}
                  >
                    <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                    <Typography variant="h6" mt={1}>
                      Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      View performance metrics and insights
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate('/admin/settings')}
                  >
                    <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
                    <Typography variant="h6" mt={1}>
                      System Settings
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure system parameters and preferences
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};