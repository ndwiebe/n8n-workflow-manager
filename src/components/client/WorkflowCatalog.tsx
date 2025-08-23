import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Rating,
  Skeleton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Campaign as CampaignIcon,
  Support as SupportIcon,
  ShoppingCart as ShoppingCartIcon,
  Settings as SettingsIcon,
  AutoMode as AutoModeIcon
} from '@mui/icons-material';
import { WorkflowSetupWizard } from '../setup/WorkflowSetupWizard';
import { useUnifiedWorkflows } from '../../hooks/useUnifiedWorkflows';
import { UnifiedWorkflowData } from '../../services/unifiedWorkflowService';
import { ClientWorkflowTemplate } from '../../services/workflowCurationService';

interface WorkflowCatalogProps {
  onSelectWorkflow: (template: ClientWorkflowTemplate) => void;
  onRequestDemo: (template: ClientWorkflowTemplate) => void;
}

export const WorkflowCatalog: React.FC<WorkflowCatalogProps> = ({
  onSelectWorkflow,
  onRequestDemo
}) => {
  // Use UnifiedWorkflows hook with client ID
  const { templates: rawTemplates, loading, error } = useUnifiedWorkflows({
    clientId: '1' // Default client ID
  });

  const [filteredTemplates, setFilteredTemplates] = useState<ClientWorkflowTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ClientWorkflowTemplate | null>(null);

  // Convert UnifiedWorkflowData to ClientWorkflowTemplate format
  const templates = React.useMemo(() => {
    return rawTemplates.map((template): ClientWorkflowTemplate => ({
      id: template.id,
      name: template.name,
      businessName: template.businessMetadata?.businessName || template.name,
      description: template.description,
      businessDescription: template.businessMetadata?.description || template.description || '',
      category: (template.businessMetadata?.category as any) || 'Operations',
      industry: template.businessMetadata?.industry || ['Small Business'],
      difficulty: (template.businessMetadata?.difficulty as any) || 'beginner',
      setupTime: template.businessMetadata?.setupTime || '30 minutes',
      monthlyValue: template.businessMetadata?.monthlyValue || 500,
      timesSaved: template.businessMetadata?.timesSaved || '2 hours per week',
      features: template.businessMetadata?.features || ['Automation', 'Time-saving'],
      requirements: [], // Default empty array - would be populated from template data
      tags: ['client-ready'], // Default tag for client-ready templates
      isClientReady: true,
      consultantOnly: false,
      originalWorkflowId: template.workflowId || template.id,
      credentialsNeeded: [], // Default empty array - would be populated from template data
      setupSteps: [], // Default empty array - would be populated from template data
      successMetrics: ['Time saved', 'Increased efficiency'], // Default success metrics
      icon: '⚡', // Default icon
      previewImages: [] // Optional field
    }));
  }, [rawTemplates]);

  const categories = ['Finance', 'Marketing', 'Sales', 'Operations', 'HR', 'Customer Service', 'E-commerce'];
  const industries = ['Small Business', 'Technology', 'E-commerce', 'Healthcare', 'Finance', 'Manufacturing'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const categoryIcons: Record<string, React.ReactNode> = {
    'Finance': <MoneyIcon />,
    'Marketing': <CampaignIcon />,
    'Sales': <TrendingUpIcon />,
    'Operations': <SettingsIcon />,
    'Customer Service': <SupportIcon />,
    'E-commerce': <ShoppingCartIcon />,
    'HR': <AutoModeIcon />
  };

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedCategory, selectedIndustry, selectedDifficulty]);

  const filterTemplates = () => {
    let filtered = [...templates];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.businessName.toLowerCase().includes(term) ||
        template.businessDescription.toLowerCase().includes(term) ||
        template.features.some(feature => feature.toLowerCase().includes(term))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (selectedIndustry) {
      filtered = filtered.filter(template => template.industry.includes(selectedIndustry));
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    setFilteredTemplates(filtered);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const formatMonthlyValue = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  const handleSelectWorkflow = (template: ClientWorkflowTemplate) => {
    setSelectedTemplate(template);
    setSetupWizardOpen(true);
  };

  const handleSetupComplete = (configuration: any) => {
    console.log('Setup completed:', configuration);
    // Here you would typically send the configuration to your backend
    // and activate the workflow
    onSelectWorkflow(selectedTemplate!);
  };

  const WorkflowCard: React.FC<{ template: ClientWorkflowTemplate }> = ({ template }) => (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            {categoryIcons[template.category] || <AutoModeIcon />}
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {template.businessName}
            </Typography>
            <Chip 
              label={template.category} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
          <Chip
            label={template.difficulty}
            size="small"
            color={getDifficultyColor(template.difficulty) as any}
          />
        </Box>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" paragraph>
          {template.businessDescription}
        </Typography>

        {/* Key Metrics */}
        <Box display="flex" gap={2} mb={2}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="caption">{template.setupTime}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <SpeedIcon fontSize="small" color="action" />
            <Typography variant="caption">{template.timesSaved}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <MoneyIcon fontSize="small" color="action" />
            <Typography variant="caption">{formatMonthlyValue(template.monthlyValue)}/mo</Typography>
          </Box>
        </Box>

        {/* Features */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>Key Features:</Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {template.features.slice(0, 3).map((feature, index) => (
              <Chip
                key={index}
                label={feature}
                size="small"
                variant="outlined"
                color="secondary"
              />
            ))}
            {template.features.length > 3 && (
              <Chip
                label={`+${template.features.length - 3} more`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {/* Industries */}
        <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
          {template.industry.map((industry, index) => (
            <Chip
              key={index}
              label={industry}
              size="small"
              variant="filled"
              color="info"
            />
          ))}
        </Box>

        {/* Success Rating */}
        <Box display="flex" alignItems="center" gap={1}>
          <Rating value={4.5} precision={0.5} size="small" readOnly />
          <Typography variant="caption" color="text.secondary">
            (Based on client success)
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onRequestDemo(template)}
        >
          Request Demo
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => handleSelectWorkflow(template)}
          startIcon={<CheckIcon />}
        >
          Get Started
        </Button>
      </CardActions>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={i}>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1">
            <strong>Failed to load workflow templates</strong><br />
            {error}
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Please check that the backend service is running and try refreshing the page.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Automation Catalog
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Choose from our proven automation solutions to streamline your business operations.
          Each automation is designed to save you time and increase efficiency.
        </Typography>

        {/* Success Banner */}
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>🎉 Join 200+ businesses</strong> already saving an average of 15 hours per week with our automations
          </Typography>
        </Alert>
      </Box>

      {/* Filters */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search automations..."
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

          {/* Category Filter */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Industry Filter */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Industry</InputLabel>
              <Select
                value={selectedIndustry}
                label="Industry"
                onChange={(e) => setSelectedIndustry(e.target.value)}
              >
                <MenuItem value="">All Industries</MenuItem>
                {industries.map(industry => (
                  <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Difficulty Filter */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={selectedDifficulty}
                label="Difficulty"
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <MenuItem value="">All Levels</MenuItem>
                {difficulties.map(difficulty => (
                  <MenuItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* View Mode */}
          <Grid item xs={12} md={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              fullWidth
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
      </Card>

      {/* Results Summary */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          {filteredTemplates.length} automation{filteredTemplates.length !== 1 ? 's' : ''} found
        </Typography>
        <Badge badgeContent="NEW" color="secondary">
          <Chip 
            label="AI-Powered Recommendations Coming Soon" 
            variant="outlined" 
            size="small" 
          />
        </Badge>
      </Box>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body1">
            No automations match your current filters. Try adjusting your search criteria or{' '}
            <Button variant="text" onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              setSelectedIndustry('');
              setSelectedDifficulty('');
            }}>
              clear all filters
            </Button>.
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} key={template.id}>
              <WorkflowCard template={template} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Call to Action */}
      <Box textAlign="center" mt={6} p={4} bgcolor="grey.50" borderRadius={2}>
        <Typography variant="h5" gutterBottom>
          Don't see what you need?
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Our automation experts can create custom solutions tailored to your specific business needs.
        </Typography>
        <Button variant="contained" size="large">
          Request Custom Automation
        </Button>
      </Box>

      {/* Setup Wizard */}
      <WorkflowSetupWizard
        open={setupWizardOpen}
        onClose={() => setSetupWizardOpen(false)}
        template={selectedTemplate}
        onComplete={handleSetupComplete}
      />
    </Container>
  );
};