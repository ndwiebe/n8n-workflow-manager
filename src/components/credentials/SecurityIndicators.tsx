import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  VpnKey as VpnKeyIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Gavel as GavelIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { 
  SecurityIndicators as SecurityIndicatorsType,
  SecurityBadge,
  SecurityRecommendation,
  EncryptionIndicator,
  ComplianceIndicator,
  PermissionHealthIndicator
} from '../../types/smartCredentials';

interface SecurityIndicatorsProps {
  indicators: SecurityIndicatorsType;
  serviceId: string;
  onRecommendationClick?: (recommendation: SecurityRecommendation) => void;
  onBadgeClick?: (badge: SecurityBadge) => void;
  showDetailed?: boolean;
}

export const SecurityIndicators: React.FC<SecurityIndicatorsProps> = ({
  indicators,
  serviceId,
  onRecommendationClick,
  onBadgeClick,
  showDetailed = false
}) => {
  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'primary';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'encrypted':
      case 'compliant':
        return <CheckCircleIcon color="success" />;
      case 'warning':
      case 'attention_needed':
      case 'partially_encrypted':
      case 'partially_compliant':
        return <WarningIcon color="warning" />;
      case 'critical':
      case 'not_encrypted':
      case 'non_compliant':
      case 'misconfigured':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'encryption': return <VpnKeyIcon />;
      case 'compliance': return <GavelIcon />;
      case 'permissions': return <AdminPanelSettingsIcon />;
      case 'monitoring': return <VisibilityIcon />;
      case 'backup': return <ShieldIcon />;
      case 'access_control': return <SecurityIcon />;
      default: return <StarIcon />;
    }
  };

  const getBadgeLevelColor = (level: string) => {
    switch (level) {
      case 'enterprise': return '#9C27B0'; // Purple
      case 'platinum': return '#757575'; // Grey
      case 'gold': return '#FF9800'; // Orange
      case 'silver': return '#607D8B'; // Blue Grey
      case 'bronze': return '#795548'; // Brown
      default: return '#2196F3'; // Blue
    }
  };

  const renderTrustScore = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <SecurityIcon color="primary" />
            Security Trust Score
          </Typography>
          <Chip
            label={`${indicators.trustScore}/100`}
            color={getTrustScoreColor(indicators.trustScore) as any}
            size="medium"
            sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
          />
        </Box>

        <Box mb={2}>
          <LinearProgress
            variant="determinate"
            value={indicators.trustScore}
            color={getTrustScoreColor(indicators.trustScore) as any}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Your security trust score reflects the overall security posture of your credentials and integrations.
          This score considers encryption strength, compliance status, permission health, and security practices.
        </Typography>

        <Alert
          severity={indicators.riskLevel === 'low' ? 'success' : 
                   indicators.riskLevel === 'medium' ? 'warning' : 'error'}
          sx={{ mt: 2 }}
        >
          <strong>Risk Level: {indicators.riskLevel.toUpperCase()}</strong>
          {indicators.riskLevel === 'low' && ' - Your security posture is excellent with minimal risk exposure.'}
          {indicators.riskLevel === 'medium' && ' - Some security improvements recommended to reduce risk.'}
          {indicators.riskLevel === 'high' && ' - Immediate attention required to address security vulnerabilities.'}
          {indicators.riskLevel === 'critical' && ' - Critical security issues require immediate action.'}
        </Alert>
      </CardContent>
    </Card>
  );

  const renderSecurityBadges = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <TrophyIcon color="primary" />
          Security Achievements
        </Typography>

        {indicators.securityBadges.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No security badges earned yet. Follow the recommendations below to improve your security posture.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {indicators.securityBadges.map((badge) => (
              <Grid item xs={12} sm={6} md={4} key={badge.badgeId}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: onBadgeClick ? 'pointer' : 'default',
                    borderColor: getBadgeLevelColor(badge.level),
                    borderWidth: 2,
                    '&:hover': onBadgeClick ? {
                      boxShadow: 2,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    } : {}
                  }}
                  onClick={() => onBadgeClick?.(badge)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Box
                      sx={{
                        backgroundColor: getBadgeLevelColor(badge.level),
                        color: 'white',
                        borderRadius: '50%',
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1
                      }}
                    >
                      {getBadgeIcon(badge.type)}
                    </Box>
                    
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {badge.name}
                    </Typography>
                    
                    <Chip
                      label={badge.level.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getBadgeLevelColor(badge.level),
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    />
                    
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {badge.businessValue}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  const renderEncryptionStatus = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" display="flex" alignItems="center" gap={1}>
            <VpnKeyIcon color="primary" />
            Data Encryption
          </Typography>
          {getStatusIcon(indicators.encryptionStatus.status)}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {indicators.encryptionStatus.businessDescription}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Algorithm
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {indicators.encryptionStatus.algorithm}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Key Strength
            </Typography>
            <Chip
              label={indicators.encryptionStatus.keyStrength}
              size="small"
              color={indicators.encryptionStatus.keyStrength === 'enterprise' ? 'success' :
                     indicators.encryptionStatus.keyStrength === 'strong' ? 'primary' :
                     indicators.encryptionStatus.keyStrength === 'good' ? 'warning' : 'error'}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Last key rotation: {new Date(indicators.encryptionStatus.keyLastRotated).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderComplianceStatus = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" display="flex" alignItems="center" gap={1}>
            <GavelIcon color="primary" />
            Compliance Status
          </Typography>
          {getStatusIcon(indicators.complianceStatus.overallStatus)}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {indicators.complianceStatus.businessImpact}
        </Typography>

        {indicators.complianceStatus.criticalIssues > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>{indicators.complianceStatus.criticalIssues} critical compliance issues</strong> require immediate attention.
          </Alert>
        )}

        <List dense>
          {indicators.complianceStatus.frameworks.slice(0, showDetailed ? undefined : 3).map((framework) => (
            <ListItem key={framework.name} sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {getStatusIcon(framework.status)}
              </ListItemIcon>
              <ListItemText
                primary={framework.name}
                secondary={`${framework.score}/100 - ${framework.businessRelevance}`}
              />
              <Chip
                label={framework.status.replace('_', ' ')}
                size="small"
                color={framework.status === 'compliant' ? 'success' :
                       framework.status === 'partial' ? 'warning' : 'error'}
              />
            </ListItem>
          ))}
        </List>

        {!showDetailed && indicators.complianceStatus.frameworks.length > 3 && (
          <Typography variant="caption" color="text.secondary">
            +{indicators.complianceStatus.frameworks.length - 3} more frameworks
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderPermissionHealth = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" display="flex" alignItems="center" gap={1}>
            <AdminPanelSettingsIcon color="primary" />
            Permission Health
          </Typography>
          {getStatusIcon(indicators.permissionHealth.status)}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {indicators.permissionHealth.businessImpact}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Excessive Permissions
            </Typography>
            <Typography variant="h6" color={indicators.permissionHealth.excessivePermissions > 0 ? 'error.main' : 'success.main'}>
              {indicators.permissionHealth.excessivePermissions}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Missing Permissions
            </Typography>
            <Typography variant="h6" color={indicators.permissionHealth.missingPermissions > 0 ? 'warning.main' : 'success.main'}>
              {indicators.permissionHealth.missingPermissions}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Privilege Escalation Risk
          </Typography>
          <Chip
            label={indicators.permissionHealth.privilegeEscalationRisk}
            size="small"
            color={getRiskLevelColor(indicators.permissionHealth.privilegeEscalationRisk)}
            sx={{ ml: 1 }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderRecommendations = () => {
    const criticalRecommendations = indicators.recommendations.filter(r => r.priority === 'critical');
    const otherRecommendations = indicators.recommendations.filter(r => r.priority !== 'critical');

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <InfoIcon color="primary" />
            Security Recommendations
          </Typography>

          {criticalRecommendations.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Critical Actions Required
              </Typography>
              {criticalRecommendations.map((rec) => (
                <Typography
                  key={rec.id}
                  variant="body2"
                  sx={{ cursor: 'pointer', textDecoration: 'underline', mb: 1 }}
                  onClick={() => onRecommendationClick?.(rec)}
                >
                  • {rec.title}
                </Typography>
              ))}
            </Alert>
          )}

          {otherRecommendations.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  Additional Recommendations ({otherRecommendations.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {otherRecommendations.map((recommendation) => (
                    <ListItem
                      key={recommendation.id}
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                      onClick={() => onRecommendationClick?.(recommendation)}
                    >
                      <ListItemIcon>
                        <Chip
                          label={recommendation.priority}
                          size="small"
                          color={recommendation.priority === 'high' ? 'error' :
                                 recommendation.priority === 'medium' ? 'warning' : 'info'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={recommendation.title}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {recommendation.businessImpact}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Estimated time: {recommendation.estimatedImplementationTime}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {indicators.recommendations.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No recommendations at this time. Your security posture is well-maintained.
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {renderTrustScore()}
      
      {indicators.securityBadges.length > 0 && renderSecurityBadges()}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          {renderEncryptionStatus()}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderComplianceStatus()}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderPermissionHealth()}
        </Grid>
      </Grid>

      {renderRecommendations()}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Last security scan: {new Date(indicators.lastSecurityScan).toLocaleString()}
      </Typography>
    </Box>
  );
};

export default SecurityIndicators;