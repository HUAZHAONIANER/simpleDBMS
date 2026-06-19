import { Request, Response, NextFunction } from "express";
import { Logger } from "../../utils/Logger";

const logger = new Logger("request");

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // 记录请求开始时间
  const start = Date.now();

  // 记录请求信息
  const logInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("User-Agent") || "",
    headers: req.headers,
    query: req.query,
    body: req.body,
  };

  // 移除敏感信息
  if (
    logInfo.body &&
    typeof logInfo.body === "object" &&
    "password" in logInfo.body
  ) {
    logInfo.body.password = "[REDACTED]";
  }

  // 记录请求开始
  logger.info(`请求开始: ${req.method} ${req.originalUrl}`);

  // 监听响应结束事件
  res.on("finish", () => {
    // 计算响应时间
    const duration = Date.now() - start;

    // 记录响应信息
    logger.info(`请求结束: ${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      contentType: res.get("Content-Type") || "",
      contentLength: res.get("Content-Length") || "",
    });
  });

  next();
}
