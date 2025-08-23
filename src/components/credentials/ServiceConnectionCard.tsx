/**
 * Service Connection Card Component
 * Displays business-friendly service connection status with visual indicators
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Collapse,
  Grid,
  Avatar,
  Badge,
  Dialog
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  Launch as LaunchIcon,
  VpnKey as VpnKeyIcon,
  Refresh as RefreshIcon,
  // TestTube as TestTubeIcon, // Not available in MUI icons
  // Service Icons
  Chat as ChatIcon,
  Email as EmailIcon,
  Contacts as ContactsIcon,
  Store as StoreIcon,
  Business as BusinessIcon,
  Cloud as CloudIcon,
  AccountBalance as AccountBalanceIcon,
  Dashboard as DashboardIcon,
  Api as ApiIcon,
  Webhook as WebhookIcon,
  Assignment as AssignmentIcon,
  ShoppingCart as ShoppingCartIcon,
  Folder as FolderIcon,
  Groups as GroupsIcon,
  Mail as MailIcon
} from '@mui/icons-material';
import {
  ServiceConnectionCard as ServiceConnectionCardType,
  ConnectionStatus,
  ServiceCategory,
  OAuthServiceConnectionCard,
  OAuthConnectionResult
} from '../../types/smartCredentials';
import { OAuthFlowManager } from './OAuthFlowManager';
import { GuidedSetupWizard } from './GuidedSetupWizard';

interface ServiceConnectionCardProps {
  service: ServiceConnectionCardType | OAuthServiceConnectionCard;
  onConnect: (serviceId: string) => void;
  onTest: (serviceId: string) => void;
  onConfigure: (serviceId: string) => void;
  onShowHelp: (serviceId: string) => void;
  onOAuthConnectionComplete?: (serviceId: string, result: OAuthConnectionResult) => void;
  onSetupComplete?: (serviceId: string, success: boolean) => void;
  onEscalate?: (serviceId: string, reason: string) => void;
  isLoading?: boolean;
  showBusinessValue?: boolean;
  compact?: boolean;
  workflowId?: string;
  userId?: string;
  enableGuidedSetup?: boolean;
}

export const ServiceConnectionCard: React.FC<ServiceConnectionCardProps> = ({
  service,
  onConnect,
  onTest,
  onConfigure,
  onShowHelp,
  onOAuthConnectionComplete,
  onSetupComplete,
  onEscalate,
  isLoading = false,
  showBusinessValue = true,
  compact = false,
  workflowId = '',
  userId = '',
  enableGuidedSetup = true
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [showGuidedSetup, setShowGuidedSetup] = useState(false);

  const getStatusColor = (status: ConnectionStatus): 'success' | 'error' | 'warning' | 'info' | 'primary' => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'success';
      case ConnectionStatus.FAILED:
      case ConnectionStatus.EXPIRED:
        return 'error';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.TESTING:
        return 'info';
      case ConnectionStatus.DISCONNECTED:
      default:
        return 'primary';
    }
  };

  const getChipColor = (status: ConnectionStatus): 'success' | 'error' | 'warning' | 'info' | 'default' | 'primary' | 'secondary' => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'success';
      case ConnectionStatus.FAILED:
      case ConnectionStatus.EXPIRED:
        return 'error';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.TESTING:
        return 'info';
      case ConnectionStatus.DISCONNECTED:
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return <CheckCircleIcon />;
      case ConnectionStatus.FAILED:
      case ConnectionStatus.EXPIRED:
        return <ErrorIcon />;
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.TESTING:
        return <ScheduleIcon />;
      case ConnectionStatus.DISCONNECTED:
      default:
        return <WarningIcon />;
    }
  };

  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'Connected';
      case ConnectionStatus.CONNECTING:
        return 'Connecting...';
      case ConnectionStatus.TESTING:
        return 'Testing...';
      case ConnectionStatus.FAILED:
        return 'Connection Failed';
      case ConnectionStatus.EXPIRED:
        return 'Credentials Expired';
      case ConnectionStatus.DISCONNECTED:
      default:
        return 'Not Connected';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
      default:
        return 'default';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'complex':
        return 'error';
      default:
        return 'default';
    }
  };

  const getServiceIcon = (category: ServiceCategory, iconName?: string) => {
    // Map service categories to appropriate Material-UI icons
    switch (category) {
      case ServiceCategory.COMMUNICATION:
        return iconName === 'ChatIcon' ? <ChatIcon /> : <GroupsIcon />;
      case ServiceCategory.EMAIL_MARKETING:
        return <EmailIcon />;
      case ServiceCategory.CRM:
        return <ContactsIcon />;
      case ServiceCategory.E_COMMERCE:
        return iconName === 'StoreIcon' ? <StoreIcon /> : <ShoppingCartIcon />;
      case ServiceCategory.PAYMENTS:
        return <AccountBalanceIcon />;
      case ServiceCategory.ACCOUNTING:
        return <AccountBalanceIcon />;
      case ServiceCategory.PROJECT_MANAGEMENT:
        return iconName === 'DashboardIcon' ? <DashboardIcon /> : <AssignmentIcon />;
      case ServiceCategory.FILE_STORAGE:
        return iconName === 'CloudIcon' ? <CloudIcon /> : <FolderIcon />;
      case ServiceCategory.API:
        return iconName === 'WebhookIcon' ? <WebhookIcon /> : <ApiIcon />;
      case ServiceCategory.DATABASE:
        return <BusinessIcon />;
      default:
        return <BusinessIcon />;
    }
  };

  const formatTimeAgo = (date?: Date): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const isConnected = service.status === ConnectionStatus.CONNECTED;
  const isConnecting = service.status === ConnectionStatus.CONNECTING || service.status === ConnectionStatus.TESTING;
  const hasError = service.status === ConnectionStatus.FAILED || service.status === ConnectionStatus.EXPIRED;
  
  // OAuth-specific helper functions
  const isOAuthService = (svc: ServiceConnectionCardType | OAuthServiceConnectionCard): svc is OAuthServiceConnectionCard => {
    return 'oauthConfig' in svc && svc.oauthConfig !== undefined;
  };

  const oauthService = isOAuthService(service) ? service : null;
  const isOAuthConnected = oauthService?.oauthStatus?.isAuthorized || false;
  const isOAuthExpiring = oauthService?.oauthStatus?.tokenExpiresAt 
    ? (oauthService.oauthStatus.tokenExpiresAt.getTime() - Date.now()) < 300000 // 5 minutes
    : false;
  const hasOAuthPermissionIssues = (oauthService?.oauthStatus?.missingScopes?.length || 0) > 0;

  const handleOAuthConnect = () => {
    if (!oauthService?.oauthConfig?.providerId) {
      return onConnect(service.serviceId);
    }
    setShowOAuthDialog(true);
  };

  const handleGuidedSetup = () => {
    setShowGuidedSetup(true);
  };

  const handleSetupComplete = (serviceId: string, success: boolean) => {
    setShowGuidedSetup(false);
    if (onSetupComplete) {
      onSetupComplete(serviceId, success);
    }
  };

  const handleEscalateFromSetup = (serviceId: string, reason: string) => {
    if (onEscalate) {
      onEscalate(serviceId, reason);
    }
  };

  const handleOAuthConnectionComplete = (result: OAuthConnectionResult) => {
    setShowOAuthDialog(false);
    if (onOAuthConnectionComplete) {
      onOAuthConnectionComplete(service.serviceId, result);
    }
  };

  const getOAuthStatusInfo = () => {
    if (!oauthService?.oauthStatus) return null;

    const { oauthStatus } = oauthService;
    const statusInfo = [];

    if (oauthStatus.isAuthorized) {
      statusInfo.push({
        type: 'success',
        message: `Connected as ${oauthStatus.userInfo?.name || oauthStatus.userInfo?.email || 'User'}`
      });

      if (isOAuthExpiring && oauthStatus.tokenExpiresAt) {
        statusInfo.push({
          type: 'warning',
          message: `Token expires ${oauthStatus.tokenExpiresAt.toLocaleString()}`
        });
      }

      if (hasOAuthPermissionIssues) {
        statusInfo.push({
          type: 'warning',
          message: `Missing permissions: ${oauthStatus.missingScopes?.join(', ')}`
        });
      }
    } else {
      statusInfo.push({
        type: 'info',
        message: 'Click "Connect via OAuth" to authorize access'
      });
    }

    return statusInfo;
  };

  const getConnectionTypeDisplay = () => {
    if (oauthService?.oauthConfig) {
      return 'OAuth 2.0';
    }
    return service.connectionDetails?.connectionType.replace('_', ' ') || 'Standard';
  };

  return (
    <Card 
      sx={{ 
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[8]
        },
        border: (theme) => service.required 
          ? `2px solid ${theme.palette.primary.main}` 
          : `1px solid ${theme.palette.divider}`,
        ...(hasError && {
          borderColor: 'error.main',
          bgcolor: 'error.light',
          color: 'error.contrastText'
        }),
        ...(isConnected && {
          borderColor: 'success.main',
          bgcolor: 'success.light',
          color: 'success.contrastText'
        })
      }}
    >
      {/* Loading Progress Bar */}
      {(isLoading || isConnecting) && (
        <LinearProgress 
          color={getStatusColor(service.status)} 
          sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} 
        />
      )}

      <CardContent sx={{ pb: compact ? 1 : 2 }}>
        {/* Header Row */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={compact ? 1 : 2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Badge
              badgeContent={
                service.required ? (
                  <Tooltip title="Required Service">
                    <SecurityIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                  </Tooltip>
                ) : null
              }
            >
              <Avatar 
                sx={{ 
                  width: compact ? 40 : 48, 
                  height: compact ? 40 : 48,
                  bgcolor: isConnected ? 'success.main' : 'grey.300'
                }}
              >
                {getServiceIcon(service.category, service.icon)}
              </Avatar>
            </Badge>

            <Box>
              <Typography variant={compact ? "subtitle2" : "h6"} fontWeight="bold">
                {service.displayName}
              </Typography>
              {!compact && (
                <Typography variant="body2" color="text.secondary">
                  {service.businessDescription}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Status Chip */}
          <Chip
            icon={getStatusIcon(service.status)}
            label={getStatusText(service.status)}
            color={getChipColor(service.status)}
            size="small"
            variant={isConnected ? "filled" : "outlined"}
          />
        </Box>

        {/* Service Details */}
        {!compact && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Priority: 
                </Typography>
                <Chip 
                  label={service.priority.toUpperCase()} 
                  size="small" 
                  color={getPriorityColor(service.priority) as 'error' | 'warning' | 'info' | 'success' | 'primary' | 'secondary'}
                  variant="outlined"
                />
              </Box>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <SettingsIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Setup: 
                </Typography>
                <Chip 
                  label={service.setupComplexity} 
                  size="small" 
                  color={getComplexityColor(service.setupComplexity) as 'error' | 'warning' | 'info' | 'success' | 'primary' | 'secondary'}
                  variant="outlined"
                />
              </Box>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {service.estimatedSetupTime}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Category: {service.category.replace('_', ' ')}
              </Typography>
            </Grid>
          </Grid>
        )}

        {/* Business Value */}
        {showBusinessValue && !compact && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="primary" fontWeight="medium">
              Business Value:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {service.businessValue}
            </Typography>
          </Box>
        )}

        {/* Connection Status Details */}
        {(service.lastTested || service.connectedAt) && (
          <Box display="flex" gap={2} sx={{ mb: 1 }}>
            {service.connectedAt && (
              <Typography variant="caption" color="text.secondary">
                Connected: {formatTimeAgo(service.connectedAt)}
              </Typography>
            )}
            {service.lastTested && (
              <Typography variant="caption" color="text.secondary">
                Last tested: {formatTimeAgo(service.lastTested)}
              </Typography>
            )}
          </Box>
        )}

        {/* Error Messages */}
        {hasError && service.connectionDetails?.lastError && (
          <Alert severity="error" sx={{ mt: 1 }} variant="outlined">
            {service.connectionDetails.lastError}
          </Alert>
        )}

        {/* OAuth Status Display */}
        {oauthService && (
          <Box sx={{ mb: 2 }}>
            {getOAuthStatusInfo()?.map((info, index) => (
              <Alert 
                key={index} 
                severity={info.type as 'success' | 'warning' | 'info' | 'error'} 
                sx={{ mt: 1 }}
                variant="outlined"
              >
                {info.message}
              </Alert>
            ))}

            {oauthService.oauthStatus?.authorizedScopes && oauthService.oauthStatus.authorizedScopes.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <VpnKeyIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Authorized Permissions:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {oauthService.oauthStatus.authorizedScopes.map(scope => (
                    <Chip 
                      key={scope}
                      label={scope}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Expanded Details */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Connection Details
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Type:</strong> {getConnectionTypeDisplay()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Auth Status:</strong> {service.connectionDetails?.authenticationStatus || (isOAuthConnected ? 'authenticated' : 'pending')}
                </Typography>
              </Grid>
              
              {/* OAuth-specific details */}
              {oauthService?.oauthStatus && (
                <>
                  {oauthService.oauthStatus.tokenExpiresAt && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Token Expires:</strong> {oauthService.oauthStatus.tokenExpiresAt.toLocaleString()}
                      </Typography>
                    </Grid>
                  )}
                  {oauthService.oauthStatus.lastTokenRefresh && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Last Refresh:</strong> {oauthService.oauthStatus.lastTokenRefresh.toLocaleString()}
                      </Typography>
                    </Grid>
                  )}
                  {oauthService.oauthConfig && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Provider:</strong> {oauthService.oauthConfig.providerId}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}

              {/* Standard connection details */}
              {service.connectionDetails && (
                <>
                  {service.connectionDetails.expiresAt && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Expires:</strong> {service.connectionDetails.expiresAt.toLocaleString()}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>
        </Collapse>
      </CardContent>

      {/* Action Buttons */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box display="flex" gap={1} flexWrap="wrap">
          {/* Guided Setup Button (Primary for new users) */}
          {enableGuidedSetup && !isConnected && !isOAuthConnected && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleGuidedSetup}
              disabled={isLoading || isConnecting}
              startIcon={<HelpIcon />}
              size={compact ? "small" : "medium"}
            >
              Guided Setup
            </Button>
          )}

          {/* OAuth Connection Button */}
          {oauthService && !isOAuthConnected && !enableGuidedSetup ? (
            <Button
              variant="outlined"
              color="primary"
              onClick={handleOAuthConnect}
              disabled={isLoading || isConnecting}
              startIcon={isConnecting ? <ScheduleIcon /> : <LaunchIcon />}
              size={compact ? "small" : "medium"}
            >
              {isConnecting ? 'Connecting...' : 'Connect via OAuth'}
            </Button>
          ) : !oauthService && !isConnected && !enableGuidedSetup ? (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => onConnect(service.serviceId)}
              disabled={isLoading || isConnecting}
              startIcon={isConnecting ? <ScheduleIcon /> : <PlayArrowIcon />}
              size={compact ? "small" : "medium"}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          ) : null}

          {/* Manual Setup Button (Alternative) */}
          {enableGuidedSetup && !isConnected && !isOAuthConnected && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={oauthService ? handleOAuthConnect : () => onConnect(service.serviceId)}
              disabled={isLoading || isConnecting}
              startIcon={<SettingsIcon />}
              size={compact ? "small" : "medium"}
            >
              Manual Setup
            </Button>
          )}

          {/* Test Connection Button */}
          {(isConnected || isOAuthConnected) && (
            <Button
              variant="outlined"
              color="success"
              onClick={() => onTest(service.serviceId)}
              disabled={isLoading}
              startIcon={<PlayArrowIcon />}
              size={compact ? "small" : "medium"}
            >
              Test Connection
            </Button>
          )}

          {/* OAuth Refresh Button */}
          {oauthService && isOAuthConnected && isOAuthExpiring && (
            <Button
              variant="outlined"
              color="warning"
              onClick={handleOAuthConnect}
              disabled={isLoading}
              startIcon={<RefreshIcon />}
              size={compact ? "small" : "medium"}
            >
              Refresh Token
            </Button>
          )}

          {/* Configure Button */}
          {(isConnected || isOAuthConnected) && (
            <Button
              variant="outlined"
              onClick={() => onConfigure(service.serviceId)}
              disabled={isLoading}
              startIcon={<SettingsIcon />}
              size={compact ? "small" : "medium"}
            >
              Configure
            </Button>
          )}

          {/* OAuth Reconnect Button for permission issues */}
          {oauthService && isOAuthConnected && hasOAuthPermissionIssues && (
            <Button
              variant="outlined"
              color="warning"
              onClick={handleOAuthConnect}
              disabled={isLoading}
              startIcon={<VpnKeyIcon />}
              size={compact ? "small" : "medium"}
            >
              Update Permissions
            </Button>
          )}
        </Box>

        <Box display="flex" gap={0.5}>
          {/* Expand/Collapse Button */}
          <Tooltip title={expanded ? "Show Less" : "Show More"}>
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>

          {/* Help Button */}
          <Tooltip title="Get Help">
            <IconButton 
              size="small" 
              onClick={() => onShowHelp(service.serviceId)}
              color="primary"
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>

      {/* OAuth Flow Dialog */}
      {oauthService && (
        <OAuthFlowManager
          open={showOAuthDialog}
          onClose={() => setShowOAuthDialog(false)}
          workflowId={workflowId}
          serviceId={service.serviceId}
          providerId={oauthService.oauthConfig?.providerId || ''}
          userId={userId}
          onConnectionComplete={handleOAuthConnectionComplete}
          customScopes={oauthService.oauthConfig?.requiredScopes}
        />
      )}

      {/* Guided Setup Wizard */}
      {enableGuidedSetup && (
        <GuidedSetupWizard
          open={showGuidedSetup}
          onClose={() => setShowGuidedSetup(false)}
          service={service}
          workflowId={workflowId}
          userId={userId}
          onSetupComplete={handleSetupComplete}
          onEscalate={handleEscalateFromSetup}
        />
      )}
    </Card>
  );
};