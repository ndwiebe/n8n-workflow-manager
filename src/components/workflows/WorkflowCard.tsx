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
  ListItemText
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Api as ApiIcon
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

const statusLabels = {
  active: 'Active',
  scheduled: 'Scheduled for activation',
  configuring: 'Configuration needed',
  error: 'Error',
  pending: 'Not configured',
  validating: 'Validating credentials'
};

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  module,
  configuration,
  onToggle,
  onConfigure
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const isActive = configuration?.status === 'active';
  const isScheduled = configuration?.status === 'scheduled';
  const isConfigured = configuration && configuration.status !== 'pending';

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (!isConfigured) {
      return;
    }
    onToggle(event.target.checked);
  };

  return (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {module.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {module.description}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {configuration && (
              <Tooltip title={statusLabels[configuration.status]}>
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

        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip label={module.category} size="small" color="primary" variant="outlined" />
          {module.monthlyPrice && (
            <Chip label={`$${module.monthlyPrice}/month`} size="small" color="secondary" variant="outlined" />
          )}
          <Chip label={`Setup: ${module.estimatedSetupTime}`} size="small" variant="outlined" />
        </Box>

        {isScheduled && configuration?.scheduledActivation && (
          <Box sx={{ p: 1.5, bgcolor: 'info.light', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" color="info.contrastText">
              Will be activated on: {new Date(configuration.scheduledActivation).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        <Collapse in={expanded}>
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Features:
            </Typography>
            <List dense>
              {module.features.map((feature, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              External Tools & APIs:
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {module.externalTools.map((tool, index) => (
                <Chip
                  key={index}
                  label={tool}
                  size="small"
                  icon={<ApiIcon />}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </Collapse>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {expanded ? 'Show Less' : 'Show More'}
        </Button>
        
        <Button
          variant={isConfigured ? 'outlined' : 'contained'}
          size="small"
          onClick={onConfigure}
          startIcon={<SettingsIcon />}
        >
          {isConfigured ? 'Reconfigure' : 'Configure'}
        </Button>
      </CardActions>
    </Card>
  );
};