import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  TextField
} from '@mui/material';
import {
  NetworkCheck as NetworkIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

export const BasicConnectivityTest: React.FC = () => {
  const [testUrl, setTestUrl] = useState('https://n8n.workflowhub.space');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testBasicConnectivity = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Test 1: Basic image request (bypasses CORS)
      const testImage = new Image();
      const imageResult = await new Promise<{ success: boolean; message: string }>((resolve) => {
        testImage.onload = () => resolve({ success: true, message: 'Server responds to requests' });
        testImage.onerror = () => resolve({ success: false, message: 'Server unreachable or blocked' });
        testImage.src = `${testUrl}/favicon.ico?t=${Date.now()}`;
        
        // Timeout after 10 seconds
        setTimeout(() => resolve({ success: false, message: 'Request timeout' }), 10000);
      });

      setResult({
        test: 'Basic Connectivity Test',
        success: imageResult.success,
        message: imageResult.message,
        details: `Testing: ${testUrl}/favicon.ico`
      });

    } catch (error: any) {
      setResult({
        test: 'Basic Connectivity Test',
        success: false,
        message: 'Network error',
        details: error.message
      });
    }

    setIsLoading(false);
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', my: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <NetworkIcon color="primary" />
          <Typography variant="h6">Basic Connectivity Test</Typography>
          <Button
            variant="outlined"
            onClick={testBasicConnectivity}
            disabled={isLoading}
            size="small"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </Button>
        </Box>

        <TextField
          fullWidth
          size="small"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          sx={{ mb: 2 }}
          helperText="URL to test basic connectivity"
        />

        {result && (
          <Alert 
            severity={result.success ? 'success' : 'error'}
            icon={result.success ? <CheckIcon /> : <ErrorIcon />}
          >
            <Typography variant="subtitle2">{result.test}</Typography>
            <Typography variant="body2">{result.message}</Typography>
            <Typography variant="caption" color="text.secondary">
              {result.details}
            </Typography>
          </Alert>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            This test bypasses CORS by requesting a simple resource (favicon). 
            If this fails, your server is unreachable or completely blocked by Cloudflare.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};