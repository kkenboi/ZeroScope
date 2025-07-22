import { Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemText, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const drawerWidth = 240;

export default function Layout({ children }) {
  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer variant="permanent" sx={{ width: drawerWidth, [`& .MuiDrawer-paper`]: { width: drawerWidth } }}>
        <Toolbar />
        <List>
          <ListItem button component={Link} to="/">
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button component={Link} to="/reports">
            <ListItemText primary="Reports" />
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
          <Toolbar>
            <Typography variant="h6" noWrap>
              Carbon Platform
            </Typography>
          </Toolbar>
        </AppBar>
        <Toolbar /> {/* spacing under AppBar */}
        {children}
      </Box>
    </Box>
  );
}
