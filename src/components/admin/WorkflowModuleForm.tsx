import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { WorkflowModule, CredentialField } from '../../types';
import { useAdminWorkflowStore } from '../../store/adminWorkflowStore';

interface WorkflowModuleFormProps {
  open: boolean;
  onClose: () => void;
  module?: WorkflowModule | null;
}

interface FormData {
  name: string;
  description: string;
  category: string;
  icon: string;
  requiredCredentials: CredentialField[];
  externalTools: { value: string }[];
  features: { value: string }[];
  estimatedSetupTime: string;
  monthlyPrice?: number;
  active: boolean;
}

const categories = [
  'Finance',
  'Marketing',
  'Customer Service',
  'E-commerce',
  'Communication',
  'Infrastructure',
  'Analytics',
  'HR',
  'Sales',
  'Operations'
];

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'password', label: 'Password' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'file', label: 'File Upload' }
];

export const WorkflowModuleForm: React.FC<WorkflowModuleFormProps> = ({
  open,
  onClose,
  module
}) => {
  const { createModule, updateModule, loading } = useAdminWorkflowStore();
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = !!module;

  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      icon: '',
      requiredCredentials: [],
      externalTools: [],
      features: [],
      estimatedSetupTime: '',
      monthlyPrice: undefined,
      active: true
    }
  });

  const {
    fields: credentialFields,
    append: appendCredential,
    remove: removeCredential
  } = useFieldArray({
    control,
    name: 'requiredCredentials'
  });

  const {
    fields: toolFields,
    append: appendTool,
    remove: removeTool
  } = useFieldArray({
    control,
    name: 'externalTools' as const
  });

  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature
  } = useFieldArray({
    control,
    name: 'features' as const
  });

  React.useEffect(() => {
    if (module) {
      reset({
        name: module.name,
        description: module.description,
        category: module.category,
        icon: module.icon,
        requiredCredentials: module.requiredCredentials,
        externalTools: module.externalTools.map(tool => ({ value: tool })),
        features: module.features.map(feature => ({ value: feature })),
        estimatedSetupTime: module.estimatedSetupTime,
        monthlyPrice: module.monthlyPrice,
        active: (module as any).active !== false
      });
    } else {
      reset({
        name: '',
        description: '',
        category: '',
        icon: '',
        requiredCredentials: [],
        externalTools: [],
        features: [],
        estimatedSetupTime: '',
        monthlyPrice: undefined,
        active: true
      });
    }
  }, [module, reset]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const moduleData = {
        ...data,
        externalTools: data.externalTools.map(tool => tool.value || ''),
        features: data.features.map(feature => feature.value || '')
      };

      if (isEditing && module) {
        await updateModule(module.id, moduleData);
      } else {
        await createModule(moduleData);
      }
      
      onClose();
    } catch (err) {
      setError('Failed to save module');
    }
  };

  const addCredentialField = () => {
    appendCredential({
      name: '',
      label: '',
      type: 'text',
      required: true,
      placeholder: '',
      helpText: ''
    });
  };

  const addExternalTool = () => {
    appendTool({ value: '' });
  };

  const addFeature = () => {
    appendFeature({ value: '' });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={window.innerWidth < 900}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isEditing ? 'Edit Workflow Module' : 'Create New Workflow Module'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Basic Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: 'Name is required' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Module Name"
                        fullWidth
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="category"
                    control={control}
                    rules={{ required: 'Category is required' }}
                    render={({ field, fieldState }) => (
                      <FormControl fullWidth error={!!fieldState.error}>
                        <InputLabel>Category</InputLabel>
                        <Select {...field} label="Category">
                          {categories.map(cat => (
                            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    rules={{ required: 'Description is required' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="estimatedSetupTime"
                    control={control}
                    rules={{ required: 'Setup time is required' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Estimated Setup Time"
                        fullWidth
                        placeholder="e.g., 3-5 days"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="monthlyPrice"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Monthly Price (USD)"
                        fullWidth
                        type="number"
                        placeholder="99"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="active"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Active (visible to clients)"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Required Credentials</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box mb={2}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addCredentialField}
                >
                  Add Credential Field
                </Button>
              </Box>
              
              {credentialFields.map((field, index) => (
                <Box key={field.id} sx={{ border: 1, borderColor: 'divider', p: 2, mb: 2, borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name={`requiredCredentials.${index}.name`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Field Name (code)"
                            fullWidth
                            placeholder="apiKey"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name={`requiredCredentials.${index}.label`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Display Label"
                            fullWidth
                            placeholder="API Key"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name={`requiredCredentials.${index}.type`}
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Field Type</InputLabel>
                            <Select {...field} label="Field Type">
                              {fieldTypes.map(type => (
                                <MenuItem key={type.value} value={type.value}>
                                  {type.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name={`requiredCredentials.${index}.placeholder`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Placeholder"
                            fullWidth
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Controller
                        name={`requiredCredentials.${index}.required`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} />}
                            label="Required"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <IconButton
                        onClick={() => removeCredential(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name={`requiredCredentials.${index}.helpText`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Help Text"
                            fullWidth
                            multiline
                            rows={2}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">External Tools & Features</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    External Tools/APIs
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addExternalTool}
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    Add Tool
                  </Button>
                  {toolFields.map((field, index) => (
                    <Box key={field.id} display="flex" gap={1} mb={1}>
                      <Controller
                        name={`externalTools.${index}.value` as const}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Tool/API Name"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                      <IconButton
                        onClick={() => removeTool(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Features
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addFeature}
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    Add Feature
                  </Button>
                  {featureFields.map((field, index) => (
                    <Box key={field.id} display="flex" gap={1} mb={1}>
                      <Controller
                        name={`features.${index}.value` as const}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Feature Description"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                      <IconButton
                        onClick={() => removeFeature(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Module' : 'Create Module')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};