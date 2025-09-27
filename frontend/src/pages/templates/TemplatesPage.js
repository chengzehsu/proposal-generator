import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Typography, Card, CardContent, CardActions, Button, Grid, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, IconButton, Menu, ListItemIcon, ListItemText, Divider, Alert, Paper, } from '@mui/material';
import { Add, Edit, Delete, FileCopy, MoreVert, Description, Star, Public, Visibility, } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { templatesApi } from '@/services/api';
import toast from 'react-hot-toast';
// 範本類別選項
const templateCategories = [
    '政府標案',
    '企業採購',
    '工程建設',
    '服務提案',
    '研發專案',
    '其他'
];
// 驗證 schema
const templateSchema = z.object({
    template_name: z.string().min(2, '範本名稱至少需要2個字元').max(200, '範本名稱長度不能超過200字元'),
    description: z.string().optional(),
    category: z.enum(['政府標案', '企業採購', '工程建設', '服務提案', '研發專案', '其他'], {
        errorMap: () => ({ message: '請選擇正確的範本類別' })
    }),
    is_public: z.boolean().optional().default(false),
    is_default: z.boolean().optional().default(false)
});
const TemplatesPage = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [viewingTemplate, setViewingTemplate] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const queryClient = useQueryClient();
    // 獲取範本列表
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['templates', 'list', selectedCategory],
        queryFn: () => templatesApi.getTemplates({
            category: selectedCategory === 'all' ? undefined : selectedCategory
        }),
        select: (data) => data.data || [],
    });
    // 表單設置
    const form = useForm({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            template_name: '',
            description: '',
            category: '政府標案',
            is_public: false,
            is_default: false,
        },
    });
    // 新增範本
    const createMutation = useMutation({
        mutationFn: templatesApi.createTemplate,
        onSuccess: () => {
            toast.success('範本建立成功！');
            setDialogOpen(false);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || '建立失敗';
            toast.error(message);
        },
    });
    // 更新範本
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => templatesApi.updateTemplate(id, data),
        onSuccess: () => {
            toast.success('範本更新成功！');
            setDialogOpen(false);
            setEditingTemplate(null);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || '更新失敗';
            toast.error(message);
        },
    });
    // 刪除範本
    const deleteMutation = useMutation({
        mutationFn: templatesApi.deleteTemplate,
        onSuccess: () => {
            toast.success('範本刪除成功！');
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || '刪除失敗';
            toast.error(message);
        },
    });
    const handleAdd = () => {
        setEditingTemplate(null);
        form.reset();
        setDialogOpen(true);
    };
    const handleEdit = (template) => {
        setEditingTemplate(template);
        form.reset({
            template_name: template.template_name,
            description: template.description || '',
            category: template.category,
            is_public: template.is_public,
            is_default: template.is_default,
        });
        setDialogOpen(true);
        setMenuAnchor(null);
    };
    const handleSave = (data) => {
        if (editingTemplate) {
            updateMutation.mutate({ id: editingTemplate.id, data });
        }
        else {
            createMutation.mutate(data);
        }
    };
    const handleMenuOpen = (event, template) => {
        setMenuAnchor({ element: event.currentTarget, template });
    };
    const handleMenuClose = () => {
        setMenuAnchor(null);
    };
    const handleDuplicate = (template) => {
        const duplicateData = {
            template_name: `${template.template_name} (副本)`,
            description: template.description,
            category: template.category,
            is_public: false,
            is_default: false,
        };
        createMutation.mutate(duplicateData);
        setMenuAnchor(null);
    };
    const handleDelete = (template) => {
        if (confirm(`確定要刪除範本「${template.template_name}」嗎？`)) {
            deleteMutation.mutate(template.id);
        }
        setMenuAnchor(null);
    };
    const handleView = (template) => {
        setViewingTemplate(template);
        setViewDialogOpen(true);
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "\u6A19\u66F8\u7BC4\u672C\u7BA1\u7406" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5EFA\u7ACB\u548C\u7BA1\u7406\u6A19\u66F8\u7BC4\u672C\uFF0C\u5FEB\u901F\u751F\u6210\u5C08\u696D\u6A19\u66F8" })] }), _jsx(Button, { variant: "contained", startIcon: _jsx(Add, {}), onClick: handleAdd, children: "\u65B0\u589E\u7BC4\u672C" })] }), _jsx(Box, { mb: 3, children: _jsxs(FormControl, { size: "small", sx: { minWidth: 200 }, children: [_jsx(InputLabel, { children: "\u7BE9\u9078\u985E\u5225" }), _jsxs(Select, { value: selectedCategory, label: "\u7BE9\u9078\u985E\u5225", onChange: (e) => setSelectedCategory(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "\u5168\u90E8\u985E\u5225" }), templateCategories.map((category) => (_jsx(MenuItem, { value: category, children: category }, category)))] })] }) }), _jsxs(Grid, { container: true, spacing: 3, mb: 3, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", color: "primary", children: templates.length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7E3D\u7BC4\u672C\u6578" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", color: "warning.main", children: templates.filter((t) => t.is_default).length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u9810\u8A2D\u7BC4\u672C" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", color: "success.main", children: templates.filter((t) => t.is_public).length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u516C\u958B\u7BC4\u672C" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", color: "info.main", children: new Set(templates.map((t) => t.category)).size }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7BC4\u672C\u985E\u5225" })] }) }) })] }), isLoading ? (_jsx(Box, { display: "flex", justifyContent: "center", p: 4, children: _jsx(Typography, { children: "\u8F09\u5165\u4E2D..." }) })) : templates.length === 0 ? (_jsx(Alert, { severity: "info", children: selectedCategory === 'all' ? '還沒有範本，請建立第一個範本' : `「${selectedCategory}」類別下沒有範本` })) : (_jsx(Grid, { container: true, spacing: 3, children: templates.map((template) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsxs(Card, { sx: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs(CardContent, { sx: { flexGrow: 1 }, children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, children: [_jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [_jsx(Description, { color: "primary" }), template.is_default && (_jsx(Star, { color: "warning", fontSize: "small" }))] }), _jsx(IconButton, { size: "small", onClick: (e) => handleMenuOpen(e, template), children: _jsx(MoreVert, {}) })] }), _jsx(Typography, { variant: "h6", gutterBottom: true, noWrap: true, children: template.template_name }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2, minHeight: '2.5em' }, children: template.description || '無描述' }), _jsxs(Box, { display: "flex", gap: 1, flexWrap: "wrap", mb: 2, children: [_jsx(Chip, { label: template.category, size: "small", color: "primary", variant: "outlined" }), template.is_public && (_jsx(Chip, { icon: _jsx(Public, {}), label: "\u516C\u958B", size: "small", color: "success", variant: "outlined" })), template.is_default && (_jsx(Chip, { icon: _jsx(Star, {}), label: "\u9810\u8A2D", size: "small", color: "warning", variant: "outlined" }))] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u5EFA\u7ACB\u6642\u9593\uFF1A", new Date(template.created_at).toLocaleDateString('zh-TW')] })] }), _jsxs(CardActions, { children: [_jsx(Button, { size: "small", startIcon: _jsx(Visibility, {}), onClick: () => handleView(template), children: "\u67E5\u770B" }), _jsx(Button, { size: "small", startIcon: _jsx(Edit, {}), onClick: () => handleEdit(template), children: "\u7DE8\u8F2F" })] })] }) }, template.id))) })), _jsxs(Menu, { anchorEl: menuAnchor?.element, open: Boolean(menuAnchor), onClose: handleMenuClose, children: [_jsxs(MenuItem, { onClick: () => handleEdit(menuAnchor?.template), children: [_jsx(ListItemIcon, { children: _jsx(Edit, { fontSize: "small" }) }), _jsx(ListItemText, { children: "\u7DE8\u8F2F\u7BC4\u672C" })] }), _jsxs(MenuItem, { onClick: () => handleDuplicate(menuAnchor?.template), children: [_jsx(ListItemIcon, { children: _jsx(FileCopy, { fontSize: "small" }) }), _jsx(ListItemText, { children: "\u8907\u88FD\u7BC4\u672C" })] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: () => handleDelete(menuAnchor?.template), sx: { color: 'error.main' }, children: [_jsx(ListItemIcon, { children: _jsx(Delete, { fontSize: "small", color: "error" }) }), _jsx(ListItemText, { children: "\u522A\u9664\u7BC4\u672C" })] })] }), _jsxs(Dialog, { open: viewDialogOpen, onClose: () => setViewDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsxs(DialogTitle, { children: ["\u7BC4\u672C\u8A73\u60C5 - ", viewingTemplate?.template_name] }), _jsx(DialogContent, { children: viewingTemplate && (_jsx(Box, { sx: { mt: 2 }, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "\u7BC4\u672C\u540D\u7A31" }), _jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: viewingTemplate.template_name })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "\u7BC4\u672C\u985E\u5225" }), _jsx(Chip, { label: viewingTemplate.category, color: "primary", variant: "outlined", sx: { mb: 2 } })] }), _jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "\u7BC4\u672C\u63CF\u8FF0" }), _jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2, minHeight: '100px' }, children: _jsx(Typography, { variant: "body2", children: viewingTemplate.description || '無描述' }) })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "\u72C0\u614B\u8A2D\u5B9A" }), _jsxs(Box, { display: "flex", gap: 1, flexWrap: "wrap", children: [viewingTemplate.is_public && (_jsx(Chip, { icon: _jsx(Public, {}), label: "\u516C\u958B\u7BC4\u672C", color: "success", variant: "outlined", size: "small" })), viewingTemplate.is_default && (_jsx(Chip, { icon: _jsx(Star, {}), label: "\u9810\u8A2D\u7BC4\u672C", color: "warning", variant: "outlined", size: "small" })), !viewingTemplate.is_public && !viewingTemplate.is_default && (_jsx(Chip, { label: "\u79C1\u4EBA\u7BC4\u672C", variant: "outlined", size: "small" }))] })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "\u5EFA\u7ACB\u6642\u9593" }), _jsx(Typography, { variant: "body2", children: new Date(viewingTemplate.created_at).toLocaleString('zh-TW') }), viewingTemplate.updated_at && (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, sx: { mt: 1 }, children: "\u66F4\u65B0\u6642\u9593" }), _jsx(Typography, { variant: "body2", children: new Date(viewingTemplate.updated_at).toLocaleString('zh-TW') })] }))] })] }) })) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setViewDialogOpen(false), children: "\u95DC\u9589" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(Edit, {}), onClick: () => {
                                    setViewDialogOpen(false);
                                    handleEdit(viewingTemplate);
                                }, children: "\u7DE8\u8F2F\u7BC4\u672C" })] })] }), _jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: editingTemplate ? '編輯範本' : '新增範本' }), _jsx(DialogContent, { children: _jsxs(Grid, { container: true, spacing: 2, sx: { mt: 1 }, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u7BC4\u672C\u540D\u7A31", ...form.register('template_name'), error: !!form.formState.errors.template_name, helperText: form.formState.errors.template_name?.message, required: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, required: true, children: [_jsx(InputLabel, { children: "\u7BC4\u672C\u985E\u5225" }), _jsx(Select, { ...form.register('category'), label: "\u7BC4\u672C\u985E\u5225", value: form.watch('category'), onChange: (e) => form.setValue('category', e.target.value), children: templateCategories.map((category) => (_jsx(MenuItem, { value: category, children: category }, category))) })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Box, { display: "flex", flexDirection: "column", gap: 1, children: [_jsx(FormControlLabel, { control: _jsx(Switch, { ...form.register('is_public'), checked: form.watch('is_public'), onChange: (e) => form.setValue('is_public', e.target.checked) }), label: "\u516C\u958B\u7BC4\u672C" }), _jsx(FormControlLabel, { control: _jsx(Switch, { ...form.register('is_default'), checked: form.watch('is_default'), onChange: (e) => form.setValue('is_default', e.target.checked) }), label: "\u8A2D\u70BA\u9810\u8A2D\u7BC4\u672C" })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u7BC4\u672C\u63CF\u8FF0", multiline: true, rows: 3, ...form.register('description'), error: !!form.formState.errors.description, helperText: form.formState.errors.description?.message }) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setDialogOpen(false), children: "\u53D6\u6D88" }), _jsx(Button, { variant: "contained", onClick: form.handleSubmit(handleSave), disabled: createMutation.isPending || updateMutation.isPending, children: editingTemplate ? '更新' : '建立' })] })] })] }));
};
export default TemplatesPage;
