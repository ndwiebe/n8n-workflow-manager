import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Button,
  Switch,
  FormControlLabel,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Paper,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Api as ApiIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Speed as SpeedIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { WorkflowModule, WorkflowConfiguration } from '../../types';

interface WorkflowCardProps {
  module: WorkflowModule;
  configuration?: WorkflowConfiguration;
  onToggle: (enabled: boolean) => void;
  onConfigure: () => void;
}

const statusIcons = {
  active: <CheckCircleIcon color="success" />,
  scheduled: <ScheduleIcon color="info" />,
  configuring: <SettingsIcon color="warning" />,
  error: <ErrorIcon color="error" />,
  pending: <InfoIcon color="disabled" />,
  validating: <ScheduleIcon color="info" />
};

const businessStatusLabels = {
  active: 'Actively Saving Time & Money',
  scheduled: 'Scheduled to Launch',
  configuring: 'Setup Required',
  error: 'Needs Attention',
  pending: 'Ready to Configure',
  validating: 'Finalizing Setup'
};

const businessStatusColors = {
  active: 'success',
  scheduled: 'info',
  configuring: 'warning',
  error: 'error',
  pending: 'default',
  validating: 'info'
} as const;

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  module,
  configuration,
  onToggle,
  onConfigure
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = React.useState(false);
  
  const isActive = configuration?.status === 'active';
  const isScheduled = configuration?.status === 'scheduled';
  const isConfigured = configuration && configuration.status !== 'pending';

  // Calculate business impact metrics (simulated based on workflow type)
  const estimatedHoursSavedPerWeek = isActive ? 8 : 0; // 8 hours per week when active
  const hourlyRate = 25; // Average SMB hourly rate
  const weeklySavings = estimatedHoursSavedPerWeek * hourlyRate;
  const monthlySavings = weeklySavings * 4.33;
  const roi = module.monthlyPrice ? Math.round(((monthlySavings - module.monthlyPrice) / module.monthlyPrice) * 100) : 0;

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (!isConfigured) {
      return;
    }
    onToggle(event.target.checked);
  };

  const getBusinessCategory = (category: string) => {
    const categoryMap: Record<string, string> = {
      'productivity': 'Productivity Booster',
      'communication': 'Communication Hub',
      'data': 'Data Intelligence',
      'sales': 'Sales Accelerator',
      'marketing': 'Marketing Automation',
      'finance': 'Financial Operations',
      'hr': 'HR Management',
      'crm': 'Customer Relations'
    };
    return categoryMap[category.toLowerCase()] || category;
  };

  return (
    <Card sx={{ 
      mb: 2, 
      position: 'relative', 
      overflow: 'visible',
      '&:hover': {
        boxShadow: theme.shadows[8],
        transform: 'translateY(-2px)',
        transition: 'all 0.2s ease-in-out'
      }
    }}>
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
              {module.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              {module.description}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {configuration && (
              <Tooltip title={businessStatusLabels[configuration.status]}>
                <Box>{statusIcons[configuration.status]}</Box>
              </Tooltip>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={isActive || isScheduled}
                  onChange={handleToggle}
                  disabled={!isConfigured}
                />
              }
              label=""
            />
          </Box>
        </Box>

        {/* Status Indicator */}
        {configuration && (
          <Box mb={2}>
            <Chip 
              label={businessStatusLabels[configuration.status]}
              color={businessStatusColors[configuration.status]}
              size="small"
              variant={isActive ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500 }}
            />
          </Box>
        )}

        {/* Business Impact Metrics */}
        {isActive && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <AccessTimeIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {estimatedHoursSavedPerWeek}h saved/week
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <AttachMoneyIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${monthlySavings.toLocaleString()}/month saved
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                {roi > 0 && (
                  <Box textAlign={{ xs: 'left', sm: 'right' }}>
                    <Chip 
                      label={`${roi}% ROI`}
                      color={roi >= 100 ? 'success' : 'warning'}
                      size="small"
                      icon={<TrendingUpIcon />}
                      sx={{ bgcolor: 'white', color: 'success.main', fontWeight: 600 }}
                    />
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Category and Pricing */}
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip 
            label={getBusinessCategory(module.category)} 
            size="small" 
            color="primary" 
            variant="outlined" 
            sx={{ fontWeight: 500 }}
          />
          {module.monthlyPrice && (
            <Chip 
              label={`$${module.monthlyPrice}/month`} 
              size="small" 
              color="secondary" 
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
          <Chip 
            label={`${module.estimatedSetupTime} setup`} 
            size="small" 
            variant="outlined"
          />
        </Box>

        {/* Scheduled Activation Alert */}
        {isScheduled && configuration?.scheduledActivation && (
          <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText', mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <ScheduleIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Launching: {new Date(configuration.scheduledActivation).toLocaleDateString()}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Expandable Business Details */}
        <Collapse in={expanded}>
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              🚀 Business Benefits:
            </Typography>
            <List dense>
              {module.features.map((feature, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={feature} 
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </ListItem>
              ))}
            </List>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 600, color: 'secondary.main' }}>
              🔗 Integrations & Tools:
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {module.externalTools.map((tool, index) => (
                <Chip
                  key={index}
                  label={tool}
                  size="small"
                  icon={<ApiIcon />}
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>

            {/* ROI Projection for inactive automations */}
            {!isActive && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  💰 Potential Business Impact:
                </Typography>
                <Typography variant="body2">
                  Could save ~8 hours/week and $830/month when activated
                </Typography>
                {module.monthlyPrice && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Projected ROI: ~{Math.round(((830 - module.monthlyPrice) / module.monthlyPrice) * 100)}%
                  </Typography>
                )}
              </Paper>
            )}
          </Box>
        </Collapse>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ textTransform: 'none' }}
        >
          {expanded ? 'Show Less' : 'Business Details'}
        </Button>
        
        <Button
          variant={isConfigured ? 'outlined' : 'contained'}
          size="small"
          onClick={onConfigure}
          startIcon={<SettingsIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {isConfigured ? 'Manage' : 'Get Started'}
        </Button>
      </CardActions>
    </Card>
  );
};