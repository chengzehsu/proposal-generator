import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Divider, Chip, Paper, CircularProgress, Tabs, Tab, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, } from '@mui/material';
import { Translate, ContentCopy, Save, History, Swap, VolumeUp, } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { aiApi } from '@/services/api';
import toast from 'react-hot-toast';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, ...other, children: value === index && _jsx(Box, { children: children }) }));
}
const TranslationPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [translationResult, setTranslationResult] = useState(null);
    const [translationHistory, setTranslationHistory] = useState([]);
    const form = useForm({
        defaultValues: {
            content: '',
            target_language: 'en',
            context: '',
        },
    });
    const translateMutation = useMutation({
        mutationFn: aiApi.translateContent,
        onSuccess: (response) => {
            const result = response.data;
            setTranslationResult(result);
            setTranslationHistory(prev => [result, ...prev.slice(0, 9)]); // 保留最近10條記錄
            toast.success('翻譯完成！');
        },
        onError: (error) => {
            const message = error.response?.data?.message || '翻譯失敗';
            toast.error(message);
        },
    });
    const handleTranslate = (data) => {
        if (!data.content.trim()) {
            toast.error('請輸入要翻譯的內容');
            return;
        }
        translateMutation.mutate(data);
    };
    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('已複製到剪貼簿');
    };
    const handleSwapLanguages = () => {
        if (translationResult) {
            form.setValue('content', translationResult.translated_content);
            form.setValue('target_language', translationResult.source_language);
            setTranslationResult(null);
        }
    };
    const handleLoadFromHistory = (item) => {
        form.setValue('content', item.original_content);
        form.setValue('target_language', item.target_language);
        setTranslationResult(item);
        setTabValue(0);
    };
    const handleSpeak = (text, language) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language === 'zh' ? 'zh-TW' : language;
            speechSynthesis.speak(utterance);
        }
        else {
            toast('您的瀏覽器不支援語音播放功能');
        }
    };
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
    ];
    const getLanguageName = (code) => {
        return languages.find(lang => lang.code === code)?.name || code;
    };
    const contextSuggestions = [
        { label: '技術文件', value: '這是一份技術規格文件，請保持專業術語的準確性' },
        { label: '商業提案', value: '這是商業提案內容，請使用正式的商業用語' },
        { label: '法律條款', value: '這是法律相關內容，請確保法律術語的精確翻譯' },
        { label: '行銷文案', value: '這是行銷宣傳內容，請保持吸引力和說服力' },
        { label: '學術論文', value: '這是學術研究內容，請使用學術性語言' },
    ];
    return (_jsxs(Box, { children: [_jsxs(Box, { mb: 3, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "AI \u7FFB\u8B6F\u670D\u52D9" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5C08\u696D\u7684 AI \u9A45\u52D5\u7FFB\u8B6F\u670D\u52D9\uFF0C\u652F\u63F4\u591A\u7A2E\u8A9E\u8A00\uFF0C\u9069\u5408\u6A19\u66F8\u548C\u5546\u52D9\u6587\u4EF6" })] }), _jsx(Box, { sx: { borderBottom: 1, borderColor: 'divider', mb: 3 }, children: _jsxs(Tabs, { value: tabValue, onChange: (e, newValue) => setTabValue(newValue), children: [_jsx(Tab, { label: "\u7FFB\u8B6F\u5DE5\u5177" }), _jsx(Tab, { label: "\u7FFB\u8B6F\u6B77\u53F2" })] }) }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, children: [_jsx(Typography, { variant: "h6", children: "\u7FFB\u8B6F\u8A2D\u5B9A" }), translationResult && (_jsx(IconButton, { size: "small", onClick: handleSwapLanguages, title: "\u4EA4\u63DB\u8A9E\u8A00", children: _jsx(Swap, {}) }))] }), _jsxs(Box, { component: "form", onSubmit: form.handleSubmit(handleTranslate), children: [_jsx(TextField, { fullWidth: true, multiline: true, rows: 8, label: "\u8981\u7FFB\u8B6F\u7684\u5167\u5BB9", placeholder: "\u8ACB\u8F38\u5165\u9700\u8981\u7FFB\u8B6F\u7684\u6587\u5B57\u5167\u5BB9...", ...form.register('content'), sx: { mb: 3 }, required: true }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 3 }, children: [_jsx(InputLabel, { children: "\u76EE\u6A19\u8A9E\u8A00" }), _jsx(Select, { ...form.register('target_language'), label: "\u76EE\u6A19\u8A9E\u8A00", value: form.watch('target_language'), onChange: (e) => form.setValue('target_language', e.target.value), children: languages.map((lang) => (_jsx(MenuItem, { value: lang.code, children: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", children: lang.name }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: lang.nativeName })] }) }, lang.code))) })] }), _jsx(TextField, { fullWidth: true, multiline: true, rows: 3, label: "\u7FFB\u8B6F\u60C5\u5883\u8AAA\u660E\uFF08\u9078\u586B\uFF09", placeholder: "\u4F8B\u5982\uFF1A\u9019\u662F\u6280\u8853\u6587\u4EF6\uFF0C\u8ACB\u4FDD\u6301\u5C08\u696D\u8853\u8A9E\u6E96\u78BA\u6027...", ...form.register('context'), sx: { mb: 2 } }), _jsxs(Box, { mb: 3, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", gutterBottom: true, display: "block", children: "\u5E38\u7528\u60C5\u5883\uFF1A" }), _jsx(Box, { display: "flex", gap: 1, flexWrap: "wrap", children: contextSuggestions.map((suggestion, index) => (_jsx(Chip, { label: suggestion.label, size: "small", variant: "outlined", onClick: () => form.setValue('context', suggestion.value), sx: { cursor: 'pointer' } }, index))) })] }), _jsx(Button, { fullWidth: true, variant: "contained", type: "submit", size: "large", startIcon: translateMutation.isPending ? _jsx(CircularProgress, { size: 20 }) : _jsx(Translate, {}), disabled: translateMutation.isPending, children: translateMutation.isPending ? '正在翻譯...' : '開始翻譯' })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: translationResult ? (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, children: [_jsx(Typography, { variant: "h6", children: "\u7FFB\u8B6F\u7D50\u679C" }), _jsx(Box, { display: "flex", gap: 1, children: _jsx(Chip, { label: `${getLanguageName(translationResult.source_language)} → ${getLanguageName(translationResult.target_language)}`, color: "primary", size: "small" }) })] }), _jsxs(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: ["\u539F\u6587 (", getLanguageName(translationResult.source_language), ")"] }), _jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2, backgroundColor: 'grey.50' }, children: _jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "flex-start", children: [_jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-wrap', flex: 1 }, children: translationResult.original_content }), _jsx(IconButton, { size: "small", onClick: () => handleSpeak(translationResult.original_content, translationResult.source_language), children: _jsx(VolumeUp, {}) })] }) }), _jsx(Divider, { sx: { my: 2 } }), _jsxs(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: ["\u8B6F\u6587 (", getLanguageName(translationResult.target_language), ")"] }), _jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2, backgroundColor: 'success.50' }, children: _jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "flex-start", children: [_jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-wrap', flex: 1 }, children: translationResult.translated_content }), _jsx(IconButton, { size: "small", onClick: () => handleSpeak(translationResult.translated_content, translationResult.target_language), children: _jsx(VolumeUp, {}) })] }) }), _jsxs(Box, { display: "flex", gap: 1, flexWrap: "wrap", children: [_jsx(Button, { size: "small", startIcon: _jsx(ContentCopy, {}), onClick: () => handleCopyToClipboard(translationResult.translated_content), children: "\u8907\u88FD\u8B6F\u6587" }), _jsx(Button, { size: "small", startIcon: _jsx(Save, {}), variant: "outlined", onClick: () => {
                                                        // TODO: 實現儲存功能
                                                        toast('此功能即將推出');
                                                    }, children: "\u5132\u5B58\u7FFB\u8B6F" })] }), translationResult.metadata && (_jsxs(Box, { mt: 3, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u7FFB\u8B6F\u8CC7\u8A0A" }), _jsxs(Grid, { container: true, spacing: 1, children: [_jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u539F\u6587\u5B57\u6578" }), _jsx(Typography, { variant: "h6", children: translationResult.original_content.length })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { textAlign: "center", p: 1, border: 1, borderColor: "grey.300", borderRadius: 1, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u8B6F\u6587\u5B57\u6578" }), _jsx(Typography, { variant: "h6", children: translationResult.translated_content.length })] }) })] })] }))] }) })) : (_jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { textAlign: "center", py: 4, children: [_jsx(Translate, { sx: { fontSize: 48, color: 'grey.400', mb: 2 } }), _jsx(Typography, { variant: "h6", color: "text.secondary", children: "\u958B\u59CB\u60A8\u7684\u7FFB\u8B6F\u5DE5\u4F5C" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u8F38\u5165\u5167\u5BB9\u4E26\u9078\u64C7\u76EE\u6A19\u8A9E\u8A00\uFF0CAI \u5C07\u70BA\u60A8\u63D0\u4F9B\u6E96\u78BA\u7684\u7FFB\u8B6F\u7D50\u679C" })] }) }) })) })] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u7FFB\u8B6F\u6B77\u53F2" }), translationHistory.length === 0 ? (_jsxs(Box, { textAlign: "center", py: 4, children: [_jsx(History, { sx: { fontSize: 48, color: 'grey.400', mb: 2 } }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "\u9084\u6C92\u6709\u7FFB\u8B6F\u8A18\u9304" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5B8C\u6210\u7B2C\u4E00\u6B21\u7FFB\u8B6F\u5F8C\uFF0C\u8A18\u9304\u5C07\u986F\u793A\u5728\u9019\u88E1" })] })) : (_jsx(List, { children: translationHistory.map((item, index) => (_jsxs(ListItem, { divider: true, children: [_jsx(ListItemText, { primary: _jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [_jsx(Chip, { label: `${getLanguageName(item.source_language)} → ${getLanguageName(item.target_language)}`, size: "small", color: "primary", variant: "outlined" }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [item.original_content.substring(0, 50), "..."] })] }), secondary: item.translated_content.substring(0, 100) + '...' }), _jsx(ListItemSecondaryAction, { children: _jsx(Button, { size: "small", onClick: () => handleLoadFromHistory(item), children: "\u91CD\u65B0\u8F09\u5165" }) })] }, index))) }))] }) }) })] }));
};
export default TranslationPage;
