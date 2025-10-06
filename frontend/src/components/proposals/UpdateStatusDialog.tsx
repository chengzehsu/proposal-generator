import React, { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Alert,
  Box,
  Chip
} from '@mui/material'
import {
  ProposalStatus,
  getValidStatusTransitions,
  statusLabels,
  getStatusColor
} from '@/utils/proposalStatus'
import toast from 'react-hot-toast'
import { proposalsApi } from '@/services/api'

interface UpdateStatusDialogProps {
  open: boolean
  onClose: () => void
  proposal: {
    id: string
    title: string
    status: string
  }
  onUpdate: () => void
}

const UpdateStatusDialog: React.FC<UpdateStatusDialogProps> = ({
  open,
  onClose,
  proposal,
  onUpdate
}) => {
  const [newStatus, setNewStatus] = useState<ProposalStatus>(proposal.status as ProposalStatus)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const validTransitions = getValidStatusTransitions(proposal.status as ProposalStatus)

  const handleUpdate = async () => {
    if (newStatus === proposal.status) {
      toast.error('請選擇不同的狀態')
      return
    }

    try {
      setLoading(true)
      await proposalsApi.updateProposalStatus(proposal.id, {
        status: newStatus,
        note: note.trim() || undefined
      })

      toast.success(`狀態已更新為「${statusLabels[newStatus]}」`)
      onUpdate()
      handleClose()
    } catch (error: any) {
      console.error('Failed to update status:', error)
      toast.error(error.response?.data?.message || '更新狀態失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNewStatus(proposal.status as ProposalStatus)
    setNote('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>更新標案狀態</DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            標案：<strong>{proposal.title}</strong>
          </Alert>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <span>當前狀態：</span>
            <Chip
              label={statusLabels[proposal.status as ProposalStatus]}
              color={getStatusColor(proposal.status)}
              size="small"
            />
          </Box>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>新狀態</InputLabel>
          <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ProposalStatus)}
            label="新狀態"
          >
            {validTransitions.length === 0 ? (
              <MenuItem disabled>無可用的狀態轉換</MenuItem>
            ) : (
              validTransitions.map(status => (
                <MenuItem key={status} value={status}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={statusLabels[status]}
                      color={getStatusColor(status)}
                      size="small"
                    />
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="備註（選填）"
          placeholder="記錄狀態變更的原因或相關說明..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          helperText={`${note.length}/500 字元`}
          inputProps={{ maxLength: 500 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleUpdate}
          disabled={loading || validTransitions.length === 0 || newStatus === proposal.status}
        >
          {loading ? '更新中...' : '確認更新'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UpdateStatusDialog
