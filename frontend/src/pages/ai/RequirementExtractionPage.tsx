import React, { useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import {
  AutoAwesome,
  CheckCircle,
  CloudUpload,
  Description,
  Download,
  ExpandMore,
  Save,
} from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { aiApi } from '@/services/api'
import toast from 'react-hot-toast'

interface ExtractionResult {
  extracted_requirements: string
  sections_extracted: string[]
  metadata: Record<string, unknown>
}

const RequirementExtractionPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
  const [selectedSections, setSelectedSections] = useState<string[]>([])

  const form = useForm({
    defaultValues: {
      rfp_content: '',
      extract_sections: [] as string[],
    },
  })

  const extractMutation = useMutation({
    mutationFn: aiApi.extractRequirements,
    onSuccess: (response) => {
      // aiApi.extractRequirements 已經返回 response.data，不需要再訪問 .data
      setExtractionResult(response.data)
      setActiveStep(2)
      toast.success('需求萃取完成！')
    },
    onError: (error) => {
      const message = (error as any).response?.data?.message ?? '萃取失敗'
      toast.error(message)
    },
  })

  const availableSections = [
    { id: '基本需求', label: '基本需求', description: '基本功能和服務需求' },
    { id: '技術規格', label: '技術規格', description: '技術規格、系統架構、技術標準' },
    { id: '時程要求', label: '時程要求', description: '專案時程、里程碑、交付期限' },
    { id: '預算限制', label: '預算限制', description: '預算限制、成本分析、價格要求' },
    { id: '評選標準', label: '評選標準', description: '評選條件和加分項目' },
    { id: '其他條件', label: '其他條件', description: '其他特殊條件和限制' },
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'text/plain' || file.type === 'application/pdf' || file.type.includes('document')) {
        setUploadedFile(file)
        
        // 讀取文件內容
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          form.setValue('rfp_content', content)
          setActiveStep(1)
        }
        reader.readAsText(file)
      } else {
        toast.error('請上傳 TXT、PDF 或 Word 文件')
      }
    }
  }

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => {
      const newSections = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
      
      form.setValue('extract_sections', newSections)
      return newSections
    })
  }

  const handleExtract = () => {
    const data = form.getValues()
    if (!data.rfp_content.trim()) {
      toast.error('請輸入或上傳 RFP 內容')
      return
    }
    if (data.extract_sections.length === 0) {
      toast.error('請至少選擇一個要萃取的章節')
      return
    }
    extractMutation.mutate(data)
  }

  const handleNext = () => {
    setActiveStep(prev => prev + 1)
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleReset = () => {
    setActiveStep(0)
    setUploadedFile(null)
    setExtractionResult(null)
    setSelectedSections([])
    form.reset()
  }

  const handleExportResult = () => {
    if (!extractionResult) return
    
    const exportData = {
      萃取時間: new Date().toLocaleString('zh-TW'),
      萃取章節: extractionResult.sections_extracted,
      萃取結果: extractionResult.extracted_requirements,
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `需求萃取結果_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const steps = [
    {
      label: '上傳 RFP 文件',
      description: '上傳招標文件或直接輸入內容',
    },
    {
      label: '選擇萃取章節',
      description: '選擇要分析的需求類型',
    },
    {
      label: '檢視萃取結果',
      description: '查看並儲存萃取的需求',
    },
  ]

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          需求萃取工具
        </Typography>
        <Typography variant="body2" color="text.secondary">
          使用 AI 從招標文件 (RFP) 中自動萃取和分析關鍵需求資訊
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 流程步驟 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                萃取流程
              </Typography>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, _) => (
                  <Step key={step.label}>
                    <StepLabel>
                      <Typography variant="subtitle2">{step.label}</Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              {activeStep === steps.length && (
                <Box mt={2}>
                  <Alert severity="success">
                    需求萃取已完成！您可以檢視結果並匯出報告。
                  </Alert>
                  <Button onClick={handleReset} sx={{ mt: 1 }}>
                    重新開始
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 主要內容區域 */}
        <Grid item xs={12} md={8}>
          {/* 步驟 1: 上傳文件 */}
          {activeStep === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  上傳 RFP 文件或輸入內容
                </Typography>

                {/* 文件上傳區域 */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    mb: 3,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                    cursor: 'pointer',
                    backgroundColor: 'grey.50',
                    '&:hover': { backgroundColor: 'grey.100' },
                  }}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    點擊上傳文件
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    支援 TXT、PDF、Word 格式
                  </Typography>
                  {uploadedFile && (
                    <Box mt={2}>
                      <Chip
                        icon={<Description />}
                        label={uploadedFile.name}
                        color="primary"
                        onDelete={() => {
                          setUploadedFile(null)
                          form.setValue('rfp_content', '')
                        }}
                      />
                    </Box>
                  )}
                </Paper>

                <Divider sx={{ my: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    或直接輸入內容
                  </Typography>
                </Divider>

                {/* 直接輸入區域 */}
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  label="RFP 內容"
                  placeholder="請貼上或輸入招標文件內容..."
                  {...form.register('rfp_content')}
                  value={form.watch('rfp_content')}
                  onChange={(e) => form.setValue('rfp_content', e.target.value)}
                />

                <Box mt={3} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!form.watch('rfp_content').trim()}
                  >
                    下一步
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* 步驟 2: 選擇萃取章節 */}
          {activeStep === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  選擇要萃取的需求類型
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  請選擇要從 RFP 中萃取的需求章節類型
                </Typography>

                <List>
                  {availableSections.map((section) => (
                    <ListItem key={section.id} divider>
                      <ListItemIcon>
                        <Checkbox
                          checked={selectedSections.includes(section.id)}
                          onChange={() => handleSectionToggle(section.id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={section.label}
                        secondary={section.description}
                      />
                    </ListItem>
                  ))}
                </List>

                <Box mt={3} display="flex" justifyContent="space-between">
                  <Button onClick={handleBack}>
                    上一步
                  </Button>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedSections(availableSections.map(s => s.id))}
                    >
                      全選
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={extractMutation.isPending ? <CircularProgress size={20} /> : <AutoAwesome />}
                      onClick={handleExtract}
                      disabled={selectedSections.length === 0 || extractMutation.isPending}
                    >
                      {extractMutation.isPending ? '正在萃取...' : '開始萃取'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* 步驟 3: 萃取結果 */}
          {activeStep === 2 && extractionResult && (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    萃取結果
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<Download />}
                      onClick={handleExportResult}
                    >
                      匯出結果
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
                      儲存到專案
                    </Button>
                  </Box>
                </Box>

                {/* 萃取的章節 */}
                <Typography variant="subtitle2" gutterBottom>
                  已萃取的章節
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={3}>
                  {extractionResult.sections_extracted.map((section) => {
                    const sectionInfo = availableSections.find(s => s.id === section)
                    return (
                      <Chip
                        key={section}
                        label={sectionInfo?.label ?? section}
                        color="primary"
                        size="small"
                      />
                    )
                  })}
                </Box>

                {/* 萃取的需求內容 */}
                <Typography variant="subtitle2" gutterBottom>
                  萃取的需求內容
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'success.50' }}>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto' }}
                  >
                    {extractionResult.extracted_requirements}
                  </Typography>
                </Paper>

                {/* 萃取統計 */}
                {extractionResult.metadata && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2">萃取統計資訊</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                            <Typography variant="caption" color="text.secondary">
                              原文字數
                            </Typography>
                            <Typography variant="h6">
                              {form.watch('rfp_content').length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                            <Typography variant="caption" color="text.secondary">
                              萃取字數
                            </Typography>
                            <Typography variant="h6">
                              {extractionResult.extracted_requirements.length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                            <Typography variant="caption" color="text.secondary">
                              萃取章節
                            </Typography>
                            <Typography variant="h6">
                              {extractionResult.sections_extracted.length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center" p={1} border={1} borderColor="grey.300" borderRadius={1}>
                            <Typography variant="caption" color="text.secondary">
                              萃取率
                            </Typography>
                            <Typography variant="h6">
                              {Math.round((extractionResult.extracted_requirements.length / form.watch('rfp_content').length) * 100)}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}

                <Box mt={3} display="flex" justifyContent="space-between">
                  <Button onClick={handleReset}>
                    重新開始
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      setActiveStep(3)
                      toast.success('需求萃取流程完成！')
                    }}
                  >
                    完成
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

export default RequirementExtractionPage