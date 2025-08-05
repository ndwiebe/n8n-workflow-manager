import React from 'react';
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
  CardContent
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
import { WorkflowCard } from '../components/workflows/WorkflowCard';
import { ConfigurationModal } from '../components/workflows/ConfigurationModal';
import { BusinessMetricsDashboard } from '../components/metrics/BusinessMetricsDashboard';
import { ROICalculator } from '../components/metrics/ROICalculator';
import { useWorkflowStore } from '../store/workflowStore';
import { useAuthStore } from '../store/authStore';
import { WorkflowModule } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    modules,
    configurations,
    loading,
    fetchModules,
    fetchConfigurations,
    activateWorkflow,
    updateConfiguration,
    createConfiguration
  } = useWorkflowStore();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [selectedModule, setSelectedModule] = React.useState<WorkflowModule | null>(null);
  const [configModalOpen, setConfigModalOpen] = React.useState(false);

  React.useEffect(() => {
    fetchModules();
    if (user) {
      fetchConfigurations(user.id);
    }
  }, [fetchModules, fetchConfigurations, user]);

  const categories = React.useMemo(() => {
    const cats = new Set(modules.map(m => m.category));
    return Array.from(cats).sort();
  }, [modules]);

  const filteredModules = React.useMemo(() => {
    return modules.filter(module => {
      const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           module.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || module.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [modules, searchTerm, selectedCategory]);

  // Calculate business metrics
  const activeAutomations = configurations.filter(c => c.status === 'active').length;
  const totalAutomations = configurations.length;
  const automationRate = totalAutomations > 0 ? Math.round((activeAutomations / totalAutomations) * 100) : 0;

  const handleToggleWorkflow = async (module: WorkflowModule, enabled: boolean) => {
    const config = configurations.find(c => c.workflowId === module.id);
    if (config) {
      await activateWorkflow({
        configurationId: config.id,
        workflowId: module.id,
        enabled
      });
    }
  };

  const handleConfigure = (module: WorkflowModule) => {
    setSelectedModule(module);
    setConfigModalOpen(true);
  };

  const handleConfigSubmit = async (credentials: Record<string, any>) => {
    if (!selectedModule || !user) return;
    
    const config = configurations.find(c => c.workflowId === selectedModule.id);
    if (config) {
      await updateConfiguration(config.id, credentials);
    } else {
      const newConfig = await createConfiguration(selectedModule.id, user.id);
      await updateConfiguration(newConfig.id, credentials);
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
          Welcome back, {user?.name}! Streamline your business operations and unlock productivity gains with smart automation.
        </Typography>
        <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
          Transform repetitive tasks into automated workflows and watch your ROI grow.
        </Typography>
      </Box>

      {/* Business Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                {activeAutomations}
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
                {automationRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Automation Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <ScheduleIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                24/7
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Always Working
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <MonetizationOnIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                ROI
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tracking Available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Business Metrics Dashboard */}
      <Box sx={{ mb: 4 }}>
        <BusinessMetricsDashboard configurations={configurations} />
      </Box>

      {/* ROI Calculator */}
      <Box sx={{ mb: 4 }}>
        <ROICalculator />
      </Box>

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

      {/* Automation Solutions Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : filteredModules.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No automation solutions found matching your criteria. Try adjusting your search or category filter.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredModules.map(module => {
            const config = configurations.find(c => c.workflowId === module.id);
            return (
              <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={module.id}>
                <WorkflowCard
                  module={module}
                  configuration={config}
                  onToggle={(enabled) => handleToggleWorkflow(module, enabled)}
                  onConfigure={() => handleConfigure(module)}
                />
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Configuration Modal */}
      {selectedModule && (
        <ConfigurationModal
          open={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedModule(null);
          }}
          module={selectedModule}
          existingCredentials={
            configurations.find(c => c.workflowId === selectedModule.id)?.credentials
          }
          onSubmit={handleConfigSubmit}
        />
      )}
    </Container>
  );
};