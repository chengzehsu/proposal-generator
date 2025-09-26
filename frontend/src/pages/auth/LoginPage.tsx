import React, { useState } from 'react'
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Container,
  Tabs,
  Tab,
  Grid,
  Alert
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/services/auth'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子信箱'),
  password: z.string().min(8, '密碼至少需要8個字元'),
})

const registerSchema = z.object({
  email: z.string().email('請輸入有效的電子信箱'),
  password: z.string()
    .min(8, '密碼至少需要8個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, '密碼必須包含大小寫字母、數字和特殊符號'),
  name: z.string().min(1, '請輸入姓名').max(100, '姓名長度不能超過100字元'),
  company_name: z.string().min(1, '請輸入公司名稱').max(200, '公司名稱長度不能超過200字元'),
  tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字'),
  address: z.string().min(1, '請輸入公司地址'),
  phone: z.string().min(1, '請輸入聯絡電話'),
  company_email: z.string().email('請輸入有效的公司電子信箱'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

const LoginPage: React.FC = () => {
  const [tab, setTab] = useState(0)
  const { login, register, isLoading } = useAuthStore()

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const handleLogin = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  const handleRegister = async (data: RegisterForm) => {
    try {
      const userData = {
        email: data.email,
        password: data.password,
        name: data.name,
        company: {
          company_name: data.company_name,
          tax_id: data.tax_id,
          address: data.address,
          phone: data.phone,
          email: data.company_email,
        },
      }
      await register(userData)
    } catch (error) {
      console.error('Register error:', error)
    }
  }

  return (
    <Container maxWidth="md">
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        py={4}
      >
        <Card sx={{ width: '100%', maxWidth: 600 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" align="center" gutterBottom>
              智能標書產生器
            </Typography>
            <Typography variant="body2" align="center" sx={{ mb: 3, color: 'text.secondary' }}>
              AI驅動的智能標案提案生成系統
            </Typography>

            <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} centered sx={{ mb: 3 }}>
              <Tab label="登入" />
              <Tab label="註冊" />
            </Tabs>

            {tab === 0 && (
              <Box component="form" onSubmit={loginForm.handleSubmit(handleLogin)}>
                <TextField
                  fullWidth
                  label="電子信箱"
                  type="email"
                  margin="normal"
                  {...loginForm.register('email')}
                  error={!!loginForm.formState.errors.email}
                  helperText={loginForm.formState.errors.email?.message}
                />
                <TextField
                  fullWidth
                  label="密碼"
                  type="password"
                  margin="normal"
                  {...loginForm.register('password')}
                  error={!!loginForm.formState.errors.password}
                  helperText={loginForm.formState.errors.password?.message}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading}
                >
                  {isLoading ? '登入中...' : '登入'}
                </Button>
              </Box>
            )}

            {tab === 1 && (
              <Box component="form" onSubmit={registerForm.handleSubmit(handleRegister)}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  註冊新帳戶會同時建立您的公司資料
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>個人資訊</Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="姓名"
                      {...registerForm.register('name')}
                      error={!!registerForm.formState.errors.name}
                      helperText={registerForm.formState.errors.name?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="電子信箱"
                      type="email"
                      {...registerForm.register('email')}
                      error={!!registerForm.formState.errors.email}
                      helperText={registerForm.formState.errors.email?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="密碼"
                      type="password"
                      {...registerForm.register('password')}
                      error={!!registerForm.formState.errors.password}
                      helperText={registerForm.formState.errors.password?.message}
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>公司資訊</Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="公司名稱"
                      {...registerForm.register('company_name')}
                      error={!!registerForm.formState.errors.company_name}
                      helperText={registerForm.formState.errors.company_name?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="統一編號"
                      {...registerForm.register('tax_id')}
                      error={!!registerForm.formState.errors.tax_id}
                      helperText={registerForm.formState.errors.tax_id?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="公司地址"
                      {...registerForm.register('address')}
                      error={!!registerForm.formState.errors.address}
                      helperText={registerForm.formState.errors.address?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="聯絡電話"
                      {...registerForm.register('phone')}
                      error={!!registerForm.formState.errors.phone}
                      helperText={registerForm.formState.errors.phone?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="公司電子信箱"
                      type="email"
                      {...registerForm.register('company_email')}
                      error={!!registerForm.formState.errors.company_email}
                      helperText={registerForm.formState.errors.company_email?.message}
                    />
                  </Grid>
                </Grid>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading}
                >
                  {isLoading ? '註冊中...' : '建立帳戶'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}

export default LoginPage