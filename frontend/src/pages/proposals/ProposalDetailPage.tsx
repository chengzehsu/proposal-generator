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
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import { useNavigate, useParams } from 'react-router-dom'
import { projectsApi, proposalsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { ProposalStatus, getStatusColor, statusLabels } from '@/utils/proposalStatus'
import UpdateStatusDialog from '@/components/proposals/UpdateStatusDialog'
import StatusHistoryTimeline from '@/components/proposals/StatusHistoryTimeline'

interface Proposal {
  id: string
  title: string
  client_name?: string
  estimated_amount?: string
  deadline?: string
  status: string
  submission_date?: string
  result_status?: string
  result_date?: string
  win_probability?: number
  notes?: string
  created_at: string
  updated_at: string
}

interface AnalyticsData {
  success_rate: number
  confidence_level: 'low' | 'medium' | 'high'
  factors: Array<{
    factor: string
    value: string
    impact: 'positive' | 'neutral' | 'negative'
  }>
  data_points: {
    total_proposals: number
    won_proposals: number
    submitted_proposals: number
    recent_proposals: number
  }
  best_practices: Array<{
    category: string
    suggestion: string
    priority: 'high' | 'medium' | 'low'
  }>
  generated_at: string
}

const ProposalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // 編輯表單狀態
  const [formData, setFormData] = useState({
    submission_date: '',
    result_status: '',
    result_date: '',
    win_probability: 0,
    notes: ''
  })

  useEffect(() => {
    if (id) {
      loadProposalDetail()
      loadAnalytics()
    }
  }, [id])

  const loadProposalDetail = async () => {
    try {
      setLoading(true)
      const response = await proposalsApi.getProposal(id!)
      const data = response.data
      setProposal(data)

      // 初始化表單數據
      setFormData({
        submission_date: data?.submission_date || '',
        result_status: data?.result_status || '',
        result_date: data?.result_date || '',
        win_probability: data?.win_probability || 0,
        notes: data?.notes || ''
      })

      // 載入追蹤歷史（如果有對應 API）
      // loadTrackingHistory()
    } catch (error) {
      console.error('Failed to load proposal detail:', error)
      toast.error('載入標案詳情失敗')
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/analytics/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('載入分析數據失敗')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('載入分析數據失敗:', error)
      // 不顯示錯誤提示，靜默失敗
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleUpdateTracking = async () => {
    try {
      await proposalsApi.updateProposal(id!, formData)
      toast.success('追蹤資訊已更新')
      setEditMode(false)
      loadProposalDetail()
    } catch (error) {
      console.error('Failed to update tracking:', error)
      toast.error('更新失敗')
    }
  }

  const handleConvertToProject = async () => {
    if (!proposal) return

    try {
      // 創建實績案例
      const projectData = {
        name: proposal.title,
        client: proposal.client_name || '',
        amount: proposal.estimated_amount || '',
        start_date: proposal.submission_date || proposal.created_at,
        end_date: proposal.result_date || new Date().toISOString(),
        description: `從標案「${proposal.title}」轉換而來`,
        status: 'completed'
      }

      await projectsApi.createProject(projectData)
      toast.success('已成功轉換為實績案例')
      setConvertDialogOpen(false)

      // 更新標案狀態為已轉換
      await proposalsApi.updateProposal(id!, {
        ...formData,
        notes: `${formData.notes || ''  }\n\n已轉換為實績案例。`
      })

      loadProposalDetail()
    } catch (error) {
      console.error('Failed to convert to project:', error)
      toast.error('轉換為實績失敗')
    }
  }

  const handleStatusUpdated = () => {
    loadProposalDetail()
    setStatusDialogOpen(false)
  }

  const getResultStatusColor = (status: string) => {
    const colorMap: { [key: string]: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" } = {
      'won': 'success',
      'lost': 'error',
      'pending': 'warning',
      'cancelled': 'default'
    }
    return colorMap[status] || 'default'
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!proposal) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">找不到標案資訊</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 頁首 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/proposals')}
            variant="outlined"
          >
            返回列表
          </Button>
          <Typography variant="h4">{proposal.title}</Typography>
          <Chip
            label={statusLabels[proposal.status as ProposalStatus] || proposal.status}
            color={getStatusColor(proposal.status)}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {proposal.status === ProposalStatus.WON && (
            <Button
              variant="contained"
              color="success"
              startIcon={<TrendingUpIcon />}
              onClick={() => setConvertDialogOpen(true)}
            >
              轉換為實績案例
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setStatusDialogOpen(true)}
          >
            更新狀態
          </Button>

          <Button
            variant={editMode ? 'outlined' : 'contained'}
            startIcon={<EditIcon />}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? '取消編輯' : '編輯追蹤'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 基本資訊卡片 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                標案基本資訊
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <PersonIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    客戶名稱
                  </Typography>
                  <Typography variant="body1">{proposal.client_name || '未填寫'}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <MoneyIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    預估金額
                  </Typography>
                  <Typography variant="body1">{proposal.estimated_amount || '未填寫'}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <CalendarIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    截止日期
                  </Typography>
                  <Typography variant="body1">
                    {proposal.deadline ? new Date(proposal.deadline).toLocaleDateString('zh-TW') : '未設定'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <ScheduleIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    建立時間
                  </Typography>
                  <Typography variant="body1">
                    {new Date(proposal.created_at).toLocaleDateString('zh-TW')}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 追蹤資訊卡片 */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                標案追蹤資訊
              </Typography>
              <Divider sx={{ my: 2 }} />

              {editMode ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="提交日期"
                      type="date"
                      value={formData.submission_date}
                      onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>結果狀態</InputLabel>
                      <Select
                        value={formData.result_status}
                        onChange={(e) => setFormData({ ...formData, result_status: e.target.value })}
                        label="結果狀態"
                      >
                        <MenuItem value="">未決定</MenuItem>
                        <MenuItem value="pending">審查中</MenuItem>
                        <MenuItem value="won">得標</MenuItem>
                        <MenuItem value="lost">未得標</MenuItem>
                        <MenuItem value="cancelled">已取消</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="結果公布日期"
                      type="date"
                      value={formData.result_date}
                      onChange={(e) => setFormData({ ...formData, result_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="得標機率 (%)"
                      type="number"
                      value={formData.win_probability}
                      onChange={(e) => setFormData({ ...formData, win_probability: Number(e.target.value) })}
                      InputProps={{ inputProps: { min: 0, max: 100 } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="備註"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        onClick={() => setEditMode(false)}
                      >
                        取消
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleUpdateTracking}
                      >
                        儲存變更
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">提交日期</Typography>
                    <Typography variant="body1">
                      {proposal.submission_date ? new Date(proposal.submission_date).toLocaleDateString('zh-TW') : '未提交'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">結果狀態</Typography>
                    {proposal.result_status ? (
                      <Chip label={proposal.result_status} color={getResultStatusColor(proposal.result_status)} size="small" />
                    ) : (
                      <Typography variant="body1">未決定</Typography>
                    )}
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">結果公布日期</Typography>
                    <Typography variant="body1">
                      {proposal.result_date ? new Date(proposal.result_date).toLocaleDateString('zh-TW') : '未公布'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">得標機率</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={proposal.win_probability || 0}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2">{proposal.win_probability || 0}%</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">備註</Typography>
                    <Typography variant="body1">
                      {proposal.notes || '無備註'}
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* 狀態歷史時間軸 */}
          <Box sx={{ mt: 3 }}>
            <StatusHistoryTimeline proposalId={id!} />
          </Box>
        </Grid>

        {/* 側邊欄 - 統計與建議 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>成功率分析</Typography>
              <Divider sx={{ my: 2 }} />

              {analyticsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : analytics ? (
                <>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" align="center" color="primary">
                      {analytics.success_rate}%
                    </Typography>
                    <Typography variant="caption" display="block" align="center" color="text.secondary">
                      預估得標機率 (信心水平: {analytics.confidence_level === 'high' ? '高' : analytics.confidence_level === 'medium' ? '中' : '低'})
                    </Typography>
                  </Box>

                  {analytics.factors.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>影響因素</Typography>
                      {analytics.factors.map((factor, index) => (
                        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{factor.factor}</Typography>
                          <Chip
                            label={factor.value}
                            size="small"
                            color={
                              factor.impact === 'positive' ? 'success' :
                              factor.impact === 'negative' ? 'error' : 'default'
                            }
                          />
                        </Box>
                      ))}
                    </Box>
                  )}

                  {analytics.best_practices.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>最佳實踐建議</Typography>
                      <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        {analytics.best_practices.map((practice, index) => (
                          <Typography
                            component="li"
                            variant="body2"
                            key={index}
                            sx={{
                              mb: 1,
                              color: practice.priority === 'high' ? 'error.main' :
                                     practice.priority === 'medium' ? 'warning.main' : 'text.secondary'
                            }}
                          >
                            <strong>[{practice.category}]</strong> {practice.suggestion}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  暫無足夠歷史數據進行分析
                </Alert>
              )}
            </CardContent>
          </Card>

          {proposal.status === ProposalStatus.WON && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="success.main">
                  <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  得標成功！
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Alert severity="success">
                  恭喜得標！建議將此案例轉換為實績，提升未來標案競爭力。
                </Alert>

                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  sx={{ mt: 2 }}
                  onClick={() => setConvertDialogOpen(true)}
                >
                  立即轉換為實績
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* 狀態更新對話框 */}
      <UpdateStatusDialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        proposal={proposal}
        onUpdate={handleStatusUpdated}
      />

      {/* 轉換為實績確認對話框 */}
      <Dialog open={convertDialogOpen} onClose={() => setConvertDialogOpen(false)}>
        <DialogTitle>轉換為實績案例</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            此操作將把標案「{proposal.title}」轉換為實績案例，並新增至專案實績資料庫。
          </Alert>
          <Typography variant="body2" color="text.secondary">
            轉換後的實績可在「專案實績」頁面查看和管理，並可用於未來的標案提案。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertDialogOpen(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={handleConvertToProject}>
            確認轉換
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ProposalDetailPage
