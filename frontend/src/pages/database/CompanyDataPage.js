import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Chip, Alert, CircularProgress, Divider, } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Business, Edit } from '@mui/icons-material';
import { companyApi } from '@/services/api';
import toast from 'react-hot-toast';
// Validation schema
const companySchema = z.object({
    company_name: z.string().min(1, '請輸入公司名稱').max(200, '公司名稱長度不能超過200字元'),
    tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字'),
    address: z.string().min(1, '請輸入公司地址'),
    phone: z.string().min(1, '請輸入聯絡電話'),
    email: z.string().email('請輸入有效的公司電子信箱'),
    capital: z.string().optional(),
    established_date: z.string().optional(),
    website: z.string().url('請輸入有效的網站URL').optional().or(z.literal('')),
});
const CompanyDataPage = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentVersion, setCurrentVersion] = useState(1);
    const queryClient = useQueryClient();
    // Fetch company data
    const { data: companyData, isLoading, error } = useQuery({
        queryKey: ['company', 'basic'],
        queryFn: companyApi.getBasicData,
        retry: 1,
    });
    // Form setup
    const form = useForm({
        resolver: zodResolver(companySchema),
        defaultValues: {
            company_name: '',
            tax_id: '',
            address: '',
            phone: '',
            email: '',
            capital: '',
            established_date: '',
            website: '',
        },
    });
    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data) => companyApi.updateBasicData(data),
        onSuccess: () => {
            toast.success('公司資料更新成功！');
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ['company', 'basic'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || '更新失敗，請稍後再試';
            toast.error(message);
            if (error.response?.status === 409) {
                // Version conflict, refetch data
                queryClient.invalidateQueries({ queryKey: ['company', 'basic'] });
            }
        },
    });
    // Populate form when data is loaded
    useEffect(() => {
        if (companyData?.data) {
            const company = companyData.data;
            form.reset({
                company_name: company.company_name || '',
                tax_id: company.tax_id || '',
                address: company.address || '',
                phone: company.phone || '',
                email: company.email || '',
                capital: company.capital?.toString() || '',
                established_date: company.established_date || '',
                website: company.website || '',
            });
            setCurrentVersion(company.version || 1);
        }
    }, [companyData, form]);
    const handleSave = async (data) => {
        const updateData = {
            ...data,
            capital: data.capital ? parseFloat(data.capital) : undefined,
            version: currentVersion,
        };
        updateMutation.mutate(updateData);
    };
    const handleCancel = () => {
        if (companyData?.data) {
            const company = companyData.data;
            form.reset({
                company_name: company.company_name || '',
                tax_id: company.tax_id || '',
                address: company.address || '',
                phone: company.phone || '',
                email: company.email || '',
                capital: company.capital?.toString() || '',
                established_date: company.established_date || '',
                website: company.website || '',
            });
        }
        setIsEditing(false);
    };
    if (isLoading) {
        return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsx(Alert, { severity: "error", children: "\u8F09\u5165\u516C\u53F8\u8CC7\u6599\u5931\u6557\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762" }));
    }
    return (_jsxs(Box, { children: [_jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "\u516C\u53F8\u8CC7\u6599\u7BA1\u7406" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7BA1\u7406\u60A8\u7684\u516C\u53F8\u57FA\u672C\u8CC7\u8A0A\uFF0C\u9019\u4E9B\u8CC7\u6599\u5C07\u7528\u65BC\u751F\u6210\u6A19\u66F8\u5167\u5BB9" })] }), _jsxs(Box, { display: "flex", gap: 2, children: [companyData?.data && (_jsx(Chip, { icon: _jsx(Business, {}), label: `版本 ${currentVersion}`, color: "primary", variant: "outlined" })), !isEditing ? (_jsx(Button, { variant: "contained", startIcon: _jsx(Edit, {}), onClick: () => setIsEditing(true), children: "\u7DE8\u8F2F\u8CC7\u6599" })) : (_jsxs(Box, { display: "flex", gap: 1, children: [_jsx(Button, { variant: "outlined", onClick: handleCancel, disabled: updateMutation.isPending, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "contained", startIcon: _jsx(Save, {}), onClick: form.handleSubmit(handleSave), disabled: updateMutation.isPending, children: updateMutation.isPending ? '儲存中...' : '儲存' })] }))] })] }), _jsx(Card, { children: _jsx(CardContent, { sx: { p: 4 }, children: _jsx(Box, { component: "form", onSubmit: form.handleSubmit(handleSave), children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u57FA\u672C\u8CC7\u8A0A" }), _jsx(Divider, { sx: { mb: 3 } })] }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u516C\u53F8\u540D\u7A31", ...form.register('company_name'), error: !!form.formState.errors.company_name, helperText: form.formState.errors.company_name?.message, disabled: !isEditing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u7D71\u4E00\u7DE8\u865F", ...form.register('tax_id'), error: !!form.formState.errors.tax_id, helperText: form.formState.errors.tax_id?.message, disabled: !isEditing }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u516C\u53F8\u5730\u5740", ...form.register('address'), error: !!form.formState.errors.address, helperText: form.formState.errors.address?.message, disabled: !isEditing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u806F\u7D61\u96FB\u8A71", ...form.register('phone'), error: !!form.formState.errors.phone, helperText: form.formState.errors.phone?.message, disabled: !isEditing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u516C\u53F8\u96FB\u5B50\u4FE1\u7BB1", type: "email", ...form.register('email'), error: !!form.formState.errors.email, helperText: form.formState.errors.email?.message, disabled: !isEditing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u8CC7\u672C\u984D (\u842C\u5143)", type: "number", ...form.register('capital'), error: !!form.formState.errors.capital, helperText: form.formState.errors.capital?.message, disabled: !isEditing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u6210\u7ACB\u65E5\u671F", type: "date", InputLabelProps: { shrink: true }, ...form.register('established_date'), error: !!form.formState.errors.established_date, helperText: form.formState.errors.established_date?.message, disabled: !isEditing }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u516C\u53F8\u7DB2\u7AD9", placeholder: "https://www.example.com", ...form.register('website'), error: !!form.formState.errors.website, helperText: form.formState.errors.website?.message, disabled: !isEditing }) })] }) }) }) }), companyData?.data && (_jsx(Card, { sx: { mt: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u7CFB\u7D71\u8CC7\u8A0A" }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u5EFA\u7ACB\u6642\u9593\uFF1A", new Date(companyData.data.created_at).toLocaleString('zh-TW')] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u6700\u5F8C\u66F4\u65B0\uFF1A", new Date(companyData.data.updated_at).toLocaleString('zh-TW')] }) })] })] }) }))] }));
};
export default CompanyDataPage;
