import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Analytics as AnalyticsIcon,
  Webhook as WebhookIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { n8nService, N8nWorkflow } from '../../services/n8nService';
import { workflowCurationService, ClientWorkflowTemplate } from '../../services/workflowCurationService';

// XSS Protection utility
const sanitizeInput = {
  /**
   * Sanitize user input to prevent XSS attacks
   */
  sanitizeText: (input: string): string => {
    if (!input) return '';
    
    // Remove HTML tags and escape special characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocols
      .trim();
  },

  /**
   * Validate and sanitize business metadata
   */
  validateBusinessMetadata: (metadata: any): { isValid: boolean; errors: string[]; sanitized: any } => {
    const errors: string[] = [];
    const sanitized = { ...metadata };

    // Sanitize text fields
    if (sanitized.businessName) {
      const original = sanitized.businessName;
      sanitized.businessName = sanitizeInput.sanitizeText(original);
      if (sanitized.businessName.length === 0 && original.length > 0) {
        errors.push('Business name contains invalid characters');
      }
      if (sanitized.businessName.length > 100) {
        errors.push('Business name is too long (max 100 characters)');
      }
    }

    if (sanitized.businessDescription) {
      const original = sanitized.businessDescription;
      sanitized.businessDescription = sanitizeInput.sanitizeText(original);
      if (sanitized.businessDescription.length === 0 && original.length > 0) {
        errors.push('Business description contains invalid characters');
      }
      if (sanitized.businessDescription.length > 1000) {
        errors.push('Business description is too long (max 1000 characters)');
      }
    }

    // Sanitize features array
    if (sanitized.features && Array.isArray(sanitized.features)) {
      sanitized.features = sanitized.features
        .map((feature: string) => sanitizeInput.sanitizeText(String(feature)))
        .filter((feature: string) => feature.length > 0);
    }

    // Validate numeric fields
    if (sanitized.monthlyValue && (isNaN(sanitized.monthlyValue) || sanitized.monthlyValue < 0)) {
      errors.push('Monthly value must be a positive number');
      sanitized.monthlyValue = 0;
    }

    return { isValid: errors.length === 0, errors, sanitized };
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const WorkflowAdminPanel: React.FC = () => {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [businessMetadata, setBusinessMetadata] = useState<Partial<ClientWorkflowTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'client-ready' | 'internal-only' | 'consultant-demo'>('all');

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Load registered webhooks from localStorage with validation
  const loadRegisteredWebhooks = () => {
    try {
      const stored = localStorage.getItem('n8n-registered-webhooks');
      if (!stored) return;
      
      const webhooks = JSON.parse(stored);
      if (!Array.isArray(webhooks)) {
        console.warn('Invalid webhook data format in storage, resetting');
        localStorage.removeItem('n8n-registered-webhooks');
        return;
      }
      
      // Validate and filter webhooks
      const validWebhooks = webhooks.filter(webhook => {
        if (!webhook || typeof webhook !== 'object') return false;
        if (!webhook.workflowId || typeof webhook.workflowId !== 'string') return false;
        if (!webhook.webhookUrl || typeof webhook.webhookUrl !== 'string') return false;
        
        // Validate the webhook URL
        const validation = validateWebhookUrl(webhook.webhookUrl);
        if (!validation.isValid) {
          console.warn(`Skipping invalid webhook URL: ${webhook.webhookUrl}`);
          return false;
        }
        
        return true;
      });
      
      const webhookMap = new Map();
      validWebhooks.forEach((webhook: any) => {
        webhookMap.set(webhook.workflowId, webhook);
      });
      
      setRegisteredWebhooks(webhookMap);
      console.log(`📡 Loaded ${validWebhooks.length} valid webhooks from localStorage`);
      
      // If any webhooks were filtered out, update storage
      if (validWebhooks.length < webhooks.length) {
        localStorage.setItem('n8n-registered-webhooks', JSON.stringify(validWebhooks));
      }
    } catch (error) {
      console.error('Failed to load registered webhooks:', error);
      // Don't clear storage on error - user might fix the issue
      setRegisteredWebhooks(new Map());
    }
  };

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const workflowList = await n8nService.getWorkflows();
      setWorkflows(workflowList);
      
      // Also load registered webhooks
      loadRegisteredWebhooks();
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowVisibility = (workflow: N8nWorkflow): 'client-ready' | 'internal-only' | 'consultant-demo' | 'none' => {
    // Use the workflowCurationService helper method
    return workflowCurationService.getWorkflowVisibility(workflow.id);
  };

  const filteredWorkflows = workflows.filter(workflow => {
    if (visibilityFilter === 'all') return true;
    return getWorkflowVisibility(workflow) === visibilityFilter;
  });

  const handleVisibilityChange = async (workflowId: string, visibility: 'client-ready' | 'internal-only' | 'consultant-demo') => {
    try {
      console.log(`🔄 Changing workflow ${workflowId} visibility to: ${visibility}`);
      await workflowCurationService.setWorkflowVisibility(workflowId, visibility);
      console.log(`✅ Successfully changed workflow ${workflowId} visibility to: ${visibility}`);
      
      // Show success message to user
      alert(`✅ Successfully changed workflow visibility to "${visibility}"`);
      
      await loadWorkflows(); // Reload to see changes
    } catch (error) {
      console.error('❌ Failed to update workflow visibility:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to update workflow visibility: ${errorMessage}\n\nPlease check your n8n connection and try again.`);
    }
  };

  const handleEditMetadata = async (workflow: N8nWorkflow) => {
    setSelectedWorkflow(workflow);
    
    // Try to get existing template metadata
    try {
      const analysis = await workflowCurationService.analyzeWorkflow(workflow.id);
      setBusinessMetadata(analysis.suggestedTemplate);
    } catch (error) {
      // If no existing metadata, start with empty
      setBusinessMetadata({
        businessName: workflow.name,
        businessDescription: '',
        category: 'Operations',
        industry: ['Small Business'],
        difficulty: 'beginner',
        setupTime: '10-30 minutes',
        monthlyValue: 500,
        timesSaved: '2-5 hours per week',
        features: [],
        consultantOnly: false
      });
    }
    
    setEditDialogOpen(true);
  };

  const handleSaveMetadata = async () => {
    if (!selectedWorkflow) return;
    
    try {
      setSaving(true);
      
      // Validate and sanitize business metadata before saving
      const validation = sanitizeInput.validateBusinessMetadata(businessMetadata);
      
      if (!validation.isValid) {
        // Show validation errors to user
        console.error('Validation errors:', validation.errors);
        alert('Please fix the following errors:\n' + validation.errors.join('\n'));
        return;
      }
      
      // Use sanitized data for template creation
      await workflowCurationService.createClientTemplate(selectedWorkflow.id, validation.sanitized);
      setEditDialogOpen(false);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to save metadata:', error);
      alert('Failed to save metadata. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (workflowId: string, currentActive: boolean) => {
    try {
      await n8nService.setWorkflowActive(workflowId, !currentActive);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow active state:', error);
    }
  };

  // Add webhook management functionality
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [selectedWorkflowForWebhook, setSelectedWorkflowForWebhook] = useState<N8nWorkflow | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMethod, setWebhookMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [webhookPath, setWebhookPath] = useState('');
  const [detectedWebhooks, setDetectedWebhooks] = useState<string[]>([]);
  const [registeredWebhooks, setRegisteredWebhooks] = useState<Map<string, any>>(new Map());

  // Function to detect existing webhooks in workflow with improved error handling
  const detectExistingWebhooks = (workflow: N8nWorkflow): string[] => {
    const webhooks: string[] = [];
    
    // Use environment variable or default to production URL
    const baseUrl = process.env.REACT_APP_N8N_BASE_URL?.replace('/api/n8n', '') || 'https://n8n.workflowhub.space';
    
    if (!workflow?.nodes || !Array.isArray(workflow.nodes)) {
      console.warn(`Invalid workflow structure for webhook detection: ${workflow?.id}`);
      return webhooks;
    }
    
    try {
      workflow.nodes.forEach(node => {
        if (!node || typeof node !== 'object') return;
        
        let webhookId: string | null = null;
        
        // Check for chat trigger nodes
        if (node.type === '@n8n/n8n-nodes-langchain.chatTrigger' && (node as any).webhookId) {
          webhookId = String((node as any).webhookId);
        }
        // Check for webhook trigger nodes
        else if (node.type === 'n8n-nodes-base.webhook' && node.parameters?.path) {
          webhookId = String(node.parameters.path);
        }
        // Check for tool nodes with webhookId
        else if ((node as any).webhookId) {
          webhookId = String((node as any).webhookId);
        }
        
        // Add valid webhook URL
        if (webhookId && webhookId.length > 0) {
          const webhookUrl = `${baseUrl}/webhook/${webhookId}`;
          // Validate the constructed URL
          const validation = validateWebhookUrl(webhookUrl);
          if (validation.isValid && !webhooks.includes(webhookUrl)) {
            webhooks.push(webhookUrl);
          }
        }
      });
    } catch (error) {
      console.error('Error detecting webhooks in workflow:', error);
    }
    
    return webhooks;
  };

  const handleAddWebhook = (workflow: N8nWorkflow) => {
    setSelectedWorkflowForWebhook(workflow);
    
    // Detect existing webhooks in the workflow
    const existingWebhooks = detectExistingWebhooks(workflow);
    setDetectedWebhooks(existingWebhooks);
    
    // If there are existing webhooks, pre-fill the first one
    if (existingWebhooks.length > 0) {
      setWebhookUrl(existingWebhooks[0]);
    } else {
      setWebhookUrl('');
    }
    
    setWebhookPath(workflow.name.toLowerCase().replace(/\s+/g, '-'));
    setWebhookDialogOpen(true);
  };

  // Add webhook URL validation with security improvements
  const validateWebhookUrl = (url: string): { isValid: boolean; error?: string } => {
    if (!url.trim()) {
      return { isValid: false, error: 'Webhook URL is required' };
    }
    
    try {
      const urlObj = new URL(url);
      
      // Strict hostname validation to prevent bypassing
      const allowedHosts = ['n8n.workflowhub.space', 'localhost', '127.0.0.1'];
      if (!allowedHosts.includes(urlObj.hostname)) {
        return { isValid: false, error: 'Webhook URL must be from an authorized n8n instance' };
      }
      
      // Ensure HTTPS for production URLs
      if (urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1' && urlObj.protocol !== 'https:') {
        return { isValid: false, error: 'Webhook URL must use HTTPS for security' };
      }
      
      // Validate webhook path structure
      if (!urlObj.pathname.startsWith('/webhook/') || urlObj.pathname.length < 10) {
        return { isValid: false, error: 'Invalid webhook path format' };
      }
      
      // Check for suspicious patterns
      if (urlObj.search || urlObj.hash) {
        return { isValid: false, error: 'Webhook URL should not contain query parameters or fragments' };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  };

  const handleSaveWebhook = async () => {
    if (!selectedWorkflowForWebhook || !webhookUrl) return;
    
    // Validate the webhook URL
    const validation = validateWebhookUrl(webhookUrl);
    if (!validation.isValid) {
      alert(`❌ Invalid webhook URL: ${validation.error}`);
      return;
    }
    
    try {
      setSaving(true);
      
      // Save webhook configuration to local storage
      const webhookConfig = {
        workflowId: selectedWorkflowForWebhook.id,
        workflowName: selectedWorkflowForWebhook.name,
        webhookUrl: webhookUrl.trim(),
        method: webhookMethod,
        description: webhookPath || 'Registered webhook',
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      console.log('Saving webhook configuration:', webhookConfig);
      
      // Store in localStorage with error handling
      let existingWebhooks: any[] = [];
      try {
        const stored = localStorage.getItem('n8n-registered-webhooks');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            existingWebhooks = parsed;
          }
        }
      } catch (parseError) {
        console.error('Failed to parse existing webhooks, starting fresh:', parseError);
        existingWebhooks = [];
      }
      
      // Remove any existing webhook for this workflow
      const filteredWebhooks = existingWebhooks.filter(
        (w: any) => w && w.workflowId !== selectedWorkflowForWebhook.id
      );
      
      // Add the new webhook configuration
      filteredWebhooks.push(webhookConfig);
      
      // Try to save with error handling
      try {
        const serialized = JSON.stringify(filteredWebhooks);
        
        // Check localStorage quota (roughly 5MB limit)
        if (serialized.length > 5000000) {
          throw new Error('Webhook data exceeds storage limit');
        }
        
        localStorage.setItem('n8n-registered-webhooks', serialized);
      } catch (storageError) {
        console.error('Failed to save webhooks to storage:', storageError);
        alert('⚠️ Failed to save webhook configuration to browser storage. The webhook may not persist after refresh.');
      }
      
      // Reload registered webhooks to update the display
      loadRegisteredWebhooks();
      
      setWebhookDialogOpen(false);
      alert(`✅ Webhook registered successfully!\n\nURL: ${webhookUrl}\nMethod: ${webhookMethod}\n\nThis webhook is now available for client integration.`);
      
    } catch (error) {
      console.error('Failed to save webhook:', error);
      alert('❌ Failed to save webhook configuration');
    } finally {
      setSaving(false);
    }
  };

  // Add webhook testing functionality with security and timeout
  const handleTestWebhook = async (workflowId: string) => {
    const registeredWebhook = registeredWebhooks.get(workflowId);
    if (!registeredWebhook) {
      alert('❌ No webhook registered for this workflow');
      return;
    }
    
    // Validate webhook URL again before testing
    const validation = validateWebhookUrl(registeredWebhook.webhookUrl);
    if (!validation.isValid) {
      alert(`❌ Invalid webhook URL: ${validation.error}`);
      return;
    }
    
    try {
      setSaving(true);
      console.log(`🧪 Testing webhook: ${registeredWebhook.webhookUrl}`);
      
      // Create test payload with unique ID for tracking
      const testPayload = {
        test: true,
        testId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: 'n8n-workflow-manager',
        message: 'Test webhook from admin panel',
        workflowId: workflowId
      };
      
      // Add timeout and abort controller for better control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        // Make test request to webhook with timeout
        const response = await fetch(registeredWebhook.webhookUrl, {
          method: registeredWebhook.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Request': 'true', // Mark as test request
            'X-Request-ID': testPayload.testId
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal,
          mode: 'cors', // Ensure CORS mode
          credentials: 'omit' // Don't send cookies for security
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const responseText = await response.text();
          const preview = responseText.substring(0, 200);
          alert(`✅ Webhook test successful!\n\nStatus: ${response.status}\nTest ID: ${testPayload.testId}\nResponse: ${preview}${responseText.length > 200 ? '...' : ''}`);
        } else {
          alert(`⚠️ Webhook responded with status ${response.status}\n\nThis may be normal depending on your workflow configuration.\nTest ID: ${testPayload.testId}`);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          alert(`⏱️ Webhook test timed out after 10 seconds.\n\nPlease check if the workflow is active and the webhook is properly configured.`);
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Failed to fetch')) {
        alert(`❌ Unable to reach webhook URL.\n\nPossible causes:\n- Workflow is not active\n- CORS restrictions\n- Network connectivity issues\n- Invalid webhook URL`);
      } else {
        alert(`❌ Webhook test failed: ${errorMessage}\n\nPlease verify the webhook URL and ensure the workflow is active.`);
      }
    } finally {
      setSaving(false);
    }
  };


  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.active).length,
    clientReady: workflows.filter(w => getWorkflowVisibility(w) === 'client-ready').length,
    internalOnly: workflows.filter(w => getWorkflowVisibility(w) === 'internal-only').length,
    consultantDemo: workflows.filter(w => getWorkflowVisibility(w) === 'consultant-demo').length,
    unconfigured: workflows.filter(w => getWorkflowVisibility(w) === 'none').length
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading workflows...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Workflow Administration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure workflow visibility, business metadata, and client-facing settings.
        </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total Workflows</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color="success.main">{stats.active}</Typography>
              <Typography variant="body2" color="text.secondary">Active</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color="primary.main">{stats.clientReady}</Typography>
              <Typography variant="body2" color="text.secondary">Client Ready</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color="warning.main">{stats.consultantDemo}</Typography>
              <Typography variant="body2" color="text.secondary">Demo Only</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">{stats.internalOnly}</Typography>
              <Typography variant="body2" color="text.secondary">Internal Only</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color="error.main">{stats.unconfigured}</Typography>
              <Typography variant="body2" color="text.secondary">Unconfigured</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Workflow Management" />
          <Tab label="Template Configuration" />
          <Tab label="Analytics & Reports" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        {/* Workflow Management */}
        <Box mb={3}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Visibility</InputLabel>
            <Select
              value={visibilityFilter}
              label="Filter by Visibility"
              onChange={(e) => setVisibilityFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Workflows</MenuItem>
              <MenuItem value="client-ready">Client Ready</MenuItem>
              <MenuItem value="consultant-demo">Demo Only</MenuItem>
              <MenuItem value="internal-only">Internal Only</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Visibility</TableCell>
                <TableCell>Webhooks</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredWorkflows.map((workflow) => {
                const visibility = getWorkflowVisibility(workflow);
                return (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {workflow.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {workflow.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Chip
                          label={workflow.active ? 'Active' : 'Inactive'}
                          color={workflow.active ? 'success' : 'default'}
                          size="small"
                        />
                        <Tooltip title={workflow.active ? 'Deactivate workflow' : 'Activate workflow'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleActive(workflow.id, workflow.active)}
                          >
                            {workflow.active ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                          value={visibility === 'none' ? 'internal-only' : visibility}
                          onChange={(e) => handleVisibilityChange(workflow.id, e.target.value as any)}
                        >
                          <MenuItem value="client-ready">Client Ready</MenuItem>
                          <MenuItem value="consultant-demo">Demo Only</MenuItem>
                          <MenuItem value="internal-only">Internal Only</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const detectedWebhooks = detectExistingWebhooks(workflow);
                        const registeredWebhook = registeredWebhooks.get(workflow.id);
                        
                        if (registeredWebhook) {
                          return (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label="Registered"
                                color="success"
                                size="small"
                                icon={<WebhookIcon />}
                              />
                              <Tooltip title={`Registered URL: ${registeredWebhook.webhookUrl.substring(0, 50)}...`}>
                                <IconButton size="small">
                                  <LinkIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Test webhook">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleTestWebhook(workflow.id)}
                                  color="primary"
                                  disabled={saving}
                                >
                                  <PlayArrowIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          );
                        } else if (detectedWebhooks.length > 0) {
                          return (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={`${detectedWebhooks.length} Detected`}
                                color="warning"
                                size="small"
                                icon={<WebhookIcon />}
                              />
                              <Tooltip title="Webhooks detected but not registered. Click to register.">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleAddWebhook(workflow)}
                                  color="primary"
                                >
                                  <LinkIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          );
                        } else {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              No webhooks
                            </Typography>
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      {new Date(workflow.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Edit business metadata">
                          <IconButton
                            size="small"
                            onClick={() => handleEditMetadata(workflow)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Configure webhook">
                          <IconButton
                            size="small"
                            onClick={() => handleAddWebhook(workflow)}
                            color="secondary"
                          >
                            <WebhookIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View analytics">
                          <IconButton size="small" color="secondary">
                            <AnalyticsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Template Configuration */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Configure business metadata for workflows marked as "Client Ready" to make them appear in the client catalog with proper descriptions and pricing.
        </Alert>
        
        <Typography variant="h6" gutterBottom>Client-Ready Workflows</Typography>
        
        <Grid container spacing={2}>
          {workflows
            .filter(w => getWorkflowVisibility(w) === 'client-ready')
            .map(workflow => (
              <Grid item xs={12} md={6} key={workflow.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{workflow.name}</Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip
                        label="Client Ready"
                        color="success"
                        size="small"
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditMetadata(workflow)}
                      >
                        Configure
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          }
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Analytics & Reports */}
        <Typography variant="h6" gutterBottom>Analytics Dashboard</Typography>
        <Alert severity="info">
          Analytics and reporting features will be implemented in the next phase.
        </Alert>
      </TabPanel>

      {/* Edit Metadata Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        disableEnforceFocus={false}
        disableAutoFocus={false}
        keepMounted={false}
        aria-labelledby="edit-metadata-dialog-title"
        aria-describedby="edit-metadata-dialog-description"
      >
        <DialogTitle id="edit-metadata-dialog-title">
          Configure Business Metadata
          {selectedWorkflow && (
            <Typography variant="body2" color="text.secondary">
              {selectedWorkflow.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent id="edit-metadata-dialog-description">
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Business Name"
                value={businessMetadata.businessName || ''}
                onChange={(e) => {
                  const sanitized = sanitizeInput.sanitizeText(e.target.value);
                  setBusinessMetadata({ ...businessMetadata, businessName: sanitized });
                }}
                helperText="Client-friendly name for this automation"
                inputProps={{ maxLength: 100 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={businessMetadata.category || 'Operations'}
                  label="Category"
                  onChange={(e) => setBusinessMetadata({ ...businessMetadata, category: e.target.value as any })}
                >
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Sales">Sales</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Customer Service">Customer Service</MenuItem>
                  <MenuItem value="E-commerce">E-commerce</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Business Description"
                multiline
                rows={3}
                value={businessMetadata.businessDescription || ''}
                onChange={(e) => {
                  const sanitized = sanitizeInput.sanitizeText(e.target.value);
                  setBusinessMetadata({ ...businessMetadata, businessDescription: sanitized });
                }}
                helperText="Business-focused description emphasizing value and benefits"
                inputProps={{ maxLength: 1000 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={businessMetadata.difficulty || 'beginner'}
                  label="Difficulty"
                  onChange={(e) => setBusinessMetadata({ ...businessMetadata, difficulty: e.target.value as any })}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Setup Time"
                value={businessMetadata.setupTime || ''}
                onChange={(e) => setBusinessMetadata({ ...businessMetadata, setupTime: e.target.value })}
                placeholder="e.g., 15-30 minutes"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Monthly Value ($)"
                type="number"
                value={businessMetadata.monthlyValue || ''}
                onChange={(e) => setBusinessMetadata({ ...businessMetadata, monthlyValue: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Time Saved"
                value={businessMetadata.timesSaved || ''}
                onChange={(e) => setBusinessMetadata({ ...businessMetadata, timesSaved: e.target.value })}
                placeholder="e.g., 5 hours per week"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={businessMetadata.consultantOnly || false}
                    onChange={(e) => setBusinessMetadata({ ...businessMetadata, consultantOnly: e.target.checked })}
                  />
                }
                label="Consultant Only (requires consultation)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveMetadata}
            variant="contained"
            disabled={saving}
            startIcon={saving ? undefined : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Webhook Configuration Dialog */}
      <Dialog 
        open={webhookDialogOpen} 
        onClose={() => setWebhookDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus={false}
        disableAutoFocus={false}
        keepMounted={false}
        aria-labelledby="webhook-dialog-title"
        aria-describedby="webhook-dialog-description"
      >
        <DialogTitle id="webhook-dialog-title">
          Configure Webhook
          {selectedWorkflowForWebhook && (
            <Typography variant="body2" color="text.secondary">
              {selectedWorkflowForWebhook.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent id="webhook-dialog-description">
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Register an existing webhook URL from your n8n workflow. Copy the webhook URL from your n8n workflow and paste it below.
              </Alert>
            </Grid>
            
            {/* Show detected webhooks if any */}
            {detectedWebhooks.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Detected Webhooks in this workflow:</strong>
                  </Typography>
                  {detectedWebhooks.map((webhook, index) => (
                    <Box key={index} sx={{ mt: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          wordBreak: 'break-all',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.100' },
                          p: 1,
                          borderRadius: 1
                        }}
                        onClick={() => setWebhookUrl(webhook)}
                      >
                        {webhook}
                      </Typography>
                    </Box>
                  ))}
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Click on a webhook URL above to select it
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Webhook URL"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                helperText="Paste the complete webhook URL from your n8n workflow"
                placeholder="https://n8n.workflowhub.space/webhook/your-webhook-id"
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>HTTP Method</InputLabel>
                <Select
                  value={webhookMethod}
                  label="HTTP Method"
                  onChange={(e) => setWebhookMethod(e.target.value as any)}
                >
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Description (optional)"
                value={webhookPath}
                onChange={(e) => setWebhookPath(e.target.value)}
                helperText="Optional description for this webhook"
                placeholder="Chat interface, Form submission, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>How to get the webhook URL:</strong>
                  <br />• Open your workflow in n8n
                  <br />• Find the Webhook trigger node or Chat trigger node
                  <br />• Copy the webhook URL shown in the node
                  <br />• Paste it in the field above
                  <br />• Make sure the workflow is active in n8n
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveWebhook}
            variant="contained"
            disabled={saving || !webhookUrl}
            startIcon={saving ? undefined : <LinkIcon />}
          >
            {saving ? 'Registering...' : 'Register Webhook'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};