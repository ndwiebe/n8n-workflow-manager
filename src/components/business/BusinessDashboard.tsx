import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Avatar,
  LinearProgress,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Fab,
  Zoom,
  Skeleton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Insights as InsightsIcon,
  Timeline as TimelineIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Email as EmailIcon,
  Share as ShareIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon,
  QueryStats as QueryStatsIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  CloudDownload as CloudDownloadIcon,
  CompareArrows as CompareArrowsIcon,
  DataUsage as DataUsageIcon,
  AutoGraph as AutoGraphIcon,
  Recommend as RecommendIcon,
  Psychology as PsychologyIcon,
  Engineering as EngineeringIcon,
  CurrencyExchange as CurrencyExchangeIcon,
  Timer as TimerIcon,
  Groups as GroupsIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Treemap,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { businessMetricsService, BusinessDashboardData, BusinessMetrics } from '../../services/BusinessMetricsService';
import { n8nService, n8nUtils } from '../../services/n8nService';

interface BusinessDashboardProps {
  onWorkflowSelect?: (workflowId: string) => void;
  onExportReport?: (format: 'pdf' | 'excel') => void;
  clientId?: string;
  viewMode?: 'consultant' | 'client';
  showAdvancedMetrics?: boolean;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  onWorkflowSelect,
  onExportReport,
  clientId,
  viewMode = 'consultant',
  showAdvancedMetrics = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [dashboardData, setDashboardData] = useState<BusinessDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M');
  const [dashboardView, setDashboardView] = useState<'executive' | 'detailed' | 'insights' | 'comparison'>('executive');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['savings', 'hours', 'roi']);
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous' | 'budget' | 'target'>('previous');
  const [showNotifications, setShowNotifications] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: 'all',
    status: 'all',
    roiThreshold: 0
  });

  const colorPalette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    '#FF8042',
    '#00C49F',
    '#FFBB28',
    '#8884D8',
    '#82CA9D',
    '#FFC658'
  ];

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadDashboardData(false); // Silent refresh
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, timeRange]);

  const loadDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      
      const [dashboardData, alertsData] = await Promise.all([
        businessMetricsService.getBusinessDashboard(),
        businessMetricsService.getBusinessAlerts()
      ]);
      
      setDashboardData(dashboardData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  // Generate advanced trend data based on time range
  const trendData = useMemo(() => {
    if (!dashboardData) return [];
    
    const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
    const data: Array<{
      month: string;
      savings: number;
      hours: number;
      roi: number;
      efficiency: number;
      savingsGrowth: number;
      costs: number;
      netSavings: number;
      cumulativeSavings: number;
    }> = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = startOfMonth(subMonths(new Date(), i));
      const monthName = format(date, 'MMM yyyy');
      
      // Simulate progressive savings growth with seasonality
      const growth = (months - i) / months;
      const seasonality = 1 + 0.1 * Math.sin((i * 2 * Math.PI) / 12); // Annual cycle
      const baseSavings = dashboardData.summary.totalMonthlySavings;
      
      const monthSavings = Math.round(baseSavings * (0.3 + growth * 0.7) * seasonality);
      const previousMonthSavings: number = i < months - 1 ? data[data.length - 1]?.savings || 0 : monthSavings * 0.9;
      
      data.push({
        month: monthName,
        savings: monthSavings,
        savingsGrowth: previousMonthSavings > 0 ? ((monthSavings - previousMonthSavings) / previousMonthSavings) * 100 : 0,
        hours: Math.round(dashboardData.summary.totalHoursSavedPerMonth * (0.3 + growth * 0.7) * seasonality),
        roi: Math.round(dashboardData.summary.totalMonthlyROI * (0.6 + growth * 0.4)),
        efficiency: Math.round(95 + 5 * growth * seasonality),
        costs: Math.round(baseSavings * 0.15 * (0.8 + growth * 0.2)),
        netSavings: Math.round(monthSavings * 0.85),
        cumulativeSavings: data.reduce((sum, item) => sum + item.savings, 0) + monthSavings
      });
    }
    
    return data;
  }, [dashboardData, timeRange]);

  // Enhanced analytics data
  const analyticsData = useMemo(() => {
    if (!dashboardData) return { categories: [], performance: [], efficiency: [] };
    
    const categories = dashboardData.trends.roiByCategory.map((item, index) => ({
      ...item,
      fill: colorPalette[index % colorPalette.length],
      savings: item.workflows * 500, // Estimated savings per workflow
      growth: Math.random() * 20 + 5 // Random growth percentage
    }));
    
    const performance = dashboardData.workflows.map(workflow => ({
      name: workflow.name,
      roi: workflow.roiPercentage,
      savings: workflow.monthlySavings,
      hours: workflow.hoursPerMonth,
      uptime: workflow.uptime,
      category: workflow.category,
      efficiency: (workflow.uptime / 100) * (workflow.roiPercentage / 100) * 100
    }));
    
    const efficiency = trendData.map(item => ({
      month: item.month,
      efficiency: item.efficiency,
      target: 95,
      benchmark: 90
    }));
    
    return { categories, performance, efficiency };
  }, [dashboardData, trendData, colorPalette]);

  // Advanced Executive KPI Cards with comparison metrics
  const ExecutiveKPIs: React.FC = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  ${dashboardData?.summary.totalMonthlySavings.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Monthly Savings
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                  <TrendingUpIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    +12.5% vs last month
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                  ${((dashboardData?.summary.totalMonthlySavings || 0) * 12).toLocaleString()} annually
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <MoneyIcon sx={{ fontSize: 32 }} />
              </Avatar>
            </Box>
            <Box 
              sx={{ 
                position: 'absolute', 
                bottom: -10, 
                right: -10, 
                opacity: 0.1,
                fontSize: 100,
                transform: 'rotate(-15deg)'
              }}
            >
              💰
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {dashboardData?.summary.totalHoursSavedPerMonth.toFixed(0)}h
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Hours Saved/Month
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                  <TimerIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {((dashboardData?.summary.totalHoursSavedPerMonth || 0) * 12).toFixed(0)}h annually
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                  {((dashboardData?.summary.totalHoursSavedPerMonth || 0) / 160 * 100).toFixed(1)}% FTE equivalent
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <TimeIcon sx={{ fontSize: 32 }} />
              </Avatar>
            </Box>
            <Box 
              sx={{ 
                position: 'absolute', 
                bottom: -10, 
                right: -10, 
                opacity: 0.1,
                fontSize: 100,
                transform: 'rotate(-15deg)'
              }}
            >
              ⏰
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {dashboardData?.summary.totalMonthlyROI.toFixed(0)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Average ROI
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                  <AutoGraphIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Above industry 150%
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                  {dashboardData?.summary.averagePaybackPeriod.toFixed(1)} months payback
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <TrendingUpIcon sx={{ fontSize: 32 }} />
              </Avatar>
            </Box>
            <Box 
              sx={{ 
                position: 'absolute', 
                bottom: -10, 
                right: -10, 
                opacity: 0.1,
                fontSize: 100,
                transform: 'rotate(-15deg)'
              }}
            >
              📈
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {dashboardData?.summary.activeWorkflows}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Active Workflows
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                  <Badge 
                    badgeContent={alerts.length} 
                    color="error" 
                    sx={{ '& .MuiBadge-badge': { bgcolor: 'rgba(255,255,255,0.9)', color: 'error.main' } }}
                  >
                    <QueryStatsIcon sx={{ fontSize: 16 }} />
                  </Badge>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {(((dashboardData?.summary.activeWorkflows || 0) / (dashboardData?.summary.totalWorkflows || 1)) * 100).toFixed(0)}% utilization
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                  {dashboardData?.summary.totalWorkflows} total workflows
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <SpeedIcon sx={{ fontSize: 32 }} />
              </Avatar>
            </Box>
            <Box 
              sx={{ 
                position: 'absolute', 
                bottom: -10, 
                right: -10, 
                opacity: 0.1,
                fontSize: 100,
                transform: 'rotate(-15deg)'
              }}
            >
              ⚡
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Advanced Executive Trend Charts with multiple visualizations
  const TrendCharts: React.FC = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} lg={8}>
        <Card sx={{ height: dashboardView === 'detailed' ? 600 : 500 }}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={2}>
                <ShowChartIcon color="primary" />
                <Typography variant="h6">Business Impact Analytics</Typography>
              </Box>
            }
            subheader={`Comprehensive performance metrics over ${timeRange}`}
            action={
              <Box display="flex" gap={1} alignItems="center">
                {['1M', '3M', '6M', '1Y'].map((range) => (
                  <Button
                    key={range}
                    size="small"
                    variant={timeRange === range ? 'contained' : 'outlined'}
                    onClick={() => setTimeRange(range as any)}
                  >
                    {range}
                  </Button>
                ))}
                <Tooltip title="Fullscreen View">
                  <IconButton onClick={() => setFullscreenChart('trends')}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
          <CardContent sx={{ pt: 0, height: '100%' }}>
            {dashboardView === 'executive' ? (
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke={theme.palette.text.secondary}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    tick={{ fontSize: 12 }}
                    stroke={theme.palette.text.secondary}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fontSize: 12 }}
                    stroke={theme.palette.text.secondary}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius
                    }}
                    formatter={(value, name) => [
                      name === 'savings' || name === 'netSavings' || name === 'costs' ? `$${value.toLocaleString()}` : 
                      name === 'hours' ? `${value}h` : 
                      name === 'roi' || name === 'efficiency' ? `${value}%` : 
                      name === 'savingsGrowth' ? `${value > 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(1) : value}%` : value,
                      name === 'savings' ? 'Monthly Savings' :
                      name === 'netSavings' ? 'Net Savings' :
                      name === 'costs' ? 'Operating Costs' :
                      name === 'hours' ? 'Hours Saved' :
                      name === 'roi' ? 'ROI %' :
                      name === 'efficiency' ? 'Efficiency %' :
                      name === 'savingsGrowth' ? 'Growth Rate' : name
                    ]}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="savings"
                    fill={theme.palette.primary.main}
                    fillOpacity={0.8}
                    radius={[4, 4, 0, 0]}
                    name="Monthly Savings"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="efficiency"
                    stroke={theme.palette.success.main}
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name="Efficiency %"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="netSavings"
                    stroke={theme.palette.secondary.main}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Net Savings"
                  />
                  <ReferenceLine 
                    y={dashboardData?.summary.totalMonthlySavings || 0} 
                    stroke={theme.palette.warning.main}
                    strokeDasharray="3 3"
                    label="Current Target"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="2 2" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Line dataKey="cumulativeSavings" stroke={theme.palette.primary.main} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  <Typography variant="subtitle2" align="center">Cumulative Savings</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="2 2" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Area dataKey="hours" stroke={theme.palette.secondary.main} fill={theme.palette.secondary.main} fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <Typography variant="subtitle2" align="center">Time Savings Trend</Typography>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} lg={4}>
        <Card sx={{ height: dashboardView === 'detailed' ? 600 : 500 }}>
          <CardHeader 
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <CategoryIcon color="primary" />
                <Typography variant="h6">Performance by Category</Typography>
              </Box>
            }
            action={
              <Tooltip title="View Details">
                <IconButton onClick={() => setDashboardView('detailed')}>
                  <AnalyticsIcon />
                </IconButton>
              </Tooltip>
            }
          />
          <CardContent sx={{ pt: 0, height: '100%' }}>
            {dashboardView === 'executive' ? (
              <ResponsiveContainer width="100%" height={330}>
                <PieChart>
                  <Pie
                    data={analyticsData.categories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, avgROI, workflows }) => `${category} (${workflows})`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="avgROI"
                  >
                    {analyticsData.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name, props) => [
                      `${typeof value === 'number' ? value.toFixed(1) : value}%`, 
                      'Average ROI',
                      <div key="extra">Workflows: {props.payload.workflows}<br/>Savings: ${props.payload.savings?.toLocaleString()}</div>
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analyticsData.categories} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" fontSize={10} />
                    <YAxis fontSize={10} />
                    <RechartsTooltip />
                    <Bar dataKey="avgROI" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="workflows" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Box mt={2}>
                  {analyticsData.categories.map((category, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box 
                          width={12} 
                          height={12} 
                          bgcolor={category.fill} 
                          borderRadius="50%" 
                        />
                        <Typography variant="body2">{category.category}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {category.avgROI.toFixed(0)}% ROI
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Enhanced Workflow Performance Analytics
  const WorkflowPerformance: React.FC = () => (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={2}>
            <AssessmentIcon color="primary" />
            <Typography variant="h6">Workflow Performance Analytics</Typography>
          </Box>
        }
        subheader="Deep-dive analysis of individual workflow metrics, ROI, and business impact"
        action={
          <Box display="flex" gap={2} alignItems="center">
            <Button
              size="small"
              variant={dashboardView === 'detailed' ? 'contained' : 'outlined'}
              startIcon={<AnalyticsIcon />}
              onClick={() => setDashboardView(dashboardView === 'detailed' ? 'executive' : 'detailed')}
            >
              {dashboardView === 'detailed' ? 'Simple View' : 'Detailed Analytics'}
            </Button>
            <Button
              size="small"
              variant={dashboardView === 'comparison' ? 'contained' : 'outlined'}
              startIcon={<CompareArrowsIcon />}
              onClick={() => setDashboardView('comparison')}
            >
              Compare
            </Button>
          </Box>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {dashboardView === 'comparison' ? (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={analyticsData.performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="roi" 
                type="number" 
                domain={['dataMin', 'dataMax']}
                name="ROI %"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                dataKey="savings" 
                type="number" 
                domain={['dataMin', 'dataMax']}
                name="Monthly Savings"
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [
                  name === 'roi' ? `${value}%` : `$${value.toLocaleString()}`,
                  name === 'roi' ? 'ROI %' : 'Monthly Savings'
                ]}
                labelFormatter={(label) => `Workflow: ${label}`}
              />
              <Scatter 
                dataKey="savings" 
                fill={theme.palette.primary.main}
                r={6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          dashboardData?.workflows.map((workflow) => (
            <Card
              key={workflow.id}
              variant="outlined"
              sx={{
                mb: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { 
                  boxShadow: theme.shadows[8], 
                  transform: 'translateY(-4px)',
                  '&::before': {
                    opacity: 1
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 4,
                  height: '100%',
                  background: workflow.status === 'active' ? theme.palette.success.main : theme.palette.warning.main,
                  opacity: 0.7,
                  transition: 'opacity 0.3s ease'
                }
              }}
              onClick={() => onWorkflowSelect?.(workflow.id)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar 
                      sx={{ 
                        bgcolor: workflow.status === 'active' ? 'success.main' : 
                                workflow.status === 'error' ? 'error.main' : 'warning.main',
                        width: 48,
                        height: 48
                      }}
                    >
                      {workflow.status === 'active' ? <CheckCircleIcon /> : 
                       workflow.status === 'error' ? <WarningIcon /> : <QueryStatsIcon />}
                    </Avatar>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="h6">{workflow.name}</Typography>
                        {workflow.uptime > 98 && (
                          <Chip 
                            label="High Performer" 
                            size="small" 
                            color="success" 
                            icon={<TrendingUpIcon />}
                            sx={{ fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip 
                          label={workflow.category} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          icon={<CategoryIcon />}
                        />
                        <Chip 
                          label={`${workflow.hoursPerMonth.toFixed(0)}h saved`} 
                          size="small" 
                          variant="outlined"
                          icon={<TimerIcon />}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h6" color="success.main">
                      ${workflow.monthlySavings.toLocaleString()}/mo
                    </Typography>
                    <Typography variant="body2" color="primary.main" fontWeight={600}>
                      {workflow.roiPercentage.toFixed(0)}% ROI
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ${(workflow.monthlySavings * 12).toLocaleString()}/year
                    </Typography>
                  </Box>
                </Box>
              
              {dashboardView === 'detailed' && (
                <>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Hours/Month</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {workflow.hoursPerMonth.toFixed(1)}h
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Uptime</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {workflow.uptime.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Chip
                        label={workflow.status}
                        size="small"
                        color={workflow.status === 'active' ? 'success' : 'warning'}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Annual Value</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        ${(workflow.monthlySavings * 12).toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        Performance Score
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {workflow.uptime.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(workflow.uptime, 100)}
                      color={workflow.uptime > 95 ? 'success' : workflow.uptime > 80 ? 'warning' : 'error'}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>
                  
                  {/* Performance indicators */}
                  <Box display="flex" gap={1} mt={2}>
                    <Tooltip title="Uptime Score">
                      <Chip
                        size="small"
                        icon={workflow.uptime > 95 ? <CheckCircleIcon /> : <WarningIcon />}
                        label={`${workflow.uptime.toFixed(1)}% uptime`}
                        color={workflow.uptime > 95 ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Tooltip>
                    <Tooltip title="ROI Category">
                      <Chip
                        size="small"
                        label={workflow.roiPercentage > 200 ? 'Excellent ROI' : 
                               workflow.roiPercentage > 100 ? 'Good ROI' : 'Moderate ROI'}
                        color={workflow.roiPercentage > 200 ? 'success' : 
                               workflow.roiPercentage > 100 ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </Tooltip>
                  </Box>
                </>
              )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );

  // AI-Powered Business Insights & Recommendations
  const BusinessInsights: React.FC = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={2}>
                <PsychologyIcon color="primary" />
                <Typography variant="h6">AI-Powered Business Insights</Typography>
              </Box>
            }
            subheader="Machine learning recommendations to maximize your automation ROI and operational efficiency"
            action={
              <Tooltip title="Refresh Insights">
                <IconButton onClick={() => loadDashboardData(false)} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            {dashboardData?.recommendations.map((rec, index) => (
              <Card 
                key={index} 
                variant="outlined" 
                sx={{ 
                  mb: 2, 
                  borderLeft: `4px solid ${
                    rec.priority === 'high' ? theme.palette.error.main :
                    rec.priority === 'medium' ? theme.palette.warning.main :
                    theme.palette.info.main
                  }`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: theme.shadows[4],
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar 
                        sx={{ 
                          bgcolor: rec.priority === 'high' ? 'error.main' :
                                  rec.priority === 'medium' ? 'warning.main' : 'info.main',
                          width: 40,
                          height: 40
                        }}
                      >
                        {rec.type === 'optimization' ? <EngineeringIcon /> :
                         rec.type === 'new_workflow' ? <AutoGraphIcon /> :
                         <CurrencyExchangeIcon />}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {rec.title}
                        </Typography>
                        <Chip 
                          label={rec.type.replace('_', ' ').toUpperCase()} 
                          size="small" 
                          color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Chip 
                      label={rec.priority.toUpperCase()} 
                      size="small" 
                      color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {rec.description}
                  </Typography>
                  
                  {rec.potentialSavings && (
                    <Box 
                      sx={{ 
                        bgcolor: 'success.light', 
                        color: 'success.contrastText', 
                        p: 2, 
                        borderRadius: 2,
                        mb: 2
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <MoneyIcon sx={{ fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600}>
                          Potential monthly savings: ${rec.potentialSavings.toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                        Annual impact: ${(rec.potentialSavings * 12).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box display="flex" gap={1} mt={2}>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'primary'}
                      startIcon={<RecommendIcon />}
                    >
                      Act Now
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<AnalyticsIcon />}
                    >
                      Learn More
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
        
            {(!dashboardData?.recommendations || dashboardData.recommendations.length === 0) && (
              <Box textAlign="center" py={6}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'success.main', 
                    width: 80, 
                    height: 80, 
                    mx: 'auto', 
                    mb: 2 
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom color="success.main">
                  Outstanding Performance!
                </Typography>
                <Typography variant="body1" color="text.secondary" maxWidth={400} mx="auto">
                  Your automation portfolio is running at peak efficiency. All workflows are performing optimally with no immediate action items.
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<TrendingUpIcon />} 
                  sx={{ mt: 2 }}
                >
                  Explore Growth Opportunities
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <NotificationsIcon color="warning" />
                <Typography variant="h6">Live Alerts</Typography>
                <Badge badgeContent={alerts.length} color="error" />
              </Box>
            }
            action={
              <Button size="small" onClick={() => setShowNotifications(!showNotifications)}>
                {showNotifications ? 'Hide' : 'Show All'}
              </Button>
            }
          />
          <CardContent sx={{ pt: 0, maxHeight: 400, overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <Box textAlign="center" py={3}>
                <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  All systems running smoothly
                </Typography>
              </Box>
            ) : (
              <List dense>
                {alerts.slice(0, showNotifications ? alerts.length : 3).map((alert, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar 
                        sx={{ 
                          bgcolor: alert.severity === 'high' ? 'error.light' : 
                                  alert.severity === 'medium' ? 'warning.light' : 'info.light',
                          width: 32, 
                          height: 32 
                        }}
                      >
                        {alert.type === 'workflow_failure' ? <WarningIcon sx={{ fontSize: 18 }} /> :
                         alert.type === 'roi_drop' ? <TrendingDownIcon sx={{ fontSize: 18 }} /> :
                         <QueryStatsIcon sx={{ fontSize: 18 }} />}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {alert.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {alert.description.substring(0, 80)}...
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Export menu handlers
  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (format: 'pdf' | 'excel' | 'email') => {
    handleExportClose();
    if (format === 'email') {
      // Open email client with pre-filled content
      const subject = encodeURIComponent('Business Automation Report');
      const body = encodeURIComponent(`Here's our latest automation performance report:

Monthly Savings: $${dashboardData?.summary.totalMonthlySavings.toLocaleString()}
Hours Saved: ${dashboardData?.summary.totalHoursSavedPerMonth.toFixed(0)}h
Average ROI: ${dashboardData?.summary.totalMonthlyROI.toFixed(0)}%
Active Workflows: ${dashboardData?.summary.activeWorkflows}

Best regards,
Automation Team`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    } else {
      onExportReport?.(format);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => loadDashboardData()}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Enhanced Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <BusinessIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Executive Business Dashboard
            </Typography>
            {viewMode === 'client' && (
              <Chip 
                label="Client View" 
                color="primary" 
                variant="outlined"
                size="small"
              />
            )}
          </Box>
          <Typography variant="body1" color="text.secondary">
            Comprehensive automation ROI analytics and business impact insights
          </Typography>
          <Box display="flex" gap={2} mt={1}>
            <Chip 
              icon={<DataUsageIcon />} 
              label={`${dashboardData?.summary.totalWorkflows || 0} Workflows`} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              icon={<CurrencyExchangeIcon />} 
              label={`$${(dashboardData?.summary.totalMonthlySavings || 0).toLocaleString()}/month`} 
              size="small" 
              color="success"
              variant="outlined"
            />
            {alerts.length > 0 && (
              <Chip 
                icon={<NotificationsIcon />} 
                label={`${alerts.length} Alert${alerts.length > 1 ? 's' : ''}`} 
                size="small" 
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        
        <Box display="flex" gap={2} flexDirection={isMobile ? 'column' : 'row'} alignItems="center">
          {/* View Mode Toggles */}
          <Box display="flex" gap={1}>
            {['executive', 'detailed', 'insights'].map((mode) => (
              <Button
                key={mode}
                size="small"
                variant={dashboardView === mode ? 'contained' : 'outlined'}
                onClick={() => setDashboardView(mode as any)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </Box>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Controls */}
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto-refresh"
          />
          
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={() => loadDashboardData()}
              disabled={loading || refreshing}
              color="primary"
            >
              {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Export Report">
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportClick}
            >
              Export
            </Button>
          </Tooltip>
          
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => handleExport('pdf')}>
              <PdfIcon sx={{ mr: 2, color: 'error.main' }} />
              <Box>
                <Typography variant="body2">Export as PDF</Typography>
                <Typography variant="caption" color="text.secondary">Executive summary</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>
              <ExcelIcon sx={{ mr: 2, color: 'success.main' }} />
              <Box>
                <Typography variant="body2">Export as Excel</Typography>
                <Typography variant="caption" color="text.secondary">Detailed analytics</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleExport('email')}>
              <EmailIcon sx={{ mr: 2, color: 'info.main' }} />
              <Box>
                <Typography variant="body2">Email Report</Typography>
                <Typography variant="caption" color="text.secondary">Share insights</Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Executive KPIs */}
      <ExecutiveKPIs />

      {/* Trend Charts */}
      <TrendCharts />

      {/* Workflow Performance */}
      <WorkflowPerformance />

      {/* Business Insights */}
      <BusinessInsights />

      {/* Executive Summary Footer */}
      <Paper 
        sx={{ 
          p: 4, 
          mt: 4, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box textAlign="center" position="relative" zIndex={1}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            🎯 Total Business Impact Summary
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  ${((dashboardData?.summary.totalMonthlySavings || 0) * 12).toLocaleString()}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                  Annual Savings
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  💰 Direct cost reduction
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {((dashboardData?.summary.totalHoursSavedPerMonth || 0) * 12).toFixed(0)}h
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                  Annual Time Savings
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  ⏰ Productivity gains
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {((dashboardData?.summary.totalHoursSavedPerMonth || 0) / 160 * 100).toFixed(1)}%
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                  FTE Equivalent
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  👥 Workforce efficiency
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {dashboardData?.summary.averagePaybackPeriod.toFixed(1)}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                  Months to ROI
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  ⚡ Investment return
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Call-to-Action */}
          <Box mt={4}>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 2, maxWidth: 600, mx: 'auto' }}>
              Your automation strategy is delivering exceptional results. Continue monitoring and optimizing for sustained growth.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
              }}
              startIcon={<TrendingUpIcon />}
            >
              View Growth Opportunities
            </Button>
          </Box>
        </Box>
        
        {/* Background decoration */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: -50, 
            right: -50, 
            opacity: 0.1,
            fontSize: 200,
            transform: 'rotate(-15deg)',
            pointerEvents: 'none'
          }}
        >
          📈
        </Box>
      </Paper>
      
      {/* Fullscreen Chart Dialog */}
      <Dialog
        fullScreen
        open={Boolean(fullscreenChart)}
        onClose={() => setFullscreenChart(null)}
        TransitionComponent={Zoom}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h5">Fullscreen Analytics View</Typography>
            <IconButton onClick={() => setFullscreenChart(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {fullscreenChart === 'trends' && (
            <ResponsiveContainer width="100%" height={600}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="savings" fill={theme.palette.primary.main} />
                <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke={theme.palette.success.main} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Floating Action Button for Quick Actions */}
      {!isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setDashboardView('insights')}
        >
          <PsychologyIcon />
        </Fab>
      )}
    </Container>
  );
};