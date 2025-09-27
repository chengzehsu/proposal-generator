import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Divider, Chip, Paper, CircularProgress, Accordion, AccordionSummary, AccordionDetails, } from '@mui/material';
import { AutoAwesome, ExpandMore, CompareArrows, Save, ContentCopy, ThumbUp, ThumbDown, } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { aiApi } from '@/services/api';
import toast from 'react-hot-toast';
const ContentImprovementPage = () => {
    const [improvementResult, setImprovementResult] = useState(null);
    const [selectedContent, setSelectedContent] = useState('');
    const form = useForm({
        defaultValues: {
            content: '',
            improvement_type: 'clarity',
            specific_requirements: '',
            target_length: '',
        },
    });
    const improveMutation = useMutation({
        mutationFn: aiApi.improveContent,
        onSuccess: (response) => {
            setImprovementResult(response.data);
            toast.success('內容優化完成！');
        },
        onError: (error) => {
            const message = error.response?.data?.message || '優化失敗';
            toast.error(message);
        },
    });
    const handleImprove = (data) => {
        if (!data.content.trim()) {
            toast.error('請輸入要優化的內容');
            return;
        }
        improveMutation.mutate(data);
    };
    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('已複製到剪貼簿');
    };
    const handleSelectContent = (content) => {
        setSelectedContent(content);
        form.setValue('content', content);
    };
    const improvementTypes = [
        { value: 'clarity', label: '提升清晰度', description: '讓內容更清楚易懂' },
        { value: 'professionalism', label: '提升專業度', description: '增加專業術語和正式表達' },
        { value: 'persuasiveness', label: '增強說服力', description: '強化論點和說服效果' },
        { value: 'conciseness', label: '精簡表達', description: '去除冗餘，突出重點' },
        { value: 'detail', label: '增加細節', description: '補充更多具體資訊' },
        { value: 'structure', label: '改善結構', description: '優化邏輯架構和組織' },
    ];
    const targetLengths = [
        { value: '', label: '保持原長度' },
        { value: 'shorter', label: '縮短 20-30%' },
        { value: 'much_shorter', label: '縮短 50%' },
        { value: 'longer', label: '增加 20-30%' },
        { value: 'much_longer', label: '增加 50%' },
    ];
    return (_jsxs(Box, { children: [_jsxs(Box, { mb: 3, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "AI \u5167\u5BB9\u512A\u5316" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u4F7F\u7528 AI \u6280\u8853\u6539\u5584\u60A8\u7684\u6A19\u66F8\u5167\u5BB9\uFF0C\u63D0\u5347\u8CEA\u91CF\u548C\u5C08\u696D\u5EA6" })] }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u5167\u5BB9\u512A\u5316\u8A2D\u5B9A" }), _jsxs(Box, { component: "form", onSubmit: form.handleSubmit(handleImprove), children: [_jsx(TextField, { fullWidth: true, multiline: true, rows: 8, label: "\u8981\u512A\u5316\u7684\u5167\u5BB9", placeholder: "\u8ACB\u8F38\u5165\u9700\u8981\u512A\u5316\u7684\u6587\u5B57\u5167\u5BB9...", ...form.register('content'), sx: { mb: 3 }, required: true }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 3 }, children: [_jsx(InputLabel, { children: "\u512A\u5316\u985E\u578B" }), _jsx(Select, { ...form.register('improvement_type'), label: "\u512A\u5316\u985E\u578B", value: form.watch('improvement_type'), onChange: (e) => form.setValue('improvement_type', e.target.value), children: improvementTypes.map((type) => (_jsx(MenuItem, { value: type.value, children: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", children: type.label }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: type.description })] }) }, type.value))) })] }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 3 }, children: [_jsx(InputLabel, { children: "\u76EE\u6A19\u9577\u5EA6" }), _jsx(Select, { ...form.register('target_length'), label: "\u76EE\u6A19\u9577\u5EA6", value: form.watch('target_length'), onChange: (e) => form.setValue('target_length', e.target.value), children: targetLengths.map((length) => (_jsx(MenuItem, { value: length.value, children: length.label }, length.value))) })] }), _jsx(TextField, { fullWidth: true, multiline: true, rows: 3, label: "\u7279\u6B8A\u8981\u6C42\uFF08\u9078\u586B\uFF09", placeholder: "\u4F8B\u5982\uFF1A\u52A0\u5F37\u6280\u8853\u512A\u52E2\u63CF\u8FF0\u3001\u7A81\u51FA\u6210\u672C\u6548\u76CA...", ...form.register('specific_requirements'), sx: { mb: 3 } }), _jsx(Button, { fullWidth: true, variant: "contained", type: "submit", size: "large", startIcon: improveMutation.isPending ? _jsx(CircularProgress, { size: 20 }) : _jsx(AutoAwesome, {}), disabled: improveMutation.isPending, children: improveMutation.isPending ? '正在優化...' : '開始優化' })] })] }) }), _jsx(Card, { sx: { mt: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u5E38\u7528\u5167\u5BB9\u7BC4\u4F8B" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "\u9EDE\u64CA\u4E0B\u65B9\u7BC4\u4F8B\u5FEB\u901F\u586B\u5165\u5167\u5BB9" }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsx(Typography, { variant: "subtitle2", children: "\u516C\u53F8\u7C21\u4ECB" }) }), _jsxs(AccordionDetails, { children: [_jsx(Typography, { variant: "body2", paragraph: true, children: "\u672C\u516C\u53F8\u6210\u7ACB\u65BC2015\u5E74\uFF0C\u5C08\u6CE8\u65BC\u8CC7\u8A0A\u79D1\u6280\u670D\u52D9\u9818\u57DF\uFF0C\u64C1\u6709\u8C50\u5BCC\u7684\u7CFB\u7D71\u958B\u767C\u8207\u7DAD\u8B77\u7D93\u9A57\u3002 \u6211\u5011\u7684\u5718\u968A\u7531\u7D93\u9A57\u8C50\u5BCC\u7684\u5DE5\u7A0B\u5E2B\u7D44\u6210\uFF0C\u5177\u5099\u5B8C\u6574\u7684\u5C08\u6848\u7BA1\u7406\u80FD\u529B\u3002" }), _jsx(Button, { size: "small", onClick: () => handleSelectContent('本公司成立於2015年，專注於資訊科技服務領域，擁有豐富的系統開發與維護經驗。我們的團隊由經驗豐富的工程師組成，具備完整的專案管理能力。'), children: "\u4F7F\u7528\u6B64\u7BC4\u4F8B" })] })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsx(Typography, { variant: "subtitle2", children: "\u6280\u8853\u512A\u52E2" }) }), _jsxs(AccordionDetails, { children: [_jsx(Typography, { variant: "body2", paragraph: true, children: "\u6211\u5011\u63A1\u7528\u5148\u9032\u7684\u958B\u767C\u6280\u8853\u548C\u65B9\u6CD5\u8AD6\uFF0C\u78BA\u4FDD\u7CFB\u7D71\u7684\u7A69\u5B9A\u6027\u548C\u64F4\u5C55\u6027\u3002 \u5177\u5099\u96F2\u7AEF\u90E8\u7F72\u3001\u5FAE\u670D\u52D9\u67B6\u69CB\u3001DevOps\u7B49\u73FE\u4EE3\u5316\u6280\u8853\u80FD\u529B\u3002" }), _jsx(Button, { size: "small", onClick: () => handleSelectContent('我們採用先進的開發技術和方法論，確保系統的穩定性和擴展性。具備雲端部署、微服務架構、DevOps等現代化技術能力。'), children: "\u4F7F\u7528\u6B64\u7BC4\u4F8B" })] })] })] }) })] }), _jsx(Grid, { item: true, xs: 12, md: 6, children: improvementResult ? (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, children: [_jsx(Typography, { variant: "h6", children: "\u512A\u5316\u7D50\u679C" }), _jsx(Chip, { label: improvementTypes.find(t => t.value === improvementResult.improvement_type)?.label, color: "primary", size: "small" })] }), _jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "\u539F\u59CB\u5167\u5BB9" }), _jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2, backgroundColor: 'grey.50' }, children: _jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-wrap' }, children: improvementResult.original_content }) }), _jsx(Divider, { sx: { my: 2 }, children: _jsx(CompareArrows, { color: "primary" }) }), _jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "\u512A\u5316\u5F8C\u5167\u5BB9" }), _jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2, backgroundColor: 'success.50' }, children: _jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-wrap' }, children: improvementResult.improved_content }) }), _jsxs(Box, { display: "flex", gap: 1, flexWrap: "wrap", children: [_jsx(Button, { size: "small", startIcon: _jsx(ContentCopy, {}), onClick: () => handleCopyToClipboard(improvementResult.improved_content), children: "\u8907\u88FD\u512A\u5316\u5167\u5BB9" }), _jsx(Button, { size: "small", startIcon: _jsx(Save, {}), variant: "outlined", onClick: () => {
                                                    // TODO: 實現儲存到標書的功能
                                                    toast('此功能即將推出');
                                                }, children: "\u5132\u5B58\u5230\u6A19\u66F8" })] }), improvementResult.metadata && (_jsxs(Box, { mt: 3, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u512A\u5316\u7D71\u8A08" }), _jsxs(Grid, { container: true, spacing: 1, children: [_jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u539F\u59CB\u5B57\u6578" }), _jsx(Typography, { variant: "h6", children: improvementResult.original_content.length })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u512A\u5316\u5F8C\u5B57\u6578" }), _jsx(Typography, { variant: "h6", children: improvementResult.improved_content.length })] }) })] })] })), _jsxs(Box, { mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300", children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u512A\u5316\u6548\u679C\u8A55\u50F9" }), _jsxs(Box, { display: "flex", gap: 1, children: [_jsx(Button, { size: "small", startIcon: _jsx(ThumbUp, {}), onClick: () => {
                                                            // TODO: 實現評價功能
                                                            toast.success('感謝您的回饋！');
                                                        }, children: "\u6EFF\u610F" }), _jsx(Button, { size: "small", startIcon: _jsx(ThumbDown, {}), onClick: () => {
                                                            // TODO: 實現評價功能
                                                            toast('感謝您的回饋，我們會持續改進');
                                                        }, children: "\u9700\u8981\u6539\u9032" })] })] })] }) })) : (_jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { textAlign: "center", py: 4, children: [_jsx(AutoAwesome, { sx: { fontSize: 48, color: 'grey.400', mb: 2 } }), _jsx(Typography, { variant: "h6", color: "text.secondary", children: "\u958B\u59CB\u60A8\u7684\u5167\u5BB9\u512A\u5316" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u8F38\u5165\u5167\u5BB9\u4E26\u9078\u64C7\u512A\u5316\u985E\u578B\uFF0CAI \u5C07\u70BA\u60A8\u63D0\u4F9B\u5C08\u696D\u7684\u5167\u5BB9\u6539\u5584\u5EFA\u8B70" })] }) }) })) })] })] }));
};
export default ContentImprovementPage;
