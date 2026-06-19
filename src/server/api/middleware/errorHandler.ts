import { NextFunction, Request, Response } from "express";
import { Logger } from "../../utils/Logger";

const logger = new Logger("ErrorHandler");

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    public sql?: string,
    public sqlState?: string,
    public errorCode?: string
  ) {
    super(500, message);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public fields?: { [key: string]: string }
  ) {
    super(400, message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(401, message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(403, message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, `${resource}${id ? ` '${id}'` : ""} not found`);
    this.name = "NotFoundError";
  }
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 默认错误值
  let statusCode = 500;
  let message = "Internal Server Error";
  let errorType = "InternalError";
  let details: any = undefined;

  // 处理不同类型的错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorType = error.constructor.name;
    details = error.details;

    // 记录非操作性错误
    if (!error.isOperational) {
      logger.error("Non-operational error", {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
      });
    }
  } else if (error instanceof SyntaxError && "body" in error) {
    // JSON解析错误
    statusCode = 400;
    message = "Invalid JSON in request body";
    errorType = "JsonParseError";
  } else {
    // 未知错误
    logger.error("Unhandled error", {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  // 在生产环境中隐藏详细错误信息
  if (process.env.NODE_ENV === "production" && statusCode >= 500) {
    message = "Internal Server Error";
    details = undefined;
  }

  // 发送错误响应
  res.status(statusCode).json({
    error: {
      type: errorType,
      message,
      details,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    },
  });
}

export function asyncErrorHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function convertDatabaseError(error: any): AppError {
  // 处理SQL解析错误
  if (error.name === "SyntaxError" && error.message.includes("SQL")) {
    return new ValidationError("Invalid SQL syntax", {
      sql: error.message,
      position: error.position || 0,
    });
  }

  // 处理连接错误
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    return new DatabaseError(
      "Database connection failed",
      undefined,
      error.code
    );
  }

  // 处理约束违反错误
  if (error.code === "ER_DUP_ENTRY") {
    return new ValidationError("Duplicate entry violates unique constraint");
  }

  if (error.code === "ER_NO_REFERENCED_ROW") {
    return new ValidationError("Foreign key constraint violated");
  }

  if (error.code === "ER_NO_DEFAULT_FOR_FIELD") {
    return new ValidationError("Required field missing");
  }

  // 处理表/列不存在错误
  if (error.code === "ER_NO_SUCH_TABLE") {
    return new NotFoundError("Table", error.table);
  }

  if (error.code === "ER_BAD_FIELD_ERROR") {
    return new ValidationError(`Unknown column: ${error.column}`);
  }

  // 处理权限错误
  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return new AuthorizationError("Database access denied");
  }

  // 处理超时错误
  if (error.code === "ER_LOCK_WAIT_TIMEOUT") {
    return new DatabaseError("Query timeout - lock wait timeout exceeded");
  }

  // 默认数据库错误
  return new DatabaseError(
    error.message || "Database error occurred",
    error.sql,
    error.sqlState,
    error.code
  );
}

export function logError(error: Error, context?: any): void {
  logger.error("Application error", {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

export class ErrorMonitor {
  private static errorCounts: Map<string, number> = new Map();
  private static lastReset: Date = new Date();

  static recordError(errorType: string): void {
    const count = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, count + 1);
  }

  static getErrorStats(): {
    errors: { [key: string]: number };
    totalErrors: number;
    timeWindow: string;
  } {
    const errors: { [key: string]: number } = {};
    let totalErrors = 0;

    for (const [type, count] of this.errorCounts) {
      errors[type] = count;
      totalErrors += count;
    }

    return {
      errors,
      totalErrors,
      timeWindow: `Since ${this.lastReset.toISOString()}`,
    };
  }

  static reset(): void {
    this.errorCounts.clear();
    this.lastReset = new Date();
  }

  static isErrorRateHigh(threshold: number = 10): boolean {
    const stats = this.getErrorStats();
    const timeWindowHours =
      (Date.now() - this.lastReset.getTime()) / (1000 * 60 * 60);
    const errorRate = stats.totalErrors / Math.max(timeWindowHours, 1);

    return errorRate > threshold;
  }
}
