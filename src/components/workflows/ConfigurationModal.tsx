import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormHelperText
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { WorkflowModule, CredentialField } from '../../types';

interface ConfigurationModalProps {
  open: boolean;
  onClose: () => void;
  module: WorkflowModule;
  existingCredentials?: Record<string, any>;
  onSubmit: (credentials: Record<string, any>) => Promise<void>;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  open,
  onClose,
  module,
  existingCredentials = {},
  onSubmit
}) => {
  const [showPasswords, setShowPasswords] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: existingCredentials
  });

  React.useEffect(() => {
    reset(existingCredentials);
  }, [existingCredentials, reset]);

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const onFormSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      // Validate required fields
      const missingFields = module.requiredCredentials
        .filter(field => field.required && (!data[field.name] || data[field.name].trim() === ''))
        .map(field => field.label);
      
      if (missingFields.length > 0) {
        setError(`Please fill in required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }
      
      await onSubmit(data);
      onClose();
    } catch (err) {
      setError('Failed to save configuration. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: CredentialField) => {
    switch (field.type) {
      case 'select':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={{ required: field.required ? 'This field is required' : false }}
            render={({ field: formField, fieldState }) => (
              <FormControl fullWidth error={!!fieldState.error}>
                <InputLabel>{field.label}</InputLabel>
                <Select {...formField} label={field.label}>
                  {field.options?.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {field.helpText && <FormHelperText>{field.helpText}</FormHelperText>}
                {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
              </FormControl>
            )}
          />
        );

      case 'password':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={{ required: field.required ? 'This field is required' : false }}
            render={({ field: formField, fieldState }) => (
              <TextField
                {...formField}
                type={showPasswords[field.name] ? 'text' : 'password'}
                label={field.label}
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message || field.helpText}
                placeholder={field.placeholder}
                required={field.required}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility(field.name)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showPasswords[field.name] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}
          />
        );

      case 'file':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={{ required: field.required ? 'This field is required' : false }}
            render={({ field: formField, fieldState }) => (
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<CloudUploadIcon />}
                  sx={{ justifyContent: 'flex-start', p: 2 }}
                >
                  {formField.value ? 'File uploaded' : field.label}
                  <input
                    type="file"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        formField.onChange(file.name);
                      }
                    }}
                  />
                </Button>
                {field.helpText && <FormHelperText>{field.helpText}</FormHelperText>}
                {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
              </Box>
            )}
          />
        );

      default:
        return (
          <Controller
            name={field.name}
            control={control}
            rules={{ 
              required: field.required ? 'This field is required' : false,
              pattern: field.type === 'url' ? {
                value: /^https?:\/\/.+/,
                message: 'Please enter a valid URL starting with http:// or https://'
              } : undefined
            }}
            render={({ field: formField, fieldState }) => (
              <TextField
                {...formField}
                type={field.type}
                label={field.label}
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message || field.helpText}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          />
        );
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={window.innerWidth < 600}
    >
      <DialogTitle>Configure {module.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            After configuration, this workflow will be activated within 1 week. You'll receive an email notification when it's ready.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onFormSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
              {module.requiredCredentials.map(field => (
                <Box key={field.name}>
                  {renderField(field)}
                </Box>
              ))}
            </Box>
          </form>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            Your credentials are encrypted and stored securely. We never share your data with third parties.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onFormSubmit)}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Validating...' : 'Save Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};