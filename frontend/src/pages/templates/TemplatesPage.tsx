import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Paper,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  FileCopy,
  MoreVert,
  Description,
  Star,
  StarBorder,
  Public,
  Lock,
  Visibility,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { templatesApi } from '@/services/api'
import toast from 'react-hot-toast'

// 範本類別選項
const templateCategories = [
  '政府標案',
  '企業採購', 
  '工程建設',
  '服務提案',
  '研發專案',
  '其他'
]

// 驗證 schema
const templateSchema = z.object({
  template_name: z.string().min(2, '範本名稱至少需要2個字元').max(200, '範本名稱長度不能超過200字元'),
  description: z.string().optional(),
  category: z.enum(['政府標案', '企業採購', '工程建設', '服務提案', '研發專案', '其他'] as const, {
    errorMap: () => ({ message: '請選擇正確的範本類別' })
  }),
  is_public: z.boolean().optional().default(false),
  is_default: z.boolean().optional().default(false)
})

type TemplateForm = z.infer<typeof templateSchema>

const TemplatesPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [viewingTemplate, setViewingTemplate] = useState<any>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; template: any } | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const queryClient = useQueryClient()

  // 獲取範本列表
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', 'list', selectedCategory],
    queryFn: () => templatesApi.getTemplates({
      category: selectedCategory === 'all' ? undefined : selectedCategory
    }),
    select: (data) => data.data || [],
  })

  // 表單設置
  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      template_name: '',
      description: '',
      category: '政府標案',
      is_public: false,
      is_default: false,
    },
  })

  // 新增範本
  const createMutation = useMutation({
    mutationFn: templatesApi.createTemplate,
    onSuccess: () => {
      toast.success('範本建立成功！')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '建立失敗'
      toast.error(message)
    },
  })

  // 更新範本
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => templatesApi.updateTemplate(id, data),
    onSuccess: () => {
      toast.success('範本更新成功！')
      setDialogOpen(false)
      setEditingTemplate(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '更新失敗'
      toast.error(message)
    },
  })

  // 刪除範本
  const deleteMutation = useMutation({
    mutationFn: templatesApi.deleteTemplate,
    onSuccess: () => {
      toast.success('範本刪除成功！')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '刪除失敗'
      toast.error(message)
    },
  })

  const handleAdd = () => {
    setEditingTemplate(null)
    form.reset()
    setDialogOpen(true)
  }

  const handleEdit = (template: any) => {
    setEditingTemplate(template)
    form.reset({
      template_name: template.template_name,
      description: template.description || '',
      category: template.category,
      is_public: template.is_public,
      is_default: template.is_default,
    })
    setDialogOpen(true)
    setMenuAnchor(null)
  }

  const handleSave = (data: TemplateForm) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: any) => {
    setMenuAnchor({ element: event.currentTarget, template })
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleDuplicate = (template: any) => {
    const duplicateData = {
      template_name: `${template.template_name} (副本)`,
      description: template.description,
      category: template.category,
      is_public: false,
      is_default: false,
    }
    createMutation.mutate(duplicateData)
    setMenuAnchor(null)
  }

  const handleDelete = (template: any) => {
    if (confirm(`確定要刪除範本「${template.template_name}」嗎？`)) {
      deleteMutation.mutate(template.id)
    }
    setMenuAnchor(null)
  }

  const handleView = (template: any) => {
    setViewingTemplate(template)
    setViewDialogOpen(true)
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            標書範本管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            建立和管理標書範本，快速生成專業標書
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          新增範本
        </Button>
      </Box>

      {/* 類別篩選 */}
      <Box mb={3}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>篩選類別</InputLabel>
          <Select
            value={selectedCategory}
            label="篩選類別"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">全部類別</MenuItem>
            {templateCategories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 範本統計 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {templates.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                總範本數
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {templates.filter((t: any) => t.is_default).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                預設範本
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {templates.filter((t: any) => t.is_public).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                公開範本
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {new Set(templates.map((t: any) => t.category)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                範本類別
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 範本列表 */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography>載入中...</Typography>
        </Box>
      ) : templates.length === 0 ? (
        <Alert severity="info">
          {selectedCategory === 'all' ? '還沒有範本，請建立第一個範本' : `「${selectedCategory}」類別下沒有範本`}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template: any) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Description color="primary" />
                      {template.is_default && (
                        <Star color="warning" fontSize="small" />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, template)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Typography variant="h6" gutterBottom noWrap>
                    {template.template_name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '2.5em' }}>
                    {template.description || '無描述'}
                  </Typography>

                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    <Chip
                      label={template.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {template.is_public && (
                      <Chip
                        icon={<Public />}
                        label="公開"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                    {template.is_default && (
                      <Chip
                        icon={<Star />}
                        label="預設"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    建立時間：{new Date(template.created_at).toLocaleDateString('zh-TW')}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleView(template)}
                  >
                    查看
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleEdit(template)}
                  >
                    編輯
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 右鍵選單 */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEdit(menuAnchor?.template)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>編輯範本</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDuplicate(menuAnchor?.template)}>
          <ListItemIcon>
            <FileCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>複製範本</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDelete(menuAnchor?.template)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>刪除範本</ListItemText>
        </MenuItem>
      </Menu>

      {/* 查看範本對話框 */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          範本詳情 - {viewingTemplate?.template_name}
        </DialogTitle>
        <DialogContent>
          {viewingTemplate && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    範本名稱
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewingTemplate.template_name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    範本類別
                  </Typography>
                  <Chip 
                    label={viewingTemplate.category} 
                    color="primary" 
                    variant="outlined" 
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    範本描述
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, minHeight: '100px' }}>
                    <Typography variant="body2">
                      {viewingTemplate.description || '無描述'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    狀態設定
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {viewingTemplate.is_public && (
                      <Chip
                        icon={<Public />}
                        label="公開範本"
                        color="success"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    {viewingTemplate.is_default && (
                      <Chip
                        icon={<Star />}
                        label="預設範本"
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    {!viewingTemplate.is_public && !viewingTemplate.is_default && (
                      <Chip
                        label="私人範本"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    建立時間
                  </Typography>
                  <Typography variant="body2">
                    {new Date(viewingTemplate.created_at).toLocaleString('zh-TW')}
                  </Typography>
                  {viewingTemplate.updated_at && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                        更新時間
                      </Typography>
                      <Typography variant="body2">
                        {new Date(viewingTemplate.updated_at).toLocaleString('zh-TW')}
                      </Typography>
                    </>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            關閉
          </Button>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => {
              setViewDialogOpen(false)
              handleEdit(viewingTemplate)
            }}
          >
            編輯範本
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新增/編輯對話框 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? '編輯範本' : '新增範本'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="範本名稱"
                {...form.register('template_name')}
                error={!!form.formState.errors.template_name}
                helperText={form.formState.errors.template_name?.message}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>範本類別</InputLabel>
                <Select
                  {...form.register('category')}
                  label="範本類別"
                  value={form.watch('category')}
                  onChange={(e) => form.setValue('category', e.target.value as any)}
                >
                  {templateCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      {...form.register('is_public')}
                      checked={form.watch('is_public')}
                      onChange={(e) => form.setValue('is_public', e.target.checked)}
                    />
                  }
                  label="公開範本"
                />
                <FormControlLabel
                  control={
                    <Switch
                      {...form.register('is_default')}
                      checked={form.watch('is_default')}
                      onChange={(e) => form.setValue('is_default', e.target.checked)}
                    />
                  }
                  label="設為預設範本"
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="範本描述"
                multiline
                rows={3}
                {...form.register('description')}
                error={!!form.formState.errors.description}
                helperText={form.formState.errors.description?.message}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={form.handleSubmit(handleSave)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingTemplate ? '更新' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TemplatesPage
