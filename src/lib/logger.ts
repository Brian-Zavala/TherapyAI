/**
 * Unified logger for the application
 * Provides consistent logging interface with context support
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('info', message, context);
    console.log(formatted);
  }

  warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
  }

  error(message: string, errorOrContext?: Error | LogContext): void {
    let context: LogContext = {};
    
    if (errorOrContext instanceof Error) {
      context = {
        error: errorOrContext.message,
        stack: this.isDevelopment ? errorOrContext.stack : undefined,
      };
    } else if (errorOrContext) {
      context = errorOrContext;
    }

    const formatted = this.formatMessage('error', message, context);
    console.error(formatted);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      const formatted = this.formatMessage('debug', message, context);
      console.debug(formatted);
    }
  }

  // Structured logging for production environments
  log(level: LogLevel, message: string, context?: LogContext): void {
    switch (level) {
      case 'info':
        this.info(message, context);
        break;
      case 'warn':
        this.warn(message, context);
        break;
      case 'error':
        this.error(message, context as any);
        break;
      case 'debug':
        this.debug(message, context);
        break;
    }
  }

  // Create a child logger with persistent context
  child(defaultContext: LogContext): Logger {
    const parent = this;
    return {
      info(message: string, context?: LogContext) {
        parent.info(message, { ...defaultContext, ...context });
      },
      warn(message: string, context?: LogContext) {
        parent.warn(message, { ...defaultContext, ...context });
      },
      error(message: string, errorOrContext?: Error | LogContext) {
        if (errorOrContext instanceof Error) {
          parent.error(message, errorOrContext);
        } else {
          parent.error(message, { ...defaultContext, ...errorOrContext });
        }
      },
      debug(message: string, context?: LogContext) {
        parent.debug(message, { ...defaultContext, ...context });
      },
      log(level: LogLevel, message: string, context?: LogContext) {
        parent.log(level, message, { ...defaultContext, ...context });
      },
      child(additionalContext: LogContext) {
        return parent.child({ ...defaultContext, ...additionalContext });
      },
    } as Logger;
  }
}

// Export singleton instance
export const logger = new Logger();