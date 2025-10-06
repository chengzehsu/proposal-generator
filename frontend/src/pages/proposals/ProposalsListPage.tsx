import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
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
  Tooltip,
  Typography
} from '@mui/material'
import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  FileDownload as DownloadIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { proposalsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { ProposalStatus, getStatusColor, statusLabels } from '@/utils/proposalStatus'
import UpdateStatusDialog from '@/components/proposals/UpdateStatusDialog'

interface Proposal {
  id: string
  title: string
  client_name?: string
  estimated_amount?: string
  deadline?: string
  status: string
  created_at: string
  updated_at: string
  version: number
}

const ProposalsListPage: React.FC = () => {
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filterStatus) params.status = filterStatus

      const data = await proposalsApi.getProposals(params)
      setProposals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load proposals:', error)
      toast.error('載入標書列表失敗')
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    loadProposals()
  }, [loadProposals])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, proposal: Proposal) => {
    setAnchorEl(event.currentTarget)
    setSelectedProposal(proposal)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedProposal(null)
  }

  const handleView = (proposal: Proposal) => {
    navigate(`/editor/${proposal.id}`)
    handleMenuClose()
  }

  const handleDelete = async (proposal: Proposal) => {
    handleMenuClose()

    if (!confirm(`確定要刪除標書「${proposal.title}」嗎？此操作無法復原。`)) {
      return
    }

    try {
      await proposalsApi.deleteProposal(proposal.id)
      toast.success('標書已刪除')
      loadProposals()
    } catch (error) {
      console.error('Delete proposal failed:', error)
      toast.error('刪除失敗')
    }
  }

  const handleExport = (proposal: Proposal) => {
    navigate(`/export?proposalId=${proposal.id}`)
    handleMenuClose()
  }

  const handleChangeStatus = (proposal: Proposal) => {
    setSelectedProposal(proposal)
    setStatusDialogOpen(true)
    handleMenuClose()
  }

  const handleStatusUpdated = () => {
    loadProposals()
    setStatusDialogOpen(false)
  }


  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      [ProposalStatus.DRAFT]: <EditIcon fontSize="small" />,
      [ProposalStatus.PENDING]: <ScheduleIcon fontSize="small" />,
      [ProposalStatus.SUBMITTED]: <CheckCircleIcon fontSize="small" />,
      [ProposalStatus.WON]: <CheckCircleIcon fontSize="small" />,
      [ProposalStatus.LOST]: <CancelIcon fontSize="small" />,
      [ProposalStatus.CANCELLED]: <ArchiveIcon fontSize="small" />
    }
    return icons[status] ?? null
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const isDeadlineSoon = (deadline?: string) => {
    if (!deadline) return false
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 7 && daysUntil >= 0
  }

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false
    const deadlineDate = new Date(deadline)
    const today = new Date()
    return deadlineDate < today
  }

  const filteredProposals = proposals.filter(proposal => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      proposal.title.toLowerCase().includes(query) ||
      (proposal.client_name?.toLowerCase() ?? '').includes(query)
    )
  })

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            標書管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理所有標書項目
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/templates')}
          size="large"
        >
          建立新標書
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="搜尋標書名稱或客戶..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>狀態篩選</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="狀態篩選"
                  startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
                >
                  <MenuItem value="">全部狀態</MenuItem>
                  <MenuItem value={ProposalStatus.DRAFT}>{statusLabels[ProposalStatus.DRAFT]}</MenuItem>
                  <MenuItem value={ProposalStatus.PENDING}>{statusLabels[ProposalStatus.PENDING]}</MenuItem>
                  <MenuItem value={ProposalStatus.SUBMITTED}>{statusLabels[ProposalStatus.SUBMITTED]}</MenuItem>
                  <MenuItem value={ProposalStatus.WON}>{statusLabels[ProposalStatus.WON]}</MenuItem>
                  <MenuItem value={ProposalStatus.LOST}>{statusLabels[ProposalStatus.LOST]}</MenuItem>
                  <MenuItem value={ProposalStatus.CANCELLED}>{statusLabels[ProposalStatus.CANCELLED]}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Chip
                  label={`共 ${filteredProposals.length} 份標書`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`進行中 ${proposals.filter(p => [ProposalStatus.DRAFT, ProposalStatus.PENDING].includes(p.status as ProposalStatus)).length}`}
                  color="info"
                />
                <Chip
                  label={`得標 ${proposals.filter(p => p.status === ProposalStatus.WON).length}`}
                  color="success"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      {loading ? (
        <Typography>載入中...</Typography>
      ) : filteredProposals.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {searchQuery || filterStatus
            ? '沒有符合條件的標書'
            : '尚未建立任何標書。點擊「建立新標書」按鈕開始。'
          }
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>標書名稱</TableCell>
                <TableCell>客戶</TableCell>
                <TableCell>預估金額</TableCell>
                <TableCell>截止日期</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>版本</TableCell>
                <TableCell>最後更新</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProposals.map((proposal) => (
                <TableRow
                  key={proposal.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleView(proposal)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {proposal.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {proposal.client_name ?? <Typography variant="caption" color="text.secondary">未指定</Typography>}
                  </TableCell>
                  <TableCell>
                    {proposal.estimated_amount
                      ? `NT$ ${parseInt(proposal.estimated_amount).toLocaleString()}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {proposal.deadline ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {formatDate(proposal.deadline)}
                        {isOverdue(proposal.deadline) && (
                          <Chip size="small" label="逾期" color="error" />
                        )}
                        {!isOverdue(proposal.deadline) && isDeadlineSoon(proposal.deadline) && (
                          <Chip size="small" label="即將到期" color="warning" />
                        )}
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={getStatusIcon(proposal.status) ?? undefined}
                      label={statusLabels[proposal.status as ProposalStatus] ?? proposal.status}
                      color={getStatusColor(proposal.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={`v${proposal.version}`} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(proposal.updated_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="快速操作">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, proposal)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedProposal && handleView(selectedProposal)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>查看/編輯</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedProposal && handleExport(selectedProposal)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>匯出文件</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedProposal && handleChangeStatus(selectedProposal)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>更新狀態</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => selectedProposal && handleDelete(selectedProposal)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>刪除</ListItemText>
        </MenuItem>
      </Menu>

      {/* Status Update Dialog */}
      {selectedProposal && (
        <UpdateStatusDialog
          open={statusDialogOpen}
          onClose={() => setStatusDialogOpen(false)}
          proposal={selectedProposal}
          onUpdate={handleStatusUpdated}
        />
      )}
    </Box>
  )
}

export default ProposalsListPage
