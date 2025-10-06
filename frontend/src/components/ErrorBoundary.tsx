/**
 * React Error Boundary 元件
 * 捕獲子元件中的 JavaScript 錯誤，記錄錯誤並顯示友善的錯誤 UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 以便下次渲染顯示錯誤 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 記錄錯誤到日誌系統
    logger.error('Error Boundary caught an error', error, 'ErrorBoundary');
    logger.error('Error Info', {
      componentStack: errorInfo.componentStack,
    }, 'ErrorBoundary');

    // 更新 state
    this.setState({
      errorInfo,
    });

    // 呼叫自訂錯誤處理函數
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自訂 fallback UI，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 預設錯誤 UI
      return (
        <div className="error-boundary-container" style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <svg
                style={styles.icon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 style={styles.title}>抱歉，發生了一些錯誤</h1>

            <p style={styles.message}>
              應用程式遇到了未預期的錯誤。我們已經記錄了這個問題，並會盡快修復。
            </p>

            {import.meta.env.MODE === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>錯誤詳情 (僅開發環境顯示)</summary>
                <div style={styles.errorDetails}>
                  <p style={styles.errorMessage}>
                    <strong>錯誤：</strong> {this.state.error.toString()}
                  </p>
                  {this.state.error.stack && (
                    <pre style={styles.stack}>{this.state.error.stack}</pre>
                  )}
                  {this.state.errorInfo && (
                    <pre style={styles.stack}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div style={styles.actions}>
              <button onClick={this.handleReset} style={styles.buttonSecondary}>
                重新嘗試
              </button>
              <button onClick={this.handleReload} style={styles.buttonPrimary}>
                重新載入頁面
              </button>
            </div>

            <p style={styles.help}>
              如果問題持續發生，請聯絡技術支援。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 樣式定義
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  icon: {
    width: '64px',
    height: '64px',
    color: '#ef4444',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  details: {
    marginTop: '24px',
    marginBottom: '24px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    padding: '16px',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '12px',
  },
  errorDetails: {
    marginTop: '12px',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#1f2937',
    marginBottom: '12px',
  },
  stack: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  buttonPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  help: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};

export default ErrorBoundary;
