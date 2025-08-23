import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  MenuItem,
  Avatar,
  Badge
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Business as BusinessIcon,
  Code as CodeIcon,
  DataUsage as DataIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  AccountBalance as ComplianceIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import {
  PermissionScope,
  PermissionManagement,
  DataAccessLevel,
  BusinessFunction,
  PermissionMapping,
  ApprovalWorkflow,
  ApprovalAudit
} from '../../types/smartCredentials';

interface PermissionManagerProps {
  serviceId: string;
  permissionManagement: PermissionManagement;
  onPermissionChange?: (scopeId: string, granted: boolean, justification?: string) => void;
  onPermissionReview?: () => void;
  onApprovalRequest?: (permissions: PermissionScope[], justification: string) => void;
  showBusinessView?: boolean;
  readOnly?: boolean;
}

interface PermissionChangeRequest {
  permission: PermissionScope;
  action: 'grant' | 'revoke';
  justification: string;
  businessReason: string;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({
  serviceId,
  permissionManagement,
  onPermissionChange,
  onPermissionReview,
  onApprovalRequest,
  showBusinessView = true,
  readOnly = false
}) => {
  const [selectedPermission, setSelectedPermission] = useState<PermissionScope | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [businessViewMode, setBusinessViewMode] = useState(showBusinessView);
  const [permissionRequests, setPermissionRequests] = useState<PermissionChangeRequest[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const getPermissionStatusColor = (permission: PermissionScope) => {
    if (!permission.granted && permission.required) return 'error';
    if (permission.granted && !permission.required && permission.riskLevel === 'high') return 'warning';
    if (permission.granted && permission.required) return 'success';
    return 'default';
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

  const getDataAccessIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'read': return <VisibilityIcon />;
      case 'write': return <EditIcon />;
      case 'delete': return <RemoveIcon />;
      case 'admin': return <AdminIcon />;
      case 'full_control': return <SecurityIcon />;
      default: return <DataIcon />;
    }
  };

  const handlePermissionToggle = useCallback((permission: PermissionScope) => {
    if (readOnly) return;

    if (permission.granted) {
      // Revoking permission
      const request: PermissionChangeRequest = {
        permission,
        action: 'revoke',
        justification: '',
        businessReason: ''
      };
      setPermissionRequests(prev => [...prev, request]);
    } else {
      // Granting permission
      const request: PermissionChangeRequest = {
        permission,
        action: 'grant',
        justification: '',
        businessReason: ''
      };
      setPermissionRequests(prev => [...prev, request]);
    }

    setSelectedPermission(permission);
    setApprovalDialogOpen(true);
  }, [readOnly]);

  const renderPermissionOverview = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <AdminIcon color="primary" />
            Permission Overview
          </Typography>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Switch between business and technical view">
              <FormControlLabel
                control={
                  <Switch
                    checked={businessViewMode}
                    onChange={(e) => setBusinessViewMode(e.target.checked)}
                  />
                }
                label="Business View"
              />
            </Tooltip>
            
            {!readOnly && (
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setAuditDialogOpen(true)}
              >
                Audit Trail
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {permissionManagement.totalPermissions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Permissions
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {permissionManagement.grantedPermissions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Granted
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {permissionManagement.excessivePermissions.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Excessive
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {permissionManagement.missingPermissions.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Missing Required
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {permissionManagement.reviewRequired && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Permission Review Required</strong>
            <br />
            This service hasn't had a permission review since {new Date(permissionManagement.lastReview).toLocaleDateString()}.
            Regular reviews help maintain security and compliance.
            {!readOnly && (
              <Button
                size="small"
                onClick={onPermissionReview}
                sx={{ ml: 2 }}
              >
                Start Review
              </Button>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderBusinessFunctionView = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <BusinessIcon color="primary" />
          Business Functions & Permissions
        </Typography>

        {permissionManagement.permissionMatrix.businessFunctions.map((businessFunction) => (
          <Accordion key={businessFunction.functionId} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%">
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  {businessFunction.name}
                </Typography>
                <Chip
                  label={businessFunction.businessCriticality}
                  size="small"
                  color={businessFunction.businessCriticality === 'critical' ? 'error' :
                         businessFunction.businessCriticality === 'high' ? 'warning' :
                         businessFunction.businessCriticality === 'medium' ? 'primary' : 'default'}
                  sx={{ mr: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {businessFunction.requiredPermissions.length} permissions
                </Typography>
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                {businessFunction.description}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Data Requirements:
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {businessFunction.dataRequirements.map((req, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined" sx={{ p: 1 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        {getDataAccessIcon(req.accessType)}
                        <Typography variant="body2" fontWeight="medium">
                          {req.dataType}
                        </Typography>
                      </Box>
                      <Typography variant="caption" display="block">
                        {req.businessJustification}
                      </Typography>
                      <Chip
                        label={req.accessType}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" gutterBottom>
                Required Permissions:
              </Typography>
              <List dense>
                {businessFunction.requiredPermissions.map((permId) => {
                  const permission = [...permissionManagement.excessivePermissions, ...permissionManagement.missingPermissions]
                    .find(p => p.scopeId === permId);
                  
                  if (!permission) return null;
                  
                  return (
                    <ListItem key={permId}>
                      <ListItemIcon>
                        {permission.granted ? 
                          <CheckCircleIcon color="success" /> : 
                          <ErrorIcon color="error" />
                        }
                      </ListItemIcon>
                      <ListItemText
                        primary={permission.displayName}
                        secondary={permission.businessPurpose}
                      />
                      <ListItemSecondaryAction>
                        {!readOnly && (
                          <Switch
                            checked={permission.granted}
                            onChange={() => handlePermissionToggle(permission)}
                            color="primary"
                          />
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </CardContent>
    </Card>
  );

  const renderTechnicalPermissionView = () => {
    const allPermissions = [
      ...permissionManagement.excessivePermissions,
      ...permissionManagement.missingPermissions
    ];

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <CodeIcon color="primary" />
            Technical Permissions
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Permission</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>Usage</TableCell>
                  <TableCell>Data Access</TableCell>
                  {!readOnly && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {allPermissions.map((permission) => (
                  <TableRow key={permission.scopeId}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {permission.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {permission.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {permission.granted ? 
                          <CheckCircleIcon color="success" fontSize="small" /> : 
                          <ErrorIcon color="error" fontSize="small" />
                        }
                        <Typography variant="body2">
                          {permission.granted ? 'Granted' : 'Not Granted'}
                        </Typography>
                        {permission.required && (
                          <Chip label="Required" size="small" color="primary" />
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={permission.riskLevel}
                        size="small"
                        color={getRiskLevelColor(permission.riskLevel)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {permission.usageFrequency}
                        </Typography>
                        {permission.lastUsed && (
                          <Typography variant="caption" color="text.secondary">
                            Last used: {new Date(permission.lastUsed).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        {permission.dataAccess.map((access, index) => (
                          <Chip
                            key={index}
                            label={`${access.dataType}: ${access.accessLevel}`}
                            size="small"
                            variant="outlined"
                            color={access.businessNecessity === 'essential' ? 'primary' :
                                   access.businessNecessity === 'important' ? 'secondary' : 'default'}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    
                    {!readOnly && (
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title={permission.granted ? 'Revoke permission' : 'Grant permission'}>
                            <IconButton
                              size="small"
                              onClick={() => handlePermissionToggle(permission)}
                              color={permission.granted ? 'error' : 'success'}
                            >
                              {permission.granted ? <RemoveIcon /> : <AddIcon />}
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="View details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedPermission(permission)}
                            >
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  const renderApprovalDialog = () => (
    <Dialog
      open={approvalDialogOpen}
      onClose={() => setApprovalDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Permission Change Request
      </DialogTitle>
      
      <DialogContent>
        {selectedPermission && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              You are requesting to {permissionRequests[permissionRequests.length - 1]?.action} the following permission:
            </Alert>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedPermission.displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedPermission.description}
                </Typography>
                
                <Box display="flex" gap={2} mb={2}>
                  <Chip
                    label={`Risk: ${selectedPermission.riskLevel}`}
                    size="small"
                    color={getRiskLevelColor(selectedPermission.riskLevel)}
                  />
                  <Chip
                    label={selectedPermission.required ? 'Required' : 'Optional'}
                    size="small"
                    color={selectedPermission.required ? 'primary' : 'default'}
                  />
                  <Chip
                    label={selectedPermission.sensitive ? 'Sensitive' : 'Standard'}
                    size="small"
                    color={selectedPermission.sensitive ? 'warning' : 'default'}
                  />
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Business Purpose:
                </Typography>
                <Typography variant="body2" paragraph>
                  {selectedPermission.businessPurpose}
                </Typography>

                <Typography variant="subtitle2" gutterBottom>
                  Business Implications:
                </Typography>
                <Typography variant="body2">
                  {selectedPermission.businessImplications}
                </Typography>
              </CardContent>
            </Card>

            <Stepper activeStep={activeStep} orientation="vertical">
              <Step>
                <StepLabel>Business Justification</StepLabel>
                <StepContent>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Explain the business need for this permission change"
                    placeholder="Describe why this permission change is necessary for business operations..."
                    sx={{ mb: 2 }}
                  />
                  <Button onClick={() => setActiveStep(1)}>
                    Continue
                  </Button>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>Risk Assessment</StepLabel>
                <StepContent>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    This permission change has a <strong>{selectedPermission.riskLevel}</strong> risk level.
                    Please confirm you understand the implications.
                  </Alert>
                  <FormControlLabel
                    control={<Switch />}
                    label="I understand the security and compliance implications"
                    sx={{ mb: 2 }}
                  />
                  <Box>
                    <Button onClick={() => setActiveStep(0)} sx={{ mr: 1 }}>
                      Back
                    </Button>
                    <Button onClick={() => setActiveStep(2)}>
                      Continue
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>Review and Submit</StepLabel>
                <StepContent>
                  <Typography variant="body2" paragraph>
                    Your permission change request will be submitted for approval based on your organization's workflow.
                  </Typography>
                  <Box>
                    <Button onClick={() => setActiveStep(1)} sx={{ mr: 1 }}>
                      Back
                    </Button>
                    <Button variant="contained" color="primary">
                      Submit Request
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setApprovalDialogOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderAuditDialog = () => (
    <Dialog
      open={auditDialogOpen}
      onClose={() => setAuditDialogOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        Permission Audit Trail
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Complete history of permission changes, approvals, and reviews for this service.
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Approver</TableCell>
                <TableCell>Business Impact</TableCell>
                <TableCell>Risk Assessment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissionManagement.approvalWorkflow.auditTrail.map((audit) => (
                <TableRow key={audit.auditId}>
                  <TableCell>
                    {new Date(audit.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={audit.action.replace('_', ' ')}
                      size="small"
                      color={audit.action.includes('approved') ? 'success' :
                             audit.action.includes('rejected') ? 'error' :
                             audit.action.includes('escalated') ? 'warning' : 'info'}
                    />
                  </TableCell>
                  <TableCell>
                    {audit.approverId || 'System'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {audit.businessImpact}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {audit.riskAssessment && (
                      <Typography variant="caption" color="text.secondary">
                        {audit.riskAssessment}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setAuditDialogOpen(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {renderPermissionOverview()}
      
      {businessViewMode ? renderBusinessFunctionView() : renderTechnicalPermissionView()}
      
      {renderApprovalDialog()}
      {renderAuditDialog()}
    </Box>
  );
};

export default PermissionManager;