import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  Typography
} from '@mui/material'
import {
  History as HistoryIcon
} from '@mui/icons-material'
import { proposalsApi } from '@/services/api'
import { getStatusColor, statusLabels } from '@/utils/proposalStatus'
import toast from 'react-hot-toast'

interface StatusHistoryTimelineProps {
  proposalId: string
}

interface HistoryItem {
  id: string
  from_status: string | null
  to_status: string
  changed_at: string
  changed_by: string
  note?: string
}

const StatusHistoryTimeline: React.FC<StatusHistoryTimelineProps> = ({ proposalId }) => {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const response = await proposalsApi.getProposalStatusHistory(proposalId)
      if (response.data) {
        setHistory(response.data.history ?? [])
      }
    } catch (error: any) {
      console.error('Failed to load status history:', error)
      toast.error('載入狀態歷史失敗')
    } finally {
      setLoading(false)
    }
  }, [proposalId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          狀態歷史
        </Typography>
        <Divider sx={{ my: 2 }} />

        {history.length === 0 ? (
          <Alert severity="info">尚無狀態變更記錄</Alert>
        ) : (
          <List sx={{ width: '100%' }}>
            {history.map((item, index) => (
              <ListItem
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  py: 2,
                  borderLeft: index < history.length - 1 ? '2px solid' : 'none',
                  borderColor: 'divider',
                  ml: 1,
                  pl: 2,
                  position: 'relative'
                }}
              >
                {/* 圓點標記 */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: -9,
                    top: 16,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: index === 0 ? `${getStatusColor(item.to_status)}.main` : 'grey.300',
                    border: '2px solid white',
                    boxShadow: 1
                  }}
                />

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {item.from_status && (
                      <>
                        <Chip
                          label={statusLabels[item.from_status as keyof typeof statusLabels]}
                          color={getStatusColor(item.from_status)}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">→</Typography>
                      </>
                    )}
                    <Chip
                      label={statusLabels[item.to_status as keyof typeof statusLabels]}
                      color={getStatusColor(item.to_status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatDate(item.changed_at)} · 操作人：{item.changed_by}
                  </Typography>

                  {item.note && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                    >
                      {item.note}
                    </Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}

export default StatusHistoryTimeline
