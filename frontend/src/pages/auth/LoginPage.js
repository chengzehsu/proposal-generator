import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Container, Tabs, Tab, Grid, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/services/auth';
// Validation schemas
const loginSchema = z.object({
    email: z.string().email('請輸入有效的電子信箱'),
    password: z.string().min(8, '密碼至少需要8個字元'),
});
const registerSchema = z.object({
    email: z.string().email('請輸入有效的電子信箱'),
    password: z.string()
        .min(8, '密碼至少需要8個字元')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, '密碼必須包含大小寫字母、數字和特殊符號'),
    name: z.string().min(1, '請輸入姓名').max(100, '姓名長度不能超過100字元'),
    company_name: z.string().min(1, '請輸入公司名稱').max(200, '公司名稱長度不能超過200字元'),
    tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為8位數字'),
    address: z.string().min(1, '請輸入公司地址'),
    phone: z.string().min(1, '請輸入聯絡電話'),
    company_email: z.string().email('請輸入有效的公司電子信箱'),
});
const LoginPage = () => {
    const [tab, setTab] = useState(0);
    const { login, register, isLoading } = useAuthStore();
    const loginForm = useForm({
        resolver: zodResolver(loginSchema),
    });
    const registerForm = useForm({
        resolver: zodResolver(registerSchema),
    });
    const handleLogin = async (data) => {
        try {
            await login(data.email, data.password);
        }
        catch (error) {
            console.error('Login error:', error);
        }
    };
    const handleRegister = async (data) => {
        try {
            const userData = {
                email: data.email,
                password: data.password,
                name: data.name,
                company: {
                    company_name: data.company_name,
                    tax_id: data.tax_id,
                    address: data.address,
                    phone: data.phone,
                    email: data.company_email,
                },
            };
            await register(userData);
        }
        catch (error) {
            console.error('Register error:', error);
        }
    };
    return (_jsx(Container, { maxWidth: "md", children: _jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", py: 4, children: _jsx(Card, { sx: { width: '100%', maxWidth: 600 }, children: _jsxs(CardContent, { sx: { p: 4 }, children: [_jsx(Typography, { variant: "h4", align: "center", gutterBottom: true, children: "\u667A\u80FD\u6A19\u66F8\u7522\u751F\u5668" }), _jsx(Typography, { variant: "body2", align: "center", sx: { mb: 3, color: 'text.secondary' }, children: "AI\u9A45\u52D5\u7684\u667A\u80FD\u6A19\u6848\u63D0\u6848\u751F\u6210\u7CFB\u7D71" }), _jsxs(Tabs, { value: tab, onChange: (_, newValue) => setTab(newValue), centered: true, sx: { mb: 3 }, children: [_jsx(Tab, { label: "\u767B\u5165" }), _jsx(Tab, { label: "\u8A3B\u518A" })] }), tab === 0 && (_jsxs(Box, { component: "form", onSubmit: loginForm.handleSubmit(handleLogin), children: [_jsx(TextField, { fullWidth: true, label: "\u96FB\u5B50\u4FE1\u7BB1", type: "email", margin: "normal", ...loginForm.register('email'), error: !!loginForm.formState.errors.email, helperText: loginForm.formState.errors.email?.message }), _jsx(TextField, { fullWidth: true, label: "\u5BC6\u78BC", type: "password", margin: "normal", ...loginForm.register('password'), error: !!loginForm.formState.errors.password, helperText: loginForm.formState.errors.password?.message }), _jsx(Button, { type: "submit", fullWidth: true, variant: "contained", sx: { mt: 3, mb: 2 }, disabled: isLoading, children: isLoading ? '登入中...' : '登入' })] })), tab === 1 && (_jsxs(Box, { component: "form", onSubmit: registerForm.handleSubmit(handleRegister), children: [_jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "\u8A3B\u518A\u65B0\u5E33\u6236\u6703\u540C\u6642\u5EFA\u7ACB\u60A8\u7684\u516C\u53F8\u8CC7\u6599" }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u500B\u4EBA\u8CC7\u8A0A" }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u59D3\u540D", ...registerForm.register('name'), error: !!registerForm.formState.errors.name, helperText: registerForm.formState.errors.name?.message }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u96FB\u5B50\u4FE1\u7BB1", type: "email", ...registerForm.register('email'), error: !!registerForm.formState.errors.email, helperText: registerForm.formState.errors.email?.message }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u5BC6\u78BC", type: "password", ...registerForm.register('password'), error: !!registerForm.formState.errors.password, helperText: registerForm.formState.errors.password?.message }) }), _jsx(Grid, { item: true, xs: 12, sx: { mt: 2 }, children: _jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u516C\u53F8\u8CC7\u8A0A" }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u516C\u53F8\u540D\u7A31", ...registerForm.register('company_name'), error: !!registerForm.formState.errors.company_name, helperText: registerForm.formState.errors.company_name?.message }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u7D71\u4E00\u7DE8\u865F", ...registerForm.register('tax_id'), error: !!registerForm.formState.errors.tax_id, helperText: registerForm.formState.errors.tax_id?.message }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u516C\u53F8\u5730\u5740", ...registerForm.register('address'), error: !!registerForm.formState.errors.address, helperText: registerForm.formState.errors.address?.message }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u806F\u7D61\u96FB\u8A71", ...registerForm.register('phone'), error: !!registerForm.formState.errors.phone, helperText: registerForm.formState.errors.phone?.message }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u516C\u53F8\u96FB\u5B50\u4FE1\u7BB1", type: "email", ...registerForm.register('company_email'), error: !!registerForm.formState.errors.company_email, helperText: registerForm.formState.errors.company_email?.message }) })] }), _jsx(Button, { type: "submit", fullWidth: true, variant: "contained", sx: { mt: 3, mb: 2 }, disabled: isLoading, children: isLoading ? '註冊中...' : '建立帳戶' })] }))] }) }) }) }));
};
export default LoginPage;
