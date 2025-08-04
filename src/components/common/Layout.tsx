import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Container,
  Chip,
  Badge
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  WorkspacePremium as PremiumIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkflowStore } from '../../store/workflowStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { configurations } = useWorkflowStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const activeWorkflows = configurations.filter(c => c.status === 'active').length;
  const pendingWorkflows = configurations.filter(c => c.status === 'scheduled').length;

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              flexGrow: 0, 
              mr: { xs: 2, md: 4 },
              fontSize: { xs: '1rem', md: '1.25rem' },
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8
              }
            }}
          >
            n8n Workflow Manager
          </Typography>
          
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            gap: { xs: 1, md: 2 },
            flexWrap: 'wrap'
          }}>
            <Chip
              label={`${activeWorkflows} Active`}
              color="success"
              size="small"
              variant="outlined"
              sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}
            />
            {pendingWorkflows > 0 && (
              <Chip
                label={`${pendingWorkflows} Pending`}
                color="warning"
                size="small"
                variant="outlined"
                sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit" size="large">
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.name.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => handleNavigate('/dashboard')}>
                <DashboardIcon sx={{ mr: 2 }} fontSize="small" />
                Dashboard
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/profile')}>
                <AccountCircleIcon sx={{ mr: 2 }} fontSize="small" />
                Profile
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/settings')}>
                <SettingsIcon sx={{ mr: 2 }} fontSize="small" />
                Settings
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/billing')}>
                <PremiumIcon sx={{ mr: 2 }} fontSize="small" />
                Billing
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 2 }} fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 2,
          mt: 'auto',
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © 2024 n8n Workflow Manager. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};