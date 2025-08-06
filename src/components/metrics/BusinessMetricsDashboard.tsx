import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { WorkflowConfiguration } from '../../types';

interface BusinessMetricsDashboardProps {
  configurations: WorkflowConfiguration[];
}

export const BusinessMetricsDashboard: React.FC<BusinessMetricsDashboardProps> = ({
  configurations
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate business metrics
  const activeConfigs = configurations.filter(c => c.status === 'active');
  const totalConfigs = configurations.length;
  
  // Simulated business impact calculations (in a real app, these would come from actual tracking)
  const hoursPerWeekSaved = activeConfigs.length * 8; // Estimate 8 hours per active automation
  const hourlyRate = 25; // Average SMB hourly rate
  const weeklySavings = hoursPerWeekSaved * hourlyRate;
  const monthlySavings = weeklySavings * 4.33; // Average weeks per month
  const yearlySavings = monthlySavings * 12;
  
  const tasksAutomated = activeConfigs.length * 150; // Estimate tasks per automation
  const successRate = activeConfigs.length > 0 ? 96 : 0; // High success rate for active automations
  const efficiencyGain = Math.min(activeConfigs.length * 15, 85); // Max 85% efficiency gain

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    color: 'primary' | 'success' | 'info' | 'warning';
    progress?: number;
  }> = ({ title, value, subtitle, icon, color, progress }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
              {title}
            </Typography>
            <Typography variant="h4" color={`${color}.main`} sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          </Box>
          <Box color={`${color}.main`} sx={{ ml: 1 }}>
            {icon}
          </Box>
        </Box>
        {progress !== undefined && (
          <Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              color={color}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {progress}% efficiency gain
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" />
          Business Impact Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track your automation ROI and business efficiency gains in real-time
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Time Saved */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Time Saved"
            value={`${hoursPerWeekSaved}h`}
            subtitle="per week"
            icon={<ScheduleIcon sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="info"
            progress={efficiencyGain}
          />
        </Grid>

        {/* Cost Savings */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Monthly Savings"
            value={`$${monthlySavings.toLocaleString()}`}
            subtitle={`$${yearlySavings.toLocaleString()} annually`}
            icon={<AttachMoneyIcon sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="success"
          />
        </Grid>

        {/* Tasks Automated */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Tasks Automated"
            value={tasksAutomated.toLocaleString()}
            subtitle="this month"
            icon={<AssignmentIcon sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="primary"
          />
        </Grid>

        {/* Success Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Success Rate"
            value={`${successRate}%`}
            subtitle="reliability score"
            icon={<CheckCircleIcon sx={{ fontSize: { xs: 28, md: 32 } }} />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Additional Insights */}
      {activeConfigs.length > 0 && (
        <Box mt={4}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpeedIcon color="primary" />
            Automation Insights
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {hoursPerWeekSaved >= 20 && (
                  <Chip 
                    label="High Impact Automations" 
                    color="success" 
                    size="small" 
                    icon={<TrendingUpIcon />}
                  />
                )}
                {successRate >= 95 && (
                  <Chip 
                    label="Excellent Reliability" 
                    color="primary" 
                    size="small" 
                    icon={<CheckCircleIcon />}
                  />
                )}
                {activeConfigs.length >= 5 && (
                  <Chip 
                    label="Automation Leader" 
                    color="warning" 
                    size="small" 
                    icon={<SpeedIcon />}
                  />
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                💡 <strong>Pro Tip:</strong> Add 2 more automations to reach the next efficiency tier
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Getting Started Message */}
      {activeConfigs.length === 0 && (
        <Box mt={4}>
          <Divider sx={{ mb: 3 }} />
          <Box textAlign="center" py={2}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Ready to Start Saving Time and Money?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure your first automation below to begin tracking your business impact
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};