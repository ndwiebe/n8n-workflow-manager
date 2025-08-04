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
  Alert
} from '@mui/material';
import { Save as SaveIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

export const Profile: React.FC = () => {
  const { user } = useAuthStore();
  const [editing, setEditing] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: user?.name || 'Demo User',
    email: user?.email || 'demo@example.com',
    company: user?.company || 'Demo Company',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York'
  });

  const handleSave = () => {
    setSuccess(true);
    setEditing(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
            >
              {formData.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{formData.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.company}
              </Typography>
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
                label="Company"
                fullWidth
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
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
                label="Timezone"
                fullWidth
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                disabled={!editing}
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
    </Box>
  );
};