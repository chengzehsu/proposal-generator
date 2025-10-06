import React, { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  ContentCopy,
  History,
  Save,
  SwapHoriz as Swap,
  Translate,
  VolumeUp,
} from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { aiApi } from '@/services/api'
import toast from 'react-hot-toast'

interface TranslationResult {
  original_content: string
  translated_content: string
  source_language: string
  target_language: string
  metadata: any
}

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

const TranslationPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null)
  const [translationHistory, setTranslationHistory] = useState<TranslationResult[]>([])

  const form = useForm({
    defaultValues: {
      content: '',
      target_language: 'en',
      context: '',
    },
  })

  const translateMutation = useMutation({
    mutationFn: aiApi.translateContent,
    onSuccess: (response) => {
      const result = response.data
      setTranslationResult(result)
      setTranslationHistory(prev => [result, ...prev.slice(0, 9)]) // 保留最近10條記錄
      toast.success('翻譯完成！')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? '翻譯失敗'
      toast.error(message)
    },
  })

  const handleTranslate = (data: any) => {
    if (!data.content.trim()) {
      toast.error('請輸入要翻譯的內容')
      return
    }
    translateMutation.mutate(data)
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('已複製到剪貼簿')
  }

  const handleSwapLanguages = () => {
    if (translationResult) {
      form.setValue('content', translationResult.translated_content)
      form.setValue('target_language', translationResult.source_language)
      setTranslationResult(null)
    }
  }

  const handleLoadFromHistory = (item: TranslationResult) => {
    form.setValue('content', item.original_content)
    form.setValue('target_language', item.target_language)
    setTranslationResult(item)
    setTabValue(0)
  }

  const handleSpeak = (text: string, language: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language === 'zh' ? 'zh-TW' : language
      speechSynthesis.speak(utterance)
    } else {
      toast('您的瀏覽器不支援語音播放功能')
    }
  }

  const languages = [
    { code: 'en', name: '英文', nativeName: 'English' },
    { code: 'ja', name: '日文', nativeName: '日本語' },
    { code: 'ko', name: '韓文', nativeName: '한국어' },
    { code: 'zh', name: '中文', nativeName: '中文' },
    { code: 'fr', name: '法文', nativeName: 'Français' },
    { code: 'de', name: '德文', nativeName: 'Deutsch' },
    { code: 'es', name: '西班牙文', nativeName: 'Español' },
    { code: 'pt', name: '葡萄牙文', nativeName: 'Português' },
    { code: 'it', name: '義大利文', nativeName: 'Italiano' },
    { code: 'ru', name: '俄文', nativeName: 'Русский' },
    { code: 'ar', name: '阿拉伯文', nativeName: 'العربية' },
    { code: 'th', name: '泰文', nativeName: 'ไทย' },
    { code: 'vi', name: '越南文', nativeName: 'Tiếng Việt' },
  ]

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name ?? code
  }

  const contextSuggestions = [
    { label: '技術文件', value: '這是一份技術規格文件，請保持專業術語的準確性' },
    { label: '商業提案', value: '這是商業提案內容，請使用正式的商業用語' },
    { label: '法律條款', value: '這是法律相關內容，請確保法律術語的精確翻譯' },
    { label: '行銷文案', value: '這是行銷宣傳內容，請保持吸引力和說服力' },
    { label: '學術論文', value: '這是學術研究內容，請使用學術性語言' },
  ]

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          AI 翻譯服務
        </Typography>
        <Typography variant="body2" color="text.secondary">
          專業的 AI 驅動翻譯服務，支援多種語言，適合標書和商務文件
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="翻譯工具" />
          <Tab label="翻譯歷史" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* 翻譯輸入區域 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    翻譯設定
                  </Typography>
                  {translationResult && (
                    <IconButton size="small" onClick={handleSwapLanguages} title="交換語言">
                      <Swap />
                    </IconButton>
                  )}
                </Box>

                <Box component="form" onSubmit={form.handleSubmit(handleTranslate)}>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label="要翻譯的內容"
                    placeholder="請輸入需要翻譯的文字內容..."
                    {...form.register('content')}
                    sx={{ mb: 3 }}
                    required
                  />

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>目標語言</InputLabel>
                    <Select
                      {...form.register('target_language')}
                      label="目標語言"
                      value={form.watch('target_language')}
                      onChange={(e) => form.setValue('target_language', e.target.value)}
                    >
                      {languages.map((lang) => (
                        <MenuItem key={lang.code} value={lang.code}>
                          <Box>
                            <Typography variant="body2">{lang.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {lang.nativeName}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="翻譯情境說明（選填）"
                    placeholder="例如：這是技術文件，請保持專業術語準確性..."
                    {...form.register('context')}
                    sx={{ mb: 2 }}
                  />

                  {/* 情境建議 */}
                  <Box mb={3}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      常用情境：
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {contextSuggestions.map((suggestion, index) => (
                        <Chip
                          key={index}
                          label={suggestion.label}
                          size="small"
                          variant="outlined"
                          onClick={() => form.setValue('context', suggestion.value)}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    size="large"
                    startIcon={translateMutation.isPending ? <CircularProgress size={20} /> : <Translate />}
                    disabled={translateMutation.isPending}
                  >
                    {translateMutation.isPending ? '正在翻譯...' : '開始翻譯'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 翻譯結果區域 */}
          <Grid item xs={12} md={6}>
            {translationResult ? (
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      翻譯結果
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip
                        label={`${getLanguageName(translationResult.source_language)} → ${getLanguageName(translationResult.target_language)}`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </Box>

                  {/* 原文 */}
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    原文 ({getLanguageName(translationResult.source_language)})
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', flex: 1 }}>
                        {translationResult.original_content}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleSpeak(translationResult.original_content, translationResult.source_language)}
                      >
                        <VolumeUp />
                      </IconButton>
                    </Box>
                  </Paper>

                  <Divider sx={{ my: 2 }} />

                  {/* 譯文 */}
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    譯文 ({getLanguageName(translationResult.target_language)})
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'success.50' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', flex: 1 }}>
                        {translationResult.translated_content}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleSpeak(translationResult.translated_content, translationResult.target_language)}
                      >
                        <VolumeUp />
                      </IconButton>
                    </Box>
                  </Paper>

                  {/* 操作按鈕 */}
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={() => handleCopyToClipboard(translationResult.translated_content)}
                    >
                      複製譯文
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Save />}
                      variant="outlined"
                      onClick={() => {
                        // TODO: 實現儲存功能
                        toast('此功能即將推出')
                      }}
                    >
                      儲存翻譯
                    </Button>
                  </Box>

                  {/* 翻譯資訊 */}
                  {translationResult.metadata && (
                    <Box mt={3}>
                      <Typography variant="subtitle2" gutterBottom>
                        翻譯資訊
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                            <Typography variant="caption" color="text.secondary">
                              原文字數
                            </Typography>
                            <Typography variant="h6">
                              {translationResult.original_content.length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                            <Typography variant="caption" color="text.secondary">
                              譯文字數
                            </Typography>
                            <Typography variant="h6">
                              {translationResult.translated_content.length}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Box textAlign="center" py={4}>
                    <Translate sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      開始您的翻譯工作
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      輸入內容並選擇目標語言，AI 將為您提供準確的翻譯結果
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              翻譯歷史
            </Typography>
            {translationHistory.length === 0 ? (
              <Box textAlign="center" py={4}>
                <History sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  還沒有翻譯記錄
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  完成第一次翻譯後，記錄將顯示在這裡
                </Typography>
              </Box>
            ) : (
              <List>
                {translationHistory.map((item, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={`${getLanguageName(item.source_language)} → ${getLanguageName(item.target_language)}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {item.original_content.substring(0, 50)}...
                          </Typography>
                        </Box>
                      }
                      secondary={`${item.translated_content.substring(0, 100)  }...`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        onClick={() => handleLoadFromHistory(item)}
                      >
                        重新載入
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  )
}

export default TranslationPage