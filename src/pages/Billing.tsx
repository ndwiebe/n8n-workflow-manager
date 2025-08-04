import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Upgrade as UpgradeIcon
} from '@mui/icons-material';

export const Billing: React.FC = () => {
  const [currentPlan] = React.useState({
    name: 'Professional',
    price: 299,
    period: 'monthly',
    features: [
      'Unlimited workflow modules',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
      'Team collaboration'
    ],
    nextBilling: '2024-08-15'
  });

  const [invoices] = React.useState([
    {
      id: 'INV-2024-001',
      date: '2024-07-15',
      amount: 299,
      status: 'paid',
      description: 'Monthly subscription - Professional Plan'
    },
    {
      id: 'INV-2024-002',
      date: '2024-06-15',
      amount: 299,
      status: 'paid',
      description: 'Monthly subscription - Professional Plan'
    },
    {
      id: 'INV-2024-003',
      date: '2024-05-15',
      amount: 299,
      status: 'paid',
      description: 'Monthly subscription - Professional Plan'
    }
  ]);

  const [usage] = React.useState({
    activeWorkflows: 12,
    totalExecutions: 45678,
    storageUsed: 2.4,
    apiCalls: 123456
  });

  const handleDownloadInvoice = (invoiceId: string) => {
    console.log('Downloading invoice:', invoiceId);
    // In a real app, this would trigger a download
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Billing & Subscription
      </Typography>

      <Grid container spacing={3}>
        {/* Current Plan */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CreditCardIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Current Plan</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {currentPlan.name}
              </Typography>
              <Typography variant="h5" gutterBottom>
                ${currentPlan.price}/{currentPlan.period}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Next billing: {currentPlan.nextBilling}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Plan Features:
              </Typography>
              {currentPlan.features.map((feature, index) => (
                <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                  • {feature}
                </Typography>
              ))}
              <Box mt={2}>
                <Button
                  variant="outlined"
                  startIcon={<UpgradeIcon />}
                  fullWidth
                >
                  Upgrade Plan
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage This Month
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Active Workflows
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {usage.activeWorkflows}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Executions
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {usage.totalExecutions.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Storage Used
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {usage.storageUsed} GB
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    API Calls
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {usage.apiCalls.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Method */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Method
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Your payment method will be charged automatically on the next billing date.
              </Alert>
              <Box display="flex" alignItems="center" gap={2}>
                <CreditCardIcon />
                <Typography>
                  •••• •••• •••• 4242
                </Typography>
                <Chip label="Expires 12/26" size="small" />
                <Button size="small" variant="outlined">
                  Update
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Billing History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ReceiptIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Billing History</Typography>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.id}</TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell>${invoice.amount}</TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status}
                            color={invoice.status === 'paid' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownloadInvoice(invoice.id)}
                          >
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};