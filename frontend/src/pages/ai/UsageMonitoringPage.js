import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, LinearProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, List, ListItem, ListItemText, ListItemIcon, } from '@mui/material';
import { TrendingUp, TrendingDown, CheckCircle, AutoAwesome, Translate, FindInPage, Timeline, Speed, MonetizationOn, DataUsage, } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { aiApi } from '@/services/api';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, ...other, children: value === index && _jsx(Box, { children: children }) }));
}
const UsageMonitoringPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState(null);
    // 獲取 AI 使用統計
    const { data: usageData, isLoading } = useQuery({
        queryKey: ['ai', 'usage'],
        queryFn: () => aiApi.getUsage(),
        select: (data) => data.data,
        refetchInterval: 30000, // 每30秒更新一次
    });
    // 模擬數據（實際應用中從 API 獲取）
    const mockUsageData = {
        current_period: {
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            total_requests: 1250,
            total_tokens: 45230,
            total_cost: 12.45,
            success_rate: 98.2,
        },
        limits: {
            monthly_requests: 2000,
            monthly_tokens: 100000,
            monthly_cost_limit: 50.0,
        },
        services: {
            content_generation: {
                requests: 680,
                tokens: 25400,
                cost: 7.62,
                avg_response_time: 2.3,
                success_rate: 99.1,
            },
            content_improvement: {
                requests: 320,
                tokens: 12800,
                cost: 3.84,
                avg_response_time: 2.1,
                success_rate: 97.8,
            },
            translation: {
                requests: 180,
                tokens: 5200,
                cost: 0.78,
                avg_response_time: 1.8,
                success_rate: 98.9,
            },
            requirement_extraction: {
                requests: 70,
                tokens: 1830,
                cost: 0.21,
                avg_response_time: 3.2,
                success_rate: 96.4,
            },
        },
        daily_usage: [
            { date: '2024-01-25', requests: 45, tokens: 1680, cost: 0.42 },
            { date: '2024-01-26', requests: 52, tokens: 1920, cost: 0.48 },
            { date: '2024-01-27', requests: 38, tokens: 1420, cost: 0.35 },
            { date: '2024-01-28', requests: 61, tokens: 2280, cost: 0.57 },
            { date: '2024-01-29', requests: 48, tokens: 1760, cost: 0.44 },
            { date: '2024-01-30', requests: 55, tokens: 2040, cost: 0.51 },
            { date: '2024-01-31', requests: 43, tokens: 1590, cost: 0.39 },
        ],
        recommendations: [
            {
                type: 'optimization',
                title: '優化建議',
                message: '您的內容生成請求較多，建議使用更精確的提示詞以提高效率',
                severity: 'info',
            },
            {
                type: 'limit_warning',
                title: '使用量提醒',
                message: '本月已使用 62.5% 的 Token 額度，請注意使用量',
                severity: 'warning',
            },
        ],
    };
    const data = usageData || mockUsageData;
    const getUsagePercentage = (used, limit) => {
        return Math.min((used / limit) * 100, 100);
    };
    const getProgressColor = (percentage) => {
        if (percentage < 50)
            return 'success';
        if (percentage < 80)
            return 'warning';
        return 'error';
    };
    const handleShowDetail = (metric) => {
        setSelectedMetric(metric);
        setDetailDialogOpen(true);
    };
    const serviceIcons = {
        content_generation: _jsx(AutoAwesome, {}),
        content_improvement: _jsx(TrendingUp, {}),
        translation: _jsx(Translate, {}),
        requirement_extraction: _jsx(FindInPage, {}),
    };
    const serviceNames = {
        content_generation: '內容生成',
        content_improvement: '內容優化',
        translation: '翻譯服務',
        requirement_extraction: '需求萃取',
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { mb: 3, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "AI \u4F7F\u7528\u76E3\u63A7" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u76E3\u63A7 AI \u670D\u52D9\u4F7F\u7528\u91CF\u3001\u6210\u672C\u548C\u6548\u80FD\u6307\u6A19" })] }), _jsxs(Grid, { container: true, spacing: 3, mb: 3, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", alignItems: "center", mb: 1, children: [_jsx(DataUsage, { color: "primary", sx: { mr: 1 } }), _jsx(Typography, { variant: "subtitle2", children: "API \u8ACB\u6C42" })] }), _jsx(Typography, { variant: "h5", gutterBottom: true, children: data.current_period.total_requests.toLocaleString() }), _jsx(LinearProgress, { variant: "determinate", value: getUsagePercentage(data.current_period.total_requests, data.limits.monthly_requests), color: getProgressColor(getUsagePercentage(data.current_period.total_requests, data.limits.monthly_requests)), sx: { mb: 1 } }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [data.limits.monthly_requests.toLocaleString(), " \u9650\u984D"] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", alignItems: "center", mb: 1, children: [_jsx(Speed, { color: "secondary", sx: { mr: 1 } }), _jsx(Typography, { variant: "subtitle2", children: "Token \u4F7F\u7528" })] }), _jsx(Typography, { variant: "h5", gutterBottom: true, children: data.current_period.total_tokens.toLocaleString() }), _jsx(LinearProgress, { variant: "determinate", value: getUsagePercentage(data.current_period.total_tokens, data.limits.monthly_tokens), color: getProgressColor(getUsagePercentage(data.current_period.total_tokens, data.limits.monthly_tokens)), sx: { mb: 1 } }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [data.limits.monthly_tokens.toLocaleString(), " \u9650\u984D"] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", alignItems: "center", mb: 1, children: [_jsx(MonetizationOn, { color: "success", sx: { mr: 1 } }), _jsx(Typography, { variant: "subtitle2", children: "\u4F7F\u7528\u6210\u672C" })] }), _jsxs(Typography, { variant: "h5", gutterBottom: true, children: ["$", data.current_period.total_cost.toFixed(2)] }), _jsx(LinearProgress, { variant: "determinate", value: getUsagePercentage(data.current_period.total_cost, data.limits.monthly_cost_limit), color: getProgressColor(getUsagePercentage(data.current_period.total_cost, data.limits.monthly_cost_limit)), sx: { mb: 1 } }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["$", data.limits.monthly_cost_limit.toFixed(2), " \u9810\u7B97"] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", alignItems: "center", mb: 1, children: [_jsx(CheckCircle, { color: "info", sx: { mr: 1 } }), _jsx(Typography, { variant: "subtitle2", children: "\u6210\u529F\u7387" })] }), _jsxs(Typography, { variant: "h5", gutterBottom: true, children: [data.current_period.success_rate, "%"] }), _jsxs(Box, { display: "flex", alignItems: "center", children: [data.current_period.success_rate >= 95 ? (_jsx(TrendingUp, { color: "success" })) : (_jsx(TrendingDown, { color: "error" })), _jsx(Typography, { variant: "caption", color: "text.secondary", sx: { ml: 1 }, children: "\u54C1\u8CEA\u6307\u6A19" })] })] }) }) })] }), data.recommendations && data.recommendations.length > 0 && (_jsx(Box, { mb: 3, children: data.recommendations.map((recommendation, index) => (_jsxs(Alert, { severity: recommendation.severity, sx: { mb: 1 }, action: _jsx(Button, { color: "inherit", size: "small", children: "\u4E86\u89E3\u66F4\u591A" }), children: [_jsx(Typography, { variant: "subtitle2", children: recommendation.title }), recommendation.message] }, index))) })), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Box, { sx: { borderBottom: 1, borderColor: 'divider', mb: 3 }, children: _jsxs(Tabs, { value: tabValue, onChange: (e, newValue) => setTabValue(newValue), children: [_jsx(Tab, { label: "\u670D\u52D9\u4F7F\u7528\u7D71\u8A08" }), _jsx(Tab, { label: "\u6BCF\u65E5\u4F7F\u7528\u8DA8\u52E2" }), _jsx(Tab, { label: "\u6548\u80FD\u5206\u6790" })] }) }), _jsxs(TabPanel, { value: tabValue, index: 0, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "AI \u670D\u52D9\u4F7F\u7528\u7D71\u8A08" }), _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u670D\u52D9" }), _jsx(TableCell, { align: "right", children: "\u8ACB\u6C42\u6B21\u6578" }), _jsx(TableCell, { align: "right", children: "Token \u4F7F\u7528" }), _jsx(TableCell, { align: "right", children: "\u6210\u672C" }), _jsx(TableCell, { align: "right", children: "\u6210\u529F\u7387" }), _jsx(TableCell, { align: "right", children: "\u64CD\u4F5C" })] }) }), _jsx(TableBody, { children: Object.entries(data.services).map(([key, service]) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsxs(Box, { display: "flex", alignItems: "center", children: [serviceIcons[key], _jsx(Typography, { sx: { ml: 1 }, children: serviceNames[key] })] }) }), _jsx(TableCell, { align: "right", children: service.requests.toLocaleString() }), _jsx(TableCell, { align: "right", children: service.tokens.toLocaleString() }), _jsxs(TableCell, { align: "right", children: ["$", service.cost.toFixed(2)] }), _jsx(TableCell, { align: "right", children: _jsx(Chip, { label: `${service.success_rate}%`, color: service.success_rate >= 95 ? 'success' : 'warning', size: "small" }) }), _jsx(TableCell, { align: "right", children: _jsx(Button, { size: "small", onClick: () => handleShowDetail(service), children: "\u8A73\u7D30" }) })] }, key))) })] }) })] }), _jsxs(TabPanel, { value: tabValue, index: 1, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u8FD1\u4E03\u65E5\u4F7F\u7528\u8DA8\u52E2" }), _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u65E5\u671F" }), _jsx(TableCell, { align: "right", children: "\u8ACB\u6C42\u6B21\u6578" }), _jsx(TableCell, { align: "right", children: "Token \u4F7F\u7528" }), _jsx(TableCell, { align: "right", children: "\u6210\u672C" })] }) }), _jsx(TableBody, { children: data.daily_usage.map((day) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: new Date(day.date).toLocaleDateString('zh-TW') }), _jsx(TableCell, { align: "right", children: day.requests }), _jsx(TableCell, { align: "right", children: day.tokens.toLocaleString() }), _jsxs(TableCell, { align: "right", children: ["$", day.cost.toFixed(2)] })] }, day.date))) })] }) })] }), _jsxs(TabPanel, { value: tabValue, index: 2, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u6548\u80FD\u5206\u6790" }), _jsx(Grid, { container: true, spacing: 3, children: Object.entries(data.services).map(([key, service]) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { variant: "outlined", children: _jsxs(CardContent, { children: [_jsxs(Box, { display: "flex", alignItems: "center", mb: 2, children: [serviceIcons[key], _jsx(Typography, { variant: "subtitle2", sx: { ml: 1 }, children: serviceNames[key] })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5E73\u5747\u56DE\u61C9\u6642\u9593" }), _jsxs(Typography, { variant: "h6", gutterBottom: true, children: [service.avg_response_time, "s"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6210\u529F\u7387" }), _jsxs(Typography, { variant: "h6", children: [service.success_rate, "%"] })] }) }) }, key))) })] })] }) }), _jsxs(Dialog, { open: detailDialogOpen, onClose: () => setDetailDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u670D\u52D9\u8A73\u7D30\u8CC7\u8A0A" }), _jsx(DialogContent, { children: selectedMetric && (_jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u4F7F\u7528\u7D71\u8A08" }), _jsxs(List, { dense: true, children: [_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(DataUsage, {}) }), _jsx(ListItemText, { primary: "\u8ACB\u6C42\u6B21\u6578", secondary: selectedMetric.requests?.toLocaleString() || 'N/A' })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(Speed, {}) }), _jsx(ListItemText, { primary: "Token \u4F7F\u7528", secondary: selectedMetric.tokens?.toLocaleString() || 'N/A' })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(MonetizationOn, {}) }), _jsx(ListItemText, { primary: "\u6210\u672C", secondary: `$${selectedMetric.cost?.toFixed(2) || '0.00'}` })] })] })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u6548\u80FD\u6307\u6A19" }), _jsxs(List, { dense: true, children: [_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(Timeline, {}) }), _jsx(ListItemText, { primary: "\u5E73\u5747\u56DE\u61C9\u6642\u9593", secondary: `${selectedMetric.avg_response_time || 'N/A'}s` })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(CheckCircle, {}) }), _jsx(ListItemText, { primary: "\u6210\u529F\u7387", secondary: `${selectedMetric.success_rate || 'N/A'}%` })] })] })] })] })) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setDetailDialogOpen(false), children: "\u95DC\u9589" }) })] })] }));
};
export default UsageMonitoringPage;
