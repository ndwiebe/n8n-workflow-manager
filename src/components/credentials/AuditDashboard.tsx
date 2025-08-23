import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
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
  Paper,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  // DatePicker, // Temporarily disabled - needs @mui/x-date-pickers
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Security as SecurityIcon,
  Gavel as ComplianceIcon,
  Timeline as TimelineIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as ReportIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Code as TechnicalIcon,
  Verified as VerifiedIcon,
  Flag as FlagIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as AnalyticsIcon,
  FileDownload as ExportIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Share as ShareIcon
} from '@mui/icons-material';
// Temporarily disabled - needs @mui/x-date-pickers package
// import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  SecurityAuditLog,
  SecurityAuditEventType,
  ComplianceFramework,
  GeoLocation
} from '../../types/smartCredentials';

interface AuditDashboardProps {
  organizationId: string;
  serviceId?: string;
  workflowId?: string;
  initialDateRange?: {
    start: Date;
    end: Date;
  };
  showComplianceView?: boolean;
  onExportAudit?: (filters: AuditFilters, format: 'csv' | 'json' | 'pdf') => void;
}

interface AuditFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  eventTypes: SecurityAuditEventType[];
  eventCategories: string[];
  severity: string[];
  users: string[];
  services: string[];
  complianceRelevant: boolean | null;
  riskScoreRange: {
    min: number;
    max: number;
  };
  searchQuery: string;
}

interface AuditSummary {
  totalEvents: number;
  criticalEvents: number;
  complianceEvents: number;
  uniqueUsers: number;
  uniqueServices: number;
  riskTrend: 'improving' | 'stable' | 'degrading';
  topEventTypes: Array<{
    type: SecurityAuditEventType;
    count: number;
    businessImpact: string;
  }>;
  complianceStatus: {
    frameworks: ComplianceFramework[];
    overallScore: number;
    criticalGaps: number;
  };
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({
  organizationId,
  serviceId,
  workflowId,
  initialDateRange,
  showComplianceView = false,
  onExportAudit
}) => {
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SecurityAuditLog[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: {
      start: initialDateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: initialDateRange?.end || new Date()
    },
    eventTypes: [],
    eventCategories: [],
    severity: [],
    users: [],
    services: serviceId ? [serviceId] : [],
    complianceRelevant: null,
    riskScoreRange: { min: 0, max: 100 },
    searchQuery: ''
  });
  const [currentTab, setCurrentTab] = useState(showComplianceView ? 1 : 0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    loadAuditData();
  }, [organizationId, serviceId, workflowId, filters]);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, filters]);

  const loadAuditData = async () => {
    // In a real implementation, this would fetch from the backend
    // For now, we'll generate sample audit data
    const sampleLogs = generateSampleAuditLogs();
    setAuditLogs(sampleLogs);
    
    const summary = calculateAuditSummary(sampleLogs);
    setAuditSummary(summary);
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    // Date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(log => log.timestamp >= filters.dateRange.start!);
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(log => log.timestamp <= filters.dateRange.end!);
    }

    // Event type filter
    if (filters.eventTypes.length > 0) {
      filtered = filtered.filter(log => filters.eventTypes.includes(log.eventType));
    }

    // Event category filter
    if (filters.eventCategories.length > 0) {
      filtered = filtered.filter(log => filters.eventCategories.includes(log.eventCategory));
    }

    // Severity filter
    if (filters.severity.length > 0) {
      filtered = filtered.filter(log => filters.severity.includes(log.severity));
    }

    // User filter
    if (filters.users.length > 0) {
      filtered = filtered.filter(log => log.userId && filters.users.includes(log.userId));
    }

    // Service filter
    if (filters.services.length > 0) {
      filtered = filtered.filter(log => log.serviceId && filters.services.includes(log.serviceId));
    }

    // Compliance relevant filter
    if (filters.complianceRelevant !== null) {
      filtered = filtered.filter(log => log.complianceRelevant === filters.complianceRelevant);
    }

    // Risk score range filter
    filtered = filtered.filter(log => 
      log.riskScore >= filters.riskScoreRange.min && 
      log.riskScore <= filters.riskScoreRange.max
    );

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(query) ||
        log.businessContext.toLowerCase().includes(query) ||
        log.eventType.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const generateSampleAuditLogs = (): SecurityAuditLog[] => {
    const eventTypes = Object.values(SecurityAuditEventType);
    const categories = ['authentication', 'authorization', 'data_access', 'configuration', 'compliance', 'incident'];
    const severities = ['info', 'warning', 'error', 'critical'];
    const users = ['user1', 'user2', 'admin1', 'service_account'];
    const services = ['gmail', 'slack', 'salesforce', 'shopify'];

    return Array.from({ length: 100 }, (_, index) => ({
      logId: `log_${index + 1}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      organizationId,
      userId: Math.random() > 0.3 ? users[Math.floor(Math.random() * users.length)] : undefined,
      serviceId: Math.random() > 0.2 ? services[Math.floor(Math.random() * services.length)] : undefined,
      workflowId: Math.random() > 0.5 ? `workflow_${Math.floor(Math.random() * 10)}` : undefined,
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      eventCategory: categories[Math.floor(Math.random() * categories.length)] as any,
      severity: severities[Math.floor(Math.random() * severities.length)] as any,
      description: `Sample audit event ${index + 1} - ${eventTypes[Math.floor(Math.random() * eventTypes.length)]}`,
      businessContext: `Business context for event ${index + 1} - impact on operations and compliance`,
      technicalDetails: {
        requestId: `req_${index + 1}`,
        endpoint: '/api/v1/credentials',
        method: 'POST',
        statusCode: Math.random() > 0.8 ? 400 : 200
      },
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
        riskScore: Math.floor(Math.random() * 30)
      },
      riskScore: Math.floor(Math.random() * 100),
      complianceRelevant: Math.random() > 0.4,
      retentionPeriod: 2555, // 7 years
      businessImpact: `Business impact description for event ${index + 1}`,
      followUpRequired: Math.random() > 0.8,
      investigationStatus: Math.random() > 0.9 ? 'open' : undefined
    }));
  };

  const calculateAuditSummary = (logs: SecurityAuditLog[]): AuditSummary => {
    const total = logs.length;
    const critical = logs.filter(l => l.severity === 'critical').length;
    const compliance = logs.filter(l => l.complianceRelevant).length;
    const uniqueUsers = new Set(logs.map(l => l.userId).filter(Boolean)).size;
    const uniqueServices = new Set(logs.map(l => l.serviceId).filter(Boolean)).size;

    // Calculate top event types
    const eventTypeCounts = logs.reduce((acc, log) => {
      acc[log.eventType] = (acc[log.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEventTypes = Object.entries(eventTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type: type as SecurityAuditEventType,
        count,
        businessImpact: getBusinessImpactForEventType(type as SecurityAuditEventType)
      }));

    return {
      totalEvents: total,
      criticalEvents: critical,
      complianceEvents: compliance,
      uniqueUsers,
      uniqueServices,
      riskTrend: critical > total * 0.1 ? 'degrading' : 'stable',
      topEventTypes,
      complianceStatus: {
        frameworks: [],
        overallScore: Math.max(0, 100 - (critical / total) * 100),
        criticalGaps: critical
      }
    };
  };

  const getBusinessImpactForEventType = (eventType: SecurityAuditEventType): string => {
    const impacts: Record<string, string> = {
      [SecurityAuditEventType.USER_LOGIN]: 'User access to business systems',
      [SecurityAuditEventType.LOGIN_FAILED]: 'Potential security threat or user access issues',
      [SecurityAuditEventType.CREDENTIAL_ACCESSED]: 'Access to sensitive business authentication data',
      [SecurityAuditEventType.PERMISSION_GRANTED]: 'Changes to user access rights and capabilities',
      [SecurityAuditEventType.COMPLIANCE_VIOLATION]: 'Regulatory compliance and legal risks',
      [SecurityAuditEventType.SECURITY_INCIDENT_DETECTED]: 'Immediate threat to business operations and data'
    };
    return impacts[eventType] || 'General business system activity';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'error': return <ErrorIcon color="warning" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const renderSummaryCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="between">
              <Box>
                <Typography variant="h4" color="primary">
                  {auditSummary?.totalEvents || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Events
                </Typography>
              </Box>
              <TimelineIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="between">
              <Box>
                <Typography variant="h4" color="error">
                  {auditSummary?.criticalEvents || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Critical Events
                </Typography>
              </Box>
              <ErrorIcon color="error" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="between">
              <Box>
                <Typography variant="h4" color="warning.main">
                  {auditSummary?.complianceEvents || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Compliance Events
                </Typography>
              </Box>
              <ComplianceIcon color="warning" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="between">
              <Box>
                <Typography variant="h4" color="success.main">
                  {auditSummary?.complianceStatus.overallScore.toFixed(0) || 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Compliance Score
                </Typography>
              </Box>
              <VerifiedIcon color="success" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <FilterIcon />
          Audit Filters
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
              }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="date"
              value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
              }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                multiple
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  severity: e.target.value as string[]
                }))}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {['info', 'warning', 'error', 'critical'].map((severity) => (
                  <MenuItem key={severity} value={severity}>
                    {severity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              placeholder="Search events..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                searchQuery: e.target.value
              }))}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredLogs.length} of {auditLogs.length} events
          </Typography>
          
          <Box display="flex" gap={1}>
            <Button
              size="small"
              onClick={() => setExportDialogOpen(true)}
              startIcon={<ExportIcon />}
            >
              Export
            </Button>
            <Button
              size="small"
              onClick={() => setFilters({
                dateRange: { start: null, end: null },
                eventTypes: [],
                eventCategories: [],
                severity: [],
                users: [],
                services: serviceId ? [serviceId] : [],
                complianceRelevant: null,
                riskScoreRange: { min: 0, max: 100 },
                searchQuery: ''
              })}
            >
              Clear Filters
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderAuditTable = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Audit Events
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Risk Score</TableCell>
                <TableCell>Compliance</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => (
                  <TableRow key={log.logId} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {log.timestamp.toLocaleString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getSeverityIcon(log.severity)}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {log.eventType.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.eventCategory}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={log.severity}
                        size="small"
                        color={log.severity === 'critical' ? 'error' :
                               log.severity === 'error' ? 'warning' :
                               log.severity === 'warning' ? 'warning' : 'info'}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {log.userId || 'System'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {log.serviceId || '-'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">
                          {log.riskScore}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={log.riskScore}
                          color={log.riskScore >= 70 ? 'error' :
                                 log.riskScore >= 40 ? 'warning' : 'success'}
                          sx={{ width: 50 }}
                        />
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      {log.complianceRelevant && (
                        <Chip
                          label="Compliance"
                          size="small"
                          color="secondary"
                          icon={<ComplianceIcon />}
                        />
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredLogs.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </CardContent>
    </Card>
  );

  const renderComplianceView = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Framework Status
            </Typography>
            
            {/* This would show actual compliance frameworks */}
            <Alert severity="info" sx={{ mb: 2 }}>
              Compliance framework assessment requires configuration of your organization's regulatory requirements.
            </Alert>
            
            <Typography variant="body2" color="text.secondary">
              Configure compliance frameworks in Security Settings to see detailed compliance tracking.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Events
            </Typography>
            
            <List>
              {filteredLogs
                .filter(log => log.complianceRelevant)
                .slice(0, 5)
                .map((log) => (
                  <ListItem key={log.logId}>
                    <ListItemIcon>
                      {getSeverityIcon(log.severity)}
                    </ListItemIcon>
                    <ListItemText
                      primary={log.eventType.replace(/_/g, ' ')}
                      secondary={log.timestamp.toLocaleDateString()}
                    />
                  </ListItem>
                ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderEventDetailDialog = () => (
    <Dialog
      open={detailDialogOpen}
      onClose={() => setDetailDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Event Details
      </DialogTitle>
      
      <DialogContent>
        {selectedLog && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Event Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Event Type"
                      secondary={selectedLog.eventType.replace(/_/g, ' ')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Timestamp"
                      secondary={selectedLog.timestamp.toLocaleString()}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Severity"
                      secondary={
                        <Chip
                          label={selectedLog.severity}
                          size="small"
                          color={selectedLog.severity === 'critical' ? 'error' : 'warning'}
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Risk Score"
                      secondary={`${selectedLog.riskScore}/100`}
                    />
                  </ListItem>
                </List>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Context Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="User"
                      secondary={selectedLog.userId || 'System'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Service"
                      secondary={selectedLog.serviceId || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="IP Address"
                      secondary={selectedLog.ipAddress || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Compliance Relevant"
                      secondary={selectedLog.complianceRelevant ? 'Yes' : 'No'}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Description
            </Typography>
            <Typography variant="body2" paragraph>
              {selectedLog.description}
            </Typography>

            <Typography variant="subtitle2" gutterBottom>
              Business Context
            </Typography>
            <Typography variant="body2" paragraph>
              {selectedLog.businessContext}
            </Typography>

            <Typography variant="subtitle2" gutterBottom>
              Technical Details
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selectedLog.technicalDetails, null, 2)}
              </pre>
            </Paper>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setDetailDialogOpen(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderExportDialog = () => (
    <Dialog
      open={exportDialogOpen}
      onClose={() => setExportDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Export Audit Data
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Export filtered audit data for compliance reporting, analysis, or archival purposes.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Export Format
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={() => onExportAudit?.(filters, 'csv')}
                >
                  CSV
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={() => onExportAudit?.(filters, 'json')}
                >
                  JSON
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => onExportAudit?.(filters, 'pdf')}
                >
                  PDF Report
                </Button>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info">
              <strong>{filteredLogs.length} events</strong> will be included in the export based on current filters.
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setExportDialogOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {renderSummaryCards()}

      <Tabs
        value={currentTab}
        onChange={(_, newValue) => setCurrentTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Audit Events" icon={<TimelineIcon />} />
        <Tab label="Compliance View" icon={<ComplianceIcon />} />
        <Tab label="Analytics" icon={<AnalyticsIcon />} />
      </Tabs>

      {currentTab === 0 && (
        <>
          {renderFilters()}
          {renderAuditTable()}
        </>
      )}

      {currentTab === 1 && renderComplianceView()}

      {currentTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Audit Analytics
            </Typography>
            <Alert severity="info">
              Advanced audit analytics and reporting features coming soon.
            </Alert>
          </CardContent>
        </Card>
      )}

      {renderEventDetailDialog()}
      {renderExportDialog()}
    </Box>
  );
};

export default AuditDashboard;