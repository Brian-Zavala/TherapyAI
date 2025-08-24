/**
 * Simple file logger for the custom transcriber
 */
import fs from 'fs';
import path from 'path';

class FileLogger {
  logDir: string;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create log directory:', err);
        // Fall back to console logging only
      }
    }
  }

  log(message: string) {
    console.log(message);
    this.appendToLog('app.log', message);
  }

  error(message: string, error?: any, context?: string) {
    const formattedMessage = `[ERROR] ${context ? `[${context}] ` : ''}${message}${error ? `: ${JSON.stringify(error)}` : ''}`;
    console.error(formattedMessage);
    this.appendToLog('error.log', formattedMessage);
  }

  warn(message: string, context?: string) {
    const formattedMessage = `[WARN] ${context ? `[${context}] ` : ''}${message}`;
    console.warn(formattedMessage);
    this.appendToLog('warn.log', formattedMessage);
  }

  info(message: string, context?: string) {
    const formattedMessage = `[INFO] ${context ? `[${context}] ` : ''}${message}`;
    console.info(formattedMessage);
    this.appendToLog('info.log', formattedMessage);
  }

  logDetailed(level: string, message: string, context?: string, data?: any) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${context ? `[${context}] ` : ''}${message}${data ? `\nDATA: ${JSON.stringify(data, null, 2)}` : ''}`;
    console.log(formattedMessage);
    this.appendToLog('detailed.log', formattedMessage);
  }

  private appendToLog(filename: string, message: string) {
    try {
      const logPath = path.join(this.logDir, filename);
      const logMessage = `[${new Date().toISOString()}] ${message}\n`;
      fs.appendFileSync(logPath, logMessage);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  createNamedLogger(filename: string) {
    return {
      log: (message: string) => this.appendToLog(filename, message),
      error: (message: string, error?: any) => {
        const formattedMessage = `[ERROR] ${message}${error ? `: ${JSON.stringify(error)}` : ''}`;
        this.appendToLog(filename, formattedMessage);
      },
      info: (message: string) => {
        const formattedMessage = `[INFO] ${message}`;
        this.appendToLog(filename, formattedMessage);
      },
      warn: (message: string) => {
        const formattedMessage = `[WARN] ${message}`;
        this.appendToLog(filename, formattedMessage);
      }
    };
  }
}

export default FileLogger;

export function createNamedLogger(filename: string) {
  const logger = new FileLogger();
  return logger.createNamedLogger(filename);
}