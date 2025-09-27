import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, TextField, Grid, Breadcrumbs, Link, Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemIcon, Divider, } from '@mui/material';
import { ArrowBack, Save, History, Description, NavigateNext, CheckCircle, Schedule, Error as ErrorIcon, } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { proposalsApi, aiApi } from '@/services/api';
import ProposalEditor from '@/components/editor/ProposalEditor';
import toast from 'react-hot-toast';
const ProposalEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
    const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState(null);
    const form = useForm({
        defaultValues: {
            title: '',
            client_name: '',
            deadline: '',
        },
    });
    // 載入標書資料
    const { data: proposal, isLoading, error } = useQuery({
        queryKey: ['proposals', 'detail', id],
        queryFn: () => proposalsApi.getProposal(id),
        enabled: !!id,
        select: (data) => data.data,
        onSuccess: (data) => {
            setContent(data.content.main || '');
            form.reset({
                title: data.title,
                client_name: data.client_name,
                deadline: data.deadline,
            });
        },
    });
    // 載入版本歷史
    const { data: versions = [] } = useQuery({
        queryKey: ['proposals', 'versions', id],
        queryFn: () => proposalsApi.getProposalVersions(id),
        enabled: !!id && versionsDialogOpen,
        select: (data) => data.data || [],
    });
    // 更新標書內容
    const updateContentMutation = useMutation({
        mutationFn: (data) => proposalsApi.updateProposalContent(id, {
            content: { main: data.content },
            version: proposal?.version || 1,
        }),
        onMutate: () => setAutoSaveStatus('saving'),
        onSuccess: () => {
            setAutoSaveStatus('saved');
            setLastSaveTime(new Date());
            queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', id] });
        },
        onError: () => setAutoSaveStatus('error'),
    });
    // 更新標書基本資訊
    const updateProposalMutation = useMutation({
        mutationFn: (data) => proposalsApi.updateProposal(id, data),
        onSuccess: () => {
            toast.success('標書資訊更新成功！');
            queryClient.invalidateQueries({ queryKey: ['proposals', 'detail', id] });
        },
        onError: () => toast.error('更新失敗'),
    });
    // AI 生成內容
    const aiGenerateMutation = useMutation({
        mutationFn: aiApi.generateContent,
        onSuccess: (response) => {
            const generatedContent = response.data.content;
            if (generatedContent) {
                setContent(prev => prev + '\n\n' + generatedContent);
                toast.success('AI 內容生成成功！');
            }
        },
        onError: () => toast.error('AI 生成失敗'),
    });
    // 自動儲存功能
    const autoSave = useCallback(debounce((newContent) => {
        if (newContent !== (proposal?.content.main || '')) {
            updateContentMutation.mutate({ content: newContent });
        }
    }, 2000), [proposal?.content.main, updateContentMutation]);
    // 內容變更處理
    const handleContentChange = (newContent) => {
        setContent(newContent);
        autoSave(newContent);
    };
    // 手動儲存
    const handleManualSave = () => {
        updateContentMutation.mutate({ content });
    };
    // AI 生成處理
    const handleAIGenerate = (prompt) => {
        aiGenerateMutation.mutate({
            prompt,
            section_type: 'main',
            context: {
                company_data: true,
                proposal_title: proposal?.title,
                client_name: proposal?.client_name,
            },
        });
    };
    // 儲存基本資訊
    const handleSaveInfo = (data) => {
        updateProposalMutation.mutate(data);
    };
    // 版本恢復
    const handleRestoreVersion = (versionData) => {
        setContent(versionData.content.main || '');
        setVersionsDialogOpen(false);
        toast.success('版本恢復成功！');
    };
    if (isLoading) {
        return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsxs(Box, { p: 3, children: [_jsx(Alert, { severity: "error", children: "\u8F09\u5165\u6A19\u66F8\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66\u6216\u8FD4\u56DE\u6A19\u66F8\u5217\u8868" }), _jsx(Button, { startIcon: _jsx(ArrowBack, {}), onClick: () => navigate('/proposals'), sx: { mt: 2 }, children: "\u8FD4\u56DE\u6A19\u66F8\u5217\u8868" })] }));
    }
    if (!proposal) {
        return (_jsxs(Box, { p: 3, children: [_jsx(Alert, { severity: "warning", children: "\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u6A19\u66F8" }), _jsx(Button, { startIcon: _jsx(ArrowBack, {}), onClick: () => navigate('/proposals'), sx: { mt: 2 }, children: "\u8FD4\u56DE\u6A19\u66F8\u5217\u8868" })] }));
    }
    const getStatusColor = (status) => {
        const colors = {
            draft: 'default',
            in_progress: 'info',
            submitted: 'warning',
            won: 'success',
            lost: 'error',
        };
        return colors[status] || 'default';
    };
    const getStatusLabel = (status) => {
        const labels = {
            draft: '草稿',
            in_progress: '進行中',
            submitted: '已提交',
            won: '得標',
            lost: '未得標',
        };
        return labels[status] || status;
    };
    const getAutoSaveIcon = () => {
        switch (autoSaveStatus) {
            case 'saving':
                return _jsx(CircularProgress, { size: 16 });
            case 'saved':
                return _jsx(CheckCircle, { color: "success" });
            case 'error':
                return _jsx(ErrorIcon, { color: "error" });
        }
    };
    return (_jsxs(Box, { sx: { height: '100vh', display: 'flex', flexDirection: 'column' }, children: [_jsxs(Paper, { elevation: 1, sx: { p: 2, borderRadius: 0 }, children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, children: [_jsxs(Breadcrumbs, { separator: _jsx(NavigateNext, { fontSize: "small" }), children: [_jsx(Link, { component: "button", variant: "body2", onClick: () => navigate('/proposals'), sx: { display: 'flex', alignItems: 'center' }, children: "\u6A19\u66F8\u7BA1\u7406" }), _jsx(Typography, { variant: "body2", color: "text.primary", children: "\u7DE8\u8F2F\u6A19\u66F8" })] }), _jsxs(Box, { display: "flex", gap: 1, alignItems: "center", children: [_jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [getAutoSaveIcon(), _jsx(Typography, { variant: "caption", color: "text.secondary", children: autoSaveStatus === 'saved' && lastSaveTime
                                                    ? `已儲存 ${lastSaveTime.toLocaleTimeString()}`
                                                    : autoSaveStatus === 'saving'
                                                        ? '儲存中...'
                                                        : autoSaveStatus === 'error'
                                                            ? '儲存失敗'
                                                            : '' })] }), _jsx(Button, { size: "small", startIcon: _jsx(History, {}), onClick: () => setVersionsDialogOpen(true), children: "\u7248\u672C\u6B77\u53F2" }), _jsx(Button, { variant: "contained", startIcon: _jsx(Save, {}), onClick: handleManualSave, disabled: updateContentMutation.isPending, children: "\u624B\u52D5\u5132\u5B58" })] })] }), _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(TextField, { fullWidth: true, size: "small", label: "\u6A19\u66F8\u6A19\u984C", ...form.register('title'), onBlur: () => handleSaveInfo(form.getValues()) }) }), _jsx(Grid, { item: true, xs: 12, sm: 3, children: _jsx(TextField, { fullWidth: true, size: "small", label: "\u5BA2\u6236\u540D\u7A31", ...form.register('client_name'), onBlur: () => handleSaveInfo(form.getValues()) }) }), _jsx(Grid, { item: true, xs: 12, sm: 2, children: _jsx(TextField, { fullWidth: true, size: "small", type: "date", label: "\u622A\u6B62\u65E5\u671F", ...form.register('deadline'), onBlur: () => handleSaveInfo(form.getValues()), InputLabelProps: { shrink: true } }) }), _jsx(Grid, { item: true, xs: 12, sm: 3, children: _jsxs(Box, { display: "flex", gap: 1, alignItems: "center", children: [_jsx(Chip, { icon: _jsx(Description, {}), label: getStatusLabel(proposal.status), color: getStatusColor(proposal.status), size: "small" }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["v", proposal.version] })] }) })] })] }), _jsx(Box, { sx: { flexGrow: 1, overflow: 'hidden' }, children: _jsx(ProposalEditor, { content: content, onChange: handleContentChange, onSave: handleManualSave, onAIGenerate: handleAIGenerate }) }), _jsxs(Dialog, { open: versionsDialogOpen, onClose: () => setVersionsDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u7248\u672C\u6B77\u53F2" }), _jsx(DialogContent, { children: _jsx(List, { children: versions.map((version, index) => (_jsxs(React.Fragment, { children: [_jsxs(ListItem, { secondaryAction: _jsx(Button, { size: "small", onClick: () => handleRestoreVersion(version), disabled: version.version === proposal.version, children: version.version === proposal.version ? '當前版本' : '恢復此版本' }), children: [_jsx(ListItemIcon, { children: _jsx(Schedule, {}) }), _jsx(ListItemText, { primary: `版本 ${version.version}`, secondary: `${new Date(version.created_at).toLocaleString()} - ${version.change_summary || '無說明'}` })] }), index < versions.length - 1 && _jsx(Divider, {})] }, version.id))) }) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setVersionsDialogOpen(false), children: "\u95DC\u9589" }) })] })] }));
};
// 防抖函數
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
export default ProposalEditorPage;
