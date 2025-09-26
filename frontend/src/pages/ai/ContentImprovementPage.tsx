import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Chip,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  AutoAwesome,
  ExpandMore,
  CompareArrows,
  Save,
  ContentCopy,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { aiApi } from '@/services/api'
import toast from 'react-hot-toast'

interface ImprovementResult {
  original_content: string
  improved_content: string
  improvement_type: string
  metadata: any
}

const ContentImprovementPage: React.FC = () => {
  const [improvementResult, setImprovementResult] = useState<ImprovementResult | null>(null)
  const [selectedContent, setSelectedContent] = useState('')

  const form = useForm({
    defaultValues: {
      content: '',
      improvement_type: 'clarity',
      specific_requirements: '',
      target_length: '',
    },
  })

  const improveMutation = useMutation({
    mutationFn: aiApi.improveContent,
    onSuccess: (response) => {
      setImprovementResult(response.data)
      toast.success('內容優化完成！')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '優化失敗'
      toast.error(message)
    },
  })

  const handleImprove = (data: any) => {
    if (!data.content.trim()) {
      toast.error('請輸入要優化的內容')
      return
    }
    improveMutation.mutate(data)
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('已複製到剪貼簿')
  }

  const handleSelectContent = (content: string) => {
    setSelectedContent(content)
    form.setValue('content', content)
  }

  const improvementTypes = [
    { value: 'clarity', label: '提升清晰度', description: '讓內容更清楚易懂' },
    { value: 'professionalism', label: '提升專業度', description: '增加專業術語和正式表達' },
    { value: 'persuasiveness', label: '增強說服力', description: '強化論點和說服效果' },
    { value: 'conciseness', label: '精簡表達', description: '去除冗餘，突出重點' },
    { value: 'detail', label: '增加細節', description: '補充更多具體資訊' },
    { value: 'structure', label: '改善結構', description: '優化邏輯架構和組織' },
  ]

  const targetLengths = [
    { value: '', label: '保持原長度' },
    { value: 'shorter', label: '縮短 20-30%' },
    { value: 'much_shorter', label: '縮短 50%' },
    { value: 'longer', label: '增加 20-30%' },
    { value: 'much_longer', label: '增加 50%' },
  ]

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          AI 內容優化
        </Typography>
        <Typography variant="body2" color="text.secondary">
          使用 AI 技術改善您的標書內容，提升質量和專業度
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 輸入區域 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                內容優化設定
              </Typography>

              <Box component="form" onSubmit={form.handleSubmit(handleImprove)}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="要優化的內容"
                  placeholder="請輸入需要優化的文字內容..."
                  {...form.register('content')}
                  sx={{ mb: 3 }}
                  required
                />

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>優化類型</InputLabel>
                  <Select
                    {...form.register('improvement_type')}
                    label="優化類型"
                    value={form.watch('improvement_type')}
                    onChange={(e) => form.setValue('improvement_type', e.target.value)}
                  >
                    {improvementTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box>
                          <Typography variant="body2">{type.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {type.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>目標長度</InputLabel>
                  <Select
                    {...form.register('target_length')}
                    label="目標長度"
                    value={form.watch('target_length')}
                    onChange={(e) => form.setValue('target_length', e.target.value)}
                  >
                    {targetLengths.map((length) => (
                      <MenuItem key={length.value} value={length.value}>
                        {length.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="特殊要求（選填）"
                  placeholder="例如：加強技術優勢描述、突出成本效益..."
                  {...form.register('specific_requirements')}
                  sx={{ mb: 3 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  size="large"
                  startIcon={improveMutation.isPending ? <CircularProgress size={20} /> : <AutoAwesome />}
                  disabled={improveMutation.isPending}
                >
                  {improveMutation.isPending ? '正在優化...' : '開始優化'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 常用內容模板 */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                常用內容範例
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                點擊下方範例快速填入內容
              </Typography>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">公司簡介</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    本公司成立於2015年，專注於資訊科技服務領域，擁有豐富的系統開發與維護經驗。
                    我們的團隊由經驗豐富的工程師組成，具備完整的專案管理能力。
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => handleSelectContent(
                      '本公司成立於2015年，專注於資訊科技服務領域，擁有豐富的系統開發與維護經驗。我們的團隊由經驗豐富的工程師組成，具備完整的專案管理能力。'
                    )}
                  >
                    使用此範例
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">技術優勢</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    我們採用先進的開發技術和方法論，確保系統的穩定性和擴展性。
                    具備雲端部署、微服務架構、DevOps等現代化技術能力。
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => handleSelectContent(
                      '我們採用先進的開發技術和方法論，確保系統的穩定性和擴展性。具備雲端部署、微服務架構、DevOps等現代化技術能力。'
                    )}
                  >
                    使用此範例
                  </Button>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>

        {/* 結果區域 */}
        <Grid item xs={12} md={6}>
          {improvementResult ? (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    優化結果
                  </Typography>
                  <Chip
                    label={improvementTypes.find(t => t.value === improvementResult.improvement_type)?.label}
                    color="primary"
                    size="small"
                  />
                </Box>

                {/* 原始內容 */}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  原始內容
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {improvementResult.original_content}
                  </Typography>
                </Paper>

                <Divider sx={{ my: 2 }}>
                  <CompareArrows color="primary" />
                </Divider>

                {/* 優化後內容 */}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  優化後內容
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'success.50' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {improvementResult.improved_content}
                  </Typography>
                </Paper>

                {/* 操作按鈕 */}
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() => handleCopyToClipboard(improvementResult.improved_content)}
                  >
                    複製優化內容
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Save />}
                    variant="outlined"
                    onClick={() => {
                      // TODO: 實現儲存到標書的功能
                      toast.info('此功能即將推出')
                    }}
                  >
                    儲存到標書
                  </Button>
                </Box>

                {/* 優化統計 */}
                {improvementResult.metadata && (
                  <Box mt={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      優化統計
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                          <Typography variant="caption" color="text.secondary">
                            原始字數
                          </Typography>
                          <Typography variant="h6">
                            {improvementResult.original_content.length}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                          <Typography variant="caption" color="text.secondary">
                            優化後字數
                          </Typography>
                          <Typography variant="h6">
                            {improvementResult.improved_content.length}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* 評價功能 */}
                <Box mt={3} pt={2} borderTop={1} borderColor="grey.300">
                  <Typography variant="subtitle2" gutterBottom>
                    優化效果評價
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<ThumbUp />}
                      onClick={() => {
                        // TODO: 實現評價功能
                        toast.success('感謝您的回饋！')
                      }}
                    >
                      滿意
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ThumbDown />}
                      onClick={() => {
                        // TODO: 實現評價功能
                        toast.info('感謝您的回饋，我們會持續改進')
                      }}
                    >
                      需要改進
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box textAlign="center" py={4}>
                  <AutoAwesome sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    開始您的內容優化
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    輸入內容並選擇優化類型，AI 將為您提供專業的內容改善建議
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

export default ContentImprovementPage