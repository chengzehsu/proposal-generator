import axios from 'axios';
import { useAuthStore } from './auth';
// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
// Create axios instance
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});
// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor to handle errors
apiClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response?.status === 401) {
        // Token expired or invalid, logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
    }
    return Promise.reject(error);
});
// Auth API
export const authApi = {
    login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data;
    },
    register: async (userData) => {
        const response = await apiClient.post('/auth/register', userData);
        return response.data;
    },
    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    },
    refreshToken: async () => {
        const response = await apiClient.post('/auth/refresh');
        return response.data;
    },
};
// Company API
export const companyApi = {
    getBasicData: async () => {
        const response = await apiClient.get('/companies/basic');
        return response.data;
    },
    updateBasicData: async (data) => {
        const response = await apiClient.put('/companies/basic', data);
        return response.data;
    },
};
// Team Members API
export const teamApi = {
    getMembers: async (params) => {
        const response = await apiClient.get('/team-members', { params });
        return response.data;
    },
    createMember: async (data) => {
        const response = await apiClient.post('/team-members', data);
        return response.data;
    },
    updateMember: async (id, data) => {
        const response = await apiClient.put(`/team-members/${id}`, data);
        return response.data;
    },
    deleteMember: async (id) => {
        await apiClient.delete(`/team-members/${id}`);
    },
};
// Projects API
export const projectsApi = {
    getProjects: async (params) => {
        const response = await apiClient.get('/projects', { params });
        return response.data;
    },
    getProject: async (id) => {
        const response = await apiClient.get(`/projects/${id}`);
        return response.data;
    },
    createProject: async (data) => {
        const response = await apiClient.post('/projects', data);
        return response.data;
    },
    updateProject: async (id, data) => {
        const response = await apiClient.put(`/projects/${id}`, data);
        return response.data;
    },
    deleteProject: async (id) => {
        await apiClient.delete(`/projects/${id}`);
    },
};
// Awards API
export const awardsApi = {
    getAwards: async (params) => {
        const response = await apiClient.get('/awards', { params });
        return response.data;
    },
    createAward: async (data) => {
        const response = await apiClient.post('/awards', data);
        return response.data;
    },
    updateAward: async (id, data) => {
        const response = await apiClient.put(`/awards/${id}`, data);
        return response.data;
    },
    deleteAward: async (id) => {
        await apiClient.delete(`/awards/${id}`);
    },
};
// Templates API
export const templatesApi = {
    getTemplates: async (params) => {
        const response = await apiClient.get('/templates', { params });
        return response.data;
    },
    getTemplate: async (id) => {
        const response = await apiClient.get(`/templates/${id}`);
        return response.data;
    },
    createTemplate: async (data) => {
        const response = await apiClient.post('/templates', data);
        return response.data;
    },
    updateTemplate: async (id, data) => {
        const response = await apiClient.put(`/templates/${id}`, data);
        return response.data;
    },
    deleteTemplate: async (id) => {
        await apiClient.delete(`/templates/${id}`);
    },
};
// Proposals API
export const proposalsApi = {
    getProposals: async (params) => {
        const response = await apiClient.get('/proposals', { params });
        return response.data;
    },
    getProposal: async (id) => {
        const response = await apiClient.get(`/proposals/${id}`);
        return response.data;
    },
    createProposal: async (data) => {
        const response = await apiClient.post('/proposals', data);
        return response.data;
    },
    updateProposal: async (id, data) => {
        const response = await apiClient.put(`/proposals/${id}`, data);
        return response.data;
    },
    updateProposalContent: async (id, data) => {
        const response = await apiClient.put(`/proposals/${id}/content`, data);
        return response.data;
    },
    getProposalVersions: async (id) => {
        const response = await apiClient.get(`/proposals/${id}/versions`);
        return response.data;
    },
    deleteProposal: async (id) => {
        await apiClient.delete(`/proposals/${id}`);
    },
};
// AI API
export const aiApi = {
    generateContent: async (data) => {
        const response = await apiClient.post('/ai/generate', data);
        return response.data;
    },
    improveContent: async (data) => {
        const response = await apiClient.post('/ai/improve', data);
        return response.data;
    },
    translateContent: async (data) => {
        const response = await apiClient.post('/ai/translate', data);
        return response.data;
    },
    extractRequirements: async (data) => {
        const response = await apiClient.post('/ai/extract-requirements', data);
        return response.data;
    },
    getUsage: async () => {
        const response = await apiClient.get('/ai/usage');
        return response.data;
    },
};
// Export API
export const exportApi = {
    exportProposal: async (data) => {
        const response = await apiClient.post('/exports/proposal', data);
        return response.data;
    },
    exportTemplate: async (data) => {
        const response = await apiClient.post('/exports/template', data);
        return response.data;
    },
    batchExport: async (data) => {
        const response = await apiClient.post('/exports/batch', data);
        return response.data;
    },
    getExportHistory: async (params) => {
        const response = await apiClient.get('/exports/history', { params });
        return response.data;
    },
    deleteExport: async (exportId) => {
        await apiClient.delete(`/exports/${exportId}`);
    },
};
export default apiClient;
