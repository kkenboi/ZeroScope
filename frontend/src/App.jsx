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
import Data from "./pages/Data"
import Analysis from "./pages/Analysis"

// Ultra-modern minimalist theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2E7D32", // Forest Green (Nature)
      light: "#4CAF50",
      dark: "#1B5E20",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#5D4037", // Brown (Earth)
      light: "#8D6E63",
      dark: "#3E2723",
      contrastText: "#ffffff",
    },
    scopes: {
      scope1: "#8D6E63", // Soft Brown (Material Brown 400)
      scope2: "#FBC02D", // Soft Yellow (Material Yellow 700 - readable on white)
      scope3: "#66BB6A", // Soft Green (Material Green 400)
    },
    background: {
      default: "#F3F4F6", // Slightly darker grey for better contrast with white cards
      paper: "#FFFFFF",
    },
    success: {
      main: "#2E7D32",
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
      primary: "#111827", // Cool Gray 900
      secondary: "#6B7280", // Cool Gray 500
    },
    divider: "#E5E7EB",
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: "1.75rem",
      letterSpacing: "-0.025em",
      color: "#111827",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      letterSpacing: "-0.02em",
      color: "#111827",
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.125rem",
      letterSpacing: "-0.02em",
      color: "#111827",
    },
    body1: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
      color: "#374151",
    },
    body2: {
      fontSize: "0.8125rem",
      lineHeight: 1.5,
      color: "#6B7280",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      fontSize: "0.875rem",
      letterSpacing: "0.01em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
          borderRadius: 16,
          border: "1px solid rgba(229, 231, 235, 0.5)", // Subtle border
          backgroundImage: "none",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "24px",
          "&:last-child": {
            paddingBottom: "24px",
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: "24px 24px 0 24px",
        },
        title: {
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "#111827",
        },
        subheader: {
          fontSize: "0.875rem",
          marginTop: "4px",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 20px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          "&:hover": {
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          },
        },
        outlined: {
          borderWidth: "1.5px",
          "&:hover": {
            borderWidth: "1.5px",
            backgroundColor: "#F9FAFB",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
          borderBottom: "1px solid #F3F4F6",
        },
        head: {
          fontWeight: 600,
          backgroundColor: "#F9FAFB",
          color: "#4B5563",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
})

function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
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
            <Route path="/projects/:projectID/analysis" element={<Analysis />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/data" element={<Data />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
