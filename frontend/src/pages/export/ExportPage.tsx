import React, { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import {
  ArticleOutlined,
  Layers as Batch,
  CheckCircle,
  CloudDownload,
  Delete,
  Description,
  Download,
  Error as ErrorIcon,
  GetApp,
  History,
  PictureAsPdf,
  Refresh,
  Schedule,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { exportApi, proposalsApi } from '@/services/api'
import toast from 'react-hot-toast'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

const ExportPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [selectedProposals, setSelectedProposals] = useState<string[]>([])
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      proposal_id: '',
      format: 'pdf' as 'pdf' | 'docx' | 'odt',
      options: {
        include_cover: true,
        include_toc: true,
        include_appendix: true,
        watermark: false,
        compress: false,
      },
    },
  })

  const batchForm = useForm({
    defaultValues: {
      format: 'pdf' as 'pdf' | 'docx' | 'odt',
      merge_into_single: false,
    },
  })

  // 獲取標書列表
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', 'list'],
    queryFn: () => proposalsApi.getProposals(),
    select: (data) => data.data || [],
  })

  // 獲取匯出歷史
  const { data: exportHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['exports', 'history'],
    queryFn: () => exportApi.getExportHistory(),
    select: (data) => data.data || [],
    refetchInterval: 10000, // 每10秒更新一次
  })

  // 匯出標書
  const exportMutation = useMutation({
    mutationFn: exportApi.exportProposal,
    onSuccess: (response) => {
      toast.success('匯出任務已建立！')
      queryClient.invalidateQueries({ queryKey: ['exports', 'history'] })
      
      // 如果有下載連結，自動下載
      if (response.data.download_url) {
        const link = document.createElement('a')
        link.href = response.data.download_url
        link.download = response.data.filename
        link.click()
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '匯出失敗'
      toast.error(message)
    },
  })

  // 批次匯出
  const batchExportMutation = useMutation({
    mutationFn: exportApi.batchExport,
    onSuccess: () => {
      toast.success('批次匯出任務已建立！')
      setBatchDialogOpen(false)
      setSelectedProposals([])
      queryClient.invalidateQueries({ queryKey: ['exports', 'history'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '批次匯出失敗'
      toast.error(message)
    },
  })

  // 刪除匯出記錄
  const deleteMutation = useMutation({
    mutationFn: exportApi.deleteExport,
    onSuccess: () => {
      toast.success('匯出記錄已刪除')
      queryClient.invalidateQueries({ queryKey: ['exports', 'history'] })
    },
    onError: () => toast.error('刪除失敗'),
  })

  const handleExport = (data: any) => {
    if (!data.proposal_id) {
      toast.error('請選擇要匯出的標書')
      return
    }
    exportMutation.mutate(data)
  }

  const handleBatchExport = (data: any) => {
    if (selectedProposals.length === 0) {
      toast.error('請選擇要匯出的標書')
      return
    }
    batchExportMutation.mutate({
      ...data,
      proposal_ids: selectedProposals,
    })
  }

  const handleProposalSelect = (proposalId: string, checked: boolean) => {
    setSelectedProposals(prev => 
      checked 
        ? [...prev, proposalId]
        : prev.filter(id => id !== proposalId)
    )
  }

  const handleSelectAll = () => {
    const allSelected = selectedProposals.length === proposals.length
    setSelectedProposals(allSelected ? [] : proposals.map((p: any) => p.id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <PictureAsPdf color="error" />
      case 'docx':
        return <Description color="primary" />
      case 'odt':
        return <ArticleOutlined color="success" />
      default:
        return <Description />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />
      case 'processing':
        return <CircularProgress size={20} />
      case 'failed':
        return <ErrorIcon color="error" />
      default:
        return <Schedule color="warning" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '等待中',
      processing: '處理中',
      completed: '完成',
      failed: '失敗',
    }
    return labels[status as keyof typeof labels] || status
  }

  const formats = [
    { value: 'pdf', label: 'PDF', description: '便攜式文件格式，適合列印和分享' },
    { value: 'docx', label: 'Word文件', description: 'Microsoft Word 格式，可編輯' },
    { value: 'odt', label: 'ODT文件', description: 'OpenDocument 格式，開源標準' },
  ]

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          文件匯出
        </Typography>
        <Typography variant="body2" color="text.secondary">
          將標書匯出為多種格式的文件，支援單個匯出和批次匯出
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="單個匯出" />
          <Tab label="批次匯出" />
          <Tab label="匯出歷史" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* 匯出設定 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  匯出設定
                </Typography>

                <Box component="form" onSubmit={form.handleSubmit(handleExport)}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>選擇標書</InputLabel>
                    <Select
                      {...form.register('proposal_id')}
                      label="選擇標書"
                      value={form.watch('proposal_id')}
                      onChange={(e) => form.setValue('proposal_id', e.target.value)}
                    >
                      {proposals.map((proposal: any) => (
                        <MenuItem key={proposal.id} value={proposal.id}>
                          <Box>
                            <Typography variant="body2">{proposal.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {proposal.client_name} - {proposal.status}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>匯出格式</InputLabel>
                    <Select
                      {...form.register('format')}
                      label="匯出格式"
                      value={form.watch('format')}
                      onChange={(e) => form.setValue('format', e.target.value as any)}
                    >
                      {formats.map((format) => (
                        <MenuItem key={format.value} value={format.value}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getFormatIcon(format.value)}
                            <Box>
                              <Typography variant="body2">{format.label}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format.description}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="subtitle2" gutterBottom>
                    匯出選項
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.watch('options.include_cover')}
                          onChange={(e) => form.setValue('options.include_cover', e.target.checked)}
                        />
                      }
                      label="包含封面"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.watch('options.include_toc')}
                          onChange={(e) => form.setValue('options.include_toc', e.target.checked)}
                        />
                      }
                      label="包含目錄"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.watch('options.include_appendix')}
                          onChange={(e) => form.setValue('options.include_appendix', e.target.checked)}
                        />
                      }
                      label="包含附錄"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.watch('options.watermark')}
                          onChange={(e) => form.setValue('options.watermark', e.target.checked)}
                        />
                      }
                      label="加入浮水印"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.watch('options.compress')}
                          onChange={(e) => form.setValue('options.compress', e.target.checked)}
                        />
                      }
                      label="壓縮檔案"
                    />
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    size="large"
                    startIcon={exportMutation.isPending ? <CircularProgress size={20} /> : <GetApp />}
                    disabled={exportMutation.isPending}
                  >
                    {exportMutation.isPending ? '匯出中...' : '開始匯出'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 預覽區域 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  匯出預覽
                </Typography>
                {form.watch('proposal_id') ? (
                  <Box>
                    {(() => {
                      const selectedProposal = proposals.find((p: any) => p.id === form.watch('proposal_id'))
                      return selectedProposal ? (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            {selectedProposal.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            客戶：{selectedProposal.client_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            狀態：{selectedProposal.status}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            截止日期：{selectedProposal.deadline || '未設定'}
                          </Typography>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Typography variant="subtitle2" gutterBottom>
                            匯出設定摘要
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            <Chip
                              icon={getFormatIcon(form.watch('format'))}
                              label={formats.find(f => f.value === form.watch('format'))?.label}
                              size="small"
                              color="primary"
                            />
                            {form.watch('options.include_cover') && (
                              <Chip label="包含封面" size="small" variant="outlined" />
                            )}
                            {form.watch('options.include_toc') && (
                              <Chip label="包含目錄" size="small" variant="outlined" />
                            )}
                            {form.watch('options.watermark') && (
                              <Chip label="浮水印" size="small" variant="outlined" />
                            )}
                          </Box>
                        </Box>
                      ) : null
                    })()}
                  </Box>
                ) : (
                  <Box textAlign="center" py={4}>
                    <GetApp sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      請選擇要匯出的標書
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                批次匯出
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                >
                  {selectedProposals.length === proposals.length ? '取消全選' : '全選'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Batch />}
                  onClick={() => setBatchDialogOpen(true)}
                  disabled={selectedProposals.length === 0}
                >
                  批次匯出 ({selectedProposals.length})
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedProposals.length === proposals.length && proposals.length > 0}
                        indeterminate={selectedProposals.length > 0 && selectedProposals.length < proposals.length}
                        onChange={() => handleSelectAll()}
                      />
                    </TableCell>
                    <TableCell>標書標題</TableCell>
                    <TableCell>客戶</TableCell>
                    <TableCell>狀態</TableCell>
                    <TableCell>截止日期</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposals.map((proposal: any) => (
                    <TableRow key={proposal.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedProposals.includes(proposal.id)}
                          onChange={(e) => handleProposalSelect(proposal.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>{proposal.title}</TableCell>
                      <TableCell>{proposal.client_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={proposal.status}
                          size="small"
                          color={proposal.status === 'completed' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{proposal.deadline || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                匯出歷史
              </Typography>
              <Button
                startIcon={<Refresh />}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['exports', 'history'] })}
              >
                重新整理
              </Button>
            </Box>

            {isLoadingHistory ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : exportHistory.length === 0 ? (
              <Box textAlign="center" py={4}>
                <History sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  還沒有匯出記錄
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>檔案名稱</TableCell>
                      <TableCell>格式</TableCell>
                      <TableCell>檔案大小</TableCell>
                      <TableCell>狀態</TableCell>
                      <TableCell>匯出時間</TableCell>
                      <TableCell>到期時間</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exportHistory.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.filename}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getFormatIcon(item.format)}
                            {item.format.toUpperCase()}
                          </Box>
                        </TableCell>
                        <TableCell>{formatFileSize(item.file_size || 0)}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatusIcon(item.status)}
                            <Chip
                              label={getStatusLabel(item.status)}
                              size="small"
                              color={item.status === 'completed' ? 'success' : 
                                     item.status === 'failed' ? 'error' : 'warning'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(item.created_at).toLocaleString('zh-TW')}
                        </TableCell>
                        <TableCell>
                          {item.expires_at ? new Date(item.expires_at).toLocaleString('zh-TW') : '-'}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            {item.status === 'completed' && item.download_url && (
                              <IconButton
                                size="small"
                                href={item.download_url}
                                target="_blank"
                                title="下載"
                              >
                                <Download />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => deleteMutation.mutate(item.id)}
                              title="刪除"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* 批次匯出對話框 */}
      <Dialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>批次匯出設定</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              已選擇 {selectedProposals.length} 個標書進行批次匯出
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>匯出格式</InputLabel>
              <Select
                {...batchForm.register('format')}
                label="匯出格式"
                value={batchForm.watch('format')}
                onChange={(e) => batchForm.setValue('format', e.target.value as any)}
              >
                {formats.map((format) => (
                  <MenuItem key={format.value} value={format.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getFormatIcon(format.value)}
                      {format.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={batchForm.watch('merge_into_single')}
                  onChange={(e) => batchForm.setValue('merge_into_single', e.target.checked)}
                />
              }
              label="合併為單一檔案"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={batchForm.handleSubmit(handleBatchExport)}
            disabled={batchExportMutation.isPending}
            startIcon={batchExportMutation.isPending ? <CircularProgress size={20} /> : <CloudDownload />}
          >
            {batchExportMutation.isPending ? '匯出中...' : '開始批次匯出'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ExportPage
