import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import {
  Add as AddIcon,
  EmojiEvents as AwardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material'
import { awardsApi } from '@/services/api'
import toast from 'react-hot-toast'

interface Award {
  id: string
  title: string
  issuer: string
  award_date?: string
  project_name?: string
  description?: string
  award_type?: string
  award_level?: string
  amount?: string
  certificate_url?: string
  is_public: boolean
  display_order: number
  created_at: string
  updated_at: string
}

const AwardsPage: React.FC = () => {
  const [awards, setAwards] = useState<Award[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingAward, setEditingAward] = useState<Award | null>(null)
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [filterYear, setFilterYear] = useState<string>('')

  const [formData, setFormData] = useState<{
    title: string
    issuer: string
    award_date: string
    project_name: string
    description: string
    award_type: string
    award_level: string
    amount: string
    certificate_url: string
    is_public: boolean
    display_order: number
  }>({
    title: '',
    issuer: '',
    award_date: '',
    project_name: '',
    description: '',
    award_type: 'OTHER',
    award_level: '',
    amount: '',
    certificate_url: '',
    is_public: true,
    display_order: 0
  })

  useEffect(() => {
    loadAwards()
  }, [filterLevel, filterYear])

  const loadAwards = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filterLevel) params.award_level = filterLevel
      if (filterYear) params.year = parseInt(filterYear)

      const data = await awardsApi.getAwards(params)
      setAwards(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load awards:', error)
      toast.error('載入獲獎記錄失敗')
      setAwards([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (award?: Award) => {
    if (award) {
      setEditingAward(award)
      setFormData({
        title: award.title,
        issuer: award.issuer,
        award_date: award.award_date?.split('T')[0] ?? '',
        project_name: award.project_name ?? '',
        description: award.description ?? '',
        award_type: award.award_type ?? 'OTHER',
        award_level: award.award_level ?? '',
        amount: award.amount ?? '',
        certificate_url: award.certificate_url ?? '',
        is_public: award.is_public,
        display_order: award.display_order
      })
    } else {
      setEditingAward(null)
      setFormData({
        title: '',
        issuer: '',
        award_date: '',
        project_name: '',
        description: '',
        award_type: 'OTHER',
        award_level: '',
        amount: '',
        certificate_url: '',
        is_public: true,
        display_order: 0
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingAward(null)
  }

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.issuer) {
        toast.error('請填寫必填欄位')
        return
      }

      const data = {
        ...formData,
        award_date: formData.award_date ? new Date(formData.award_date).toISOString() : undefined
      }

      if (editingAward) {
        await awardsApi.updateAward(editingAward.id, data)
        toast.success('獲獎記錄已更新')
      } else {
        await awardsApi.createAward(data)
        toast.success('獲獎記錄已新增')
      }

      handleCloseDialog()
      loadAwards()
    } catch (error: any) {
      console.error('Save award failed:', error)
      toast.error(error.response?.data?.message ?? '儲存失敗')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此獲獎記錄嗎？')) {
      return
    }

    try {
      await awardsApi.deleteAward(id)
      toast.success('獲獎記錄已刪除')
      loadAwards()
    } catch (error) {
      console.error('Delete award failed:', error)
      toast.error('刪除失敗')
    }
  }

  const getAwardTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      'GOVERNMENT': '政府獎項',
      'INDUSTRY': '產業獎項',
      'CERTIFICATION': '認證/證書',
      'PATENT': '專利',
      'OTHER': '其他'
    }
    return labels[type ?? ''] ?? type ?? 'OTHER'
  }

  const getAwardLevelColor = (level?: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      '金獎': 'warning',
      '銀獎': 'default',
      '銅獎': 'error',
      '優等獎': 'success',
      '特優': 'primary',
      '佳作': 'info'
    }
    return colors[level ?? ''] ?? 'default'
  }

  const availableYears = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year >= currentYear - 10; year--) {
      years.push(year.toString())
    }
    return years
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            獲獎記錄管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理公司和團隊的獲獎記錄與榮譽
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新增獲獎記錄
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>獎項等級</InputLabel>
                <Select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  label="獎項等級"
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="金獎">金獎</MenuItem>
                  <MenuItem value="銀獎">銀獎</MenuItem>
                  <MenuItem value="銅獎">銅獎</MenuItem>
                  <MenuItem value="優等獎">優等獎</MenuItem>
                  <MenuItem value="特優">特優</MenuItem>
                  <MenuItem value="佳作">佳作</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>年度</InputLabel>
                <Select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  label="年度"
                >
                  <MenuItem value="">全部</MenuItem>
                  {availableYears().map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setFilterLevel('')
                  setFilterYear('')
                }}
              >
                清除篩選
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Awards Table */}
      {loading ? (
        <Typography>載入中...</Typography>
      ) : awards.length === 0 ? (
        <Alert severity="info">
          尚未新增任何獲獎記錄。點擊「新增獲獎記錄」按鈕開始。
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>獎項名稱</TableCell>
                <TableCell>頒發單位</TableCell>
                <TableCell>年度</TableCell>
                <TableCell>等級</TableCell>
                <TableCell>類型</TableCell>
                <TableCell>相關專案</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {awards.map((award) => (
                <TableRow key={award.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AwardIcon color="warning" fontSize="small" />
                      {award.title}
                    </Box>
                  </TableCell>
                  <TableCell>{award.issuer}</TableCell>
                  <TableCell>
                    {award.award_date ? new Date(award.award_date).getFullYear() : '-'}
                  </TableCell>
                  <TableCell>
                    {award.award_level ? (
                      <Chip
                        size="small"
                        label={award.award_level}
                        color={getAwardLevelColor(award.award_level)}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={getAwardTypeLabel(award.award_type)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{award.project_name ?? '-'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={award.is_public ? '公開' : '私密'}
                      color={award.is_public ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(award)}
                      title="編輯"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {award.certificate_url && (
                      <IconButton
                        size="small"
                        onClick={() => window.open(award.certificate_url, '_blank')}
                        title="查看證書"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(award.id)}
                      title="刪除"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAward ? '編輯獲獎記錄' : '新增獲獎記錄'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="獎項名稱"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="頒發單位"
                required
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="獲獎日期"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.award_date}
                onChange={(e) => setFormData({ ...formData, award_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>獎項類型</InputLabel>
                <Select
                  value={formData.award_type}
                  onChange={(e) => setFormData({ ...formData, award_type: e.target.value })}
                  label="獎項類型"
                >
                  <MenuItem value="GOVERNMENT">政府獎項</MenuItem>
                  <MenuItem value="INDUSTRY">產業獎項</MenuItem>
                  <MenuItem value="CERTIFICATION">認證/證書</MenuItem>
                  <MenuItem value="PATENT">專利</MenuItem>
                  <MenuItem value="OTHER">其他</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>獎項等級</InputLabel>
                <Select
                  value={formData.award_level}
                  onChange={(e) => setFormData({ ...formData, award_level: e.target.value })}
                  label="獎項等級"
                >
                  <MenuItem value="">不指定</MenuItem>
                  <MenuItem value="金獎">金獎</MenuItem>
                  <MenuItem value="銀獎">銀獎</MenuItem>
                  <MenuItem value="銅獎">銅獎</MenuItem>
                  <MenuItem value="優等獎">優等獎</MenuItem>
                  <MenuItem value="特優">特優</MenuItem>
                  <MenuItem value="佳作">佳作</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="相關專案"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="獎金金額"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="例如: 100000"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="證書 URL"
                value={formData.certificate_url}
                onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
                placeholder="https://..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="獲獎說明"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>顯示狀態</InputLabel>
                <Select
                  value={formData.is_public ? 'public' : 'private'}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.value === 'public' })}
                  label="顯示狀態"
                >
                  <MenuItem value="public">公開（顯示於標書中）</MenuItem>
                  <MenuItem value="private">私密（僅內部使用）</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="顯示順序"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            儲存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AwardsPage
