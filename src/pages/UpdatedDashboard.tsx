/**
 * Updated Dashboard Component
 * Uses the new unified workflow system with templates and live n8n workflows
 */

import React, { useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Skeleton,
  Alert,
  Card,
  CardContent,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  MonetizationOn as MonetizationOnIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import UnifiedWorkflowCard from '../components/workflows/UnifiedWorkflowCard';
import { useUnifiedWorkflows } from '../hooks/useUnifiedWorkflows';
import { useAuthStore } from '../store/authStore';
import { UnifiedWorkflowData } from '../services/unifiedWorkflowService';

export const UpdatedDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const clientId = user?.id || 'demo-client';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<UnifiedWorkflowData | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Business configuration form state
  const [businessConfig, setBusinessConfig] = useState({
    businessName: '',
    businessDescription: '',
    category: '',
    expectedMonthlySavings: 1000,
    targetUsers: [''],
    department: ''
  });

  const {
    workflows,
    templates,
    analytics,
    loading,
    error,
    refresh,
    deployTemplate,
    executeAction
  } = useUnifiedWorkflows({
    clientId,
    category: selectedCategory || undefined,
    includeInactive: true
  });

  // Combine workflows and templates for display
  const allWorkflows = [...workflows, ...templates];

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set(allWorkflows.map(w => w.category));
    return Array.from(cats).sort();
  }, [allWorkflows]);

  // Filter workflows
  const filteredWorkflows = React.useMemo(() => {
    return allWorkflows.filter(workflow => {
      const matchesSearch = 
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || workflow.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allWorkflows, searchTerm, selectedCategory]);

  const handleToggleExpand = (workflowId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId);
    } else {
      newExpanded.add(workflowId);
    }
    setExpandedCards(newExpanded);
  };

  const handleConfigure = (workflowId: string) => {
    const workflow = allWorkflows.find(w => w.id === workflowId);
    if (workflow && workflow.type === 'template') {
      setSelectedWorkflow(workflow);
      setBusinessConfig({
        businessName: workflow.name,
        businessDescription: workflow.description,
        category: workflow.category,
        expectedMonthlySavings: workflow.businessMetrics.estimatedValue || 1000,
        targetUsers: [''],
        department: ''
      });
      setConfigModalOpen(true);
    }
  };

  const handleActionClick = async (workflowId: string, action: string) => {
    try {
      const result = await executeAction(workflowId, action);
      setSnackbar({
        open: true,
        message: result.businessImpact || 'Action completed successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Action failed',
        severity: 'error'
      });
    }
  };

  const handleToggleActive = async (workflowId: string, active: boolean) => {
    const action = active ? 'resume' : 'pause';
    await handleActionClick(workflowId, action);
  };

  const handleDeployTemplate = async () => {
    if (!selectedWorkflow) return;

    try {
      await deployTemplate(selectedWorkflow.id, businessConfig);
      setConfigModalOpen(false);
      setSnackbar({
        open: true,
        message: `${businessConfig.businessName} deployed successfully!`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Deployment failed',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Business-focused header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Business Automation Hub
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Welcome back, {user?.name}! Streamline your business operations with smart automation templates and live workflows.
        </Typography>
        <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
          Transform repetitive tasks into automated workflows and watch your ROI grow.
        </Typography>
      </Box>

      {/* Business Metrics Overview */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {analytics.summary.activeWorkflows}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Automations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <TrendingUpIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                  ${analytics.businessMetrics.totalMonthlySavings.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monthly Savings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <ScheduleIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                  {analytics.businessMetrics.totalTimeSavedPerWeek}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hours Saved/Week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <MonetizationOnIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                  {Math.round(analytics.businessMetrics.averageROI)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average ROI
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => window.location.reload()}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Find business automation solutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: { xs: 1, md: 0 } }}>
              <Chip
                label="All Solutions"
                onClick={() => setSelectedCategory(null)}
                color={!selectedCategory ? 'primary' : 'default'}
                size="small"
              />
              {categories.map(cat => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setSelectedCategory(cat)}
                  color={selectedCategory === cat ? 'primary' : 'default'}
                  size="small"
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              fullWidth
              size="small"
            >
              <ToggleButton value="grid">
                <ViewModuleIcon />
              </ToggleButton>
              <ToggleButton value="list">
                <ViewListIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Workflows Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={i}>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : filteredWorkflows.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No automation solutions found matching your criteria. Try adjusting your search or category filter.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredWorkflows.map((workflow, index) => (
            <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={`${workflow.type}-${workflow.id}-${index}`}>
              <UnifiedWorkflowCard
                workflow={workflow}
                onActionClick={handleActionClick}
                onConfigure={handleConfigure}
                onToggleActive={handleToggleActive}
                isExpanded={expandedCards.has(workflow.id)}
                onToggleExpand={() => handleToggleExpand(workflow.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Configuration Modal */}
      <Dialog open={configModalOpen} onClose={() => setConfigModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configure {selectedWorkflow?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Business Name"
                  value={businessConfig.businessName}
                  onChange={(e) => setBusinessConfig(prev => ({ ...prev, businessName: e.target.value }))}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={businessConfig.department}
                    label="Department"
                    onChange={(e) => setBusinessConfig(prev => ({ ...prev, department: e.target.value }))}
                  >
                    <MenuItem value="sales">Sales</MenuItem>
                    <MenuItem value="marketing">Marketing</MenuItem>
                    <MenuItem value="operations">Operations</MenuItem>
                    <MenuItem value="finance">Finance</MenuItem>
                    <MenuItem value="hr">HR</MenuItem>
                    <MenuItem value="it">IT</MenuItem>
                    <MenuItem value="customer-service">Customer Service</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business Description"
                  value={businessConfig.businessDescription}
                  onChange={(e) => setBusinessConfig(prev => ({ ...prev, businessDescription: e.target.value }))}
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expected Monthly Savings ($)"
                  type="number"
                  value={businessConfig.expectedMonthlySavings}
                  onChange={(e) => setBusinessConfig(prev => ({ ...prev, expectedMonthlySavings: Number(e.target.value) }))}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Target Users (comma separated)"
                  value={businessConfig.targetUsers.join(', ')}
                  onChange={(e) => setBusinessConfig(prev => ({ 
                    ...prev, 
                    targetUsers: e.target.value.split(',').map(u => u.trim()).filter(Boolean)
                  }))}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigModalOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeployTemplate} 
            variant="contained"
            disabled={!businessConfig.businessName || !businessConfig.department}
          >
            Deploy Workflow
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Container>
  );
};