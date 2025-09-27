import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, DataGrid, GridActionsCellItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Avatar, IconButton, } from '@mui/material';
import { Add, Edit, Delete, Person, Star, StarBorder, } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { teamApi } from '@/services/api';
import toast from 'react-hot-toast';
const TeamMembersPage = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const queryClient = useQueryClient();
    const { data: members = [], isLoading } = useQuery({
        queryKey: ['team', 'members'],
        queryFn: () => teamApi.getMembers(),
        select: (data) => data.data || [],
    });
    const form = useForm({
        defaultValues: {
            name: '',
            title: '',
            department: '',
            education: '',
            experience: '',
            expertise: '',
            photo_url: '',
            is_key_member: false,
        },
    });
    const createMutation = useMutation({
        mutationFn: teamApi.createMember,
        onSuccess: () => {
            toast.success('團隊成員新增成功！');
            setDialogOpen(false);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
        },
        onError: () => toast.error('新增失敗'),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => teamApi.updateMember(id, data),
        onSuccess: () => {
            toast.success('更新成功！');
            setDialogOpen(false);
            setEditingMember(null);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
        },
        onError: () => toast.error('更新失敗'),
    });
    const deleteMutation = useMutation({
        mutationFn: teamApi.deleteMember,
        onSuccess: () => {
            toast.success('刪除成功！');
            queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
        },
        onError: () => toast.error('刪除失敗'),
    });
    const handleAdd = () => {
        setEditingMember(null);
        form.reset();
        setDialogOpen(true);
    };
    const handleEdit = (member) => {
        setEditingMember(member);
        form.reset(member);
        setDialogOpen(true);
    };
    const handleSave = (data) => {
        if (editingMember) {
            updateMutation.mutate({ id: editingMember.id, data });
        }
        else {
            createMutation.mutate(data);
        }
    };
    const columns = [
        {
            field: 'name',
            headerName: '姓名',
            width: 150,
            renderCell: (params) => (_jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [_jsx(Avatar, { sx: { width: 32, height: 32 }, children: _jsx(Person, {}) }), params.value] })),
        },
        { field: 'title', headerName: '職位', width: 150 },
        { field: 'department', headerName: '部門', width: 120 },
        {
            field: 'is_key_member',
            headerName: '核心成員',
            width: 100,
            renderCell: (params) => (_jsx(IconButton, { size: "small", color: params.value ? 'primary' : 'default', children: params.value ? _jsx(Star, {}) : _jsx(StarBorder, {}) })),
        },
        { field: 'expertise', headerName: '專長', width: 200 },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 120,
            getActions: (params) => [
                _jsx(GridActionsCellItem, { icon: _jsx(Edit, {}), label: "\u7DE8\u8F2F", onClick: () => handleEdit(params.row) }),
                _jsx(GridActionsCellItem, { icon: _jsx(Delete, {}), label: "\u522A\u9664", onClick: () => deleteMutation.mutate(params.row.id) }),
            ],
        },
    ];
    return (_jsxs(Box, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "\u5718\u968A\u6210\u54E1\u7BA1\u7406" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7BA1\u7406\u60A8\u7684\u5718\u968A\u6210\u54E1\u8CC7\u8A0A\uFF0C\u7528\u65BC\u6A19\u66F8\u4E2D\u7684\u5718\u968A\u4ECB\u7D39" })] }), _jsx(Button, { variant: "contained", startIcon: _jsx(Add, {}), onClick: handleAdd, children: "\u65B0\u589E\u6210\u54E1" })] }), _jsx(Card, { children: _jsx(CardContent, { children: _jsx(DataGrid, { rows: members, columns: columns, loading: isLoading, pageSizeOptions: [10, 25, 50], initialState: {
                            pagination: { paginationModel: { pageSize: 10 } },
                        }, disableRowSelectionOnClick: true, autoHeight: true }) }) }), _jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: editingMember ? '編輯團隊成員' : '新增團隊成員' }), _jsx(DialogContent, { children: _jsxs(Grid, { container: true, spacing: 2, sx: { mt: 1 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u59D3\u540D", ...form.register('name'), required: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u8077\u4F4D", ...form.register('title'), required: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u90E8\u9580", ...form.register('department') }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u5B78\u6B77", ...form.register('education') }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u5DE5\u4F5C\u7D93\u9A57", multiline: true, rows: 3, ...form.register('experience') }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u5C08\u696D\u6280\u80FD", multiline: true, rows: 2, ...form.register('expertise') }) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setDialogOpen(false), children: "\u53D6\u6D88" }), _jsx(Button, { variant: "contained", onClick: form.handleSubmit(handleSave), disabled: createMutation.isPending || updateMutation.isPending, children: editingMember ? '更新' : '新增' })] })] })] }));
};
export default TeamMembersPage;
