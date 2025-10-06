/**
 * 統一的日誌系統
 * 替換所有 console.log 的使用
 */

/**
 * 日誌等級
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日誌配置
 */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

/**
 * 日誌項目
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  context?: string;
  userAgent?: string;
  url?: string;
}

/**
 * Logger 類別
 */
class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enabled: import.meta.env.MODE !== 'test',
      level: import.meta.env.MODE === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: import.meta.env.MODE !== 'production',
      enableRemote: import.meta.env.MODE === 'production',
      remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
      ...config,
    };
  }

  /**
   * 設定日誌配置
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 記錄 DEBUG 等級日誌
   */
  public debug(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  /**
   * 記錄 INFO 等級日誌
   */
  public info(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  /**
   * 記錄 WARN 等級日誌
   */
  public warn(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  /**
   * 記錄 ERROR 等級日誌
   */
  public error(message: string, error?: Error | unknown, context?: string): void {
    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error;

    this.log(LogLevel.ERROR, message, errorData, context);
  }

  /**
   * 記錄 API 請求
   */
  public api(method: string, url: string, status?: number, duration?: number): void {
    this.info('API Request', {
      method,
      url,
      status,
      duration,
    }, 'API');
  }

  /**
   * 記錄用戶行為
   */
  public track(event: string, properties?: Record<string, unknown>): void {
    this.info('User Event', {
      event,
      ...properties,
    }, 'TRACKING');
  }

  /**
   * 核心日誌方法
   */
  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    if (!this.config.enabled) return;
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // 加入緩衝區
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift();
    }

    // 輸出到 console
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // 發送到遠端
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(logEntry);
    }
  }

  /**
   * 檢查是否應該記錄此等級的日誌
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= configLevelIndex;
  }

  /**
   * 輸出到 console
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, data, context } = entry;
    const prefix = `[${timestamp}] [${level}]${context ? ` [${context}]` : ''}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data ?? '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data ?? '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data ?? '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data ?? '');
        break;
    }
  }

  /**
   * 發送到遠端日誌服務
   */
  private logToRemote(entry: LogEntry): void {
    if (!this.config.remoteEndpoint) return;

    // 使用 sendBeacon API 以確保在頁面卸載時也能發送日誌
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' });
      navigator.sendBeacon(this.config.remoteEndpoint, blob);
    } else {
      // fallback 到 fetch
      fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true,
      }).catch(() => {
        // 靜默失敗，避免無限循環
      });
    }
  }

  /**
   * 獲取日誌緩衝區
   */
  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * 清空日誌緩衝區
   */
  public clearLogBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * 下載日誌為檔案
   */
  public downloadLogs(): void {
    const logs = this.logBuffer.map(entry =>
      `${entry.timestamp} [${entry.level}] ${entry.message}${entry.data ? ` ${  JSON.stringify(entry.data)}` : ''}`
    ).join('\n');

    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// 建立全域 logger 實例
export const logger = new Logger();

// 開發環境中將 logger 暴露到 window 以便調試
if (import.meta.env.MODE === 'development') {
  (window as typeof window & { logger: Logger }).logger = logger;
}

export default logger;
