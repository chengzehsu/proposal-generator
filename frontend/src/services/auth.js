import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from './api';
import toast from 'react-hot-toast';
export const useAuthStore = create()(persist((set, get) => ({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    login: async (email, password) => {
        try {
            set({ isLoading: true });
            const response = await authApi.login(email, password);
            set({
                user: response.data.user,
                token: response.data.token,
                refreshToken: response.data.refreshToken,
                isAuthenticated: true,
                isLoading: false,
            });
            toast.success('登入成功！');
        }
        catch (error) {
            set({ isLoading: false });
            const message = error.response?.data?.message || '登入失敗，請檢查帳號密碼';
            toast.error(message);
            throw error;
        }
    },
    register: async (userData) => {
        try {
            set({ isLoading: true });
            const response = await authApi.register(userData);
            set({
                user: response.data.user,
                token: response.data.token,
                refreshToken: response.data.refreshToken,
                isAuthenticated: true,
                isLoading: false,
            });
            toast.success('註冊成功！歡迎使用智能標書產生器');
        }
        catch (error) {
            set({ isLoading: false });
            const message = error.response?.data?.message || '註冊失敗，請稍後再試';
            toast.error(message);
            throw error;
        }
    },
    logout: async () => {
        try {
            await authApi.logout();
        }
        catch (error) {
            // Ignore logout errors
            console.warn('Logout error:', error);
        }
        finally {
            set({
                user: null,
                token: null,
                refreshToken: null,
                isAuthenticated: false,
            });
            toast.success('已成功登出');
        }
    },
    checkAuth: () => {
        const { token } = get();
        if (token) {
            // TODO: Optionally validate token with backend
            set({ isAuthenticated: true });
        }
        else {
            set({ isAuthenticated: false });
        }
    },
    refreshAuthToken: async () => {
        try {
            const response = await authApi.refreshToken();
            set({
                token: response.data.token,
                isAuthenticated: true,
            });
        }
        catch (error) {
            // Refresh failed, logout user
            set({
                user: null,
                token: null,
                refreshToken: null,
                isAuthenticated: false,
            });
            throw error;
        }
    },
}), {
    name: 'auth-storage',
    partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
    }),
}));
