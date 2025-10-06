import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  CheckCircle,
  CloudOff,
  Description,
  Error as ErrorIcon,
  History,
  NavigateNext,
  Save,
  Schedule,
  WifiOff,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { aiApi, proposalsApi } from '@/services/api'
import ProposalEditor from '@/components/editor/ProposalEditor'
import { SaveStatus, useAutoSave, useBeforeUnload, useOfflineStorage } from '@/hooks'
import { formatRelativeTime } from '@/utils/formatTime'
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
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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
    queryFn: () => id ? proposalsApi.getProposal(id) : Promise.reject(new Error('No proposal ID')),
    enabled: !!id,
    select: (data) => data.data as ProposalData,
  })

  // 本地草稿儲存 (用於離線備份和草稿恢復)
  const [draftContent, , clearDraft] = useOfflineStorage<string>(
    `proposal_draft_${id}`,
    ''
  );

  // Populate form when proposal data is loaded
  useEffect(() => {
    if (proposal) {
      // 檢查是否有本地草稿
      if (draftContent && draftContent !== proposal.content.main) {
        const shouldRestore = window.confirm(
          '發現本地儲存的草稿，是否恢復？\n\n' +
          '點擊「確定」恢復草稿，點擊「取消」載入伺服器版本。'
        );

        if (shouldRestore) {
          setContent(draftContent);
          setHasUnsavedChanges(true);
          toast.success('已恢復本地草稿');
        } else {
          setContent(proposal.content.main ?? '');
          clearDraft(); // 清除草稿
        }
      } else {
        setContent(proposal.content.main ?? '');
      }

      form.reset({
        title: proposal.title,
        client_name: proposal.client_name,
        deadline: proposal.deadline,
      });
    }
    // form.reset 是穩定的，不需要加入依賴
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal, draftContent, clearDraft])

  // 載入版本歷史
  const { data: versions = [] } = useQuery({
    queryKey: ['proposals', 'versions', id],
    queryFn: () => id ? proposalsApi.getProposalVersions(id) : Promise.reject(new Error('No proposal ID')),
    enabled: !!id && versionsDialogOpen,
    select: (data) => data.data || [],
  })

  // 更新標書內容
  const updateContentMutation = useMutation({
    mutationFn: (data: { content: string }) =>
      id ? proposalsApi.updateProposalContent(id, {
        content: { main: data.content },
        version: proposal?.version ?? 1,
      }) : Promise.reject(new Error('No proposal ID')),
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', id] });
    },
  });

  // 更新標書基本資訊
  const updateProposalMutation = useMutation({
    mutationFn: (data: any) => id ? proposalsApi.updateProposal(id, data) : Promise.reject(new Error('No proposal ID')),
    onSuccess: () => {
      toast.success('標書資訊更新成功！')
      queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', id] })
    },
    onError: () => toast.error('更新失敗'),
  })

  // 自動儲存 Hook (支援離線備份)
  const {
    status: autoSaveStatus,
    lastSaved,
    error: saveError,
    isOffline,
    save: manualSave,
  } = useAutoSave({
    data: content,
    onSave: async (newContent: string) => {
      await updateContentMutation.mutateAsync({ content: newContent });
    },
    delay: 2000, // 2 秒防抖
    enabled: !!proposal && content !== (proposal?.content.main ?? ''),
    storageKey: `proposal_draft_${id}`,
    enableOfflineBackup: true,
    onSuccess: () => {
      toast.success('儲存成功');
    },
    onError: (error) => {
      toast.error(`儲存失敗: ${error.message}`);
    },
  });

  // 離開頁面前確認
  useBeforeUnload(
    hasUnsavedChanges || autoSaveStatus === SaveStatus.SAVING,
    '您有未儲存的變更，確定要離開嗎？'
  );

  // AI 生成內容
  const aiGenerateMutation = useMutation({
    mutationFn: aiApi.generateContent,
    onSuccess: (response) => {
      const generatedContent = response.data.content;
      if (generatedContent) {
        setContent((prev) => `${prev}\n\n${generatedContent}`);
        setHasUnsavedChanges(true);
        toast.success('AI 內容生成成功！');
      }
    },
    onError: () => toast.error('AI 生成失敗'),
  });

  // 內容變更處理
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  // 手動儲存
  const handleManualSave = () => {
    manualSave();
  };

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
    setContent(versionData.content.main ?? '')
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

  const getAutoSaveStatusText = () => {
    if (isOffline) {
      return '離線編輯 (本地備份)';
    }

    switch (autoSaveStatus) {
      case SaveStatus.SAVING:
        return '儲存中...';
      case SaveStatus.SAVED:
        return lastSaved ? `已儲存 ${formatRelativeTime(lastSaved)}` : '已儲存';
      case SaveStatus.ERROR:
        return `儲存失敗${saveError ? `: ${saveError.message}` : ''}`;
      case SaveStatus.OFFLINE:
        return '離線模式 (本地備份)';
      default:
        return '';
    }
  };

  const getAutoSaveIcon = () => {
    if (isOffline) {
      return <WifiOff fontSize="small" color="warning" />;
    }

    switch (autoSaveStatus) {
      case SaveStatus.SAVING:
        return <CircularProgress size={16} />;
      case SaveStatus.SAVED:
        return <CheckCircle fontSize="small" color="success" />;
      case SaveStatus.ERROR:
        return <ErrorIcon fontSize="small" color="error" />;
      case SaveStatus.OFFLINE:
        return <CloudOff fontSize="small" color="warning" />;
      default:
        return null;
    }
  };

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
            {/* 離線模式指示 */}
            {isOffline && (
              <Chip
                icon={<WifiOff />}
                label="離線模式"
                color="warning"
                size="small"
                sx={{ mr: 1 }}
              />
            )}

            {/* 儲存狀態指示器 */}
            <Box display="flex" alignItems="center" gap={1}>
              {getAutoSaveIcon()}
              <Typography variant="caption" color="text.secondary">
                {getAutoSaveStatusText()}
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
              disabled={autoSaveStatus === SaveStatus.SAVING}
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

      {/* 離線模式提示 */}
      {isOffline && (
        <Alert severity="warning" sx={{ m: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <WifiOff fontSize="small" />
            <Typography variant="body2">
              目前處於離線模式，內容將儲存在本機。網路恢復後會自動同步到伺服器。
            </Typography>
          </Box>
        </Alert>
      )}

      {/* 儲存失敗提示 */}
      {autoSaveStatus === SaveStatus.ERROR && saveError && (
        <Alert severity="error" sx={{ m: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <ErrorIcon fontSize="small" />
            <Typography variant="body2">
              自動儲存失敗: {saveError.message}。內容已備份至本機，請稍後重試。
            </Typography>
          </Box>
        </Alert>
      )}

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
                    secondary={`${new Date(version.created_at).toLocaleString()} - ${version.change_summary ?? '無說明'}`}
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

export default ProposalEditorPage
