import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export const SystemSettings: React.FC = () => {
  const [success, setSuccess] = React.useState(false);
  const [settings, setSettings] = React.useState({
    // Security Settings
    enforceSSL: true,
    requireMFA: false,
    sessionTimeout: 30,
    passwordComplexity: true,
    loginAttempts: 5,
    
    // System Settings
    maintenanceMode: false,
    autoBackup: true,
    backupFrequency: 'daily',
    logRetention: 90,
    
    // Email Settings
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'noreply@example.com',
    smtpEnabled: true,
    
    // Performance
    maxConcurrentJobs: 10,
    dbConnectionPool: 20,
    cacheEnabled: true,
    
    // Workflow Settings
    defaultExecutionTimeout: 300,
    maxWorkflowSize: 1000,
    enableWorkflowSharing: true
  });

  const [systemInfo] = React.useState({
    version: '1.0.0',
    uptime: '15 days, 3 hours',
    activeUsers: 245,
    totalWorkflows: 1,
    systemLoad: '23%',
    memoryUsage: '1.2GB / 4GB',
    diskUsage: '45GB / 100GB'
  });

  const handleSave = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleToggle = (field: string) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const handleInputChange = (field: string, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          System settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* System Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                System Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Version" secondary={systemInfo.version} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Uptime" secondary={systemInfo.uptime} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Active Users" secondary={systemInfo.activeUsers} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Total Workflows" secondary={systemInfo.totalWorkflows} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="System Load" secondary={systemInfo.systemLoad} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Memory Usage" secondary={systemInfo.memoryUsage} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Disk Usage" secondary={systemInfo.diskUsage} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Security Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enforceSSL}
                        onChange={() => handleToggle('enforceSSL')}
                      />
                    }
                    label="Enforce SSL"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.requireMFA}
                        onChange={() => handleToggle('requireMFA')}
                      />
                    }
                    label="Require MFA"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.passwordComplexity}
                        onChange={() => handleToggle('passwordComplexity')}
                      />
                    }
                    label="Password Complexity"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Session Timeout (minutes)"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Max Login Attempts"
                    type="number"
                    value={settings.loginAttempts}
                    onChange={(e) => handleInputChange('loginAttempts', parseInt(e.target.value))}
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                System & Backup Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.maintenanceMode}
                        onChange={() => handleToggle('maintenanceMode')}
                      />
                    }
                    label="Maintenance Mode"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoBackup}
                        onChange={() => handleToggle('autoBackup')}
                      />
                    }
                    label="Auto Backup"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Backup Frequency"
                    select
                    value={settings.backupFrequency}
                    onChange={(e) => handleInputChange('backupFrequency', e.target.value)}
                    size="small"
                    fullWidth
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Log Retention (days)"
                    type="number"
                    value={settings.logRetention}
                    onChange={(e) => handleInputChange('logRetention', parseInt(e.target.value))}
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Email Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.smtpEnabled}
                        onChange={() => handleToggle('smtpEnabled')}
                      />
                    }
                    label="Enable SMTP"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Host"
                    value={settings.smtpHost}
                    onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                    size="small"
                    fullWidth
                    disabled={!settings.smtpEnabled}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Port"
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                    size="small"
                    fullWidth
                    disabled={!settings.smtpEnabled}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="SMTP User"
                    value={settings.smtpUser}
                    onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                    size="small"
                    fullWidth
                    disabled={!settings.smtpEnabled}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance & Workflow Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Max Concurrent Jobs"
                    type="number"
                    value={settings.maxConcurrentJobs}
                    onChange={(e) => handleInputChange('maxConcurrentJobs', parseInt(e.target.value))}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="DB Connection Pool"
                    type="number"
                    value={settings.dbConnectionPool}
                    onChange={(e) => handleInputChange('dbConnectionPool', parseInt(e.target.value))}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Execution Timeout (sec)"
                    type="number"
                    value={settings.defaultExecutionTimeout}
                    onChange={(e) => handleInputChange('defaultExecutionTimeout', parseInt(e.target.value))}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.cacheEnabled}
                        onChange={() => handleToggle('cacheEnabled')}
                      />
                    }
                    label="Enable Caching"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableWorkflowSharing}
                        onChange={() => handleToggle('enableWorkflowSharing')}
                      />
                    }
                    label="Enable Workflow Sharing"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              size="large"
            >
              Save Settings
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              size="large"
            >
              Restart System
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};