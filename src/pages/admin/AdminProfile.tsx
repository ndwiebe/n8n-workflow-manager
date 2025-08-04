import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Edit as EditIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAdminStore } from '../../store/adminStore';

export const AdminProfile: React.FC = () => {
  const { admin } = useAdminStore();
  const [editing, setEditing] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: admin?.name || 'Admin User',
    email: admin?.email || 'admin@example.com',
    role: 'System Administrator',
    department: 'IT Operations',
    phone: '+1 (555) 987-6543',
    lastLogin: admin?.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : new Date().toLocaleDateString()
  });

  const [permissions] = React.useState([
    'User Management',
    'Workflow Management', 
    'System Configuration',
    'Analytics & Reporting',
    'Billing Management',
    'Security Settings'
  ]);

  const [recentActivity] = React.useState([
    { action: 'Updated workflow module', time: '2 hours ago' },
    { action: 'Created new user account', time: '4 hours ago' },
    { action: 'Modified system settings', time: '1 day ago' },
    { action: 'Generated analytics report', time: '2 days ago' }
  ]);

  const handleSave = () => {
    setSuccess(true);
    setEditing(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Profile
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Admin profile updated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar
                  sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
                >
                  <AdminIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6">{formData.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formData.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formData.role}
                  </Typography>
                  <Chip 
                    label="Admin" 
                    color="primary" 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email"
                    fullWidth
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Role"
                    fullWidth
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Department"
                    fullWidth
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Phone"
                    fullWidth
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Last Login"
                    fullWidth
                    value={formData.lastLogin}
                    disabled
                  />
                </Grid>
              </Grid>

              <Box display="flex" gap={2} mt={3}>
                {editing ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Permissions
              </Typography>
              <List dense>
                {permissions.map((permission, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemText primary={permission} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Activity
              </Typography>
              <List dense>
                {recentActivity.map((activity, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemText
                      primary={activity.action}
                      secondary={activity.time}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};