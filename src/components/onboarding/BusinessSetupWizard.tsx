import React, { useState, useEffect } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  RadioGroup,
  Radio,
  Card,
  CardContent,
  CardActions,
  Box,
  Grid,
  Avatar,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Business as BusinessIcon,
  Store as StoreIcon,
  Restaurant as RestaurantIcon,
  LocalHospital as HealthcareIcon,
  School as EducationIcon,
  Home as RealEstateIcon,
  Build as ManufacturingIcon,
  AccountBalance as FinanceIcon,
  CheckCircle as CheckIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  Inventory as InventoryIcon,
  People as CRMIcon,
  Assessment as AnalyticsIcon,
  Schedule as SchedulingIcon
} from '@mui/icons-material';
import { TouchButton } from '../mobile/TouchOptimized';

interface BusinessInfo {
  name: string;
  industry: string;
  size: string;
  location: string;
  website: string;
  description: string;
}

interface BusinessNeeds {
  primaryGoals: string[];
  currentChallenges: string[];
  automationPriority: string;
  techComfort: string;
}

interface IntegrationPrefs {
  crm: string;
  email: string;
  payment: string;
  inventory: string;
  communication: string;
  analytics: string;
}

interface RecommendedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  impact: string;
  setupTime: string;
  icon: React.ReactNode;
  selected: boolean;
}

const BusinessSetupWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '',
    industry: '',
    size: '',
    location: '',
    website: '',
    description: ''
  });
  const [businessNeeds, setBusinessNeeds] = useState<BusinessNeeds>({
    primaryGoals: [],
    currentChallenges: [],
    automationPriority: '',
    techComfort: ''
  });
  const [integrationPrefs, setIntegrationPrefs] = useState<IntegrationPrefs>({
    crm: '',
    email: '',
    payment: '',
    inventory: '',
    communication: '',
    analytics: ''
  });
  const [recommendedTemplates, setRecommendedTemplates] = useState<RecommendedTemplate[]>([]);
  const [setupProgress, setSetupProgress] = useState(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const industries = [
    { value: 'professional-services', label: 'Professional Services', icon: <BusinessIcon /> },
    { value: 'e-commerce', label: 'E-commerce/Retail', icon: <StoreIcon /> },
    { value: 'restaurant', label: 'Restaurant/Food Service', icon: <RestaurantIcon /> },
    { value: 'healthcare', label: 'Healthcare', icon: <HealthcareIcon /> },
    { value: 'education', label: 'Education', icon: <EducationIcon /> },
    { value: 'real-estate', label: 'Real Estate', icon: <RealEstateIcon /> },
    { value: 'manufacturing', label: 'Manufacturing', icon: <ManufacturingIcon /> },
    { value: 'finance', label: 'Finance', icon: <FinanceIcon /> }
  ];

  const businessSizes = [
    { value: 'solo', label: 'Solo (Just me)' },
    { value: 'small', label: 'Small (2-10 employees)' },
    { value: 'medium', label: 'Medium (11-50 employees)' },
    { value: 'large', label: 'Large (50+ employees)' }
  ];

  const goals = [
    'Save time on repetitive tasks',
    'Improve customer experience',
    'Reduce manual errors',
    'Increase revenue',
    'Better data organization',
    'Faster response times',
    'Automate marketing',
    'Streamline operations'
  ];

  const challenges = [
    'Too much manual data entry',
    'Poor communication between tools',
    'Missing follow-ups with customers',
    'Inventory management issues',
    'Slow invoice processing',
    'Inconsistent processes',
    'No time for strategic work',
    'Difficulty tracking performance'
  ];

  useEffect(() => {
    if (businessInfo.industry && businessNeeds.primaryGoals.length > 0) {
      generateRecommendations();
    }
  }, [businessInfo.industry, businessNeeds.primaryGoals]);

  const generateRecommendations = () => {
    const templates: RecommendedTemplate[] = [];

    // Industry-specific recommendations
    if (businessInfo.industry === 'professional-services') {
      templates.push({
        id: 'customer-onboarding',
        name: 'Customer Onboarding Automation',
        description: 'Streamline new client intake and setup processes',
        category: 'Customer Management',
        impact: 'Save 8 hours/week',
        setupTime: '30 min',
        icon: <CRMIcon />,
        selected: true
      });
      
      if (businessNeeds.primaryGoals.includes('Faster response times')) {
        templates.push({
          id: 'invoice-automation',
          name: 'Invoice Generation & Follow-up',
          description: 'Automate billing and payment reminders',
          category: 'Finance',
          impact: 'Save 5 hours/week',
          setupTime: '20 min',
          icon: <PaymentIcon />,
          selected: true
        });
      }
    }

    if (businessInfo.industry === 'e-commerce') {
      templates.push({
        id: 'order-processing',
        name: 'Order Processing Automation',
        description: 'From payment to shipping, fully automated',
        category: 'Operations',
        impact: 'Save 15 hours/week',
        setupTime: '45 min',
        icon: <InventoryIcon />,
        selected: true
      });
    }

    if (businessInfo.industry === 'restaurant') {
      templates.push({
        id: 'inventory-management',
        name: 'Inventory Management',
        description: 'Track stock levels and automate reordering',
        category: 'Operations',
        impact: 'Save 10 hours/week',
        setupTime: '40 min',
        icon: <InventoryIcon />,
        selected: true
      });
    }

    // Goal-based recommendations
    if (businessNeeds.primaryGoals.includes('Improve customer experience')) {
      templates.push({
        id: 'customer-feedback',
        name: 'Customer Feedback Collection',
        description: 'Automated surveys and review requests',
        category: 'Customer Success',
        impact: 'Increase satisfaction 25%',
        setupTime: '15 min',
        icon: <AnalyticsIcon />,
        selected: false
      });
    }

    if (businessNeeds.primaryGoals.includes('Automate marketing')) {
      templates.push({
        id: 'lead-nurturing',
        name: 'Lead Nurturing Campaign',
        description: 'Automated email sequences for prospects',
        category: 'Marketing',
        impact: 'Increase conversions 30%',
        setupTime: '35 min',
        icon: <EmailIcon />,
        selected: false
      });
    }

    setRecommendedTemplates(templates);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSetupProgress(((activeStep + 2) / 5) * 100);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setSetupProgress(((activeStep) / 5) * 100);
  };

  const handleBusinessInfoChange = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleGoalToggle = (goal: string) => {
    setBusinessNeeds(prev => ({
      ...prev,
      primaryGoals: prev.primaryGoals.includes(goal)
        ? prev.primaryGoals.filter(g => g !== goal)
        : [...prev.primaryGoals, goal]
    }));
  };

  const handleChallengeToggle = (challenge: string) => {
    setBusinessNeeds(prev => ({
      ...prev,
      currentChallenges: prev.currentChallenges.includes(challenge)
        ? prev.currentChallenges.filter(c => c !== challenge)
        : [...prev.currentChallenges, challenge]
    }));
  };

  const handleTemplateToggle = (templateId: string) => {
    setRecommendedTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? { ...template, selected: !template.selected }
          : template
      )
    );
  };

  const handleFinishSetup = async () => {
    try {
      // Save business setup data
      const setupData = {
        businessInfo,
        businessNeeds,
        integrationPrefs,
        selectedTemplates: recommendedTemplates.filter(t => t.selected),
        completedAt: new Date().toISOString()
      };

      // In a real app, this would save to your backend
      localStorage.setItem('businessSetup', JSON.stringify(setupData));
      
      setShowCompletionDialog(true);
    } catch (error) {
      console.error('Failed to save setup:', error);
    }
  };

  const steps = [
    {
      label: 'Business Information',
      content: (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Business Name"
                value={businessInfo.name}
                onChange={(e) => handleBusinessInfoChange('name', e.target.value)}
                placeholder="Enter your business name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={businessInfo.industry}
                  label="Industry"
                  onChange={(e) => handleBusinessInfoChange('industry', e.target.value)}
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Business Size</InputLabel>
                <Select
                  value={businessInfo.size}
                  label="Business Size"
                  onChange={(e) => handleBusinessInfoChange('size', e.target.value)}
                >
                  {businessSizes.map((size) => (
                    <MenuItem key={size.value} value={size.value}>
                      {size.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={businessInfo.location}
                onChange={(e) => handleBusinessInfoChange('location', e.target.value)}
                placeholder="City, State/Country"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Website (Optional)"
                value={businessInfo.website}
                onChange={(e) => handleBusinessInfoChange('website', e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Business Description"
                value={businessInfo.description}
                onChange={(e) => handleBusinessInfoChange('description', e.target.value)}
                placeholder="Briefly describe what your business does..."
              />
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Business Goals & Challenges',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            What are your primary goals? (Select all that apply)
          </Typography>
          <FormGroup sx={{ mb: 3 }}>
            <Grid container spacing={1}>
              {goals.map((goal) => (
                <Grid item xs={12} sm={6} key={goal}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={businessNeeds.primaryGoals.includes(goal)}
                        onChange={() => handleGoalToggle(goal)}
                      />
                    }
                    label={goal}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>

          <Typography variant="h6" gutterBottom>
            What are your biggest challenges? (Select all that apply)
          </Typography>
          <FormGroup sx={{ mb: 3 }}>
            <Grid container spacing={1}>
              {challenges.map((challenge) => (
                <Grid item xs={12} sm={6} key={challenge}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={businessNeeds.currentChallenges.includes(challenge)}
                        onChange={() => handleChallengeToggle(challenge)}
                      />
                    }
                    label={challenge}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>

          <Typography variant="h6" gutterBottom>
            What's your automation priority?
          </Typography>
          <RadioGroup
            value={businessNeeds.automationPriority}
            onChange={(e) => setBusinessNeeds(prev => ({ ...prev, automationPriority: e.target.value }))}
            sx={{ mb: 3 }}
          >
            <FormControlLabel value="quick-wins" control={<Radio />} label="Quick wins - simple automations first" />
            <FormControlLabel value="comprehensive" control={<Radio />} label="Comprehensive - automate entire processes" />
            <FormControlLabel value="custom" control={<Radio />} label="Custom - I have specific workflows in mind" />
          </RadioGroup>

          <Typography variant="h6" gutterBottom>
            How comfortable are you with technology?
          </Typography>
          <RadioGroup
            value={businessNeeds.techComfort}
            onChange={(e) => setBusinessNeeds(prev => ({ ...prev, techComfort: e.target.value }))}
          >
            <FormControlLabel value="beginner" control={<Radio />} label="Beginner - prefer simple, guided setups" />
            <FormControlLabel value="intermediate" control={<Radio />} label="Intermediate - comfortable with most tools" />
            <FormControlLabel value="advanced" control={<Radio />} label="Advanced - can handle complex configurations" />
          </RadioGroup>
        </Box>
      )
    },
    {
      label: 'Integration Preferences',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom color="text.secondary">
            Tell us which tools you currently use so we can recommend the best integrations.
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>CRM System</InputLabel>
                <Select
                  value={integrationPrefs.crm}
                  label="CRM System"
                  onChange={(e) => setIntegrationPrefs(prev => ({ ...prev, crm: e.target.value }))}
                >
                  <MenuItem value="">None / Don't use CRM</MenuItem>
                  <MenuItem value="hubspot">HubSpot</MenuItem>
                  <MenuItem value="salesforce">Salesforce</MenuItem>
                  <MenuItem value="pipedrive">Pipedrive</MenuItem>
                  <MenuItem value="zoho">Zoho CRM</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Email Platform</InputLabel>
                <Select
                  value={integrationPrefs.email}
                  label="Email Platform"
                  onChange={(e) => setIntegrationPrefs(prev => ({ ...prev, email: e.target.value }))}
                >
                  <MenuItem value="gmail">Gmail</MenuItem>
                  <MenuItem value="outlook">Outlook</MenuItem>
                  <MenuItem value="mailchimp">Mailchimp</MenuItem>
                  <MenuItem value="sendgrid">SendGrid</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Processor</InputLabel>
                <Select
                  value={integrationPrefs.payment}
                  label="Payment Processor"
                  onChange={(e) => setIntegrationPrefs(prev => ({ ...prev, payment: e.target.value }))}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                  <MenuItem value="square">Square</MenuItem>
                  <MenuItem value="quickbooks">QuickBooks Payments</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Communication Tool</InputLabel>
                <Select
                  value={integrationPrefs.communication}
                  label="Communication Tool"
                  onChange={(e) => setIntegrationPrefs(prev => ({ ...prev, communication: e.target.value }))}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="slack">Slack</MenuItem>
                  <MenuItem value="teams">Microsoft Teams</MenuItem>
                  <MenuItem value="discord">Discord</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Recommended Templates',
      content: (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Based on your business info and goals, we've selected these templates for you. You can modify this selection.
          </Alert>
          
          <Grid container spacing={2}>
            {recommendedTemplates.map((template) => (
              <Grid item xs={12} key={template.id}>
                <Card 
                  sx={{ 
                    border: template.selected ? '2px solid #2196f3' : '1px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}
                  onClick={() => handleTemplateToggle(template.id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Avatar sx={{ bgcolor: template.selected ? 'primary.main' : 'grey.400' }}>
                        {template.icon}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6" component="h3">
                            {template.name}
                          </Typography>
                          <Chip 
                            label={template.category} 
                            size="small" 
                            color={template.selected ? "primary" : "default"}
                          />
                          {template.selected && <CheckIcon color="primary" />}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {template.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Chip 
                            label={`Impact: ${template.impact}`} 
                            size="small" 
                            color="success" 
                            variant="outlined"
                          />
                          <Chip 
                            label={`Setup: ${template.setupTime}`} 
                            size="small" 
                            color="info" 
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {recommendedTemplates.length === 0 && (
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              Complete the previous steps to see personalized template recommendations.
            </Typography>
          )}
        </Box>
      )
    },
    {
      label: 'Setup Complete',
      content: (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Your Business Setup is Complete!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We've configured your n8n Workflow Manager based on your preferences. 
            Your selected templates are ready to be installed.
          </Typography>
          
          <Paper sx={{ p: 3, mb: 3, textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              Setup Summary
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><BusinessIcon /></ListItemIcon>
                <ListItemText 
                  primary="Business" 
                  secondary={`${businessInfo.name} - ${industries.find(i => i.value === businessInfo.industry)?.label}`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckIcon /></ListItemIcon>
                <ListItemText 
                  primary="Selected Templates" 
                  secondary={`${recommendedTemplates.filter(t => t.selected).length} workflows ready to install`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><SchedulingIcon /></ListItemIcon>
                <ListItemText 
                  primary="Estimated Setup Time" 
                  secondary={`${recommendedTemplates.filter(t => t.selected).reduce((total, t) => total + parseInt(t.setupTime), 0)} minutes total`}
                />
              </ListItem>
            </List>
          </Paper>
          
          <TouchButton
            variant="contained"
            size="large"
            onClick={handleFinishSetup}
            sx={{ minWidth: 200 }}
          >
            Complete Setup & Install Templates
          </TouchButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Welcome to n8n Workflow Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Let's set up your business automation in just a few steps
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={setupProgress} 
          sx={{ mt: 2, height: 8, borderRadius: 4 }}
        />
      </Box>

      <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            {isMobile && (
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2, mt: 3 }}>
                  <TouchButton
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleFinishSetup : handleNext}
                    sx={{ mr: 1 }}
                    disabled={
                      (index === 0 && !businessInfo.name) ||
                      (index === 1 && businessNeeds.primaryGoals.length === 0)
                    }
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </TouchButton>
                  <TouchButton
                    disabled={index === 0}
                    onClick={handleBack}
                    variant="outlined"
                  >
                    Back
                  </TouchButton>
                </Box>
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>

      {!isMobile && (
        <Paper square elevation={0} sx={{ p: 3, mt: 3 }}>
          {steps[activeStep].content}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <TouchButton
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              startIcon={<BackIcon />}
            >
              Back
            </TouchButton>
            <TouchButton
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleFinishSetup : handleNext}
              endIcon={activeStep === steps.length - 1 ? <CheckIcon /> : <NextIcon />}
              disabled={
                (activeStep === 0 && !businessInfo.name) ||
                (activeStep === 1 && businessNeeds.primaryGoals.length === 0)
              }
            >
              {activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            </TouchButton>
          </Box>
        </Paper>
      )}

      {/* Completion Dialog */}
      <Dialog 
        open={showCompletionDialog} 
        maxWidth="sm" 
        fullWidth
        onClose={() => setShowCompletionDialog(false)}
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
          <Typography variant="h5">Setup Complete!</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" textAlign="center" sx={{ mb: 2 }}>
            Your business automation is ready to go. We'll now install your selected templates and configure them based on your preferences.
          </Typography>
          <Alert severity="success">
            You can always modify these settings and add more templates later from your dashboard.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <TouchButton
            variant="contained"
            onClick={() => {
              setShowCompletionDialog(false);
              // Navigate to dashboard
              window.location.href = '/dashboard';
            }}
          >
            Go to Dashboard
          </TouchButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessSetupWizard;