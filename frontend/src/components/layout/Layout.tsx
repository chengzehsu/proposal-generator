import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  Group,
  Assignment,
  EmojiEvents,
  Description,
  Create,
  GetApp,
  AccountCircle,
  Logout,
  Settings,
  AutoAwesome,
  Translate,
  FindInPage,
  Analytics,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material'
import { useAuthStore } from '@/services/auth'

const drawerWidth = 280

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [aiMenuOpen, setAiMenuOpen] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const menuItems = [
    { text: '控制台', icon: <Dashboard />, path: '/dashboard' },
    { text: '公司資料', icon: <Business />, path: '/database/company' },
    { text: '團隊成員', icon: <Group />, path: '/database/team' },
    { text: '專案實績', icon: <Assignment />, path: '/database/projects' },
    { text: '獲獎紀錄', icon: <EmojiEvents />, path: '/database/awards' },
    { text: '標書範本', icon: <Description />, path: '/templates' },
    { text: '標書編輯', icon: <Create />, path: '/editor' },
    { text: '文件匯出', icon: <GetApp />, path: '/export' },
  ]

  const aiMenuItems = [
    { text: 'AI 內容優化', icon: <AutoAwesome />, path: '/ai/improve' },
    { text: 'AI 翻譯', icon: <Translate />, path: '/ai/translate' },
    { text: '需求萃取', icon: <FindInPage />, path: '/ai/extract-requirements' },
    { text: 'AI 使用監控', icon: <Analytics />, path: '/ai/usage' },
  ]

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    await logout()
    handleMenuClose()
  }

  const drawer = (
    <Box>
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          智能標書產生器
        </Typography>
        <Typography variant="caption" color="text.secondary">
          AI Proposal Generator
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => {
                navigate(item.path)
                if (isMobile) setMobileOpen(false)
              }}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '15',
                  color: theme.palette.primary.main,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ fontSize: '0.9rem' }}
              />
            </ListItemButton>
          </ListItem>
        ))}

        {/* AI 功能選單 */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setAiMenuOpen(!aiMenuOpen)}
            sx={{
              borderRadius: 2,
              minHeight: 48,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <AutoAwesome />
            </ListItemIcon>
            <ListItemText 
              primary="AI 智能功能" 
              primaryTypographyProps={{ fontSize: '0.9rem' }}
            />
            {aiMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        {/* AI 子選單 */}
        {aiMenuOpen && (
          <Box sx={{ pl: 2 }}>
            {aiMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path)
                    if (isMobile) setMobileOpen(false)
                  }}
                  selected={location.pathname === item.path}
                  sx={{
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
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontSize: '0.85rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </Box>
        )}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user?.company_id ? '企業版' : '個人版'}
              color="primary"
              size="small"
              variant="outlined"
            />
            
            <IconButton onClick={handleMenuClick} sx={{ p: 0 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {user?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                設定
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                登出
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}

export default Layout