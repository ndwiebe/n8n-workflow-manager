/**
 * WorkflowFormInterface Component
 * Dynamic form rendering for workflow webhook inputs
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  Alert,
  LinearProgress,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { 
  FormFieldSchema, 
  WorkflowInteractionMetadata, 
  InteractionResult 
} from './EmbeddedWorkflowInterface';
import { UnifiedWorkflowData } from '../../services/unifiedWorkflowService';

export interface WorkflowFormInterfaceProps {
  workflow: UnifiedWorkflowData;
  metadata: WorkflowInteractionMetadata;
  formSchema: FormFieldSchema[];
  webhookUrl?: string;
  onComplete: (result: InteractionResult) => void;
  onClose?: () => void;
}

interface FormData {
  [key: string]: any;
}

interface SubmissionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionId?: string;
}

export const WorkflowFormInterface: React.FC<WorkflowFormInterfaceProps> = ({
  workflow,
  metadata,
  formSchema,
  webhookUrl,
  onComplete,
  onClose
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  /**
   * Handle form field changes
   */
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear field error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of formSchema) {
      const value = formData[field.name];

      // Check required fields
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        newErrors[field.name] = `${field.label} is required`;
        continue;
      }

      // Skip validation if field is empty and not required
      if (!value) continue;

      // Type-specific validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Please enter a valid email address';
        }
      }

      if (field.type === 'number' && value) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[field.name] = 'Please enter a valid number';
        } else if (field.validation?.min !== undefined && numValue < field.validation.min) {
          newErrors[field.name] = `Minimum value is ${field.validation.min}`;
        } else if (field.validation?.max !== undefined && numValue > field.validation.max) {
          newErrors[field.name] = `Maximum value is ${field.validation.max}`;
        }
      }

      // String validation
      if (typeof value === 'string') {
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          newErrors[field.name] = `Minimum length is ${field.validation.minLength} characters`;
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          newErrors[field.name] = `Maximum length is ${field.validation.maxLength} characters`;
        }
        if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
          newErrors[field.name] = 'Please enter a valid format';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submit form data to workflow
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      let submissionResult: SubmissionResult;

      if (webhookUrl && metadata.executionMode === 'webhook') {
        // Submit via webhook
        submissionResult = await submitViaWebhook(formData);
      } else {
        // Submit via API for manual execution
        submissionResult = await submitViaAPI(formData);
      }

      setResult(submissionResult);
      setSubmitted(true);

      // Call completion callback
      onComplete({
        success: submissionResult.success,
        data: submissionResult.data,
        error: submissionResult.error,
        executionId: submissionResult.executionId
      });

    } catch (error) {
      const errorResult: SubmissionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed'
      };
      
      setResult(errorResult);
      onComplete({
        success: false,
        error: errorResult.error
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Submit via webhook URL
   */
  const submitViaWebhook = async (data: FormData): Promise<SubmissionResult> => {
    const response = await fetch(webhookUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    return {
      success: responseData.success ?? true,
      data: responseData,
      executionId: responseData.feedback_id || responseData.execution_id
    };
  };

  /**
   * Submit via API for manual execution
   */
  const submitViaAPI = async (data: FormData): Promise<SubmissionResult> => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${API_BASE_URL}/workflows/${workflow.id}/execute-with-interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interactionData: data,
        interactionType: 'form'
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    return {
      success: responseData.success ?? true,
      data: responseData.data,
      executionId: responseData.executionId
    };
  };

  /**
   * Reset form for new submission
   */
  const handleReset = () => {
    setFormData({});
    setErrors({});
    setSubmitted(false);
    setResult(null);
  };

  /**
   * Render form field based on type
   */
  const renderField = (field: FormFieldSchema) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const hasError = Boolean(error);

    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <TextField
            key={field.name}
            fullWidth
            label={field.label}
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            error={hasError}
            helperText={error}
            disabled={submitting || submitted}
            variant="outlined"
            size="medium"
          />
        );

      case 'number':
        return (
          <TextField
            key={field.name}
            fullWidth
            label={field.label}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
            error={hasError}
            helperText={error}
            disabled={submitting || submitted}
            variant="outlined"
            size="medium"
            inputProps={{
              min: field.validation?.min,
              max: field.validation?.max
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            key={field.name}
            fullWidth
            multiline
            rows={4}
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            error={hasError}
            helperText={error}
            disabled={submitting || submitted}
            variant="outlined"
            size="medium"
          />
        );

      case 'select':
        return (
          <FormControl key={field.name} fullWidth error={hasError} disabled={submitting || submitted}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              label={field.label}
              required={field.required}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {error && (
              <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                {error}
              </Typography>
            )}
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                disabled={submitting || submitted}
              />
            }
            label={field.label}
          />
        );

      case 'radio':
        return (
          <FormControl key={field.name} error={hasError} disabled={submitting || submitted}>
            <FormLabel>{field.label}</FormLabel>
            <RadioGroup
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {error && (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            )}
          </FormControl>
        );

      default:
        return null;
    }
  };

  /**
   * Render submission result
   */
  const renderResult = () => {
    if (!result) return null;

    if (result.success) {
      return (
        <Alert 
          severity="success" 
          sx={{ mt: 2 }}
          icon={<SuccessIcon />}
          action={
            <Tooltip title="Submit another">
              <IconButton size="small" onClick={handleReset}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            Form submitted successfully!
          </Typography>
          {result.executionId && (
            <Typography variant="body2" color="text.secondary">
              Execution ID: {result.executionId}
            </Typography>
          )}
          {result.data?.message && (
            <Typography variant="body2">
              {result.data.message}
            </Typography>
          )}
        </Alert>
      );
    } else {
      return (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          icon={<ErrorIcon />}
          action={
            <Tooltip title="Try again">
              <IconButton size="small" onClick={handleReset}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            Submission failed
          </Typography>
          <Typography variant="body2">
            {result.error || 'Unknown error occurred'}
          </Typography>
        </Alert>
      );
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          {workflow.businessName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {workflow.description}
        </Typography>
        
        {metadata.executionMode === 'webhook' && (
          <Chip 
            size="small" 
            label="Real-time Processing" 
            color="primary" 
            icon={<InfoIcon />}
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {formSchema.map((field) => (
            <Grid item xs={12} key={field.name}>
              {renderField(field)}
            </Grid>
          ))}
        </Grid>

        {/* Loading indicator */}
        {submitting && (
          <Box sx={{ mt: 3, mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Submitting to workflow...
            </Typography>
          </Box>
        )}

        {/* Form actions */}
        {!submitted && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SendIcon />}
              disabled={submitting}
              size="large"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
            
            {Object.keys(formData).length > 0 && (
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={submitting}
              >
                Clear
              </Button>
            )}
            
            {onClose && (
              <Button
                variant="text"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
          </Box>
        )}

        {/* Submission result */}
        {renderResult()}
      </form>
    </Box>
  );
};

export default WorkflowFormInterface;