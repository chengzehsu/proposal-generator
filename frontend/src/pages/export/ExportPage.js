import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Divider, Chip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, } from '@mui/material';
import { GetApp, PictureAsPdf, Description, ArticleOutlined, Delete, Download, Refresh, CloudDownload, CheckCircle, Error as ErrorIcon, Schedule, History, Batch, } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { exportApi, proposalsApi } from '@/services/api';
import toast from 'react-hot-toast';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, ...other, children: value === index && _jsx(Box, { children: children }) }));
}
const ExportPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedProposals, setSelectedProposals] = useState([]);
    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const form = useForm({
        defaultValues: {
            proposal_id: '',
            format: 'pdf',
            options: {
                include_cover: true,
                include_toc: true,
                include_appendix: true,
                watermark: false,
                compress: false,
            },
        },
    });
    const batchForm = useForm({
        defaultValues: {
            format: 'pdf',
            merge_into_single: false,
        },
    });
    // 獲取標書列表
    const { data: proposals = [] } = useQuery({
        queryKey: ['proposals', 'list'],
        queryFn: () => proposalsApi.getProposals(),
        select: (data) => data.data || [],
    });
    // 獲取匯出歷史
    const { data: exportHistory = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: ['exports', 'history'],
        queryFn: () => exportApi.getExportHistory(),
        select: (data) => data.data || [],
        refetchInterval: 10000, // 每10秒更新一次
    });
    // 匯出標書
    const exportMutation = useMutation({
        mutationFn: exportApi.exportProposal,
        onSuccess: (response) => {
            toast.success('匯出任務已建立！');
            queryClient.invalidateQueries({ queryKey: ['exports', 'history'] });
            // 如果有下載連結，自動下載
            if (response.data.download_url) {
                const link = document.createElement('a');
                link.href = response.data.download_url;
                link.download = response.data.filename;
                link.click();
            }
        },
        onError: (error) => {
            const message = error.response?.data?.message || '匯出失敗';
            toast.error(message);
        },
    });
    // 批次匯出
    const batchExportMutation = useMutation({
        mutationFn: exportApi.batchExport,
        onSuccess: () => {
            toast.success('批次匯出任務已建立！');
            setBatchDialogOpen(false);
            setSelectedProposals([]);
            queryClient.invalidateQueries({ queryKey: ['exports', 'history'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || '批次匯出失敗';
            toast.error(message);
        },
    });
    // 刪除匯出記錄
    const deleteMutation = useMutation({
        mutationFn: exportApi.deleteExport,
        onSuccess: () => {
            toast.success('匯出記錄已刪除');
            queryClient.invalidateQueries({ queryKey: ['exports', 'history'] });
        },
        onError: () => toast.error('刪除失敗'),
    });
    const handleExport = (data) => {
        if (!data.proposal_id) {
            toast.error('請選擇要匯出的標書');
            return;
        }
        exportMutation.mutate(data);
    };
    const handleBatchExport = (data) => {
        if (selectedProposals.length === 0) {
            toast.error('請選擇要匯出的標書');
            return;
        }
        batchExportMutation.mutate({
            ...data,
            proposal_ids: selectedProposals,
        });
    };
    const handleProposalSelect = (proposalId, checked) => {
        setSelectedProposals(prev => checked
            ? [...prev, proposalId]
            : prev.filter(id => id !== proposalId));
    };
    const handleSelectAll = () => {
        const allSelected = selectedProposals.length === proposals.length;
        setSelectedProposals(allSelected ? [] : proposals.map((p) => p.id));
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const getFormatIcon = (format) => {
        switch (format) {
            case 'pdf':
                return _jsx(PictureAsPdf, { color: "error" });
            case 'docx':
                return _jsx(Description, { color: "primary" });
            case 'odt':
                return _jsx(ArticleOutlined, { color: "success" });
            default:
                return _jsx(Description, {});
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return _jsx(CheckCircle, { color: "success" });
            case 'processing':
                return _jsx(CircularProgress, { size: 20 });
            case 'failed':
                return _jsx(ErrorIcon, { color: "error" });
            default:
                return _jsx(Schedule, { color: "warning" });
        }
    };
    const getStatusLabel = (status) => {
        const labels = {
            pending: '等待中',
            processing: '處理中',
            completed: '完成',
            failed: '失敗',
        };
        return labels[status] || status;
    };
    const formats = [
        { value: 'pdf', label: 'PDF', description: '便攜式文件格式，適合列印和分享' },
        { value: 'docx', label: 'Word文件', description: 'Microsoft Word 格式，可編輯' },
        { value: 'odt', label: 'ODT文件', description: 'OpenDocument 格式，開源標準' },
    ];
    return (_jsxs(Box, { children: [_jsxs(Box, { mb: 3, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "\u6587\u4EF6\u532F\u51FA" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5C07\u6A19\u66F8\u532F\u51FA\u70BA\u591A\u7A2E\u683C\u5F0F\u7684\u6587\u4EF6\uFF0C\u652F\u63F4\u55AE\u500B\u532F\u51FA\u548C\u6279\u6B21\u532F\u51FA" })] }), _jsx(Box, { sx: { borderBottom: 1, borderColor: 'divider', mb: 3 }, children: _jsxs(Tabs, { value: tabValue, onChange: (e, newValue) => setTabValue(newValue), children: [_jsx(Tab, { label: "\u55AE\u500B\u532F\u51FA" }), _jsx(Tab, { label: "\u6279\u6B21\u532F\u51FA" }), _jsx(Tab, { label: "\u532F\u51FA\u6B77\u53F2" })] }) }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u532F\u51FA\u8A2D\u5B9A" }), _jsxs(Box, { component: "form", onSubmit: form.handleSubmit(handleExport), children: [_jsxs(FormControl, { fullWidth: true, sx: { mb: 3 }, children: [_jsx(InputLabel, { children: "\u9078\u64C7\u6A19\u66F8" }), _jsx(Select, { ...form.register('proposal_id'), label: "\u9078\u64C7\u6A19\u66F8", value: form.watch('proposal_id'), onChange: (e) => form.setValue('proposal_id', e.target.value), children: proposals.map((proposal) => (_jsx(MenuItem, { value: proposal.id, children: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", children: proposal.title }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [proposal.client_name, " - ", proposal.status] })] }) }, proposal.id))) })] }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 3 }, children: [_jsx(InputLabel, { children: "\u532F\u51FA\u683C\u5F0F" }), _jsx(Select, { ...form.register('format'), label: "\u532F\u51FA\u683C\u5F0F", value: form.watch('format'), onChange: (e) => form.setValue('format', e.target.value), children: formats.map((format) => (_jsx(MenuItem, { value: format.value, children: _jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [getFormatIcon(format.value), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", children: format.label }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: format.description })] })] }) }, format.value))) })] }), _jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u532F\u51FA\u9078\u9805" }), _jsxs(Box, { sx: { mb: 3 }, children: [_jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: form.watch('options.include_cover'), onChange: (e) => form.setValue('options.include_cover', e.target.checked) }), label: "\u5305\u542B\u5C01\u9762" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: form.watch('options.include_toc'), onChange: (e) => form.setValue('options.include_toc', e.target.checked) }), label: "\u5305\u542B\u76EE\u9304" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: form.watch('options.include_appendix'), onChange: (e) => form.setValue('options.include_appendix', e.target.checked) }), label: "\u5305\u542B\u9644\u9304" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: form.watch('options.watermark'), onChange: (e) => form.setValue('options.watermark', e.target.checked) }), label: "\u52A0\u5165\u6D6E\u6C34\u5370" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: form.watch('options.compress'), onChange: (e) => form.setValue('options.compress', e.target.checked) }), label: "\u58D3\u7E2E\u6A94\u6848" })] }), _jsx(Button, { fullWidth: true, variant: "contained", type: "submit", size: "large", startIcon: exportMutation.isPending ? _jsx(CircularProgress, { size: 20 }) : _jsx(GetApp, {}), disabled: exportMutation.isPending, children: exportMutation.isPending ? '匯出中...' : '開始匯出' })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u532F\u51FA\u9810\u89BD" }), form.watch('proposal_id') ? (_jsx(Box, { children: (() => {
                                                const selectedProposal = proposals.find((p) => p.id === form.watch('proposal_id'));
                                                return selectedProposal ? (_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: selectedProposal.title }), _jsxs(Typography, { variant: "body2", color: "text.secondary", paragraph: true, children: ["\u5BA2\u6236\uFF1A", selectedProposal.client_name] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", paragraph: true, children: ["\u72C0\u614B\uFF1A", selectedProposal.status] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", paragraph: true, children: ["\u622A\u6B62\u65E5\u671F\uFF1A", selectedProposal.deadline || '未設定'] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u532F\u51FA\u8A2D\u5B9A\u6458\u8981" }), _jsxs(Box, { display: "flex", gap: 1, flexWrap: "wrap", children: [_jsx(Chip, { icon: getFormatIcon(form.watch('format')), label: formats.find(f => f.value === form.watch('format'))?.label, size: "small", color: "primary" }), form.watch('options.include_cover') && (_jsx(Chip, { label: "\u5305\u542B\u5C01\u9762", size: "small", variant: "outlined" })), form.watch('options.include_toc') && (_jsx(Chip, { label: "\u5305\u542B\u76EE\u9304", size: "small", variant: "outlined" })), form.watch('options.watermark') && (_jsx(Chip, { label: "\u6D6E\u6C34\u5370", size: "small", variant: "outlined" }))] })] })) : null;
                                            })() })) : (_jsxs(Box, { textAlign: "center", py: 4, children: [_jsx(GetApp, { sx: { fontSize: 48, color: 'grey.400', mb: 2 } }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "\u8ACB\u9078\u64C7\u8981\u532F\u51FA\u7684\u6A19\u66F8" })] }))] }) }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [_jsx(Typography, { variant: "h6", children: "\u6279\u6B21\u532F\u51FA" }), _jsxs(Box, { display: "flex", gap: 1, children: [_jsx(Button, { size: "small", onClick: handleSelectAll, children: selectedProposals.length === proposals.length ? '取消全選' : '全選' }), _jsxs(Button, { variant: "contained", startIcon: _jsx(Batch, {}), onClick: () => setBatchDialogOpen(true), disabled: selectedProposals.length === 0, children: ["\u6279\u6B21\u532F\u51FA (", selectedProposals.length, ")"] })] })] }), _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: selectedProposals.length === proposals.length && proposals.length > 0, indeterminate: selectedProposals.length > 0 && selectedProposals.length < proposals.length, onChange: () => handleSelectAll() }) }), _jsx(TableCell, { children: "\u6A19\u66F8\u6A19\u984C" }), _jsx(TableCell, { children: "\u5BA2\u6236" }), _jsx(TableCell, { children: "\u72C0\u614B" }), _jsx(TableCell, { children: "\u622A\u6B62\u65E5\u671F" })] }) }), _jsx(TableBody, { children: proposals.map((proposal) => (_jsxs(TableRow, { children: [_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: selectedProposals.includes(proposal.id), onChange: (e) => handleProposalSelect(proposal.id, e.target.checked) }) }), _jsx(TableCell, { children: proposal.title }), _jsx(TableCell, { children: proposal.client_name }), _jsx(TableCell, { children: _jsx(Chip, { label: proposal.status, size: "small", color: proposal.status === 'completed' ? 'success' : 'default' }) }), _jsx(TableCell, { children: proposal.deadline || '-' })] }, proposal.id))) })] }) })] }) }) }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [_jsx(Typography, { variant: "h6", children: "\u532F\u51FA\u6B77\u53F2" }), _jsx(Button, { startIcon: _jsx(Refresh, {}), onClick: () => queryClient.invalidateQueries({ queryKey: ['exports', 'history'] }), children: "\u91CD\u65B0\u6574\u7406" })] }), isLoadingHistory ? (_jsx(Box, { display: "flex", justifyContent: "center", p: 4, children: _jsx(CircularProgress, {}) })) : exportHistory.length === 0 ? (_jsxs(Box, { textAlign: "center", py: 4, children: [_jsx(History, { sx: { fontSize: 48, color: 'grey.400', mb: 2 } }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "\u9084\u6C92\u6709\u532F\u51FA\u8A18\u9304" })] })) : (_jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u6A94\u6848\u540D\u7A31" }), _jsx(TableCell, { children: "\u683C\u5F0F" }), _jsx(TableCell, { children: "\u6A94\u6848\u5927\u5C0F" }), _jsx(TableCell, { children: "\u72C0\u614B" }), _jsx(TableCell, { children: "\u532F\u51FA\u6642\u9593" }), _jsx(TableCell, { children: "\u5230\u671F\u6642\u9593" }), _jsx(TableCell, { children: "\u64CD\u4F5C" })] }) }), _jsx(TableBody, { children: exportHistory.map((item) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: item.filename }), _jsx(TableCell, { children: _jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [getFormatIcon(item.format), item.format.toUpperCase()] }) }), _jsx(TableCell, { children: formatFileSize(item.file_size || 0) }), _jsx(TableCell, { children: _jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [getStatusIcon(item.status), _jsx(Chip, { label: getStatusLabel(item.status), size: "small", color: item.status === 'completed' ? 'success' :
                                                                        item.status === 'failed' ? 'error' : 'warning' })] }) }), _jsx(TableCell, { children: new Date(item.created_at).toLocaleString('zh-TW') }), _jsx(TableCell, { children: item.expires_at ? new Date(item.expires_at).toLocaleString('zh-TW') : '-' }), _jsx(TableCell, { children: _jsxs(Box, { display: "flex", gap: 1, children: [item.status === 'completed' && item.download_url && (_jsx(IconButton, { size: "small", href: item.download_url, target: "_blank", title: "\u4E0B\u8F09", children: _jsx(Download, {}) })), _jsx(IconButton, { size: "small", onClick: () => deleteMutation.mutate(item.id), title: "\u522A\u9664", children: _jsx(Delete, {}) })] }) })] }, item.id))) })] }) }))] }) }) }), _jsxs(Dialog, { open: batchDialogOpen, onClose: () => setBatchDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u6279\u6B21\u532F\u51FA\u8A2D\u5B9A" }), _jsx(DialogContent, { children: _jsxs(Box, { component: "form", sx: { mt: 2 }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: ["\u5DF2\u9078\u64C7 ", selectedProposals.length, " \u500B\u6A19\u66F8\u9032\u884C\u6279\u6B21\u532F\u51FA"] }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 3 }, children: [_jsx(InputLabel, { children: "\u532F\u51FA\u683C\u5F0F" }), _jsx(Select, { ...batchForm.register('format'), label: "\u532F\u51FA\u683C\u5F0F", value: batchForm.watch('format'), onChange: (e) => batchForm.setValue('format', e.target.value), children: formats.map((format) => (_jsx(MenuItem, { value: format.value, children: _jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [getFormatIcon(format.value), format.label] }) }, format.value))) })] }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: batchForm.watch('merge_into_single'), onChange: (e) => batchForm.setValue('merge_into_single', e.target.checked) }), label: "\u5408\u4F75\u70BA\u55AE\u4E00\u6A94\u6848" })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setBatchDialogOpen(false), children: "\u53D6\u6D88" }), _jsx(Button, { variant: "contained", onClick: batchForm.handleSubmit(handleBatchExport), disabled: batchExportMutation.isPending, startIcon: batchExportMutation.isPending ? _jsx(CircularProgress, { size: 20 }) : _jsx(CloudDownload, {}), children: batchExportMutation.isPending ? '匯出中...' : '開始批次匯出' })] })] })] }));
};
export default ExportPage;
