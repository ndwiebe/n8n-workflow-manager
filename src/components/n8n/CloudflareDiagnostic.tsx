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
  TextField
} from '@mui/material';
import {
  Cloud as CloudIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

export const CloudflareDiagnostic: React.FC = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testUrl, setTestUrl] = useState(process.env.REACT_APP_N8N_URL || '');

  const runCloudflareDiagnostics = async () => {
    setIsRunning(true);
    const results = [];

    // Test 1: Cloudflare Detection
    try {
      const response = await fetch(testUrl, { 
        method: 'GET',
        mode: 'no-cors'
      });
      
      const isCloudflare = response.headers.get('cf-ray') || 
                          response.headers.get('server')?.includes('cloudflare') ||
                          testUrl.includes('workflowhub.space'); // Your domain likely uses CF

      results.push({
        test: 'Cloudflare Detection',
        status: isCloudflare ? 'warning' : 'pass',
        details: {
          'Cloudflare Detected': isCloudflare ? 'Yes - This may cause API issues' : 'No',
          'CF-Ray Header': response.headers.get('cf-ray') || 'Not present',
          'Server Header': response.headers.get('server') || 'Not available'
        }
      });
    } catch (error: any) {
      results.push({
        test: 'Cloudflare Detection',
        status: 'fail',
        details: { 'Error': error.message }
      });
    }

    // Test 2: API Endpoint with User Agent
    try {
      const apiUrl = `${testUrl}/api/v1/workflows?limit=1`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': process.env.REACT_APP_N8N_API_KEY!,
          'Content-Type': 'application/json',
          'User-Agent': 'SMB-Automation-Platform/1.0'
        }
      });

      results.push({
        test: 'API Request with User-Agent',
        status: response.ok ? 'pass' : 'fail',
        details: {
          'Status': `${response.status} ${response.statusText}`,
          'CF-Ray': response.headers.get('cf-ray') || 'Not present',
          'Response': response.ok ? 'Success' : await response.text().then(t => t.slice(0, 200))
        }
      });
    } catch (error: any) {
      results.push({
        test: 'API Request with User-Agent',
        status: 'fail',
        details: { 'Error': error.message }
      });
    }

    // Test 3: Bypass Rule Verification
    try {
      const bypassTest = await fetch(`${testUrl}/api/v1/workflows?limit=1`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': process.env.REACT_APP_N8N_API_KEY!,
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'X-Bypass-Test': 'cloudflare-policy-42727cce'
        }
      });

      const cfRay = bypassTest.headers.get('cf-ray');
      const isSuccess = bypassTest.ok;
      
      results.push({
        test: 'Cloudflare Bypass Rule Test',
        status: isSuccess ? 'pass' : 'fail',
        details: {
          'Status': `${bypassTest.status} ${bypassTest.statusText}`,
          'CF-Ray': cfRay || 'No CF-Ray header (bypass working?)',
          'Bypass Status': cfRay ? 'Request processed by Cloudflare' : 'Request may be bypassed',
          'Response': isSuccess ? 'API accessible' : await bypassTest.text().then(t => t.slice(0, 200))
        }
      });
    } catch (error: any) {
      results.push({
        test: 'Cloudflare Bypass Rule Test',
        status: 'fail',
        details: { 
          'Error': error.message,
          'Bypass Rule': 'Policy ID: 42727cce-2b4a-4817-89d5-3e0e65df8a10 may not be active'
        }
      });
    }

    // Test 4: CORS Preflight Request
    try {
      const directTest = await fetch(`${testUrl}/api/v1/workflows`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'X-N8N-API-KEY'
        }
      });

      results.push({
        test: 'CORS Preflight Request',
        status: directTest.ok ? 'pass' : 'fail',
        details: {
          'Status': `${directTest.status} ${directTest.statusText}`,
          'CORS Origin': directTest.headers.get('Access-Control-Allow-Origin') || 'Not set',
          'CORS Methods': directTest.headers.get('Access-Control-Allow-Methods') || 'Not set',
          'CORS Headers': directTest.headers.get('Access-Control-Allow-Headers') || 'Not set'
        }
      });
    } catch (error: any) {
      results.push({
        test: 'CORS Preflight Request',
        status: 'fail',
        details: { 'Error': error.message }
      });
    }

    // Test 5: Browser Security Check
    const securityFeatures = {
      'Mixed Content': window.location.protocol === 'https:' && testUrl.startsWith('https:'),
      'Secure Context': window.isSecureContext,
      'Local Development': window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    };

    results.push({
      test: 'Browser Security Context',
      status: Object.values(securityFeatures).every(Boolean) ? 'pass' : 'warning',
      details: securityFeatures
    });

    setDiagnosticResults(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircleIcon color="success" />;
      case 'fail': return <ErrorIcon color="error" />;
      case 'warning': return <SecurityIcon color="warning" />;
      default: return <CloudIcon color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
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
            <CloudIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Cloudflare Connection Diagnostics
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={runCloudflareDiagnostics}
            disabled={isRunning}
            startIcon={<CloudIcon />}
          >
            {isRunning ? 'Testing...' : 'Test Cloudflare'}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Testing Cloudflare Bypass Rule
          </Typography>
          Your domain appears to have a Cloudflare bypass rule configured (Policy ID: 42727cce-2b4a-4817-89d5-3e0e65df8a10). 
          This diagnostic will verify if the bypass is working correctly.
        </Alert>

        <TextField
          fullWidth
          label="n8n URL to Test"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          sx={{ mb: 3 }}
          helperText="Your n8n instance URL (defaults to environment variable)"
        />

        {diagnosticResults.length > 0 && (
          <List>
            {diagnosticResults.map((result, index) => (
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
                    <Box ml={4}>
                      {Object.entries(result.details).map(([key, value]) => (
                        <Typography key={key} variant="body2" color="text.secondary" component="div">
                          <strong>{key}:</strong> {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                </ListItem>
                {index < diagnosticResults.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {diagnosticResults.length > 0 && (
          <Box mt={3} p={2} bgcolor="blue.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom color="primary.dark">
              🔧 Bypass Rule Troubleshooting:
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Your bypass rule is configured but may need refinement:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li><strong>Policy ID:</strong> 42727cce-2b4a-4817-89d5-3e0e65df8a10</li>
                <li><strong>Current Rule:</strong> "Include Everyone" - This bypasses ALL security for ALL users</li>
                <li><strong>Recommendation:</strong> Make it more specific to your API paths</li>
              </ul>
              
              <strong>Suggested Cloudflare Rule Updates:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Change rule to: <code>(http.request.uri.path contains "/api/v1/")</code></li>
                <li>Or target specific origins: <code>(http.referer contains "localhost")</code></li>
                <li>Ensure rule is at the TOP of your WAF rules list</li>
              </ul>
              
              <strong>If bypass isn't working, try n8n CORS fix:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>In your n8n Docker environment:</li>
                <li><code>N8N_CORS_ORIGIN=http://localhost:3000,http://localhost:3001</code></li>
                <li><code>N8N_SECURE_COOKIE=false</code></li>
                <li>Restart container: <code>docker restart n8n</code></li>
              </ul>
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};