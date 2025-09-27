import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, Card, CardContent, Button, Chip, Grid, } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete, Public, Lock } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/services/api';
import toast from 'react-hot-toast';
const ProjectsPage = () => {
    const queryClient = useQueryClient();
    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects', 'list'],
        queryFn: () => projectsApi.getProjects(),
        select: (data) => data.data || [],
    });
    const deleteMutation = useMutation({
        mutationFn: projectsApi.deleteProject,
        onSuccess: () => {
            toast.success('專案刪除成功！');
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
        onError: () => toast.error('刪除失敗'),
    });
    const columns = [
        {
            field: 'project_name',
            headerName: '專案名稱',
            width: 200,
            renderCell: (params) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", fontWeight: "medium", children: params.value }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: params.row.client_name })] })),
        },
        {
            field: 'amount',
            headerName: '專案金額',
            width: 120,
            renderCell: (params) => (params.value ? `NT$ ${Number(params.value).toLocaleString()}` : '-'),
        },
        {
            field: 'start_date',
            headerName: '開始日期',
            width: 120,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'end_date',
            headerName: '結束日期',
            width: 120,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'is_public',
            headerName: '公開狀態',
            width: 100,
            renderCell: (params) => (_jsx(Chip, { icon: params.value ? _jsx(Public, {}) : _jsx(Lock, {}), label: params.value ? '公開' : '私人', color: params.value ? 'success' : 'default', size: "small" })),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 120,
            getActions: (params) => [
                _jsx(GridActionsCellItem, { icon: _jsx(Edit, {}), label: "\u7DE8\u8F2F", onClick: () => console.log('編輯專案', params.row.id) }),
                _jsx(GridActionsCellItem, { icon: _jsx(Delete, {}), label: "\u522A\u9664", onClick: () => deleteMutation.mutate(params.row.id) }),
            ],
        },
    ];
    return (_jsxs(Box, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "\u5C08\u6848\u5BE6\u7E3E\u7BA1\u7406" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7BA1\u7406\u60A8\u7684\u5C08\u6848\u5BE6\u7E3E\uFF0C\u7528\u65BC\u6A19\u66F8\u4E2D\u5C55\u793A\u516C\u53F8\u80FD\u529B" })] }), _jsx(Button, { variant: "contained", startIcon: _jsx(Add, {}), children: "\u65B0\u589E\u5C08\u6848" })] }), _jsxs(Grid, { container: true, spacing: 3, mb: 3, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", color: "primary", children: projects.length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7E3D\u5C08\u6848\u6578" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", color: "success.main", children: projects.filter((p) => p.is_public).length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u516C\u958B\u5C08\u6848" })] }) }) })] }), _jsx(Card, { children: _jsx(CardContent, { children: _jsx(DataGrid, { rows: projects, columns: columns, loading: isLoading, pageSizeOptions: [10, 25, 50], initialState: {
                            pagination: { paginationModel: { pageSize: 10 } },
                        }, disableRowSelectionOnClick: true, autoHeight: true }) }) })] }));
};
export default ProjectsPage;
