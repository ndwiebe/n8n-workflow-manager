import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Badge,
  Menu,
  MenuItem,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Schedule as ScheduledIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

interface ClientData {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: string;
  lastLogin: string;
  activeWorkflows: number;
  totalSpend: number;
  configurations: any[];
}

const mockClients: ClientData[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@acme.com',
    company: 'Acme Corp',
    role: 'admin',
    status: 'active',
    joinDate: '2024-01-15',
    lastLogin: '2024-07-15',
    activeWorkflows: 3,
    totalSpend: 447,
    configurations: [
      { workflowId: 'invoice-processor', status: 'active', activatedAt: '2024-01-20' },
      { workflowId: 'email-automation', status: 'scheduled', activatedAt: null },
      { workflowId: 'customer-support', status: 'active', activatedAt: '2024-02-01' }
    ]
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@techstart.io',
    company: 'TechStart Inc',
    role: 'user',
    status: 'active',
    joinDate: '2024-02-20',
    lastLogin: '2024-07-14',
    activeWorkflows: 2,
    totalSpend: 298,
    configurations: [
      { workflowId: 'social-media', status: 'active', activatedAt: '2024-02-25' },
      { workflowId: 'data-backup', status: 'active', activatedAt: '2024-03-01' }
    ]
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike@retail.com',
    company: 'Retail Solutions',
    role: 'admin',
    status: 'inactive',
    joinDate: '2024-03-10',
    lastLogin: '2024-06-15',
    activeWorkflows: 1,
    totalSpend: 199,
    configurations: [
      { workflowId: 'inventory-sync', status: 'error', activatedAt: '2024-03-15' }
    ]
  }
];

const statusIcons = {
  active: <ActiveIcon color="success" />,
  scheduled: <ScheduledIcon color="info" />,
  error: <ErrorIcon color="error" />,
  inactive: <ErrorIcon color="disabled" />
};

export const ClientManagement: React.FC = () => {
  const [clients] = React.useState<ClientData[]>(mockClients);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTab, setSelectedTab] = React.useState(0);
  const [selectedClient, setSelectedClient] = React.useState<ClientData | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = React.useState<ClientData | null>(null);

  const filteredClients = React.useMemo(() => {
    let filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedTab === 1) filtered = filtered.filter(c => c.status === 'active');
    if (selectedTab === 2) filtered = filtered.filter(c => c.status === 'inactive');
    if (selectedTab === 3) filtered = filtered.filter(c => c.status === 'suspended');

    return filtered;
  }, [clients, searchTerm, selectedTab]);

  const handleViewDetails = (client: ClientData) => {
    setSelectedClient(client);
    setDetailsOpen(true);
    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: ClientData) => {
    setAnchorEl(event.currentTarget);
    setMenuClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuClient(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'scheduled': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Client Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor client accounts and workflow configurations
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {clients.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Clients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {clients.filter(c => c.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Clients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {clients.reduce((sum, c) => sum + c.activeWorkflows, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Workflows
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="secondary.main">
                ${clients.reduce((sum, c) => sum + c.totalSpend, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Box p={2}>
          <TextField
            fullWidth
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />

          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
          >
            <Tab label="All Clients" />
            <Tab 
              label={
                <Badge badgeContent={clients.filter(c => c.status === 'active').length} color="success">
                  Active
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={clients.filter(c => c.status === 'inactive').length} color="warning">
                  Inactive
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={clients.filter(c => c.status === 'suspended').length} color="error">
                  Suspended
                </Badge>
              } 
            />
          </Tabs>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Workflows</TableCell>
                <TableCell>Monthly Spend</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar>{client.name.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="subtitle2">{client.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{client.company}</TableCell>
                  <TableCell>
                    <Chip
                      label={client.status}
                      color={client.status === 'active' ? 'success' : 
                             client.status === 'inactive' ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {client.configurations.map((config, index) => (
                        <Chip
                          key={index}
                          size="small"
                          label={config.workflowId.split('-')[0]}
                          color={getStatusColor(config.status) as any}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>${client.totalSpend}/mo</TableCell>
                  <TableCell>{new Date(client.lastLogin).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, client)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuClient && handleViewDetails(menuClient)}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit Client
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <EmailIcon sx={{ mr: 1 }} fontSize="small" />
          Send Message
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <BlockIcon sx={{ mr: 1 }} fontSize="small" />
          Suspend Account
        </MenuItem>
      </Menu>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Client Details: {selectedClient?.name}
        </DialogTitle>
        <DialogContent>
          {selectedClient && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body1">{selectedClient.name}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{selectedClient.email}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Company</Typography>
                  <Typography variant="body1">{selectedClient.company}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Role</Typography>
                  <Chip label={selectedClient.role} size="small" />
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Activity & Usage
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Join Date</Typography>
                  <Typography variant="body1">{new Date(selectedClient.joinDate).toLocaleDateString()}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Last Login</Typography>
                  <Typography variant="body1">{new Date(selectedClient.lastLogin).toLocaleDateString()}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Active Workflows</Typography>
                  <Typography variant="body1">{selectedClient.activeWorkflows}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">Monthly Spend</Typography>
                  <Typography variant="body1">${selectedClient.totalSpend}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Workflow Configurations
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Workflow</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Activated</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedClient.configurations.map((config, index) => (
                        <TableRow key={index}>
                          <TableCell>{config.workflowId}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {statusIcons[config.status as keyof typeof statusIcons]}
                              <Chip 
                                label={config.status} 
                                size="small" 
                                color={getStatusColor(config.status) as any}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            {config.activatedAt ? 
                              new Date(config.activatedAt).toLocaleDateString() : 
                              'Not activated'
                            }
                          </TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <SettingsIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<EditIcon />}>
            Edit Client
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};