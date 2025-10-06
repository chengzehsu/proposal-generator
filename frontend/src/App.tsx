import { Route, Routes } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CompanyDataPage from '@/pages/database/CompanyDataPage'
import TeamMembersPage from '@/pages/database/TeamMembersPage'
import ProjectsPage from '@/pages/database/ProjectsPage'
import TemplatesPage from '@/pages/templates/TemplatesPage'
import ProposalEditorPage from '@/pages/editor/ProposalEditorPage'
import ExportPage from '@/pages/export/ExportPage'
import ContentImprovementPage from '@/pages/ai/ContentImprovementPage'
import TranslationPage from '@/pages/ai/TranslationPage'
import RequirementExtractionPage from '@/pages/ai/RequirementExtractionPage'
import UsageMonitoringPage from '@/pages/ai/UsageMonitoringPage'
import AwardsPage from '@/pages/database/AwardsPage'
import ProposalsListPage from '@/pages/proposals/ProposalsListPage'
import ProposalDetailPage from '@/pages/proposals/ProposalDetailPage'
import { useAuthStore } from '@/services/auth'
import { useEffect } from 'react'

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // blue-600
    },
    secondary: {
      main: '#7c3aed', // violet-600
    },
    background: {
      default: '#f8fafc', // slate-50
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
})

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    // Check if user is authenticated on app start
    checkAuth()
  }, [checkAuth])

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/database/company" element={<CompanyDataPage />} />
          <Route path="/database/team" element={<TeamMembersPage />} />
          <Route path="/database/projects" element={<ProjectsPage />} />
          <Route path="/database/awards" element={<AwardsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/proposals" element={<ProposalsListPage />} />
          <Route path="/proposals/:id" element={<ProposalDetailPage />} />
          <Route path="/editor/:id?" element={<ProposalEditorPage />} />
          <Route path="/ai/improve" element={<ContentImprovementPage />} />
          <Route path="/ai/translate" element={<TranslationPage />} />
          <Route path="/ai/extract-requirements" element={<RequirementExtractionPage />} />
          <Route path="/ai/usage" element={<UsageMonitoringPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App