import * as fs from "fs";
import * as path from "path";
import * as winston from "winston";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LoggerConfig {
  level: LogLevel;
  filename?: string;
  maxFiles?: number;
  maxSize?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  format?: "json" | "simple" | "combined";
}

export class Logger {
  private logger: winston.Logger;
  private category: string;

  private static globalConfig: LoggerConfig = {
    level: (process.env.LOG_LEVEL as LogLevel) || "debug",
    filename: process.env.LOG_FILE || "logs/app.log",
    maxFiles: 5,
    maxSize: "10m",
    enableConsole: process.env.NODE_ENV !== "production",
    enableFile: true,
    format: process.env.NODE_ENV === "production" ? "json" : "simple",
  };

  private static ensureLogDirectory(): void {
    const logDir = path.dirname(this.globalConfig.filename!);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  constructor(category: string = "App") {
    this.category = category;
    Logger.ensureLogDirectory();
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // 控制台输出
    if (Logger.globalConfig.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: this.getConsoleFormat(),
        })
      );
    }

    // 文件输出
    if (Logger.globalConfig.enableFile) {
      const filename = Logger.globalConfig.filename || "logs/app.log";
      const maxFiles = Logger.globalConfig.maxFiles || 5;
      transports.push(
        new winston.transports.File({
          filename: filename,
          maxFiles: maxFiles,
          format: this.getFileFormat(),
        })
      );

      // 错误日志单独文件
      transports.push(
        new winston.transports.File({
          filename: filename.replace(".log", "-error.log"),
          level: "error",
          maxFiles: maxFiles,
          format: this.getFileFormat(),
        })
      );
    }

    return winston.createLogger({
      level: Logger.globalConfig.level,
      transports,
      exitOnError: false,
    });
  }

  private getConsoleFormat(): winston.Logform.Format {
    const baseFormat = [
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(
        ({ timestamp, level, message, category, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : "";
          return `${timestamp} [${category}] ${level}: ${message}${metaStr}`;
        }
      ),
    ];

    return winston.format.combine(...baseFormat);
  }

  private getFileFormat(): winston.Logform.Format {
    const baseFormat = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
    ];

    if (Logger.globalConfig.format === "json") {
      return winston.format.combine(...baseFormat, winston.format.json());
    } else {
      return winston.format.combine(
        ...baseFormat,
        winston.format.printf(
          ({ timestamp, level, message, category, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? ` ${JSON.stringify(meta)}`
              : "";
            return `${timestamp} [${category}] ${level.toUpperCase()}: ${message}${metaStr}`;
          }
        )
      );
    }
  }

  error(message: string, meta?: any): void {
    this.logger.error({
      message,
      category: this.category,
      ...meta,
    });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn({
      message,
      category: this.category,
      ...meta,
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info({
      message,
      category: this.category,
      ...meta,
    });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug({
      message,
      category: this.category,
      ...meta,
    });
  }

  sql(query: string, duration?: number, meta?: any): void {
    this.logger.info({
      message: `SQL: ${query}`,
      category: this.category,
      type: "sql",
      duration,
      ...meta,
    });
  }

  performance(operation: string, duration: number, meta?: any): void {
    this.logger.info({
      message: `Performance: ${operation} took ${duration}ms`,
      category: this.category,
      type: "performance",
      operation,
      duration,
      ...meta,
    });
  }

  security(event: string, meta?: any): void {
    this.logger.warn({
      message: `Security: ${event}`,
      category: this.category,
      type: "security",
      event,
      ...meta,
    });
  }

  async getLogs(
    _options: {
      level?: LogLevel;
      limit?: number;
      from?: string;
      to?: string;
    } = {}
  ): Promise<any[]> {
    try {
      // 这里应该实现日志文件的读取和过滤逻辑
      // 为了简化，返回空数组
      return [];
    } catch (error) {
      this.error("Failed to read logs", { error });
      return [];
    }
  }

  static configure(config: Partial<LoggerConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
  }

  static getLogLevel(): LogLevel {
    return this.globalConfig.level;
  }

  static setLogLevel(level: LogLevel): void {
    this.globalConfig.level = level;
  }

  createChildLogger(subCategory: string): Logger {
    return new Logger(`${this.category}.${subCategory}`);
  }

  withContext(context: any): ContextualLogger {
    return new ContextualLogger(this, context);
  }
}

export class ContextualLogger {
  constructor(
    private logger: Logger,
    private context: any
  ) {}

  error(message: string, meta?: any): void {
    this.logger.error(message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { ...this.context, ...meta });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { ...this.context, ...meta });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, { ...this.context, ...meta });
  }

  sql(query: string, duration?: number, meta?: any): void {
    this.logger.sql(query, duration, { ...this.context, ...meta });
  }

  performance(operation: string, duration: number, meta?: any): void {
    this.logger.performance(operation, duration, { ...this.context, ...meta });
  }

  security(event: string, meta?: any): void {
    this.logger.security(event, { ...this.context, ...meta });
  }
}

export const logUtils = {
  createRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  formatStackTrace(error: Error): string {
    return error.stack || `${error.name}: ${error.message}`;
  },

  safeStringify(obj: any): string {
    try {
      return JSON.stringify(
        obj,
        (key, value) => {
          // 过滤敏感信息
          if (
            key.toLowerCase().includes("password") ||
            key.toLowerCase().includes("secret") ||
            key.toLowerCase().includes("token")
          ) {
            return "[REDACTED]";
          }
          return value;
        },
        2
      );
    } catch {
      return "[UNSERIALIZABLE]";
    }
  },
};
