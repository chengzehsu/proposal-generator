import axios from 'axios';
import { useAuthStore } from './auth';

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout user
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<{
      user: any;
      token: string;
      refreshToken: string;
    }>>('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    name: string;
    company: {
      company_name: string;
      tax_id: string;
      address: string;
      phone: string;
      email: string;
    };
  }) => {
    const response = await apiClient.post<ApiResponse<{
      user: any;
      token: string;
      refreshToken: string;
    }>>('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refreshToken: async () => {
    const response = await apiClient.post<ApiResponse<{
      token: string;
    }>>('/auth/refresh');
    return response.data;
  },
};

// Company API
export const companyApi = {
  getBasicData: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/companies/basic');
    return response.data;
  },

  updateBasicData: async (data: any) => {
    const response = await apiClient.put<ApiResponse<any>>('/companies/basic', data);
    return response.data;
  },
};

// Team Members API
export const teamApi = {
  getMembers: async (params?: { is_key_member?: boolean; page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/team-members', { params });
    return response.data;
  },

  createMember: async (data: any) => {
    const response = await apiClient.post<ApiResponse<any>>('/team-members', data);
    return response.data;
  },

  updateMember: async (id: string, data: any) => {
    const response = await apiClient.put<ApiResponse<any>>(`/team-members/${id}`, data);
    return response.data;
  },

  deleteMember: async (id: string) => {
    await apiClient.delete(`/team-members/${id}`);
  },
};

// Projects API
export const projectsApi = {
  getProjects: async (params?: {
    tags?: string[];
    start_date_from?: string;
    start_date_to?: string;
    is_public?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/projects', { params });
    return response.data;
  },

  getProject: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/projects/${id}`);
    return response.data;
  },

  createProject: async (data: any) => {
    const response = await apiClient.post<ApiResponse<any>>('/projects', data);
    return response.data;
  },

  updateProject: async (id: string, data: any) => {
    const response = await apiClient.put<ApiResponse<any>>(`/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id: string) => {
    await apiClient.delete(`/projects/${id}`);
  },
};

// Awards API
export const awardsApi = {
  getAwards: async (params?: {
    award_level?: string;
    year?: number;
    is_public?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/awards', { params });
    return response.data;
  },

  createAward: async (data: any) => {
    const response = await apiClient.post<ApiResponse<any>>('/awards', data);
    return response.data;
  },

  updateAward: async (id: string, data: any) => {
    const response = await apiClient.put<ApiResponse<any>>(`/awards/${id}`, data);
    return response.data;
  },

  deleteAward: async (id: string) => {
    await apiClient.delete(`/awards/${id}`);
  },
};

// Templates API
export const templatesApi = {
  getTemplates: async (params?: {
    category?: string;
    is_public?: boolean;
    is_default?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/templates', { params });
    return response.data;
  },

  getTemplate: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data: any) => {
    const response = await apiClient.post<ApiResponse<any>>('/templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: any) => {
    const response = await apiClient.put<ApiResponse<any>>(`/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string) => {
    await apiClient.delete(`/templates/${id}`);
  },
};

// Proposals API
export const proposalsApi = {
  getProposals: async (params?: {
    status?: string;
    client_name?: string;
    tags?: string[];
    deadline_from?: string;
    deadline_to?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/proposals', { params });
    return response.data;
  },

  getProposal: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/proposals/${id}`);
    return response.data;
  },

  createProposal: async (data: any) => {
    const response = await apiClient.post<ApiResponse<any>>('/proposals', data);
    return response.data;
  },

  updateProposal: async (id: string, data: any) => {
    const response = await apiClient.put<ApiResponse<any>>(`/proposals/${id}`, data);
    return response.data;
  },

  updateProposalContent: async (id: string, data: { content: Record<string, any>; version: number }) => {
    const response = await apiClient.put<ApiResponse<any>>(`/proposals/${id}/content`, data);
    return response.data;
  },

  getProposalVersions: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/proposals/${id}/versions`);
    return response.data;
  },

  deleteProposal: async (id: string) => {
    await apiClient.delete(`/proposals/${id}`);
  },

  // Status management
  updateProposalStatus: async (id: string, data: { status: string; note?: string }) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/proposals/${id}/status`, data);
    return response.data;
  },

  getProposalStatusHistory: async (id: string) => {
    const response = await apiClient.get<ApiResponse<{
      proposal_id: string;
      current_status: string;
      history: Array<{
        id: string;
        from_status: string | null;
        to_status: string;
        changed_at: string;
        changed_by: string;
        note?: string;
      }>;
    }>>(`/proposals/${id}/status-history`);
    return response.data;
  },
};

// AI API
export const aiApi = {
  generateContent: async (data: {
    prompt: string;
    context?: Record<string, any>;
    max_tokens?: number;
    temperature?: number;
    section_type?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<{
      content: string;
      metadata: any;
    }>>('/ai/generate', data);
    return response.data;
  },

  improveContent: async (data: {
    content: string;
    improvement_type: string;
    specific_requirements?: string;
    target_length?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<{
      original_content: string;
      improved_content: string;
      improvement_type: string;
      metadata: any;
    }>>('/ai/improve', data);
    return response.data;
  },

  translateContent: async (data: {
    content: string;
    target_language: string;
    context?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<{
      original_content: string;
      translated_content: string;
      source_language: string;
      target_language: string;
      metadata: any;
    }>>('/ai/translate', data);
    return response.data;
  },

  extractRequirements: async (data: {
    rfp_content: string;
    extract_sections: string[];
  }) => {
    const response = await apiClient.post<ApiResponse<{
      extracted_requirements: string;
      sections_extracted: string[];
      metadata: any;
    }>>('/ai/extract-requirements', data);
    return response.data;
  },

  getUsage: async () => {
    const response = await apiClient.get<ApiResponse<any>>('/ai/usage');
    return response.data;
  },
};

// Export API
export const exportApi = {
  exportProposal: async (data: {
    proposal_id: string;
    format: 'pdf' | 'docx' | 'odt';
    options?: any;
  }) => {
    const response = await apiClient.post<ApiResponse<{
      download_url: string;
      filename: string;
      format: string;
      file_size: number;
      expires_at: string;
      metadata: any;
    }>>('/exports/proposal', data);
    return response.data;
  },

  exportTemplate: async (data: {
    template_id: string;
    format: 'pdf' | 'docx' | 'odt';
    include_sample_content?: boolean;
  }) => {
    const response = await apiClient.post<ApiResponse<any>>('/exports/template', data);
    return response.data;
  },

  batchExport: async (data: {
    proposal_ids: string[];
    format: 'pdf' | 'docx' | 'odt';
    merge_into_single?: boolean;
  }) => {
    const response = await apiClient.post<ApiResponse<any>>('/exports/batch', data);
    return response.data;
  },

  getExportHistory: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/exports/history', { params });
    return response.data;
  },

  deleteExport: async (exportId: string) => {
    await apiClient.delete(`/exports/${exportId}`);
  },
};

export default apiClient;