import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  Business as BusinessIcon,
  CalendarToday as CalendarTodayIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { format, startOfMonth, subMonths } from 'date-fns';
import { businessMetricsService, BusinessDashboardData, WorkflowBusinessMetrics } from '../../services/BusinessMetricsService';

interface ClientPerformanceReportProps {
  clientId?: string;
  clientName?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  onExport?: (format: 'pdf' | 'excel' | 'email') => void;
  reportType?: 'executive' | 'detailed' | 'technical';
  showSensitiveData?: boolean;
  consultantName?: string;
  companyLogo?: string;
}

export const ClientPerformanceReport: React.FC<ClientPerformanceReportProps> = ({
  clientId,
  clientName = 'Valued Client',
  dateRange,
  onExport,
  reportType = 'executive',
  showSensitiveData = true,
  consultantName = 'Your Automation Consultant',
  companyLogo
}) => {
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState<BusinessDashboardData | null>(null);
  const [workflowDetails, setWorkflowDetails] = useState<WorkflowBusinessMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary']);
  const [showComparisons, setShowComparisons] = useState(false);

  const reportGenerated = new Date();
  const colorPalette = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#00796b'];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dashboard = await businessMetricsService.getBusinessDashboard();
        setDashboardData(dashboard);
        
        // Convert dashboard workflow data to detailed metrics
        const workflowDetails = dashboard.workflows.map(w => ({
          workflowId: w.id,
          workflowName: w.name,
          businessCategory: w.category,
          roi: {
            timeToValue: 30,
            monthlySavings: w.monthlySavings,
            implementationCost: 500,
            monthlyOperatingCost: 20,
            roiPercentage: w.roiPercentage,
            paybackPeriod: 12
          },
          timeSavings: {
            manualTimePerTask: 15,
            automatedTimePerTask: 1,
            taskFrequency: 'daily',
            tasksPerPeriod: w.hoursPerMonth || 10,
            totalMonthlySavings: w.monthlySavings,
            hourlyRate: 25
          },
          performance: {
            totalExecutions: 100,
            successfulExecutions: 95,
            failedExecutions: 5,
            averageExecutionTime: 2.5,
            uptime: w.uptime,
            lastExecution: new Date().toISOString()
          },
          costs: {
            monthlyN8nCost: 20,
            monthlyIntegrationCosts: 10,
            monthlyMaintenanceCost: 5,
            totalMonthlyCost: 35
          },
          impact: {
            employeesAffected: 5,
            departmentsAffected: [w.category],
            processesAutomated: 3,
            errorReduction: 85
          },
          recommendations: [],
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        setWorkflowDetails(workflowDetails);
      } catch (err) {
        setError('Failed to load performance data');
        console.error('Performance report error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId, dateRange]);

  // Performance trends (simplified)
  const performanceTrends = React.useMemo(() => {
    if (!dashboardData) return [];
    
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = startOfMonth(subMonths(new Date(), i));
      const monthName = format(date, 'MMM yyyy');
      months.push({
        month: monthName,
        savings: Math.round(2000 + (i * 200) + (Math.random() * 500)),
        hours: Math.round(15 + (i * 2) + (Math.random() * 5)),
        workflows: Math.round(3 + (i * 0.5)),
        efficiency: Math.round(70 + (i * 2) + (Math.random() * 10))
      });
    }
    return months;
  }, [dashboardData]);

  // Category performance data (simplified)
  const categoryPerformance = React.useMemo(() => {
    if (!dashboardData) return [];
    
    return [
      { category: 'Finance', workflows: 5, avgROI: 180, fill: colorPalette[0] },
      { category: 'Marketing', workflows: 3, avgROI: 150, fill: colorPalette[1] },
      { category: 'Operations', workflows: 4, avgROI: 120, fill: colorPalette[2] },
      { category: 'Sales', workflows: 2, avgROI: 200, fill: colorPalette[3] }
    ];
  }, [dashboardData]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '300px' }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Card 
        sx={{ 
          mb: 4, 
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={2}>
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" style={{ height: 32, width: 32 }} />
            ) : (
              <BusinessIcon color="inherit" sx={{ fontSize: 32 }} />
            )}
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              Executive Summary for {clientName}
            </Typography>
          </Box>
          
          <Box mt={1}>
            <Typography variant="body2" sx={{ opacity: 0.9 }} gutterBottom>
              Performance Report | {format(reportGenerated, 'PPPP')}
            </Typography>
            <Box display="flex" gap={2} mt={1}>
              <Chip 
                icon={<CalendarTodayIcon />} 
                label={`${format(dateRange?.start || subMonths(new Date(), 12), 'MMM yyyy')} - ${format(dateRange?.end || new Date(), 'MMM yyyy')}`}
                size="small"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              />
              <Chip 
                icon={<GroupIcon />} 
                label={`Prepared by ${consultantName}`}
                size="small"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" gutterBottom>
                ${dashboardData?.summary.totalMonthlySavings?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly Savings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main" gutterBottom>
                {dashboardData?.summary.totalHoursSavedPerMonth || 0}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hours Saved Monthly
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main" gutterBottom>
                {dashboardData?.summary.activeWorkflows || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Workflows
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {dashboardData?.summary.totalMonthlyROI || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average ROI
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Key Insights */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Key Performance Highlights
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body1" gutterBottom>
                  <strong>Cost Reduction:</strong> Your automation portfolio has achieved a {dashboardData?.summary.totalMonthlyROI || 150}% ROI, 
                  saving ${(dashboardData?.summary.totalMonthlySavings || 0) * 12} annually.
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Time Efficiency:</strong> Automation has freed up {dashboardData?.summary.totalHoursSavedPerMonth || 0} hours per month, 
                  equivalent to {Math.round((dashboardData?.summary.totalHoursSavedPerMonth || 0) / 40)} weeks of full-time work annually.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body1" gutterBottom>
                  <strong>Process Optimization:</strong> {dashboardData?.summary.activeWorkflows || 0} workflows are actively 
                  streamlining your business operations with {dashboardData?.summary.efficiencyScore || 85}% efficiency.
                </Typography>
                <Typography variant="body1">
                  <strong>Strategic Impact:</strong> Your automation maturity level is {dashboardData?.summary.automationMaturity || 'Advanced'}, 
                  positioning you ahead of industry standards.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Strategic Recommendations
          </Typography>
          <Grid container spacing={2}>
            {dashboardData?.recommendations?.map((rec, index) => (
              <Grid item xs={12} key={index}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    mb: 2, 
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    '&:hover': { boxShadow: 2 }
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      {rec.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {rec.description}
                    </Typography>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip 
                        label={rec.priority} 
                        size="small" 
                        color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                      />
                      <Typography variant="caption">
                        Impact: ${rec.potentialSavings || 500}/month | Priority: {rec.priority}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )) || (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  No specific recommendations at this time. Your automation portfolio is performing well.
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};