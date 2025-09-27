import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Grid, Chip, Paper, CircularProgress, Alert, Stepper, Step, StepLabel, StepContent, List, ListItem, ListItemText, ListItemIcon, Checkbox, Divider, Accordion, AccordionSummary, AccordionDetails, } from '@mui/material';
import { CloudUpload, Description, AutoAwesome, CheckCircle, ExpandMore, Save, Download, } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { aiApi } from '@/services/api';
import toast from 'react-hot-toast';
const RequirementExtractionPage = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [extractionResult, setExtractionResult] = useState(null);
    const [selectedSections, setSelectedSections] = useState([]);
    const form = useForm({
        defaultValues: {
            rfp_content: '',
            extract_sections: [],
        },
    });
    const extractMutation = useMutation({
        mutationFn: aiApi.extractRequirements,
        onSuccess: (response) => {
            setExtractionResult(response.data);
            setActiveStep(2);
            toast.success('需求萃取完成！');
        },
        onError: (error) => {
            const message = error.response?.data?.message || '萃取失敗';
            toast.error(message);
        },
    });
    const availableSections = [
        { id: 'technical_requirements', label: '技術需求', description: '技術規格、系統架構、技術標準' },
        { id: 'functional_requirements', label: '功能需求', description: '系統功能、業務流程、使用者需求' },
        { id: 'performance_requirements', label: '效能需求', description: '效能指標、回應時間、併發量' },
        { id: 'security_requirements', label: '安全需求', description: '資安要求、存取控制、加密標準' },
        { id: 'compliance_requirements', label: '合規需求', description: '法規遵循、認證要求、標準規範' },
        { id: 'timeline_requirements', label: '時程需求', description: '專案時程、里程碑、交付期限' },
        { id: 'budget_requirements', label: '預算需求', description: '預算限制、成本分析、價格要求' },
        { id: 'maintenance_requirements', label: '維護需求', description: '維護服務、保固條件、技術支援' },
        { id: 'training_requirements', label: '教育訓練', description: '使用者培訓、技術轉移、文件需求' },
        { id: 'deployment_requirements', label: '部署需求', description: '部署環境、基礎建設、安裝要求' },
    ];
    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type === 'text/plain' || file.type === 'application/pdf' || file.type.includes('document')) {
                setUploadedFile(file);
                // 讀取文件內容
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result;
                    form.setValue('rfp_content', content);
                    setActiveStep(1);
                };
                reader.readAsText(file);
            }
            else {
                toast.error('請上傳 TXT、PDF 或 Word 文件');
            }
        }
    };
    const handleSectionToggle = (sectionId) => {
        setSelectedSections(prev => {
            const newSections = prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId];
            form.setValue('extract_sections', newSections);
            return newSections;
        });
    };
    const handleExtract = () => {
        const data = form.getValues();
        if (!data.rfp_content.trim()) {
            toast.error('請輸入或上傳 RFP 內容');
            return;
        }
        if (data.extract_sections.length === 0) {
            toast.error('請至少選擇一個要萃取的章節');
            return;
        }
        extractMutation.mutate(data);
    };
    const handleNext = () => {
        setActiveStep(prev => prev + 1);
    };
    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };
    const handleReset = () => {
        setActiveStep(0);
        setUploadedFile(null);
        setExtractionResult(null);
        setSelectedSections([]);
        form.reset();
    };
    const handleExportResult = () => {
        if (!extractionResult)
            return;
        const exportData = {
            萃取時間: new Date().toLocaleString('zh-TW'),
            萃取章節: extractionResult.sections_extracted,
            萃取結果: extractionResult.extracted_requirements,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `需求萃取結果_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
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
    ];
    return (_jsxs(Box, { children: [_jsxs(Box, { mb: 3, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "\u9700\u6C42\u8403\u53D6\u5DE5\u5177" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u4F7F\u7528 AI \u5F9E\u62DB\u6A19\u6587\u4EF6 (RFP) \u4E2D\u81EA\u52D5\u8403\u53D6\u548C\u5206\u6790\u95DC\u9375\u9700\u6C42\u8CC7\u8A0A" })] }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u8403\u53D6\u6D41\u7A0B" }), _jsx(Stepper, { activeStep: activeStep, orientation: "vertical", children: steps.map((step, index) => (_jsxs(Step, { children: [_jsx(StepLabel, { children: _jsx(Typography, { variant: "subtitle2", children: step.label }) }), _jsx(StepContent, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: step.description }) })] }, step.label))) }), activeStep === steps.length && (_jsxs(Box, { mt: 2, children: [_jsx(Alert, { severity: "success", children: "\u9700\u6C42\u8403\u53D6\u5DF2\u5B8C\u6210\uFF01\u60A8\u53EF\u4EE5\u6AA2\u8996\u7D50\u679C\u4E26\u532F\u51FA\u5831\u544A\u3002" }), _jsx(Button, { onClick: handleReset, sx: { mt: 1 }, children: "\u91CD\u65B0\u958B\u59CB" })] }))] }) }) }), _jsxs(Grid, { item: true, xs: 12, md: 8, children: [activeStep === 0 && (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u4E0A\u50B3 RFP \u6587\u4EF6\u6216\u8F38\u5165\u5167\u5BB9" }), _jsxs(Paper, { variant: "outlined", sx: {
                                                p: 3,
                                                mb: 3,
                                                textAlign: 'center',
                                                borderStyle: 'dashed',
                                                cursor: 'pointer',
                                                backgroundColor: 'grey.50',
                                                '&:hover': { backgroundColor: 'grey.100' },
                                            }, onClick: () => document.getElementById('file-upload')?.click(), children: [_jsx("input", { id: "file-upload", type: "file", accept: ".txt,.pdf,.doc,.docx", style: { display: 'none' }, onChange: handleFileUpload }), _jsx(CloudUpload, { sx: { fontSize: 48, color: 'grey.400', mb: 2 } }), _jsx(Typography, { variant: "h6", color: "text.secondary", gutterBottom: true, children: "\u9EDE\u64CA\u4E0A\u50B3\u6587\u4EF6" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u652F\u63F4 TXT\u3001PDF\u3001Word \u683C\u5F0F" }), uploadedFile && (_jsx(Box, { mt: 2, children: _jsx(Chip, { icon: _jsx(Description, {}), label: uploadedFile.name, color: "primary", onDelete: () => {
                                                            setUploadedFile(null);
                                                            form.setValue('rfp_content', '');
                                                        } }) }))] }), _jsx(Divider, { sx: { my: 3 }, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6216\u76F4\u63A5\u8F38\u5165\u5167\u5BB9" }) }), _jsx(TextField, { fullWidth: true, multiline: true, rows: 10, label: "RFP \u5167\u5BB9", placeholder: "\u8ACB\u8CBC\u4E0A\u6216\u8F38\u5165\u62DB\u6A19\u6587\u4EF6\u5167\u5BB9...", ...form.register('rfp_content'), value: form.watch('rfp_content'), onChange: (e) => form.setValue('rfp_content', e.target.value) }), _jsx(Box, { mt: 3, display: "flex", justifyContent: "flex-end", children: _jsx(Button, { variant: "contained", onClick: handleNext, disabled: !form.watch('rfp_content').trim(), children: "\u4E0B\u4E00\u6B65" }) })] }) })), activeStep === 1 && (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u9078\u64C7\u8981\u8403\u53D6\u7684\u9700\u6C42\u985E\u578B" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "\u8ACB\u9078\u64C7\u8981\u5F9E RFP \u4E2D\u8403\u53D6\u7684\u9700\u6C42\u7AE0\u7BC0\u985E\u578B" }), _jsx(List, { children: availableSections.map((section) => (_jsxs(ListItem, { divider: true, children: [_jsx(ListItemIcon, { children: _jsx(Checkbox, { checked: selectedSections.includes(section.id), onChange: () => handleSectionToggle(section.id) }) }), _jsx(ListItemText, { primary: section.label, secondary: section.description })] }, section.id))) }), _jsxs(Box, { mt: 3, display: "flex", justifyContent: "space-between", children: [_jsx(Button, { onClick: handleBack, children: "\u4E0A\u4E00\u6B65" }), _jsxs(Box, { display: "flex", gap: 1, children: [_jsx(Button, { variant: "outlined", onClick: () => setSelectedSections(availableSections.map(s => s.id)), children: "\u5168\u9078" }), _jsx(Button, { variant: "contained", startIcon: extractMutation.isPending ? _jsx(CircularProgress, { size: 20 }) : _jsx(AutoAwesome, {}), onClick: handleExtract, disabled: selectedSections.length === 0 || extractMutation.isPending, children: extractMutation.isPending ? '正在萃取...' : '開始萃取' })] })] })] }) })), activeStep === 2 && extractionResult && (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [_jsx(Typography, { variant: "h6", children: "\u8403\u53D6\u7D50\u679C" }), _jsxs(Box, { display: "flex", gap: 1, children: [_jsx(Button, { size: "small", startIcon: _jsx(Download, {}), onClick: handleExportResult, children: "\u532F\u51FA\u7D50\u679C" }), _jsx(Button, { size: "small", startIcon: _jsx(Save, {}), variant: "outlined", onClick: () => {
                                                                // TODO: 實現儲存功能
                                                                toast('此功能即將推出');
                                                            }, children: "\u5132\u5B58\u5230\u5C08\u6848" })] })] }), _jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u5DF2\u8403\u53D6\u7684\u7AE0\u7BC0" }), _jsx(Box, { display: "flex", gap: 1, flexWrap: "wrap", mb: 3, children: extractionResult.sections_extracted.map((section) => {
                                                const sectionInfo = availableSections.find(s => s.id === section);
                                                return (_jsx(Chip, { label: sectionInfo?.label || section, color: "primary", size: "small" }, section));
                                            }) }), _jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u8403\u53D6\u7684\u9700\u6C42\u5167\u5BB9" }), _jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 3, backgroundColor: 'success.50' }, children: _jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto' }, children: extractionResult.extracted_requirements }) }), extractionResult.metadata && (_jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsx(Typography, { variant: "subtitle2", children: "\u8403\u53D6\u7D71\u8A08\u8CC7\u8A0A" }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 6, sm: 3, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u539F\u6587\u5B57\u6578" }), _jsx(Typography, { variant: "h6", children: form.watch('rfp_content').length })] }) }), _jsx(Grid, { item: true, xs: 6, sm: 3, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u8403\u53D6\u5B57\u6578" }), _jsx(Typography, { variant: "h6", children: extractionResult.extracted_requirements.length })] }) }), _jsx(Grid, { item: true, xs: 6, sm: 3, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u8403\u53D6\u7AE0\u7BC0" }), _jsx(Typography, { variant: "h6", children: extractionResult.sections_extracted.length })] }) }), _jsx(Grid, { item: true, xs: 6, sm: 3, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u8403\u53D6\u7387" }), _jsxs(Typography, { variant: "h6", children: [Math.round((extractionResult.extracted_requirements.length / form.watch('rfp_content').length) * 100), "%"] })] }) })] }) })] })), _jsxs(Box, { mt: 3, display: "flex", justifyContent: "space-between", children: [_jsx(Button, { onClick: handleReset, children: "\u91CD\u65B0\u958B\u59CB" }), _jsx(Button, { variant: "contained", startIcon: _jsx(CheckCircle, {}), onClick: () => {
                                                        setActiveStep(3);
                                                        toast.success('需求萃取流程完成！');
                                                    }, children: "\u5B8C\u6210" })] })] }) }))] })] })] }));
};
export default RequirementExtractionPage;
