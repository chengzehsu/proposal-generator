import React, { useState } from 'react'
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
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
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
  AutoAwesome,
  CheckCircle,
  DataUsage,
  FindInPage,
  MonetizationOn,
  Speed,
  Timeline,
  Translate,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { aiApi } from '@/services/api'

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

const UsageMonitoringPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<any>(null)

  // 獲取 AI 使用統計
  const { data: usageData } = useQuery({
    queryKey: ['ai', 'usage'],
    queryFn: () => aiApi.getUsage(),
    select: (data) => data.data,
    refetchInterval: 30000, // 每30秒更新一次
  })

  // 模擬數據（實際應用中從 API 獲取）
  const mockUsageData = {
    current_period: {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      total_requests: 1250,
      total_tokens: 45230,
      total_cost: 12.45,
      success_rate: 98.2,
    },
    limits: {
      monthly_requests: 2000,
      monthly_tokens: 100000,
      monthly_cost_limit: 50.0,
    },
    services: {
      content_generation: {
        requests: 680,
        tokens: 25400,
        cost: 7.62,
        avg_response_time: 2.3,
        success_rate: 99.1,
      },
      content_improvement: {
        requests: 320,
        tokens: 12800,
        cost: 3.84,
        avg_response_time: 2.1,
        success_rate: 97.8,
      },
      translation: {
        requests: 180,
        tokens: 5200,
        cost: 0.78,
        avg_response_time: 1.8,
        success_rate: 98.9,
      },
      requirement_extraction: {
        requests: 70,
        tokens: 1830,
        cost: 0.21,
        avg_response_time: 3.2,
        success_rate: 96.4,
      },
    },
    daily_usage: [
      { date: '2024-01-25', requests: 45, tokens: 1680, cost: 0.42 },
      { date: '2024-01-26', requests: 52, tokens: 1920, cost: 0.48 },
      { date: '2024-01-27', requests: 38, tokens: 1420, cost: 0.35 },
      { date: '2024-01-28', requests: 61, tokens: 2280, cost: 0.57 },
      { date: '2024-01-29', requests: 48, tokens: 1760, cost: 0.44 },
      { date: '2024-01-30', requests: 55, tokens: 2040, cost: 0.51 },
      { date: '2024-01-31', requests: 43, tokens: 1590, cost: 0.39 },
    ],
    recommendations: [
      {
        type: 'optimization',
        title: '優化建議',
        message: '您的內容生成請求較多，建議使用更精確的提示詞以提高效率',
        severity: 'info',
      },
      {
        type: 'limit_warning',
        title: '使用量提醒',
        message: '本月已使用 62.5% 的 Token 額度，請注意使用量',
        severity: 'warning',
      },
    ],
  }

  const data = usageData ?? mockUsageData

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return 'success'
    if (percentage < 80) return 'warning'
    return 'error'
  }

  const handleShowDetail = (metric: any) => {
    setSelectedMetric(metric)
    setDetailDialogOpen(true)
  }

  const serviceIcons = {
    content_generation: <AutoAwesome />,
    content_improvement: <TrendingUp />,
    translation: <Translate />,
    requirement_extraction: <FindInPage />,
  }

  const serviceNames = {
    content_generation: '內容生成',
    content_improvement: '內容優化',
    translation: '翻譯服務',
    requirement_extraction: '需求萃取',
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          AI 使用監控
        </Typography>
        <Typography variant="body2" color="text.secondary">
          監控 AI 服務使用量、成本和效能指標
        </Typography>
      </Box>

      {/* 使用量概覽卡片 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <DataUsage color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle2">API 請求</Typography>
              </Box>
              <Typography variant="h5" gutterBottom>
                {data.current_period.total_requests.toLocaleString()}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={getUsagePercentage(data.current_period.total_requests, data.limits.monthly_requests)}
                color={getProgressColor(getUsagePercentage(data.current_period.total_requests, data.limits.monthly_requests))}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {data.limits.monthly_requests.toLocaleString()} 限額
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Speed color="secondary" sx={{ mr: 1 }} />
                <Typography variant="subtitle2">Token 使用</Typography>
              </Box>
              <Typography variant="h5" gutterBottom>
                {data.current_period.total_tokens.toLocaleString()}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={getUsagePercentage(data.current_period.total_tokens, data.limits.monthly_tokens)}
                color={getProgressColor(getUsagePercentage(data.current_period.total_tokens, data.limits.monthly_tokens))}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {data.limits.monthly_tokens.toLocaleString()} 限額
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <MonetizationOn color="success" sx={{ mr: 1 }} />
                <Typography variant="subtitle2">使用成本</Typography>
              </Box>
              <Typography variant="h5" gutterBottom>
                ${data.current_period.total_cost.toFixed(2)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={getUsagePercentage(data.current_period.total_cost, data.limits.monthly_cost_limit)}
                color={getProgressColor(getUsagePercentage(data.current_period.total_cost, data.limits.monthly_cost_limit))}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                ${data.limits.monthly_cost_limit.toFixed(2)} 預算
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CheckCircle color="info" sx={{ mr: 1 }} />
                <Typography variant="subtitle2">成功率</Typography>
              </Box>
              <Typography variant="h5" gutterBottom>
                {data.current_period.success_rate}%
              </Typography>
              <Box display="flex" alignItems="center">
                {data.current_period.success_rate >= 95 ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  品質指標
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 建議和警告 */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Box mb={3}>
          {data.recommendations.map((recommendation: any, index: number) => (
            <Alert
              key={index}
              severity={recommendation.severity}
              sx={{ mb: 1 }}
              action={
                <Button color="inherit" size="small">
                  了解更多
                </Button>
              }
            >
              <Typography variant="subtitle2">{recommendation.title}</Typography>
              {recommendation.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* 詳細統計 */}
      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="服務使用統計" />
              <Tab label="每日使用趨勢" />
              <Tab label="效能分析" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              AI 服務使用統計
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>服務</TableCell>
                    <TableCell align="right">請求次數</TableCell>
                    <TableCell align="right">Token 使用</TableCell>
                    <TableCell align="right">成本</TableCell>
                    <TableCell align="right">成功率</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(data.services).map(([key, service]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {serviceIcons[key as keyof typeof serviceIcons]}
                          <Typography sx={{ ml: 1 }}>
                            {serviceNames[key as keyof typeof serviceNames]}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{service.requests.toLocaleString()}</TableCell>
                      <TableCell align="right">{service.tokens.toLocaleString()}</TableCell>
                      <TableCell align="right">${service.cost.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${service.success_rate}%`}
                          color={service.success_rate >= 95 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => handleShowDetail(service)}
                        >
                          詳細
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              近七日使用趨勢
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>日期</TableCell>
                    <TableCell align="right">請求次數</TableCell>
                    <TableCell align="right">Token 使用</TableCell>
                    <TableCell align="right">成本</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.daily_usage.map((day: any) => (
                    <TableRow key={day.date}>
                      <TableCell>{new Date(day.date).toLocaleDateString('zh-TW')}</TableCell>
                      <TableCell align="right">{day.requests}</TableCell>
                      <TableCell align="right">{day.tokens.toLocaleString()}</TableCell>
                      <TableCell align="right">${day.cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              效能分析
            </Typography>
            <Grid container spacing={3}>
              {Object.entries(data.services).map(([key, service]: [string, any]) => (
                <Grid item xs={12} sm={6} md={3} key={key}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        {serviceIcons[key as keyof typeof serviceIcons]}
                        <Typography variant="subtitle2" sx={{ ml: 1 }}>
                          {serviceNames[key as keyof typeof serviceNames]}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        平均回應時間
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        {service.avg_response_time}s
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        成功率
                      </Typography>
                      <Typography variant="h6">
                        {service.success_rate}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

      {/* 詳細資訊對話框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>服務詳細資訊</DialogTitle>
        <DialogContent>
          {selectedMetric && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  使用統計
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <DataUsage />
                    </ListItemIcon>
                    <ListItemText
                      primary="請求次數"
                      secondary={selectedMetric.requests?.toLocaleString() ?? 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Speed />
                    </ListItemIcon>
                    <ListItemText
                      primary="Token 使用"
                      secondary={selectedMetric.tokens?.toLocaleString() ?? 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <MonetizationOn />
                    </ListItemIcon>
                    <ListItemText
                      primary="成本"
                      secondary={`$${selectedMetric.cost?.toFixed(2) ?? '0.00'}`}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  效能指標
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Timeline />
                    </ListItemIcon>
                    <ListItemText
                      primary="平均回應時間"
                      secondary={`${selectedMetric.avg_response_time ?? 'N/A'}s`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle />
                    </ListItemIcon>
                    <ListItemText
                      primary="成功率"
                      secondary={`${selectedMetric.success_rate ?? 'N/A'}%`}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UsageMonitoringPage