import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Container,
  Avatar,
  Divider
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';

interface AdminLoginData {
  email: string;
  password: string;
}

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useAdminStore();
  const [error, setError] = React.useState<string | null>(null);

  const { control, handleSubmit } = useForm<AdminLoginData>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: AdminLoginData) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/admin');
    } catch (err) {
      setError('Invalid admin credentials');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper elevation={8} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Avatar sx={{ m: 1, bgcolor: 'error.main', width: 56, height: 56 }}>
              <AdminIcon fontSize="large" />
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom>
              Admin Access
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              n8n Workflow Manager Administration
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <SecurityIcon fontSize="small" />
              <Typography variant="body2">
                Restricted access area. Authorized personnel only.
              </Typography>
            </Box>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="email"
                    label="Admin Email"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    autoComplete="email"
                    InputProps={{
                      startAdornment: <AdminIcon sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                rules={{ required: 'Password is required' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="password"
                    label="Admin Password"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    autoComplete="current-password"
                  />
                )}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ 
                  mt: 2, 
                  bgcolor: 'error.main',
                  '&:hover': { bgcolor: 'error.dark' }
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Access Admin Panel'}
              </Button>
            </Box>
          </form>

          <Box mt={3} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              Demo: admin@n8nmanager.com / admin123
            </Typography>
          </Box>

          <Box mt={2} textAlign="center">
            <Button 
              variant="text" 
              size="small"
              onClick={() => navigate('/')}
            >
              ← Back to Client Portal
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};