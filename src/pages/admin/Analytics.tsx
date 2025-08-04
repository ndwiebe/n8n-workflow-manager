import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  WorkspacePremium as WorkflowIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';

// Mock analytics data
const analyticsData = {
  overview: {
    totalRevenue: 12450,
    revenueGrowth: 15.3,
    totalClients: 47,
    clientGrowth: 8.2,
    activeWorkflows: 142,
    workflowGrowth: 12.7,
    avgSetupTime: 4.2
  },
  workflowStats: [
    { name: 'Invoice Processing', activations: 23, revenue: 2277, growth: 18.5 },
    { name: 'Email Automation', activations: 19, revenue: 2831, growth: 12.3 },
    { name: 'Customer Support AI', activations: 15, revenue: 4485, growth: 25.1 },
    { name: 'Inventory Sync', activations: 12, revenue: 2388, growth: -2.1 },
    { name: 'Social Media Scheduler', activations: 18, revenue: 2322, growth: 8.7 },
    { name: 'Data Backup', activations: 21, revenue: 1659, growth: 5.2 }
  ],
  recentActivity: [
    { user: 'John Doe', action: 'Activated Email Automation', time: '2 hours ago', company: 'Acme Corp' },
    { user: 'Sarah Johnson', action: 'Configured Slack Integration', time: '4 hours ago', company: 'TechStart Inc' },
    { user: 'Mike Chen', action: 'Updated Invoice Processor', time: '6 hours ago', company: 'Retail Solutions' },
    { user: 'Lisa Wang', action: 'Activated Customer Support AI', time: '8 hours ago', company: 'Global Tech' },
    { user: 'David Miller', action: 'Configured Data Backup', time: '1 day ago', company: 'FinServ Corp' }
  ],
  monthlyGrowth: [
    { month: 'Jan', clients: 28, revenue: 8400, workflows: 89 },
    { month: 'Feb', clients: 32, revenue: 9200, workflows: 98 },
    { month: 'Mar', clients: 35, revenue: 9800, workflows: 107 },
    { month: 'Apr', clients: 38, revenue: 10600, workflows: 118 },
    { month: 'May', clients: 42, revenue: 11200, workflows: 128 },
    { month: 'Jun', clients: 45, revenue: 11800, workflows: 135 },
    { month: 'Jul', clients: 47, revenue: 12450, workflows: 142 }
  ]
};

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = React.useState('30d');
  const [loading, setLoading] = React.useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const StatCard = ({ 
    title, 
    value, 
    growth, 
    icon, 
    color = 'primary' 
  }: { 
    title: string; 
    value: string | number; 
    growth?: number; 
    icon: React.ReactNode; 
    color?: string;
  }) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {growth !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {growth > 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography 
                  variant="body2" 
                  color={growth > 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(growth)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Business insights and performance metrics
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          
          <IconButton>
            <DownloadIcon />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={`$${analyticsData.overview.totalRevenue.toLocaleString()}`}
            growth={analyticsData.overview.revenueGrowth}
            icon={<MoneyIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Clients"
            value={analyticsData.overview.totalClients}
            growth={analyticsData.overview.clientGrowth}
            icon={<PeopleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Workflows"
            value={analyticsData.overview.activeWorkflows}
            growth={analyticsData.overview.workflowGrowth}
            icon={<WorkflowIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Setup Time"
            value={`${analyticsData.overview.avgSetupTime} days`}
            icon={<SpeedIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader 
              title="Workflow Performance" 
              subheader="Revenue and activations by workflow module"
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Workflow Module</TableCell>
                      <TableCell align="right">Activations</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Growth</TableCell>
                      <TableCell align="right">Performance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyticsData.workflowStats.map((workflow) => (
                      <TableRow key={workflow.name} hover>
                        <TableCell component="th" scope="row">
                          <Typography variant="subtitle2">
                            {workflow.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{workflow.activations}</TableCell>
                        <TableCell align="right">
                          ${workflow.revenue.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {workflow.growth > 0 ? (
                              <TrendingUpIcon color="success" fontSize="small" />
                            ) : (
                              <TrendingDownIcon color="error" fontSize="small" />
                            )}
                            <Typography 
                              variant="body2" 
                              color={workflow.growth > 0 ? 'success.main' : 'error.main'}
                              sx={{ ml: 0.5 }}
                            >
                              {Math.abs(workflow.growth)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ width: 100 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((workflow.activations / 25) * 100, 100)}
                              color={workflow.growth > 0 ? 'success' : 'error'}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Recent Activity" subheader="Latest client actions" />
            <CardContent sx={{ pt: 0 }}>
              <List>
                {analyticsData.recentActivity.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar>{activity.user.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.user}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.primary">
                              {activity.action}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {activity.company} • {activity.time}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < analyticsData.recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Growth Trends" subheader="Monthly performance overview" />
            <CardContent>
              <Grid container spacing={2}>
                {analyticsData.monthlyGrowth.slice(-6).map((month, index) => (
                  <Grid item xs={2} key={month.month}>
                    <Paper 
                      variant="outlined" 
                      sx={{ p: 2, textAlign: 'center', bgcolor: index === 5 ? 'primary.light' : 'transparent' }}
                    >
                      <Typography variant="h6" color={index === 5 ? 'primary.contrastText' : 'inherit'}>
                        {month.month}
                      </Typography>
                      <Typography variant="body2" color={index === 5 ? 'primary.contrastText' : 'text.secondary'}>
                        {month.clients} clients
                      </Typography>
                      <Typography variant="body2" color={index === 5 ? 'primary.contrastText' : 'text.secondary'}>
                        ${month.revenue.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color={index === 5 ? 'primary.contrastText' : 'text.secondary'}>
                        {month.workflows} workflows
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};