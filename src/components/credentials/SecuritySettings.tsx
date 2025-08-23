import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  VpnKey as EncryptionIcon,
  AdminPanelSettings as AuthIcon,
  Gavel as ComplianceIcon,
  Visibility as MonitoringIcon,
  Backup as BackupIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  CloudUpload as ExportIcon,
  Download as ImportIcon,
  Business as BusinessIcon,
  Code as TechnicalIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import {
  EnterpriseSecuritySettings as SecuritySettingsType,
  EncryptionSettings,
  AuthenticationSettings,
  AuditSettings,
  ComplianceSettings,
  MonitoringSettings,
  IncidentResponseSettings,
  DataRetentionSettings,
  AccessControlSettings,
  BusinessSecuritySettings
} from '../../types/smartCredentials';

interface SecuritySettingsProps {
  organizationId: string;
  settings: SecuritySettingsType;
  onSettingsChange?: (settings: SecuritySettingsType) => void;
  onSaveSettings?: (settings: SecuritySettingsType) => void;
  onExportSettings?: () => void;
  onImportSettings?: (file: File) => void;
  readOnly?: boolean;
  showBusinessView?: boolean;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  organizationId,
  settings,
  onSettingsChange,
  onSaveSettings,
  onExportSettings,
  onImportSettings,
  readOnly = false,
  showBusinessView = true
}) => {
  const [currentSettings, setCurrentSettings] = useState<SecuritySettingsType>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState('');
  const [businessViewMode, setBusinessViewMode] = useState(showBusinessView);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleSettingChange = <K extends keyof SecuritySettingsType>(
    category: K,
    field: string,
    value: any
  ) => {
    if (readOnly) return;

    const currentCategorySettings = currentSettings[category] as Record<string, any>;
    const newSettings = {
      ...currentSettings,
      [category]: {
        ...(currentCategorySettings || {}),
        [field]: value
      }
    } as SecuritySettingsType;

    setCurrentSettings(newSettings);
    setHasChanges(true);
    onSettingsChange?.(newSettings);
  };

  const handleSave = () => {
    onSaveSettings?.(currentSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setCurrentSettings(settings);
    setHasChanges(false);
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'enterprise':
      case 'strong':
      case 'high': return 'success';
      case 'enhanced':
      case 'good':
      case 'medium': return 'primary';
      case 'standard':
      case 'moderate':
      case 'low': return 'warning';
      default: return 'error';
    }
  };

  const renderBusinessImpactChip = (impact: string, description: string) => (
    <Tooltip title={description}>
      <Chip
        label={impact}
        size="small"
        color="info"
        variant="outlined"
        sx={{ ml: 1 }}
      />
    </Tooltip>
  );

  const renderEncryptionSettings = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <EncryptionIcon color="primary" />
          Data Encryption Settings
          <IconButton size="small" onClick={() => { setHelpTopic('encryption'); setHelpDialogOpen(true); }}>
            <HelpIcon fontSize="small" />
          </IconButton>
        </Typography>

        {businessViewMode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Business Impact:</strong> Strong encryption protects your business data from unauthorized access,
            meets compliance requirements, and builds customer trust.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.encryptionSettings.mandatoryEncryption}
                  onChange={(e) => handleSettingChange('encryptionSettings', 'mandatoryEncryption', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Mandatory Encryption</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Requires encryption for all sensitive data
                  </Typography>
                  {businessViewMode && renderBusinessImpactChip('High', 'Ensures all business data is protected')}
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Encryption Algorithm</InputLabel>
              <Select
                value={currentSettings.encryptionSettings.encryptionAlgorithm}
                onChange={(e) => handleSettingChange('encryptionSettings', 'encryptionAlgorithm', e.target.value)}
                disabled={readOnly}
              >
                <MenuItem value="aes-256-gcm">AES-256-GCM (Recommended)</MenuItem>
                <MenuItem value="aes-256-cbc">AES-256-CBC</MenuItem>
                <MenuItem value="chacha20-poly1305">ChaCha20-Poly1305</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.encryptionSettings.encryptionAtRest}
                  onChange={(e) => handleSettingChange('encryptionSettings', 'encryptionAtRest', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Encryption at Rest</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Encrypts data stored in databases
                  </Typography>
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.encryptionSettings.encryptionInTransit}
                  onChange={(e) => handleSettingChange('encryptionSettings', 'encryptionInTransit', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Encryption in Transit</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Encrypts data during transmission
                  </Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Key Rotation Policy
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.encryptionSettings.keyRotationPolicy.enabled}
                  onChange={(e) => handleSettingChange('encryptionSettings', 'keyRotationPolicy', {
                    ...currentSettings.encryptionSettings.keyRotationPolicy,
                    enabled: e.target.checked
                  })}
                  disabled={readOnly}
                />
              }
              label="Enable Key Rotation"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Rotation Interval (days)"
              type="number"
              value={currentSettings.encryptionSettings.keyRotationPolicy.rotationInterval}
              onChange={(e) => handleSettingChange('encryptionSettings', 'keyRotationPolicy', {
                ...currentSettings.encryptionSettings.keyRotationPolicy,
                rotationInterval: parseInt(e.target.value)
              })}
              disabled={readOnly || !currentSettings.encryptionSettings.keyRotationPolicy.enabled}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Grace Period (days)"
              type="number"
              value={currentSettings.encryptionSettings.keyRotationPolicy.gracePeriod}
              onChange={(e) => handleSettingChange('encryptionSettings', 'keyRotationPolicy', {
                ...currentSettings.encryptionSettings.keyRotationPolicy,
                gracePeriod: parseInt(e.target.value)
              })}
              disabled={readOnly || !currentSettings.encryptionSettings.keyRotationPolicy.enabled}
            />
          </Grid>
        </Grid>

        {businessViewMode && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Business Benefit:</strong> Regular key rotation reduces long-term exposure risk
            and demonstrates security best practices to customers and auditors.
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderAuthenticationSettings = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <AuthIcon color="primary" />
          Authentication & Access Settings
        </Typography>

        {businessViewMode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Business Impact:</strong> Strong authentication prevents unauthorized access
            while maintaining user productivity and satisfaction.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.authenticationSettings.mfaRequired}
                  onChange={(e) => handleSettingChange('authenticationSettings', 'mfaRequired', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Require Multi-Factor Authentication</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mandatory MFA for all users
                  </Typography>
                  {businessViewMode && renderBusinessImpactChip('Critical', 'Prevents 99.9% of account takeovers')}
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Session Timeout (minutes)</InputLabel>
              <Select
                value={currentSettings.authenticationSettings.sessionSettings.maxIdleTime}
                onChange={(e) => handleSettingChange('authenticationSettings', 'sessionSettings', {
                  ...currentSettings.authenticationSettings.sessionSettings,
                  maxIdleTime: e.target.value as number
                })}
                disabled={readOnly}
              >
                <MenuItem value={15}>15 minutes (High Security)</MenuItem>
                <MenuItem value={30}>30 minutes (Balanced)</MenuItem>
                <MenuItem value={60}>1 hour (User Friendly)</MenuItem>
                <MenuItem value={120}>2 hours (Extended)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Password Policy
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Minimum Length"
              type="number"
              value={currentSettings.authenticationSettings.passwordPolicy.minLength}
              onChange={(e) => handleSettingChange('authenticationSettings', 'passwordPolicy', {
                ...currentSettings.authenticationSettings.passwordPolicy,
                minLength: parseInt(e.target.value)
              })}
              disabled={readOnly}
              inputProps={{ min: 8, max: 32 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Complexity Level</InputLabel>
              <Select
                value={currentSettings.authenticationSettings.passwordPolicy.businessComplexity}
                onChange={(e) => handleSettingChange('authenticationSettings', 'passwordPolicy', {
                  ...currentSettings.authenticationSettings.passwordPolicy,
                  businessComplexity: e.target.value as 'simple' | 'moderate' | 'complex'
                })}
                disabled={readOnly}
              >
                <MenuItem value="simple">Simple (Basic Requirements)</MenuItem>
                <MenuItem value="moderate">Moderate (Balanced Security)</MenuItem>
                <MenuItem value="complex">Complex (High Security)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.authenticationSettings.passwordPolicy.requireUppercase}
                  onChange={(e) => handleSettingChange('authenticationSettings', 'passwordPolicy', {
                    ...currentSettings.authenticationSettings.passwordPolicy,
                    requireUppercase: e.target.checked
                  })}
                  disabled={readOnly}
                />
              }
              label="Require Uppercase"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.authenticationSettings.passwordPolicy.requireSpecialChars}
                  onChange={(e) => handleSettingChange('authenticationSettings', 'passwordPolicy', {
                    ...currentSettings.authenticationSettings.passwordPolicy,
                    requireSpecialChars: e.target.checked
                  })}
                  disabled={readOnly}
                />
              }
              label="Require Special Characters"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderComplianceSettings = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <ComplianceIcon color="primary" />
          Compliance & Regulatory Settings
        </Typography>

        {businessViewMode && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Business Impact:</strong> Compliance settings ensure your organization meets
            regulatory requirements and avoids costly penalties or business restrictions.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Business Criticality</InputLabel>
              <Select
                value={currentSettings.complianceSettings.businessCriticality}
                onChange={(e) => handleSettingChange('complianceSettings', 'businessCriticality', e.target.value)}
                disabled={readOnly}
              >
                <MenuItem value="low">Low (Internal Tools)</MenuItem>
                <MenuItem value="medium">Medium (Business Operations)</MenuItem>
                <MenuItem value="high">High (Customer-Facing)</MenuItem>
                <MenuItem value="critical">Critical (Financial/Healthcare)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.complianceSettings.automatedAssessments}
                  onChange={(e) => handleSettingChange('complianceSettings', 'automatedAssessments', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Automated Compliance Assessments</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Regular automated compliance checks
                  </Typography>
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Active Compliance Frameworks
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {['SOC2', 'GDPR', 'HIPAA', 'SOX', 'ISO27001', 'CCPA', 'PCI_DSS'].map((framework) => (
                <Chip
                  key={framework}
                  label={framework}
                  variant={currentSettings.complianceSettings.activeFrameworks.includes(framework) ? 'filled' : 'outlined'}
                  color={currentSettings.complianceSettings.activeFrameworks.includes(framework) ? 'primary' : 'default'}
                  onClick={() => {
                    if (readOnly) return;
                    const frameworks = currentSettings.complianceSettings.activeFrameworks;
                    const newFrameworks = frameworks.includes(framework)
                      ? frameworks.filter(f => f !== framework)
                      : [...frameworks, framework];
                    handleSettingChange('complianceSettings', 'activeFrameworks', newFrameworks);
                  }}
                  clickable={!readOnly}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderMonitoringSettings = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <MonitoringIcon color="primary" />
          Security Monitoring Settings
        </Typography>

        {businessViewMode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Business Impact:</strong> Continuous monitoring provides early threat detection
            and rapid response capabilities to minimize business disruption.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.monitoringSettings.continuousMonitoring}
                  onChange={(e) => handleSettingChange('monitoringSettings', 'continuousMonitoring', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Continuous Security Monitoring</Typography>
                  <Typography variant="caption" color="text.secondary">
                    24/7 automated security monitoring
                  </Typography>
                  {businessViewMode && renderBusinessImpactChip('High', 'Immediate threat detection')}
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.monitoringSettings.anomalyDetection}
                  onChange={(e) => handleSettingChange('monitoringSettings', 'anomalyDetection', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Anomaly Detection</Typography>
                  <Typography variant="caption" color="text.secondary">
                    AI-powered unusual activity detection
                  </Typography>
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.monitoringSettings.threatIntelligence}
                  onChange={(e) => handleSettingChange('monitoringSettings', 'threatIntelligence', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Threat Intelligence</Typography>
                  <Typography variant="caption" color="text.secondary">
                    External threat intelligence feeds
                  </Typography>
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.monitoringSettings.businessHoursOnly}
                  onChange={(e) => handleSettingChange('monitoringSettings', 'businessHoursOnly', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Business Hours Only</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Limit intensive monitoring to business hours
                  </Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Monitoring Scope
        </Typography>

        <Grid container spacing={2}>
          {Object.entries(currentSettings.monitoringSettings.monitoringScope).map(([key, value]) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <FormControlLabel
                control={
                  <Switch
                    checked={value as boolean}
                    onChange={(e) => handleSettingChange('monitoringSettings', 'monitoringScope', {
                      ...currentSettings.monitoringSettings.monitoringScope,
                      [key]: e.target.checked
                    })}
                    disabled={readOnly}
                  />
                }
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  const renderBusinessSettings = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <BusinessIcon color="primary" />
          Business Security Preferences
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Business Focus:</strong> These settings balance security requirements with
          business productivity and operational needs.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>
              Risk Tolerance Level
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={currentSettings.businessSettings.riskTolerance}
                onChange={(e) => handleSettingChange('businessSettings', 'riskTolerance', e.target.value)}
                disabled={readOnly}
              >
                <MenuItem value="very_low">Very Low (Maximum Security)</MenuItem>
                <MenuItem value="low">Low (High Security)</MenuItem>
                <MenuItem value="medium">Medium (Balanced)</MenuItem>
                <MenuItem value="high">High (Business Agility)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Determines the overall security vs. productivity balance
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>
              Security Investment Budget
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={currentSettings.businessSettings.securityInvestmentBudget}
                onChange={(e) => handleSettingChange('businessSettings', 'securityInvestmentBudget', e.target.value)}
                disabled={readOnly}
              >
                <MenuItem value="minimal">Minimal (Cost-Focused)</MenuItem>
                <MenuItem value="standard">Standard (Balanced Investment)</MenuItem>
                <MenuItem value="enhanced">Enhanced (Security-Focused)</MenuItem>
                <MenuItem value="enterprise">Enterprise (Premium Security)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Business Continuity Priority
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={currentSettings.businessSettings.businessContinuityPriority}
                onChange={(e) => handleSettingChange('businessSettings', 'businessContinuityPriority', e.target.value)}
                disabled={readOnly}
              >
                <MenuItem value="cost_optimization">Cost Optimization (Minimal Disruption Tolerance)</MenuItem>
                <MenuItem value="balanced">Balanced (Standard Resilience)</MenuItem>
                <MenuItem value="security_first">Security First (Maximum Protection)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              How to balance security measures with business operations continuity
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Stakeholder Notifications
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Communication Method</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentSettings.businessSettings.stakeholderNotifications.map((notification, index) => (
                <TableRow key={notification.stakeholder}>
                  <TableCell>
                    <Chip
                      label={notification.stakeholder.replace(/_/g, ' ').toUpperCase()}
                      size="small"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={notification.frequency}
                        onChange={(e) => {
                          const newNotifications = [...currentSettings.businessSettings.stakeholderNotifications];
                          newNotifications[index] = { ...notification, frequency: e.target.value as any };
                          handleSettingChange('businessSettings', 'stakeholderNotifications', newNotifications);
                        }}
                        disabled={readOnly}
                      >
                        <MenuItem value="immediate">Immediate</MenuItem>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="quarterly">Quarterly</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {notification.communicationMethod.join(', ')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderSecurityActions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <SettingsIcon color="primary" />
          Security Configuration Actions
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant={hasChanges ? 'contained' : 'outlined'}
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges || readOnly}
            >
              Save Changes
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
              disabled={!hasChanges || readOnly}
            >
              Reset Changes
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={onExportSettings}
            >
              Export Settings
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ImportIcon />}
              onClick={() => setImportDialogOpen(true)}
              disabled={readOnly}
            >
              Import Settings
            </Button>
          </Grid>
        </Grid>

        {hasChanges && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Unsaved Changes:</strong> Your security settings have been modified.
            Save changes to apply the new configuration.
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderHelpDialog = () => (
    <Dialog
      open={helpDialogOpen}
      onClose={() => setHelpDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Security Settings Help
      </DialogTitle>
      
      <DialogContent>
        {helpTopic === 'encryption' && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Encryption Settings Guide
            </Typography>
            
            <Typography variant="body2" paragraph>
              <strong>Mandatory Encryption:</strong> When enabled, all sensitive data is automatically
              encrypted using industry-standard algorithms. This protects your business data from
              unauthorized access even if systems are compromised.
            </Typography>

            <Typography variant="body2" paragraph>
              <strong>Key Rotation:</strong> Regular key rotation reduces the impact of potential
              key compromise. Recommended intervals are 90 days for high-security environments
              and 180 days for standard business use.
            </Typography>

            <Typography variant="body2" paragraph>
              <strong>Business Benefits:</strong>
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Protects customer data and business secrets" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Meets compliance requirements (GDPR, SOC2, etc.)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Builds customer trust and confidence" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Reduces breach impact and legal liability" />
              </ListItem>
            </List>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setHelpDialogOpen(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderImportDialog = () => (
    <Dialog
      open={importDialogOpen}
      onClose={() => setImportDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Import Security Settings
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Warning:</strong> Importing settings will replace your current security configuration.
          Make sure to export your current settings first as a backup.
        </Alert>

        <Button
          variant="outlined"
          component="label"
          fullWidth
          sx={{ mt: 2 }}
        >
          Choose Settings File
          <input
            type="file"
            hidden
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImportSettings) {
                onImportSettings(file);
                setImportDialogOpen(false);
              }
            }}
          />
        </Button>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setImportDialogOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h5" display="flex" alignItems="center" gap={1}>
          <ShieldIcon color="primary" />
          Security Settings
        </Typography>
        
        <Box display="flex" gap={1} alignItems="center">
          {showBusinessView && (
            <FormControlLabel
              control={
                <Switch
                  checked={businessViewMode}
                  onChange={(e) => setBusinessViewMode(e.target.checked)}
                />
              }
              label="Business View"
            />
          )}
          
          <Chip
            label={`Organization: ${organizationId}`}
            variant="outlined"
            color="primary"
          />
        </Box>
      </Box>

      {businessViewMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Business-Friendly Configuration:</strong> These settings are explained in business terms
          with clear impact descriptions. Technical details are available in Technical View mode.
        </Alert>
      )}

      {renderEncryptionSettings()}
      {renderAuthenticationSettings()}
      {renderComplianceSettings()}
      {renderMonitoringSettings()}
      {renderBusinessSettings()}
      {renderSecurityActions()}

      {renderHelpDialog()}
      {renderImportDialog()}
    </Box>
  );
};

export default SecuritySettings;