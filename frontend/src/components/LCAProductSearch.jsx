import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Typography,
  Box,
  Chip,
  Alert,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Science as ScienceIcon,
  Inventory as ProductIcon,
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );
}

function LCAProductSearch({ open, onClose, onSelect }) {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (database = null) => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search_term: searchQuery,
        limit: '50',
      });

      const response = await fetch(`/api/brightway2/search_activities_for_inputs/?${params}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      // Filter by database if specified
      let activities = data.activities || [];
      if (database) {
        activities = activities.filter(a => a.database === database);
      }
      
      setResults(activities);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectActivity = (activity) => {
    onSelect({
      type: 'lca',
      database: activity.database,
      code: activity.code,
      name: activity.name,
      location: activity.location,
      unit: activity.unit,
    });
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setResults([]);
    setError(null);
    setTabValue(0);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, height: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon color="primary" />
          <Typography variant="h6">Add LCA Activity</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Search for LCA products and processes from Brightway2 databases
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="All Databases" icon={<ScienceIcon />} iconPosition="start" />
          <Tab label="Custom Products" icon={<ProductIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Search across all imported Brightway2 databases (ecoinvent, custom products, etc.)
          </Alert>
          <TextField
            fullWidth
            placeholder="e.g., electricity production, transport, aluminum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={searching}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={() => handleSearch()}
            disabled={searching || !searchQuery.trim()}
            fullWidth
            sx={{ mb: 2 }}
          >
            {searching ? <CircularProgress size={20} /> : 'Search All Databases'}
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Search for custom LCA products you've created in Brightway2
          </Alert>
          <TextField
            fullWidth
            placeholder="Search your custom products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={searching}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={() => handleSearch('custom_products')}
            disabled={searching || !searchQuery.trim()}
            fullWidth
            sx={{ mb: 2 }}
          >
            {searching ? <CircularProgress size={20} /> : 'Search Custom Products'}
          </Button>
        </TabPanel>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {searchQuery && !searching && results.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No results found. Try a different search term.
            </Typography>
          )}

          {!searchQuery && !searching && (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Enter a search term and click Search to find activities
            </Typography>
          )}

          <List>
            {results.map((activity, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => handleSelectActivity(activity)}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2">
                        {activity.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={activity.database}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                        {activity.location && (
                          <Chip
                            label={activity.location}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {activity.unit && (
                          <Chip
                            label={activity.unit}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

export default LCAProductSearch;
