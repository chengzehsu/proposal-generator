import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem, Chip, Divider, useTheme, useMediaQuery, } from '@mui/material';
import { Menu as MenuIcon, Dashboard, Business, Group, Assignment, EmojiEvents, Description, Create, GetApp, AccountCircle, Logout, Settings, AutoAwesome, Translate, FindInPage, Analytics, ExpandMore, ExpandLess, } from '@mui/icons-material';
import { useAuthStore } from '@/services/auth';
const drawerWidth = 280;
const Layout = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [aiMenuOpen, setAiMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const menuItems = [
        { text: '控制台', icon: _jsx(Dashboard, {}), path: '/dashboard' },
        { text: '公司資料', icon: _jsx(Business, {}), path: '/database/company' },
        { text: '團隊成員', icon: _jsx(Group, {}), path: '/database/team' },
        { text: '專案實績', icon: _jsx(Assignment, {}), path: '/database/projects' },
        { text: '獲獎紀錄', icon: _jsx(EmojiEvents, {}), path: '/database/awards' },
        { text: '標書範本', icon: _jsx(Description, {}), path: '/templates' },
        { text: '標書編輯', icon: _jsx(Create, {}), path: '/editor' },
        { text: '文件匯出', icon: _jsx(GetApp, {}), path: '/export' },
    ];
    const aiMenuItems = [
        { text: 'AI 內容優化', icon: _jsx(AutoAwesome, {}), path: '/ai/improve' },
        { text: 'AI 翻譯', icon: _jsx(Translate, {}), path: '/ai/translate' },
        { text: '需求萃取', icon: _jsx(FindInPage, {}), path: '/ai/extract-requirements' },
        { text: 'AI 使用監控', icon: _jsx(Analytics, {}), path: '/ai/usage' },
    ];
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleLogout = async () => {
        await logout();
        handleMenuClose();
    };
    const drawer = (_jsxs(Box, { children: [_jsxs(Box, { sx: { p: 3, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h6", fontWeight: "bold", color: "primary", children: "\u667A\u80FD\u6A19\u66F8\u7522\u751F\u5668" }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "AI Proposal Generator" })] }), _jsx(Divider, {}), _jsxs(List, { sx: { px: 2 }, children: [menuItems.map((item) => (_jsx(ListItem, { disablePadding: true, sx: { mb: 0.5 }, children: _jsxs(ListItemButton, { onClick: () => {
                                navigate(item.path);
                                if (isMobile)
                                    setMobileOpen(false);
                            }, selected: location.pathname === item.path, sx: {
                                borderRadius: 2,
                                minHeight: 48,
                                '&.Mui-selected': {
                                    backgroundColor: theme.palette.primary.main + '15',
                                    color: theme.palette.primary.main,
                                    '& .MuiListItemIcon-root': {
                                        color: theme.palette.primary.main,
                                    },
                                },
                            }, children: [_jsx(ListItemIcon, { sx: { minWidth: 40 }, children: item.icon }), _jsx(ListItemText, { primary: item.text, primaryTypographyProps: { fontSize: '0.9rem' } })] }) }, item.text))), _jsx(ListItem, { disablePadding: true, sx: { mb: 0.5 }, children: _jsxs(ListItemButton, { onClick: () => setAiMenuOpen(!aiMenuOpen), sx: {
                                borderRadius: 2,
                                minHeight: 48,
                            }, children: [_jsx(ListItemIcon, { sx: { minWidth: 40 }, children: _jsx(AutoAwesome, {}) }), _jsx(ListItemText, { primary: "AI \u667A\u80FD\u529F\u80FD", primaryTypographyProps: { fontSize: '0.9rem' } }), aiMenuOpen ? _jsx(ExpandLess, {}) : _jsx(ExpandMore, {})] }) }), aiMenuOpen && (_jsx(Box, { sx: { pl: 2 }, children: aiMenuItems.map((item) => (_jsx(ListItem, { disablePadding: true, sx: { mb: 0.5 }, children: _jsxs(ListItemButton, { onClick: () => {
                                    navigate(item.path);
                                    if (isMobile)
                                        setMobileOpen(false);
                                }, selected: location.pathname === item.path, sx: {
                                    borderRadius: 2,
                                    minHeight: 44,
                                    pl: 1,
                                    '&.Mui-selected': {
                                        backgroundColor: theme.palette.primary.main + '15',
                                        color: theme.palette.primary.main,
                                        '& .MuiListItemIcon-root': {
                                            color: theme.palette.primary.main,
                                        },
                                    },
                                }, children: [_jsx(ListItemIcon, { sx: { minWidth: 36 }, children: item.icon }), _jsx(ListItemText, { primary: item.text, primaryTypographyProps: { fontSize: '0.85rem' } })] }) }, item.text))) }))] })] }));
    return (_jsxs(Box, { sx: { display: 'flex' }, children: [_jsx(AppBar, { position: "fixed", sx: {
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                }, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, sx: { mr: 2, display: { md: 'none' } }, children: _jsx(MenuIcon, {}) }), _jsx(Box, { sx: { flexGrow: 1 } }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Chip, { label: user?.company_id ? '企業版' : '個人版', color: "primary", size: "small", variant: "outlined" }), _jsx(IconButton, { onClick: handleMenuClick, sx: { p: 0 }, children: _jsx(Avatar, { sx: { width: 32, height: 32 }, children: _jsx(AccountCircle, {}) }) }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, transformOrigin: { horizontal: 'right', vertical: 'top' }, anchorOrigin: { horizontal: 'right', vertical: 'bottom' }, children: [_jsxs(Box, { sx: { px: 2, py: 1 }, children: [_jsx(Typography, { variant: "subtitle1", fontWeight: "medium", children: user?.name }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: user?.email })] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: handleMenuClose, children: [_jsx(ListItemIcon, { children: _jsx(Settings, { fontSize: "small" }) }), "\u8A2D\u5B9A"] }), _jsxs(MenuItem, { onClick: handleLogout, children: [_jsx(ListItemIcon, { children: _jsx(Logout, { fontSize: "small" }) }), "\u767B\u51FA"] })] })] })] }) }), _jsxs(Box, { component: "nav", sx: { width: { md: drawerWidth }, flexShrink: { md: 0 } }, children: [_jsx(Drawer, { variant: "temporary", open: mobileOpen, onClose: handleDrawerToggle, ModalProps: {
                            keepMounted: true, // Better open performance on mobile.
                        }, sx: {
                            display: { xs: 'block', md: 'none' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                        }, children: drawer }), _jsx(Drawer, { variant: "permanent", sx: {
                            display: { xs: 'none', md: 'block' },
                            '& .MuiDrawer-paper': {
                                boxSizing: 'border-box',
                                width: drawerWidth,
                                borderRight: '1px solid',
                                borderColor: 'divider',
                            },
                        }, open: true, children: drawer })] }), _jsxs(Box, { component: "main", sx: {
                    flexGrow: 1,
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    minHeight: '100vh',
                    backgroundColor: 'background.default',
                }, children: [_jsx(Toolbar, {}), _jsx(Box, { sx: { p: 3 }, children: children })] })] }));
};
export default Layout;
