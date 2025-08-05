import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Rating,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  Gavel as LegalIcon,
  AccountBalance as AccountingIcon,
  LocalShipping as ShippingIcon,
  Restaurant as RestaurantIcon,
  Home as RealEstateIcon,
  School as EducationIcon,
  LocalHospital as HealthcareIcon,
  Build as ManufacturingIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  GetApp as DownloadIcon,
  Preview as PreviewIcon,
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  AccessTime as TimeIcon,
  People as UsersIcon
} from '@mui/icons-material';
import { TouchButton } from '../mobile/TouchOptimized';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  downloads: number;
  estimatedTime: string;
  tags: string[];
  author: string;
  lastUpdated: string;
  thumbnail?: string;
  featured: boolean;
  businessImpact: {
    timeSaved: string;
    costReduction: string;
    errorReduction: string;
  };
}

const TemplateGallery: React.FC = () => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedComplexity, setSelectedComplexity] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const categories = [
    { value: 'all', label: 'All Categories', icon: <BusinessIcon /> },
    { value: 'customer-management', label: 'Customer Management', icon: <UsersIcon /> },
    { value: 'sales-marketing', label: 'Sales & Marketing', icon: <TrendingIcon /> },
    { value: 'finance-accounting', label: 'Finance & Accounting', icon: <AccountingIcon /> },
    { value: 'operations', label: 'Operations', icon: <ManufacturingIcon /> },
    { value: 'hr-admin', label: 'HR & Admin', icon: <BusinessIcon /> }
  ];

  const industries = [
    { value: 'all', label: 'All Industries', icon: <BusinessIcon /> },
    { value: 'professional-services', label: 'Professional Services', icon: <LegalIcon /> },
    { value: 'e-commerce', label: 'E-commerce', icon: <StoreIcon /> },
    { value: 'restaurant', label: 'Restaurant', icon: <RestaurantIcon /> },
    { value: 'real-estate', label: 'Real Estate', icon: <RealEstateIcon /> },
    { value: 'healthcare', label: 'Healthcare', icon: <HealthcareIcon /> },
    { value: 'education', label: 'Education', icon: <EducationIcon /> },
    { value: 'manufacturing', label: 'Manufacturing', icon: <ManufacturingIcon /> }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedIndustry, selectedComplexity]);

  const loadTemplates = async () => {
    try {
      // Simulated template data - in production, this would come from an API
      const templateData: WorkflowTemplate[] = [
        {
          id: '1',
          name: 'Customer Onboarding Automation',
          description: 'Streamline new customer onboarding with automated welcome emails, account setup, and task assignments.',
          category: 'customer-management',
          industry: 'professional-services',
          complexity: 'Intermediate',
          rating: 4.8,
          downloads: 1250,
          estimatedTime: '30 min',
          tags: ['CRM', 'Email', 'Customer Success'],
          author: 'n8n Team',
          lastUpdated: '2024-01-15',
          featured: true,
          businessImpact: {
            timeSaved: '8 hours/week',
            costReduction: '$2,400/month',
            errorReduction: '90%'
          }
        },
        {
          id: '2',
          name: 'E-commerce Order Processing',
          description: 'Automate order fulfillment from payment confirmation to shipping notification and inventory updates.',
          category: 'operations',
          industry: 'e-commerce',
          complexity: 'Advanced',
          rating: 4.9,
          downloads: 2100,
          estimatedTime: '45 min',
          tags: ['E-commerce', 'Inventory', 'Shipping', 'Notifications'],
          author: 'Commerce Pro',
          lastUpdated: '2024-01-20',
          featured: true,
          businessImpact: {
            timeSaved: '15 hours/week',
            costReduction: '$5,000/month',
            errorReduction: '95%'
          }
        },
        {
          id: '3',
          name: 'Invoice Generation & Follow-up',
          description: 'Generate invoices automatically and send follow-up reminders for overdue payments.',
          category: 'finance-accounting',
          industry: 'professional-services',
          complexity: 'Beginner',
          rating: 4.6,
          downloads: 850,
          estimatedTime: '20 min',
          tags: ['Invoicing', 'Payments', 'Accounting'],
          author: 'FinanceFlow',
          lastUpdated: '2024-01-10',
          featured: false,
          businessImpact: {
            timeSaved: '5 hours/week',
            costReduction: '$1,200/month',
            errorReduction: '85%'
          }
        },
        {
          id: '4',
          name: 'Lead Qualification & Scoring',
          description: 'Automatically score and qualify leads based on engagement and demographic data.',
          category: 'sales-marketing',
          industry: 'professional-services',
          complexity: 'Intermediate',
          rating: 4.7,
          downloads: 1450,
          estimatedTime: '35 min',
          tags: ['Lead Generation', 'CRM', 'Marketing'],
          author: 'SalesBoost',
          lastUpdated: '2024-01-18',
          featured: true,
          businessImpact: {
            timeSaved: '12 hours/week',
            costReduction: '$3,600/month',
            errorReduction: '88%'
          }
        },
        {
          id: '5',
          name: 'Restaurant Inventory Management',
          description: 'Track inventory levels, automate reordering, and manage supplier communications.',
          category: 'operations',
          industry: 'restaurant',
          complexity: 'Intermediate',
          rating: 4.5,
          downloads: 650,
          estimatedTime: '40 min',
          tags: ['Inventory', 'Suppliers', 'Cost Management'],
          author: 'RestaurantTech',
          lastUpdated: '2024-01-12',
          featured: false,
          businessImpact: {
            timeSaved: '10 hours/week',
            costReduction: '$2,800/month',
            errorReduction: '92%'
          }
        },
        {
          id: '6',
          name: 'Employee Onboarding Workflow',
          description: 'Streamline new hire processes with document collection, training assignments, and IT setup.',
          category: 'hr-admin',
          industry: 'professional-services',
          complexity: 'Beginner',
          rating: 4.4,
          downloads: 920,
          estimatedTime: '25 min',
          tags: ['HR', 'Onboarding', 'Document Management'],
          author: 'HR Solutions',
          lastUpdated: '2024-01-08',
          featured: false,
          businessImpact: {
            timeSaved: '6 hours/week',
            costReduction: '$1,800/month',
            errorReduction: '80%'
          }
        }
      ];

      setTemplates(templateData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(template => template.industry === selectedIndustry);
    }

    if (selectedComplexity !== 'all') {
      filtered = filtered.filter(template => template.complexity === selectedComplexity);
    }

    // Sort by featured first, then by rating
    filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.rating - a.rating;
    });

    setFilteredTemplates(filtered);
  };

  const toggleFavorite = (templateId: string) => {
    setFavorites(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const openPreview = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Beginner': return '#4caf50';
      case 'Intermediate': return '#ff9800';
      case 'Advanced': return '#f44336';
      default: return '#2196f3';
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData ? categoryData.icon : <BusinessIcon />;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading templates...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          SMB Workflow Templates
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ready-to-use automation templates designed for small and medium businesses
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={2.5}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {categories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {category.icon}
                      {category.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={2.5}>
            <FormControl fullWidth>
              <InputLabel>Industry</InputLabel>
              <Select
                value={selectedIndustry}
                label="Industry"
                onChange={(e) => setSelectedIndustry(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {industries.map((industry) => (
                  <MenuItem key={industry.value} value={industry.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {industry.icon}
                      {industry.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth>
              <InputLabel>Complexity</InputLabel>
              <Select
                value={selectedComplexity}
                label="Complexity"
                onChange={(e) => setSelectedComplexity(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="Beginner">Beginner</MenuItem>
                <MenuItem value="Intermediate">Intermediate</MenuItem>
                <MenuItem value="Advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Showing {filteredTemplates.length} templates
      </Typography>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} sm={6} lg={4} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                transition: 'all 0.3s ease-in-out',
                ...(template.featured && {
                  border: '2px solid #2196f3',
                  boxShadow: '0 4px 20px rgba(33, 150, 243, 0.15)'
                }),
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header with rating and favorite */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {getCategoryIcon(template.category)}
                    </Avatar>
                    {template.featured && (
                      <Chip
                        label="Featured"
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => toggleFavorite(template.id)}
                    sx={{ color: favorites.includes(template.id) ? '#f44336' : 'grey.400' }}
                  >
                    {favorites.includes(template.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                </Box>

                {/* Title and Description */}
                <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '2.5em' }}>
                  {template.description}
                </Typography>

                {/* Metrics */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Rating value={template.rating} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary">
                      ({template.rating})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DownloadIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {template.downloads.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                {/* Tags and Complexity */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  <Chip
                    label={template.complexity}
                    size="small"
                    sx={{
                      backgroundColor: getComplexityColor(template.complexity),
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  />
                  {template.tags.slice(0, 2).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>

                {/* Business Impact */}
                <Box sx={{ backgroundColor: 'grey.50', borderRadius: 2, p: 1.5, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Business Impact
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                        {template.businessImpact.timeSaved}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Time Saved
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                        {template.businessImpact.costReduction}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Cost Reduction
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Metadata */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'text.secondary' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">{template.estimatedTime}</Typography>
                  </Box>
                  <Typography variant="caption">
                    by {template.author}
                  </Typography>
                </Box>
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0 }}>
                <TouchButton
                  size="small"
                  variant="outlined"
                  onClick={() => openPreview(template)}
                  startIcon={<PreviewIcon />}
                  sx={{ mr: 1 }}
                >
                  Preview
                </TouchButton>
                <TouchButton
                  size="small"
                  variant="contained"
                  startIcon={<DownloadIcon />}
                >
                  Use Template
                </TouchButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* No Results */}
      {filteredTemplates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria or filters
          </Typography>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        {selectedTemplate && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {getCategoryIcon(selectedTemplate.category)}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="div">
                    {selectedTemplate.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTemplate.industry} • {selectedTemplate.complexity}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedTemplate.description}
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Business Impact
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'primary.light', borderRadius: 2 }}>
                      <Typography variant="h6" color="primary.contrastText">
                        {selectedTemplate.businessImpact.timeSaved}
                      </Typography>
                      <Typography variant="caption" color="primary.contrastText">
                        Time Saved
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'success.light', borderRadius: 2 }}>
                      <Typography variant="h6" color="success.contrastText">
                        {selectedTemplate.businessImpact.costReduction}
                      </Typography>
                      <Typography variant="caption" color="success.contrastText">
                        Cost Reduction
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'warning.light', borderRadius: 2 }}>
                      <Typography variant="h6" color="warning.contrastText">
                        {selectedTemplate.businessImpact.errorReduction}
                      </Typography>
                      <Typography variant="caption" color="warning.contrastText">
                        Error Reduction
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedTemplate.tags.map((tag) => (
                    <Chip key={tag} label={tag} variant="outlined" size="small" />
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Setup Time: {selectedTemplate.estimatedTime}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date(selectedTemplate.lastUpdated).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Rating value={selectedTemplate.rating} readOnly size="small" />
                    <Typography variant="body2">({selectedTemplate.rating})</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {selectedTemplate.downloads.toLocaleString()} downloads
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <TouchButton
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  // Handle template installation
                  setPreviewOpen(false);
                }}
              >
                Use This Template
              </TouchButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default TemplateGallery;