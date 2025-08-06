import React, { useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountTree as WorkflowIcon,
  ViewModule as TemplateIcon,
  Notifications as NotificationIcon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  CloudQueue as CloudIcon,
  Speed as PerformanceIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileNavigationProps {
  notificationCount?: number;
  onNotificationClick?: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  notificationCount = 0,
  onNotificationClick
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const bottomNavItems = [
    { label: 'Dashboard', value: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Workflows', value: '/workflows', icon: <WorkflowIcon /> },
    { label: 'Templates', value: '/templates', icon: <TemplateIcon /> },
    { 
      label: 'Alerts', 
      value: '/notifications', 
      icon: notificationCount > 0 ? (
        <Badge badgeContent={notificationCount} color="error">
          <NotificationIcon />
        </Badge>
      ) : (
        <NotificationIcon />
      )
    }
  ];

  const drawerItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Workflows', icon: <WorkflowIcon />, path: '/workflows' },
    { text: 'Templates', icon: <TemplateIcon />, path: '/templates' },
    { text: 'Business Setup', icon: <BusinessIcon />, path: '/onboarding' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Performance', icon: <PerformanceIcon />, path: '/performance' },
    { text: 'Cloud Status', icon: <CloudIcon />, path: '/status' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  const handleBottomNavChange = (event: React.SyntheticEvent, newValue: string) => {
    if (newValue === '/notifications' && onNotificationClick) {
      onNotificationClick();
    } else {
      navigate(newValue);
    }
  };

  const handleDrawerItemClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const getCurrentBottomNavValue = () => {
    const currentPath = location.pathname;
    const matchingItem = bottomNavItems.find(item => currentPath.startsWith(item.value));
    return matchingItem ? matchingItem.value : '/dashboard';
  };

  return (
    <>
      {/* Top App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
          boxShadow: '0 2px 10px rgba(33, 150, 243, 0.3)'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              fontSize: isMobile ? '1.1rem' : '1.25rem'
            }}
          >
            n8n Manager
          </Typography>
          
          <IconButton
            color="inherit"
            onClick={onNotificationClick}
            aria-label="notifications"
          >
            <Badge badgeContent={notificationCount} color="error">
              <NotificationIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
          }
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', pt: 2 }}>
          <List>
            {drawerItems.map((item) => (
              <ListItem
                key={item.text}
                onClick={() => handleDrawerItemClick(item.path)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: '0 25px 25px 0',
                  mx: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(33, 150, 243, 0.08)',
                    transform: 'translateX(4px)',
                    transition: 'all 0.2s ease-in-out'
                  },
                  ...(location.pathname === item.path && {
                    backgroundColor: 'rgba(33, 150, 243, 0.12)',
                    borderLeft: '4px solid #2196F3'
                  })
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: location.pathname === item.path ? '#2196F3' : 'inherit',
                    minWidth: 40
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      color: location.pathname === item.path ? '#2196F3' : 'inherit'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Bottom Navigation - Mobile Only */}
      {isMobile && (
        <BottomNavigation
          value={getCurrentBottomNavValue()}
          onChange={handleBottomNavChange}
          showLabels
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.drawer + 1,
            borderTop: '1px solid rgba(0, 0, 0, 0.12)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '6px 12px 8px',
              '&.Mui-selected': {
                color: '#2196F3',
                '& .MuiBottomNavigationAction-label': {
                  fontWeight: 600
                }
              }
            }
          }}
        >
          {bottomNavItems.map((item) => (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
      )}

      {/* Spacer for bottom navigation */}
      {isMobile && <Box sx={{ height: 56 }} />}
    </>
  );
};

export default MobileNavigation;