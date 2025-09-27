import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CompanyDataPage from '@/pages/database/CompanyDataPage';
import TeamMembersPage from '@/pages/database/TeamMembersPage';
import ProjectsPage from '@/pages/database/ProjectsPage';
import TemplatesPage from '@/pages/templates/TemplatesPage';
import ProposalEditorPage from '@/pages/editor/ProposalEditorPage';
import ExportPage from '@/pages/export/ExportPage';
import ContentImprovementPage from '@/pages/ai/ContentImprovementPage';
import TranslationPage from '@/pages/ai/TranslationPage';
import RequirementExtractionPage from '@/pages/ai/RequirementExtractionPage';
import UsageMonitoringPage from '@/pages/ai/UsageMonitoringPage';
import { useAuthStore } from '@/services/auth';
import { useEffect } from 'react';
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
});
function App() {
    const { isAuthenticated, checkAuth } = useAuthStore();
    useEffect(() => {
        // Check if user is authenticated on app start
        checkAuth();
    }, [checkAuth]);
    if (!isAuthenticated) {
        return (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(Routes, { children: _jsx(Route, { path: "*", element: _jsx(LoginPage, {}) }) })] }));
    }
    return (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/database/company", element: _jsx(CompanyDataPage, {}) }), _jsx(Route, { path: "/database/team", element: _jsx(TeamMembersPage, {}) }), _jsx(Route, { path: "/database/projects", element: _jsx(ProjectsPage, {}) }), _jsx(Route, { path: "/database/awards", element: _jsx("div", { children: "\u7372\u734E\u7D00\u9304\u9801\u9762 - \u958B\u767C\u4E2D" }) }), _jsx(Route, { path: "/templates", element: _jsx(TemplatesPage, {}) }), _jsx(Route, { path: "/editor/:id?", element: _jsx(ProposalEditorPage, {}) }), _jsx(Route, { path: "/ai/improve", element: _jsx(ContentImprovementPage, {}) }), _jsx(Route, { path: "/ai/translate", element: _jsx(TranslationPage, {}) }), _jsx(Route, { path: "/ai/extract-requirements", element: _jsx(RequirementExtractionPage, {}) }), _jsx(Route, { path: "/ai/usage", element: _jsx(UsageMonitoringPage, {}) }), _jsx(Route, { path: "/export", element: _jsx(ExportPage, {}) }), _jsx(Route, { path: "*", element: _jsx(DashboardPage, {}) })] }) })] }));
}
export default App;
