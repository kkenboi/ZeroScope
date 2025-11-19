import { useState, createContext, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
} from "@mui/material"

const drawerWidth = 240
const collapsedDrawerWidth = 64

// Create context for sidebar state
const SidebarContext = createContext()

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleToggleCollapse = () => {
    setCollapsed(!collapsed)
  }

  const menuItems = [
    {
      text: "Dashboard",
      path: "/",
    },
    {
      text: "Projects",
      path: "/projects",
    },
    {
      text: "Data",
      path: "/data",
    },
    {
      text: "Analysis",
      path: "/analysis",
    },
    {
      text: "Reports",
      path: "/reports",
    },
  ]

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ p: collapsed ? 1 : 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!collapsed ? (
          <Typography
            variant="h4"
            component="div"
            sx={{
              fontWeight: 700,
              color: "primary.main",
              letterSpacing: "-0.02em",
            }}
          >
            ZeroScope
          </Typography>
        ) : (
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: "primary.main",
              fontSize: "1.8rem",
            }}
          >
            ZS
          </Typography>
        )}
      </Box>
      <List sx={{ px: collapsed ? 1 : 2, py: 1, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
              }}
              sx={{
                borderRadius: 1.5,
                py: 1,
                px: collapsed ? 1 : 2,
                minHeight: 40,
                justifyContent: collapsed ? "center" : "flex-start",
                "&.Mui-selected": {
                  backgroundColor: "primary.main",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                  },
                },
                "&:hover": {
                  backgroundColor: "#F9FAFB",
                },
              }}
            >
              <ListItemText
                primary={collapsed ? item.text.charAt(0) : item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 500,
                  fontSize: collapsed ? "1rem" : "0.875rem",
                  textAlign: collapsed ? "center" : "left",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: collapsed ? 1 : 2 }}>
        <ListItemButton
          onClick={handleToggleCollapse}
          sx={{
            borderRadius: 1.5,
            py: 1,
            px: collapsed ? 1 : 2,
            minHeight: 40,
            justifyContent: collapsed ? "center" : "flex-start",
            "&:hover": {
              backgroundColor: "#F9FAFB",
            },
          }}
        >
          <ListItemText
            primary={collapsed ? "→" : "← Collapse"}
            primaryTypographyProps={{
              fontSize: collapsed ? "1rem" : "0.875rem",
              textAlign: collapsed ? "center" : "left",
              color: "text.secondary",
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  )

  const currentDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth

  const sidebarContextValue = {
    collapsed,
    drawerWidth: currentDrawerWidth,
  }

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <Box
          component="nav"
          sx={{
            width: { md: currentDrawerWidth },
            flexShrink: { md: 0 },
          }}
        >

          {/* Desktop Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: currentDrawerWidth,
                transition: "width 0.3s ease",
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            width: { xs: "100%", md: `calc(100% - ${currentDrawerWidth}px)` },
          }}
        >
          {/* AppBar */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              backgroundColor: "background.paper",
              color: "text.primary",
              borderBottom: "1px solid #F3F4F6",
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", minHeight: "64px !important" }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                sx={{ mr: 2, display: { md: "none" } }}
              >
                Menu
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ display: { xs: "none", sm: "block" } }}>
                Carbon Assessment Platform
              </Typography>
              <Box />
            </Toolbar>
          </AppBar>

          {/* Page Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              backgroundColor: "background.default",
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </SidebarContext.Provider>
  )
}

export default Layout
