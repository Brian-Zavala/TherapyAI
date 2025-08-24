/**
 * Enterprise Logging System
 * Structured logging with multiple outputs and log levels
 */

import { prisma } from '@/lib/database/prisma-optimized';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  error?: Error;
}

export class Logger {
  private component: string;
  private requestId?: string;

  constructor(component: string, requestId?: string) {
    this.component = component;
    this.requestId = requestId;
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  fatal(message: string, error?: any, data?: any): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  private log(level: LogLevel, message: string, data?: any, error?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component: this.component,
      message,
      data,
      requestId: this.requestId,
      error: error instanceof Error ? error : undefined
    };

    // Console output
    this.logToConsole(entry);

    // Database logging for important events
    if (level >= LogLevel.WARN) {
      this.logToDatabase(entry).catch(console.error);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] ${levelName} [${entry.component}]`;

    const logData = {
      ...entry.data,
      requestId: entry.requestId,
      error: entry.error?.message
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, logData);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, logData);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, logData);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, logData, entry.error?.stack);
        break;
    }
  }

  private async logToDatabase(entry: LogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SYSTEM_LOG',
          entityType: 'Logger',
          userId: entry.userId || null,
          metadata: {
            level: LogLevel[entry.level],
            component: entry.component,
            message: entry.message,
            data: entry.data,
            requestId: entry.requestId,
            error: entry.error ? {
              message: entry.error.message,
              stack: entry.error.stack,
              name: entry.error.name
            } : undefined
          },
          complianceFlags: entry.level >= LogLevel.ERROR ? ['SYSTEM_ERROR'] : []
        }
      });
    } catch (dbError) {
      console.error('Failed to log to database:', dbError);
    }
  }

  // Create child logger with context
  child(additionalContext: { userId?: string; sessionId?: string }): Logger {
    const childLogger = new Logger(this.component, this.requestId);
    // Could extend to include additional context in logs
    return childLogger;
  }
}