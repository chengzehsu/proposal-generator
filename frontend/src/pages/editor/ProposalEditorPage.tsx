import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Breadcrumbs,
  Link,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material'
import {
  ArrowBack,
  Save,
  History,
  Description,
  NavigateNext,
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { proposalsApi, aiApi } from '@/services/api'
import ProposalEditor from '@/components/editor/ProposalEditor'
import toast from 'react-hot-toast'

interface ProposalData {
  id: string
  title: string
  client_name: string
  deadline: string
  status: 'draft' | 'in_progress' | 'submitted' | 'won' | 'lost'
  content: {
    main: string
    sections?: Record<string, string>
  }
  template_id?: string
  version: number
  created_at: string
  updated_at: string
}

const ProposalEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [content, setContent] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)

  const form = useForm({
    defaultValues: {
      title: '',
      client_name: '',
      deadline: '',
    },
  })

  // 載入標書資料
  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ['proposals', 'detail', id],
    queryFn: () => proposalsApi.getProposal(id!),
    enabled: !!id,
    select: (data) => data.data as ProposalData,
  })

  // Populate form when proposal data is loaded
  useEffect(() => {
    if (proposal) {
      setContent(proposal.content.main || '')
      form.reset({
        title: proposal.title,
        client_name: proposal.client_name,
        deadline: proposal.deadline,
      })
    }
  }, [proposal, form])

  // 載入版本歷史
  const { data: versions = [] } = useQuery({
    queryKey: ['proposals', 'versions', id],
    queryFn: () => proposalsApi.getProposalVersions(id!),
    enabled: !!id && versionsDialogOpen,
    select: (data) => data.data || [],
  })

  // 更新標書內容
  const updateContentMutation = useMutation({
    mutationFn: (data: { content: string }) => 
      proposalsApi.updateProposalContent(id!, {
        content: { main: data.content },
        version: proposal?.version || 1,
      }),
    onMutate: () => setAutoSaveStatus('saving'),
    onSuccess: () => {
      setAutoSaveStatus('saved')
      setLastSaveTime(new Date())
      queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', id] })
    },
    onError: () => setAutoSaveStatus('error'),
  })

  // 更新標書基本資訊
  const updateProposalMutation = useMutation({
    mutationFn: (data: any) => proposalsApi.updateProposal(id!, data),
    onSuccess: () => {
      toast.success('標書資訊更新成功！')
      queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', id] })
    },
    onError: () => toast.error('更新失敗'),
  })

  // AI 生成內容
  const aiGenerateMutation = useMutation({
    mutationFn: aiApi.generateContent,
    onSuccess: (response) => {
      const generatedContent = response.data.content
      if (generatedContent) {
        setContent(prev => prev + '\n\n' + generatedContent)
        toast.success('AI 內容生成成功！')
      }
    },
    onError: () => toast.error('AI 生成失敗'),
  })

  // 自動儲存功能
  const autoSave = useCallback(
    debounce((newContent: string) => {
      if (newContent !== (proposal?.content.main || '')) {
        updateContentMutation.mutate({ content: newContent })
      }
    }, 2000),
    [proposal?.content.main, updateContentMutation]
  )

  // 內容變更處理
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    autoSave(newContent)
  }

  // 手動儲存
  const handleManualSave = () => {
    updateContentMutation.mutate({ content })
  }

  // AI 生成處理
  const handleAIGenerate = (prompt: string) => {
    aiGenerateMutation.mutate({
      prompt,
      section_type: 'main',
      context: {
        company_data: true,
        proposal_title: proposal?.title,
        client_name: proposal?.client_name,
      },
    })
  }

  // 儲存基本資訊
  const handleSaveInfo = (data: any) => {
    updateProposalMutation.mutate(data)
  }

  // 版本恢復
  const handleRestoreVersion = (versionData: any) => {
    setContent(versionData.content.main || '')
    setVersionsDialogOpen(false)
    toast.success('版本恢復成功！')
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          載入標書失敗，請重試或返回標書列表
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/proposals')} sx={{ mt: 2 }}>
          返回標書列表
        </Button>
      </Box>
    )
  }

  if (!proposal) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          找不到指定的標書
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/proposals')} sx={{ mt: 2 }}>
          返回標書列表
        </Button>
      </Box>
    )
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      in_progress: 'info',
      submitted: 'warning',
      won: 'success',
      lost: 'error',
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: '草稿',
      in_progress: '進行中',
      submitted: '已提交',
      won: '得標',
      lost: '未得標',
    }
    return labels[status as keyof typeof labels] || status
  }

  const getAutoSaveIcon = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return <CircularProgress size={16} />
      case 'saved':
        return <CheckCircle color="success" />
      case 'error':
        return <ErrorIcon color="error" />
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 頁面標題和導航 */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/proposals')}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              標書管理
            </Link>
            <Typography variant="body2" color="text.primary">
              編輯標書
            </Typography>
          </Breadcrumbs>

          <Box display="flex" gap={1} alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              {getAutoSaveIcon()}
              <Typography variant="caption" color="text.secondary">
                {autoSaveStatus === 'saved' && lastSaveTime
                  ? `已儲存 ${lastSaveTime.toLocaleTimeString()}`
                  : autoSaveStatus === 'saving'
                  ? '儲存中...'
                  : autoSaveStatus === 'error'
                  ? '儲存失敗'
                  : ''}
              </Typography>
            </Box>

            <Button
              size="small"
              startIcon={<History />}
              onClick={() => setVersionsDialogOpen(true)}
            >
              版本歷史
            </Button>

            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleManualSave}
              disabled={updateContentMutation.isPending}
            >
              手動儲存
            </Button>
          </Box>
        </Box>

        {/* 標書基本資訊 */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="標書標題"
              {...form.register('title')}
              onBlur={() => handleSaveInfo(form.getValues())}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="客戶名稱"
              {...form.register('client_name')}
              onBlur={() => handleSaveInfo(form.getValues())}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="截止日期"
              {...form.register('deadline')}
              onBlur={() => handleSaveInfo(form.getValues())}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box display="flex" gap={1} alignItems="center">
              <Chip
                icon={<Description />}
                label={getStatusLabel(proposal.status)}
                color={getStatusColor(proposal.status) as any}
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                v{proposal.version}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 編輯器 */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <ProposalEditor
          content={content}
          onChange={handleContentChange}
          onSave={handleManualSave}
          onAIGenerate={handleAIGenerate}
        />
      </Box>

      {/* 版本歷史對話框 */}
      <Dialog
        open={versionsDialogOpen}
        onClose={() => setVersionsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>版本歷史</DialogTitle>
        <DialogContent>
          <List>
            {versions.map((version: any, index: number) => (
              <React.Fragment key={version.id}>
                <ListItem
                  secondaryAction={
                    <Button
                      size="small"
                      onClick={() => handleRestoreVersion(version)}
                      disabled={version.version === proposal.version}
                    >
                      {version.version === proposal.version ? '當前版本' : '恢復此版本'}
                    </Button>
                  }
                >
                  <ListItemIcon>
                    <Schedule />
                  </ListItemIcon>
                  <ListItemText
                    primary={`版本 ${version.version}`}
                    secondary={`${new Date(version.created_at).toLocaleString()} - ${version.change_summary || '無說明'}`}
                  />
                </ListItem>
                {index < versions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// 防抖函數
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default ProposalEditorPage
