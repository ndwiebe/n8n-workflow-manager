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
  Chip
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

export const N8nDiagnostic: React.FC = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results = [];
    
    // Test 1: Environment Variables
    results.push({
      test: 'Environment Variables',
      status: process.env.REACT_APP_N8N_URL && process.env.REACT_APP_N8N_API_KEY ? 'pass' : 'fail',
      details: {
        'N8N URL': process.env.REACT_APP_N8N_URL || 'Not set',
        'API Key': process.env.REACT_APP_N8N_API_KEY ? `${process.env.REACT_APP_N8N_API_KEY.slice(0, 8)}...` : 'Not set'
      }
    });

    // Test 2: Basic URL Reachability
    try {
      const response = await fetch(process.env.REACT_APP_N8N_URL!, { 
        method: 'GET',
        mode: 'no-cors' // This bypasses CORS for basic connectivity test
      });
      results.push({
        test: 'n8n Server Reachability',
        status: 'pass',
        details: { 'Response': 'Server responded (CORS blocked details)' }
      });
    } catch (error: any) {
      results.push({
        test: 'n8n Server Reachability',
        status: 'fail',
        details: { 'Error': error.message }
      });
    }

    // Test 3: API Endpoint Test
    try {
      const apiUrl = `${process.env.REACT_APP_N8N_URL}/api/v1/workflows?limit=1`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': process.env.REACT_APP_N8N_API_KEY!,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          test: 'n8n API Authentication',
          status: 'pass',
          details: { 
            'Status': `${response.status} ${response.statusText}`,
            'Data': JSON.stringify(data, null, 2).slice(0, 200) + '...'
          }
        });
      } else {
        const errorText = await response.text();
        results.push({
          test: 'n8n API Authentication',
          status: 'fail',
          details: { 
            'Status': `${response.status} ${response.statusText}`,
            'Response': errorText.slice(0, 300)
          }
        });
      }
    } catch (error: any) {
      results.push({
        test: 'n8n API Authentication',
        status: 'fail',
        details: { 'Error': error.message }
      });
    }

    // Test 4: CORS Check
    try {
      const response = await fetch(`${process.env.REACT_APP_N8N_URL}/api/v1/workflows`, {
        method: 'OPTIONS'
      });
      results.push({
        test: 'CORS Configuration',
        status: 'pass',
        details: { 
          'CORS Headers': 'OPTIONS request succeeded',
          'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin') || 'Not set'
        }
      });
    } catch (error: any) {
      results.push({
        test: 'CORS Configuration',
        status: 'fail',
        details: { 
          'Error': error.message,
          'Solution': 'Add CORS headers to your n8n instance'
        }
      });
    }

    // Test 5: API Key Format Check
    const apiKey = process.env.REACT_APP_N8N_API_KEY!;
    const isValidFormat = apiKey && (apiKey.startsWith('ghp_') || apiKey.startsWith('n8n_') || apiKey.length >= 32);
    results.push({
      test: 'API Key Format',
      status: isValidFormat ? 'pass' : 'fail',
      details: { 
        'Format': apiKey ? 'Key provided' : 'No key',
        'Length': apiKey ? `${apiKey.length} characters` : '0',
        'Prefix': apiKey ? apiKey.slice(0, 4) : 'None'
      }
    });

    setDiagnosticResults(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircleIcon color="success" />;
      case 'fail': return <ErrorIcon color="error" />;
      default: return <BugReportIcon color="warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto', my: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <BugReportIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              n8n Connection Diagnostics
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={runDiagnostics}
            disabled={isRunning}
            startIcon={<BugReportIcon />}
          >
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          This tool will help diagnose why your n8n connection is failing. 
          Click "Run Diagnostics" to test your connection step by step.
        </Alert>

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
                          <strong>{key}:</strong> 
                          <Box component="pre" sx={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.75rem', 
                            whiteSpace: 'pre-wrap',
                            mt: 0.5,
                            p: 1,
                            bgcolor: 'grey.100',
                            borderRadius: 1,
                            maxHeight: '100px',
                            overflow: 'auto'
                          }}>
                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                          </Box>
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
          <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Common Solutions:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
              <li>If CORS fails: Add <code>N8N_CORS_ORIGIN=http://localhost:3001</code> to your n8n environment</li>
              <li>If API key fails: Generate a new API key in n8n Settings → API Keys</li>
              <li>If server unreachable: Check if your n8n instance is running and accessible</li>
              <li>If authentication fails: Verify your API key has the correct permissions</li>
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};