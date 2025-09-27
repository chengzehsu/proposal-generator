import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from './api'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  name: string
  role: string
  company_id?: string
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => void
  refreshAuthToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          const response = await authApi.login(email, password)
          
          set({
            user: response.data.user,
            token: response.data.token,
            refreshToken: response.data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
          
          toast.success('登入成功！')
        } catch (error: unknown) {
          set({ isLoading: false })
          const message = (error as any).response?.data?.message || '登入失敗，請檢查帳號密碼'
          toast.error(message)
          throw error
        }
      },

      register: async (userData: any) => {
        try {
          set({ isLoading: true })
          const response = await authApi.register(userData)
          
          set({
            user: response.data.user,
            token: response.data.token,
            refreshToken: response.data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
          
          toast.success('註冊成功！歡迎使用智能標書產生器')
        } catch (error: unknown) {
          set({ isLoading: false })
          const message = (error as any).response?.data?.message || '註冊失敗，請稍後再試'
          toast.error(message)
          throw error
        }
      },
      
      logout: async () => {
        try {
          await authApi.logout()
        } catch (error) {
          // Ignore logout errors
          console.warn('Logout error:', error)
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          })
          toast.success('已成功登出')
        }
      },
      
      checkAuth: () => {
        const { token } = get()
        if (token) {
          // TODO: Optionally validate token with backend
          set({ isAuthenticated: true })
        } else {
          set({ isAuthenticated: false })
        }
      },

      refreshAuthToken: async () => {
        try {
          const response = await authApi.refreshToken()
          set({
            token: response.data.token,
            isAuthenticated: true,
          })
        } catch (error) {
          // Refresh failed, logout user
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          })
          throw error
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)