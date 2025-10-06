import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Business, Edit, Save } from '@mui/icons-material'
import { companyApi } from '@/services/api'
import toast from 'react-hot-toast'

// Validation schema
const companySchema = z.object({
  company_name: z.string().min(1, '請輸入公司名稱').max(200, '公司名稱長度不能超過200字元'),
  tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字'),
  address: z.string().min(1, '請輸入公司地址'),
  phone: z.string().min(1, '請輸入聯絡電話'),
  email: z.string().email('請輸入有效的公司電子信箱'),
  capital: z.string().optional(),
  established_date: z.string().optional(),
  website: z.string().url('請輸入有效的網站URL').optional().or(z.literal('')),
})

type CompanyForm = z.infer<typeof companySchema>

const CompanyDataPage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<number>(1)
  const queryClient = useQueryClient()

  // Fetch company data
  const { data: companyData, isLoading, error } = useQuery({
    queryKey: ['company', 'basic'],
    queryFn: companyApi.getBasicData,
    retry: 1,
  })

  // Form setup
  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: '',
      tax_id: '',
      address: '',
      phone: '',
      email: '',
      capital: '',
      established_date: '',
      website: '',
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CompanyForm & { version: number }) => companyApi.updateBasicData(data),
    onSuccess: () => {
      toast.success('公司資料更新成功！')
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['company', 'basic'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? '更新失敗，請稍後再試'
      toast.error(message)
      
      if (error.response?.status === 409) {
        // Version conflict, refetch data
        queryClient.invalidateQueries({ queryKey: ['company', 'basic'] })
      }
    },
  })

  // Populate form when data is loaded
  useEffect(() => {
    if (companyData?.data) {
      const company = companyData.data
      form.reset({
        company_name: company.company_name ?? '',
        tax_id: company.tax_id ?? '',
        address: company.address ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        capital: company.capital?.toString() ?? '',
        established_date: company.established_date ?? '',
        website: company.website ?? '',
      })
      setCurrentVersion(company.version ?? 1)
    }
  }, [companyData, form])

  const handleSave = async (data: CompanyForm) => {
    const updateData = {
      ...data,
      version: currentVersion,
    }
    
    updateMutation.mutate(updateData)
  }

  const handleCancel = () => {
    if (companyData?.data) {
      const company = companyData.data
      form.reset({
        company_name: company.company_name ?? '',
        tax_id: company.tax_id ?? '',
        address: company.address ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        capital: company.capital?.toString() ?? '',
        established_date: company.established_date ?? '',
        website: company.website ?? '',
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error">
        載入公司資料失敗，請重新整理頁面
      </Alert>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            公司資料管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理您的公司基本資訊，這些資料將用於生成標書內容
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          {companyData?.data && (
            <Chip
              icon={<Business />}
              label={`版本 ${currentVersion}`}
              color="primary"
              variant="outlined"
            />
          )}
          
          {!isEditing ? (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setIsEditing(true)}
            >
              編輯資料
            </Button>
          ) : (
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                取消
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={form.handleSubmit(handleSave)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? '儲存中...' : '儲存'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={form.handleSubmit(handleSave)}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  基本資訊
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="公司名稱"
                  {...form.register('company_name')}
                  error={!!form.formState.errors.company_name}
                  helperText={form.formState.errors.company_name?.message}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="統一編號"
                  {...form.register('tax_id')}
                  error={!!form.formState.errors.tax_id}
                  helperText={form.formState.errors.tax_id?.message}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="公司地址"
                  {...form.register('address')}
                  error={!!form.formState.errors.address}
                  helperText={form.formState.errors.address?.message}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="聯絡電話"
                  {...form.register('phone')}
                  error={!!form.formState.errors.phone}
                  helperText={form.formState.errors.phone?.message}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="公司電子信箱"
                  type="email"
                  {...form.register('email')}
                  error={!!form.formState.errors.email}
                  helperText={form.formState.errors.email?.message}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="資本額 (萬元)"
                  type="number"
                  {...form.register('capital')}
                  error={!!form.formState.errors.capital}
                  helperText={form.formState.errors.capital?.message}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="成立日期"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  {...form.register('established_date')}
                  error={!!form.formState.errors.established_date}
                  helperText={form.formState.errors.established_date?.message}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="公司網站"
                  placeholder="https://www.example.com"
                  {...form.register('website')}
                  error={!!form.formState.errors.website}
                  helperText={form.formState.errors.website?.message}
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {companyData?.data && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              系統資訊
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  建立時間：{new Date(companyData.data.created_at).toLocaleString('zh-TW')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  最後更新：{new Date(companyData.data.updated_at).toLocaleString('zh-TW')}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default CompanyDataPage
