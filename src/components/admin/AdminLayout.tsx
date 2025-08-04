import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminIcon,
  WorkspacePremium as WorkflowIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 240;

const navigationItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Workflow Modules', icon: <WorkflowIcon />, path: '/admin/workflows' },
  { text: 'Client Management', icon: <PeopleIcon />, path: '/admin/clients' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
  { text: 'System Settings', icon: <SettingsIcon />, path: '/admin/settings' }
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { admin, logout, checkPermission } = useAdminStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAdminNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 2, bgcolor: 'error.main', color: 'white' }}>
        <Box 
          display="flex" 
          alignItems="center" 
          gap={1}
          onClick={() => handleNavigation('/admin')}
          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
        >
          <AdminIcon />
          <Typography variant="h6" noWrap>
            Admin Panel
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Workflow Manager
        </Typography>
      </Box>
      
      <Divider />
      
      <List>
        {navigationItems.map((item) => {
          const hasPermission = item.path === '/admin' || 
            checkPermission(`${item.text.toLowerCase().replace(' ', '.')}.read`);
          
          if (!hasPermission) return null;
          
          return (
            <ListItem
              key={item.text}
              onClick={() => handleNavigation(item.path)}
              sx={{
                cursor: 'pointer',
                bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'error.main'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.path === location.pathname)?.text || 'Admin Dashboard'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label="ADMIN"
              size="small"
              color="warning"
              variant="filled"
            />
            
            <IconButton color="inherit" size="large">
              <Badge badgeContent={2} color="warning">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <IconButton
              size="large"
              aria-label="admin menu"
              aria-controls="admin-menu"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.main' }}>
                {admin?.name.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            
            <Menu
              id="admin-menu"
              anchorEl={anchorEl}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{admin?.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {admin?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => handleAdminNavigate('/admin/profile')}>
                <AccountIcon sx={{ mr: 2 }} fontSize="small" />
                Admin Profile
              </MenuItem>
              <MenuItem onClick={() => handleAdminNavigate('/admin/settings')}>
                <SettingsIcon sx={{ mr: 2 }} fontSize="small" />
                System Settings
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

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, md: 8 },
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};