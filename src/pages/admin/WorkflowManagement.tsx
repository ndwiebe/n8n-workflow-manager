import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  WorkspacePremium as WorkflowIcon
} from '@mui/icons-material';
import { WorkflowModuleForm } from '../../components/admin/WorkflowModuleForm';
import { useAdminWorkflowStore } from '../../store/adminWorkflowStore';
import { WorkflowModule } from '../../types';

export const WorkflowManagement: React.FC = () => {
  const {
    modules,
    loading,
    error,
    fetchModules,
    deleteModule,
    duplicateModule,
    toggleModuleStatus
  } = useAdminWorkflowStore();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<WorkflowModule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [moduleToDelete, setModuleToDelete] = React.useState<WorkflowModule | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedModule, setSelectedModule] = React.useState<WorkflowModule | null>(null);

  React.useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const categories = React.useMemo(() => {
    const cats = new Set(modules.map(m => m.category));
    return Array.from(cats).sort();
  }, [modules]);

  const filteredModules = React.useMemo(() => {
    return modules.filter(module => {
      const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           module.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || module.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [modules, searchTerm, categoryFilter]);

  const handleCreateNew = () => {
    setEditingModule(null);
    setFormOpen(true);
  };

  const handleEdit = (module: WorkflowModule) => {
    setEditingModule(module);
    setFormOpen(true);
    handleMenuClose();
  };

  const handleDelete = (module: WorkflowModule) => {
    setModuleToDelete(module);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (moduleToDelete) {
      await deleteModule(moduleToDelete.id);
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
    }
  };

  const handleDuplicate = async (module: WorkflowModule) => {
    await duplicateModule(module.id);
    handleMenuClose();
  };

  const handleToggleStatus = async (module: WorkflowModule) => {
    const newStatus = !(module as any).active;
    await toggleModuleStatus(module.id, newStatus);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, module: WorkflowModule) => {
    setAnchorEl(event.currentTarget);
    setSelectedModule(module);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedModule(null);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Workflow Modules
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage available workflow modules for clients
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          size="large"
        >
          Create Module
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterIcon />
                </InputAdornment>
              )
            }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {filteredModules.map(module => (
          <Grid item xs={12} md={6} lg={4} key={module.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {module.name}
                    </Typography>
                    <Chip 
                      label={module.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </Box>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={(module as any).active !== false}
                          onChange={() => handleToggleStatus(module)}
                          size="small"
                        />
                      }
                      label=""
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, module)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {module.description}
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {module.monthlyPrice && (
                    <Chip 
                      label={`$${module.monthlyPrice}/month`} 
                      size="small" 
                      color="secondary" 
                      variant="outlined" 
                    />
                  )}
                  <Chip 
                    label={`${module.requiredCredentials.length} credentials`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`${module.features.length} features`} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Setup time: {module.estimatedSetupTime}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEdit(module)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  color="info"
                >
                  Preview
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedModule && handleEdit(selectedModule)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit Module
        </MenuItem>
        <MenuItem onClick={() => selectedModule && handleDuplicate(selectedModule)}>
          <CopyIcon sx={{ mr: 1 }} fontSize="small" />
          Duplicate
        </MenuItem>
        <MenuItem onClick={() => selectedModule && handleDelete(selectedModule)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      <WorkflowModuleForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        module={editingModule}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Workflow Module</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{moduleToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreateNew}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};