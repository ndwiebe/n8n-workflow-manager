import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  TextField,
  Slider,
  Paper,
  Divider,
  Collapse,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Calculate as CalculatorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

export const ROICalculator: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [expanded, setExpanded] = useState(false);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [automationCount, setAutomationCount] = useState(3);
  const [implementationCost, setImplementationCost] = useState(500);

  // Calculate savings
  const weeklySavings = hoursPerWeek * hourlyRate;
  const monthlySavings = weeklySavings * 4.33;
  const yearlySavings = monthlySavings * 12;
  const roiPercentage = implementationCost > 0 ? ((yearlySavings - implementationCost) / implementationCost) * 100 : 0;
  const paybackMonths = implementationCost > 0 ? implementationCost / monthlySavings : 0;

  const getROIColor = (roi: number) => {
    if (roi >= 200) return 'success';
    if (roi >= 100) return 'primary';
    if (roi >= 50) return 'warning';
    return 'error';
  };

  const getROILabel = (roi: number) => {
    if (roi >= 200) return 'Excellent ROI';
    if (roi >= 100) return 'Great ROI';
    if (roi >= 50) return 'Good ROI';
    return 'Consider Optimization';
  };

  return (
    <Paper elevation={2} sx={{ mb: 3 }}>
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <CalculatorIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                ROI Calculator
              </Typography>
              <Chip 
                label="Interactive" 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            </Box>
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Calculate your potential savings and return on investment
          </Typography>

          <Collapse in={expanded}>
            <Divider sx={{ my: 3 }} />
            
            <Grid container spacing={{ xs: 2, md: 4 }}>
              {/* Input Controls */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Your Business Parameters
                </Typography>
                
                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Hours saved per week: {hoursPerWeek}
                  </Typography>
                  <Slider
                    value={hoursPerWeek}
                    onChange={(_, value) => setHoursPerWeek(value as number)}
                    min={1}
                    max={40}
                    marks={[
                      { value: 5, label: '5h' },
                      { value: 20, label: '20h' },
                      { value: 40, label: '40h' }
                    ]}
                    color="primary"
                  />
                </Box>

                <Box mb={3}>
                  <TextField
                    fullWidth
                    label="Hourly Rate ($)"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    size="small"
                    InputProps={{
                      inputProps: { min: 10, max: 200 }
                    }}
                  />
                </Box>

                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Number of automations: {automationCount}
                  </Typography>
                  <Slider
                    value={automationCount}
                    onChange={(_, value) => setAutomationCount(value as number)}
                    min={1}
                    max={10}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' }
                    ]}
                    color="secondary"
                  />
                </Box>

                <Box mb={2}>
                  <TextField
                    fullWidth
                    label="Implementation Cost ($)"
                    type="number"
                    value={implementationCost}
                    onChange={(e) => setImplementationCost(Number(e.target.value))}
                    size="small"
                    InputProps={{
                      inputProps: { min: 0, max: 10000 }
                    }}
                  />
                </Box>
              </Grid>

              {/* Results Display */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Your Projected Savings
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                      <ScheduleIcon sx={{ mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        ${weeklySavings.toLocaleString()}
                      </Typography>
                      <Typography variant="caption">
                        Weekly Savings
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <AttachMoneyIcon sx={{ mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        ${monthlySavings.toLocaleString()}
                      </Typography>
                      <Typography variant="caption">
                        Monthly Savings
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <TrendingUpIcon sx={{ mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        ${yearlySavings.toLocaleString()}
                      </Typography>
                      <Typography variant="caption">
                        Yearly Savings
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper sx={{ 
                      p: 2, 
                      textAlign: 'center', 
                      bgcolor: `${getROIColor(roiPercentage)}.light`,
                      color: `${getROIColor(roiPercentage)}.contrastText`
                    }}>
                      <SpeedIcon sx={{ mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {roiPercentage.toFixed(0)}%
                      </Typography>
                      <Typography variant="caption">
                        ROI
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Box mt={3}>
                  <Divider sx={{ mb: 2 }} />
                  <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center">
                    <Chip 
                      label={getROILabel(roiPercentage)} 
                      color={getROIColor(roiPercentage)}
                      size="small"
                    />
                    {paybackMonths > 0 && (
                      <Chip 
                        label={`${paybackMonths.toFixed(1)} month payback`}
                        color="info"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    💡 <strong>Business Impact:</strong> Your automation investment could save{' '}
                    <strong>{Math.round(hoursPerWeek * 52)} hours</strong> and{' '}
                    <strong>${yearlySavings.toLocaleString()}</strong> annually
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Collapse>

          {/* Summary when collapsed */}
          {!expanded && (
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
              <Typography variant="body2" color="text.secondary">
                Potential yearly savings: <strong>${yearlySavings.toLocaleString()}</strong>
              </Typography>
              <Chip 
                label={`${roiPercentage.toFixed(0)}% ROI`}
                color={getROIColor(roiPercentage)}
                size="small"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Paper>
  );
};