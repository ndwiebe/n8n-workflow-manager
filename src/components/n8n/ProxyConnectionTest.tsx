import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Router as RouterIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export const ProxyConnectionTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const testSteps = [
    'Check proxy server health',
    'Test proxy connectivity', 
    'Test n8n API through proxy',
    'Verify CORS headers'
  ];

  const runProxyTests = async () => {
    setIsRunning(true);
    setResults([]);
    setActiveStep(0);

    const testResults: TestResult[] = [];
    const proxyUrl = 'http://127.0.0.1:3002';
    const n8nProxyUrl = process.env.REACT_APP_N8N_URL;

    // Test 1: Proxy Health Check
    try {
      const healthResponse = await fetch(`${proxyUrl}/health`);
      const healthData = await healthResponse.json();
      
      testResults.push({
        test: 'Proxy Server Health',
        status: healthResponse.ok ? 'pass' : 'fail',
        message: healthResponse.ok ? 'Proxy server is running' : 'Proxy server not responding',
        details: healthData
      });
    } catch (error: any) {
      testResults.push({
        test: 'Proxy Server Health',
        status: 'fail',
        message: 'Cannot connect to proxy server',
        details: { error: error.message, suggestion: 'Run: cd server && npm install && npm start' }
      });
    }

    setActiveStep(1);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: Proxy Test Endpoint
    try {
      const testResponse = await fetch(`${proxyUrl}/api/test`);
      const testData = await testResponse.json();
      
      testResults.push({
        test: 'Proxy Test Endpoint',
        status: testResponse.ok ? 'pass' : 'fail',
        message: testResponse.ok ? 'Proxy routing is working' : 'Proxy test failed',
        details: testData
      });
    } catch (error: any) {
      testResults.push({
        test: 'Proxy Test Endpoint',
        status: 'fail',
        message: 'Proxy test endpoint failed',
        details: { error: error.message }
      });
    }

    setActiveStep(2);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: n8n API through Proxy
    try {
      const n8nResponse = await fetch(`${n8nProxyUrl}/workflows?limit=1`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': process.env.REACT_APP_N8N_API_KEY!,
          'Content-Type': 'application/json'
        }
      });

      let responseData;
      try {
        responseData = await n8nResponse.json();
      } catch {
        responseData = await n8nResponse.text();
      }

      testResults.push({
        test: 'n8n API via Proxy',
        status: n8nResponse.ok ? 'pass' : 'fail',
        message: n8nResponse.ok ? 'Successfully connected to n8n through proxy' : `n8n API error: ${n8nResponse.status}`,
        details: {
          status: `${n8nResponse.status} ${n8nResponse.statusText}`,
          response: n8nResponse.ok ? `Found ${responseData?.data?.length || 0} workflows` : responseData
        }
      });
    } catch (error: any) {
      testResults.push({
        test: 'n8n API via Proxy',
        status: 'fail',
        message: 'Failed to connect to n8n through proxy',
        details: { error: error.message }
      });
    }

    setActiveStep(3);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: CORS Headers Verification
    try {
      const corsResponse = await fetch(`${proxyUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Origin': window.location.origin
        }
      });

      const corsHeaders = {
        'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': corsResponse.headers.get('Access-Control-Allow-Headers'),
        'Access-Control-Allow-Credentials': corsResponse.headers.get('Access-Control-Allow-Credentials')
      };

      const corsWorking = corsHeaders['Access-Control-Allow-Origin'] !== null;

      testResults.push({
        test: 'CORS Headers Verification',
        status: corsWorking ? 'pass' : 'warning',
        message: corsWorking ? 'CORS headers are properly set' : 'Some CORS headers missing',
        details: corsHeaders
      });
    } catch (error: any) {
      testResults.push({
        test: 'CORS Headers Verification',
        status: 'fail',
        message: 'Could not verify CORS headers',
        details: { error: error.message }
      });
    }

    setResults(testResults);
    setActiveStep(-1);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckIcon color="success" />;
      case 'fail': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      default: return <RouterIcon color="info" />;
    }
  };

  const getStatusColor = (status: string): any => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto', my: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <RouterIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Proxy Connection Test
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={runProxyTests}
            disabled={isRunning}
            startIcon={<RouterIcon />}
          >
            {isRunning ? 'Testing...' : 'Test Proxy'}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Proxy Solution for CORS
          </Typography>
          This test verifies that the local proxy server is working to bypass Cloudflare CORS restrictions.
          The proxy forwards requests from your React app to your remote n8n instance at n8n.workflowhub.space.
        </Alert>

        {isRunning && (
          <Box sx={{ mb: 3 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {testSteps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      {index === 0 && "Checking if proxy server is running on port 3002..."}
                      {index === 1 && "Testing proxy routing and CORS configuration..."}
                      {index === 2 && "Attempting to connect to n8n through the proxy..."}
                      {index === 3 && "Verifying CORS headers are properly set..."}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {results.length > 0 && (
          <List>
            {results.map((result, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <Box sx={{ width: '100%' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(result.status)}
                        {result.test}
                      </Typography>
                      <Chip 
                        label={result.status.toUpperCase()} 
                        color={getStatusColor(result.status)} 
                        size="small" 
                      />
                    </Box>
                    <Typography variant="body1" color="text.primary" sx={{ mb: 1, ml: 4 }}>
                      {result.message}
                    </Typography>
                    {result.details && (
                      <Box ml={4} p={2} bgcolor="grey.50" borderRadius={1}>
                        <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {JSON.stringify(result.details, null, 2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </ListItem>
                {index < results.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {results.length > 0 && (
          <Box mt={3} p={2} bgcolor="green.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom color="success.dark">
              🚀 Setup Instructions:
            </Typography>
            <Typography variant="body2" component="div">
              <strong>1. Install proxy server dependencies:</strong>
              <Box component="code" sx={{ display: 'block', p: 1, bgcolor: 'grey.100', mt: 1, mb: 2, borderRadius: 1 }}>
                cd server && npm install
              </Box>
              
              <strong>2. Start the proxy server:</strong>
              <Box component="code" sx={{ display: 'block', p: 1, bgcolor: 'grey.100', mt: 1, mb: 2, borderRadius: 1 }}>
                npm start
              </Box>
              
              <strong>3. The proxy forwards requests:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li><code>localhost:3000</code> → <code>127.0.0.1:3002/api/n8n</code> → <code>n8n.workflowhub.space/api/v1</code></li>
                <li>Bypasses Cloudflare completely</li>
                <li>Adds proper CORS headers</li>
                <li>No docker-compose changes needed</li>
              </ul>
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};