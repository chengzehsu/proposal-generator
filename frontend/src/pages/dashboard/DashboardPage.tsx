import React, { useEffect, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material'
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as AwardIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/services/auth'
import { proposalsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { useDataCompleteness } from '@/hooks/useDataCompleteness'
import { OnboardingGuide } from '@/components/onboarding/OnboardingGuide'

interface DashboardStats {
  companyDataComplete: number
  totalProposals: number
  activeProposals: number
  completedProposals: number
  successRate: number
  totalProjects: number
  totalAwards: number
  teamMembers: number
}

interface RecentProposal {
  id: string
  title: string
  client_name: string
  status: string
  deadline: string
  updated_at: string
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    companyDataComplete: 0,
    totalProposals: 0,
    activeProposals: 0,
    completedProposals: 0,
    successRate: 0,
    totalProjects: 0,
    totalAwards: 0,
    teamMembers: 0
  })
  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([])
  const { completeness, loading: completenessLoading, refresh: refreshCompleteness } = useDataCompleteness()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load proposals
      let proposalsData: any[] = []
      try {
        const response = await proposalsApi.getProposals({ limit: 5 })
        proposalsData = Array.isArray(response) ? response : []
      } catch (error) {
        console.warn('Failed to load proposals:', error)
      }

      // Calculate stats
      const activeCount = proposalsData.filter((p: any) =>
        ['DRAFT', 'IN_REVIEW'].includes(p.status)
      ).length
      const completedCount = proposalsData.filter((p: any) =>
        p.status === 'COMPLETED'
      ).length
      const successRate = proposalsData.length > 0
        ? Math.round((completedCount / proposalsData.length) * 100)
        : 0

      setStats({
        companyDataComplete: completeness.company.percentage,
        totalProposals: proposalsData.length,
        activeProposals: activeCount,
        completedProposals: completedCount,
        successRate,
        totalProjects: completeness.projects.count,
        totalAwards: completeness.awards.count,
        teamMembers: completeness.teamMembers.count
      })

      setRecentProposals(proposalsData.slice(0, 5))

    } catch (error) {
      console.error('Failed to load dashboard:', error)
      toast.error('載入儀表板資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = () => {
    toast.success('歡迎完成設定！您現在可以開始使用系統了')
    refreshCompleteness()
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'DRAFT': 'default',
      'IN_REVIEW': 'info',
      'COMPLETED': 'success',
      'SUBMITTED': 'primary',
      'ARCHIVED': 'default'
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': '草稿',
      'IN_REVIEW': '審核中',
      'COMPLETED': '已完成',
      'SUBMITTED': '已提交',
      'ARCHIVED': '已封存'
    }
    return labels[status] || status
  }

  if (loading || completenessLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>載入中...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Onboarding Guide */}
      <OnboardingGuide
        completeness={completeness}
        onComplete={handleOnboardingComplete}
      />

      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          歡迎回來，{user?.name || '用戶'}！
        </Typography>
        <Typography variant="body1" color="text.secondary">
          智能標案產生器儀表板
        </Typography>
      </Box>

      {/* Data Completeness Progress Card */}
      {completeness.overall < 100 && (
        <Card sx={{ mb: 3, bgcolor: completeness.overall >= 75 ? 'success.50' : 'warning.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                資料完整度
              </Typography>
              <Chip
                label={`${completeness.overall}%`}
                color={completeness.overall >= 75 ? 'success' : 'warning'}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={completeness.overall}
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {completeness.overall >= 75
                ? '已達到基本要求，可以開始建立標書'
                : '完成更多資料以獲得更好的 AI 生成效果'}
            </Typography>

            {/* Incomplete Items */}
            {completeness.incompleteItems.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  待完成項目：
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {completeness.incompleteItems.map((item) => (
                    <Chip
                      key={item.key}
                      label={item.label}
                      size="small"
                      onClick={() => navigate(item.route)}
                      icon={<AddIcon />}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <AssignmentIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.totalProposals}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    標書總數
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip size="small" label={`進行中 ${stats.activeProposals}`} />
                <Chip size="small" label={`已完成 ${stats.completedProposals}`} color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.successRate}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    成功率
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                基於已完成標書計算
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.totalProjects}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    專案實績
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                onClick={() => navigate('/database/projects')}
              >
                查看全部
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <AwardIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.totalAwards}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    獲獎記錄
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  團隊成員 {stats.teamMembers} 人
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                快速操作
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/templates')}
                    size="large"
                  >
                    建立新標書
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate('/database/company')}
                    size="large"
                  >
                    更新公司資料
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PeopleIcon />}
                    onClick={() => navigate('/database/team')}
                  >
                    管理團隊
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<BusinessIcon />}
                    onClick={() => navigate('/database/projects')}
                  >
                    新增實績
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Proposals */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  最近標書
                </Typography>
                <Button size="small" onClick={() => navigate('/proposals')}>
                  查看全部
                </Button>
              </Box>
              {recentProposals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    尚未建立任何標書
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/templates')}
                    sx={{ mt: 2 }}
                  >
                    建立第一份標書
                  </Button>
                </Box>
              ) : (
                <List>
                  {recentProposals.map((proposal) => (
                    <ListItem
                      key={proposal.id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => navigate(`/editor/${proposal.id}`)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      }
                      divider
                    >
                      <ListItemText
                        primary={proposal.title}
                        secondary={
                          <Box>
                            <Typography variant="caption" component="span">
                              {proposal.client_name || '未指定客戶'}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={getStatusLabel(proposal.status)}
                                color={getStatusColor(proposal.status)}
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default DashboardPage
