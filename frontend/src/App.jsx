import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import Layout from "./layout/Layout"

import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import Register from "./pages/Register"
import ProtectedRoute from "./components/ProtectedRoute"
import EnvironmentalDashboard from "./pages/Dashboard"
import Reports from "./pages/Reports"
import Projects from "./pages/Projects"
import ProjectDetails from "./pages/ProjectDetails"

// Ultra-modern minimalist theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2E7D32",
      light: "#4CAF50",
      dark: "#1B5E20",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#5D4037",
      light: "#8D6E63",
      dark: "#3E2723",
      contrastText: "#ffffff",
    },
    background: {
      default: "#FAFAFA",
      paper: "#FFFFFF",
    },
    success: {
      main: "#388E3C",
      light: "#81C784",
    },
    warning: {
      main: "#F57C00",
      light: "#FFB74D",
    },
    error: {
      main: "#D32F2F",
      light: "#EF5350",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#6B7280",
    },
    divider: "#F3F4F6",
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: "1.75rem",
      letterSpacing: "-0.025em",
      color: "#1A1A1A",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.125rem",
      letterSpacing: "-0.02em",
      color: "#1A1A1A",
    },
    body1: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.8125rem",
      lineHeight: 1.4,
      color: "#6B7280",
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
      fontSize: "0.875rem",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          borderRadius: 12,
          border: "1px solid #F3F4F6",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            borderColor: "#E5E7EB",
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "20px",
          "&:last-child": {
            paddingBottom: "20px",
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: "20px 20px 0 20px",
        },
        title: {
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "#1A1A1A",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 16px",
          fontWeight: 500,
          boxShadow: "none",
          textTransform: "none",
        },
        contained: {
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          "&:hover": {
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
          },
        },
        outlined: {
          borderColor: "#E5E7EB",
          color: "#6B7280",
          "&:hover": {
            borderColor: "#D1D5DB",
            backgroundColor: "#F9FAFB",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
          fontSize: "0.75rem",
          height: 24,
        },
        outlined: {
          borderColor: "#E5E7EB",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "12px 16px",
          borderBottom: "1px solid #F3F4F6",
        },
        head: {
          fontWeight: 600,
          backgroundColor: "#F9FAFB",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#6B7280",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: "#F3F4F6",
        },
        bar: {
          borderRadius: 3,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          borderBottom: "1px solid #F3F4F6",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: "1px solid #F3F4F6",
          boxShadow: "none",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#F3F4F6",
        },
      },
    },
  },
})

function Logout() {
  localStorage.clear()
  return <Navigate to="/login"/>
}

function RegisterAndLogout() {
  localStorage.clear() // incase the access token has something, log out first
  return <Register />
}


function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={
                <EnvironmentalDashboard />
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<RegisterAndLogout />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectID" element={<ProjectDetails />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
