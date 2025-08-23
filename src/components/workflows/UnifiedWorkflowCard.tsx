/**
 * UnifiedWorkflowCard Component
 * Displays both workflow templates and live n8n workflows with unified UX
 * Handles template → configuring → live workflow state transitions
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Box,
  Grid,
  Tooltip,
  Skeleton,
  Button,
  LinearProgress,
  Paper,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Refresh,
  Settings,
  ExpandMore,
  CheckCircle,
  Warning,
  Error,
  PauseCircle,
  Schedule,
  TrendingUp,
  AttachMoney,
  AccessTime,
  Api,
  GetApp,
  Chat as ChatIcon,
  Assignment as FormIcon,
  Dashboard as MonitorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { UnifiedWorkflowData } from '../../services/unifiedWorkflowService';
import { EmbeddedWorkflowInterface } from '../interactions/EmbeddedWorkflowInterface';

interface UnifiedWorkflowCardProps {
  workflow: UnifiedWorkflowData;
  onActionClick?: (workflowId: string, action: string) => Promise<void>;
  onConfigure?: (workflowId: string) => void;
  onToggleActive?: (workflowId: string, active: boolean) => Promise<void>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isLoading?: boolean;
}

const UnifiedWorkflowCard: React.FC<UnifiedWorkflowCardProps> = ({
  workflow,
  onActionClick,
  onConfigure,
  onToggleActive,
  isExpanded = false,
  onToggleExpand,
  isLoading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);

  // Determine workflow state
  const isTemplate = workflow.type === 'template';
  const isLive = workflow.type === 'live';
  const isConfiguring = workflow.configuration?.status === 'configuring';
  const isScheduled = workflow.configuration?.status === 'scheduled';
  const isActive = workflow.isActive;
  const isPaused = !workflow.isActive && isLive;

  const getHealthIcon = (status?: string) => {
    if (isTemplate) return <GetApp sx={{ color: theme.palette.primary.main }} />;
    if (isConfiguring) return <Settings sx={{ color: theme.palette.warning.main }} />;
    if (isScheduled) return <Schedule sx={{ color: theme.palette.info.main }} />;
    
    switch (status || 'inactive') {
      case 'healthy':
        return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'warning':
        return <Warning sx={{ color: theme.palette.warning.main }} />;
      case 'critical':
        return <Error sx={{ color: theme.palette.error.main }} />;
      case 'inactive':
        return <PauseCircle sx={{ color: theme.palette.grey[500] }} />;
      default:
        return <CheckCircle sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  const getHealthColor = (status?: string) => {
    if (isTemplate) return theme.palette.primary.main;
    if (isConfiguring) return theme.palette.warning.main;
    if (isScheduled) return theme.palette.info.main;
    
    switch (status || 'inactive') {
      case 'healthy':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'critical':
        return theme.palette.error.main;
      case 'inactive':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusText = () => {
    if (isTemplate) return 'Available Template';
    if (isConfiguring) return 'Setting Up';
    if (isScheduled) return 'Scheduled';
    if (isActive) return 'Running Smoothly';
    if (isPaused) return 'Paused';
    return 'Unknown';
  };

  const handleActionClick = async (action: string) => {
    if (!onActionClick) return;
    
    setActionLoading(action);
    try {
      await onActionClick(workflow.id, action);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfigure = () => {
    if (onConfigure) {
      onConfigure(workflow.id);
    }
  };

  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onToggleActive) {
      await onToggleActive(workflow.id, event.target.checked);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'pause':
        return <Pause />;
      case 'resume':
        return <PlayArrow />;
      case 'restart':
        return <Refresh />;
      case 'configure':
        return <Settings />;
      case 'interact':
        return <ChatIcon />;
      default:
        return <Settings />;
    }
  };

  // Check if workflow supports embedded interactions
  const supportsInteraction = () => {
    if (!isLive) return false;
    
    // Check if workflow name suggests interaction capabilities
    const name = workflow.name.toLowerCase();
    const description = workflow.description.toLowerCase();
    
    return name.includes('chat') || name.includes('assistant') || name.includes('form') || 
           name.includes('feedback') || name.includes('analytics') || name.includes('dashboard') ||
           description.includes('chat') || description.includes('form') || description.includes('feedback');
  };

  const handleInteractionClick = () => {
    setInteractionDialogOpen(true);
  };

  const handleInteractionClose = () => {
    setInteractionDialogOpen(false);
  };

  const handleInteractionComplete = (result: any) => {
    console.log('Interaction completed:', result);
    // Could show a success toast or update workflow metrics
  };

  const formatExecutionTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (isLoading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        mb: 2,
        borderLeft: `4px solid ${getHealthColor(workflow.healthStatus)}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-1px)'
        }
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header with status and toggle */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            {getHealthIcon(workflow.healthStatus)}
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              {workflow.businessName}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={getStatusText()}
              size="small"
              sx={{
                backgroundColor: `${getHealthColor(workflow.healthStatus)}20`,
                color: getHealthColor(workflow.healthStatus),
                fontWeight: 500
              }}
            />
            
            {/* Toggle switch for live workflows */}
            {isLive && onToggleActive && (
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={handleToggle}
                    size="small"
                  />
                }
                label=""
              />
            )}
          </Box>
        </Box>

        {/* Description and category */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {workflow.description}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip 
            label={workflow.category} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
          {workflow.template?.monthlyPrice && workflow.template.monthlyPrice > 0 && (
            <Chip 
              label={`$${workflow.template.monthlyPrice}/month`} 
              size="small" 
              color="secondary" 
              variant="outlined"
            />
          )}
          {workflow.template?.estimatedSetupTime && (
            <Chip 
              label={`${workflow.template.estimatedSetupTime} setup`} 
              size="small" 
              variant="outlined"
            />
          )}
        </Box>

        {/* Configuration progress bar */}
        {isConfiguring && workflow.configuration?.progress !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary">
                Setup Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {workflow.configuration.progress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={workflow.configuration.progress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Scheduled activation alert */}
        {isScheduled && workflow.configuration?.scheduledActivation && (
          <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText', mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Launching: {workflow.configuration.scheduledActivation.toLocaleDateString()}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Last execution info for live workflows */}
        {workflow.lastExecution && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Last execution: {workflow.lastExecution.time.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {workflow.lastExecution.businessImpact}
            </Typography>
          </Box>
        )}

        {/* Business Impact Metrics */}
        {(isActive || isTemplate) && (
          <Paper sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: isActive ? 'success.light' : 'primary.light', 
            color: isActive ? 'success.contrastText' : 'primary.contrastText' 
          }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <AccessTime fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {workflow.businessMetrics.timeSavedPerWeek}h saved/week
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <AttachMoney fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${workflow.businessMetrics.monthlySavings.toLocaleString()}/month
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                {workflow.businessMetrics.roi > 0 && (
                  <Box textAlign={{ xs: 'left', sm: 'right' }}>
                    <Chip 
                      label={`${workflow.businessMetrics.roi}% ROI`}
                      color={workflow.businessMetrics.roi >= 100 ? 'success' : 'warning'}
                      size="small"
                      icon={<TrendingUp />}
                      sx={{ bgcolor: 'white', fontWeight: 600 }}
                    />
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Live workflow metrics */}
        {isLive && (
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Today
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {workflow.metrics.executionsToday}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Success Rate
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {workflow.metrics.successRate}%
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Avg Time
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {formatExecutionTime(workflow.metrics.avgExecutionTime)}
              </Typography>
            </Grid>
          </Grid>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
          <Box display="flex" gap={1}>
            {/* Template: Show configure button */}
            {isTemplate && (
              <Button
                variant="contained"
                size="small"
                onClick={handleConfigure}
                startIcon={<Settings />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Get Started
              </Button>
            )}
            
            {/* Live workflow: Show action buttons */}
            {isLive && workflow.quickActions && (
              <>
                {workflow.quickActions.slice(0, isMobile ? 1 : 2).map((action) => (
                  <Tooltip key={action} title={action.charAt(0).toUpperCase() + action.slice(1)}>
                    <IconButton
                      size={isMobile ? "medium" : "small"}
                      onClick={() => handleActionClick(action)}
                      disabled={actionLoading !== null}
                      sx={{
                        minWidth: 44,
                        minHeight: 44,
                        backgroundColor: theme.palette.primary.main + '10',
                        '&:hover': {
                          backgroundColor: theme.palette.primary.main + '20',
                        }
                      }}
                    >
                      {getActionIcon(action)}
                    </IconButton>
                  </Tooltip>
                ))}
                
                {/* Add interaction button for supported workflows */}
                {supportsInteraction() && (
                  <Tooltip title="Interact with Workflow">
                    <IconButton
                      size={isMobile ? "medium" : "small"}
                      onClick={handleInteractionClick}
                      sx={{
                        minWidth: 44,
                        minHeight: 44,
                        backgroundColor: theme.palette.secondary.main + '15',
                        color: theme.palette.secondary.main,
                        '&:hover': {
                          backgroundColor: theme.palette.secondary.main + '25',
                        }
                      }}
                    >
                      <ChatIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
            
            {/* Configuring: Show manage button */}
            {isConfiguring && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleConfigure}
                startIcon={<Settings />}
                sx={{ textTransform: 'none' }}
              >
                Manage Setup
              </Button>
            )}
          </Box>

          {/* Expand button */}
          {onToggleExpand && (
            <IconButton
              onClick={onToggleExpand}
              sx={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out',
                minWidth: 44,
                minHeight: 44
              }}
            >
              <ExpandMore />
            </IconButton>
          )}
        </Box>
      </CardActions>

      {/* Expandable details section */}
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 0, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" gutterBottom>
            {isTemplate ? 'Template Details' : 'Workflow Information'}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                {isTemplate ? 'Template ID' : 'Workflow ID'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {workflow.id}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body2">
                {getStatusText()}
              </Typography>
            </Grid>
          </Grid>

          {/* Template features */}
          {workflow.template?.features && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Features & Benefits
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {workflow.template.features.map((feature: string, index: number) => (
                  <Chip
                    key={index}
                    label={feature}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Template integrations */}
          {workflow.template?.externalTools && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Integrations
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {workflow.template.externalTools.map((tool: string, index: number) => (
                  <Chip
                    key={index}
                    label={tool}
                    size="small"
                    icon={<Api />}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Live workflow additional actions */}
          {isLive && workflow.quickActions && workflow.quickActions.length > 3 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Additional Actions
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {workflow.quickActions.slice(3).map((action) => (
                  <Chip
                    key={action}
                    label={action.charAt(0).toUpperCase() + action.slice(1)}
                    size="small"
                    onClick={() => handleActionClick(action)}
                    clickable
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Collapse>

      {/* Embedded Workflow Interaction Dialog */}
      <Dialog 
        open={interactionDialogOpen} 
        onClose={handleInteractionClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '60vh',
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1 
        }}>
          <Box>
            <Typography variant="h6">
              Interact with {workflow.businessName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {workflow.description}
            </Typography>
          </Box>
          <IconButton onClick={handleInteractionClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {interactionDialogOpen && (
            <EmbeddedWorkflowInterface
              workflow={workflow}
              isActive={isActive}
              onInteractionComplete={handleInteractionComplete}
              onClose={handleInteractionClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UnifiedWorkflowCard;