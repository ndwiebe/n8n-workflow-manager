import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);

  const { control, handleSubmit } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Sign In
      </Typography>
      
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        Access your n8n workflow dashboard
      </Typography>

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
                label="Email"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                autoComplete="email"
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
                label="Password"
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
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </Box>
      </form>

      <Box mt={3} textAlign="center">
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link href="/register" underline="hover">
            Sign up
          </Link>
        </Typography>
      </Box>

      <Box mt={2} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          Demo credentials: demo@example.com / password
        </Typography>
      </Box>
    </Paper>
  );
};