import { NextFunction, Request, Response } from "express";

// 速率限制配置
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 100, // 每个IP在窗口内的最大请求数
  message: { error: "请求速率过高，请稍后再试", code: "RATE_LIMIT_EXCEEDED" },
};

// 存储IP地址的请求计数
const ipRequestCounts: Map<
  string,
  {
    count: number;
    resetTime: number;
  }
> = new Map();

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 获取客户端IP
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // 当前时间
  const now = Date.now();

  // 获取或初始化IP的请求计数
  let ipData = ipRequestCounts.get(ip);

  if (!ipData) {
    // 新IP，初始化计数
    ipData = {
      count: 0,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    };
    ipRequestCounts.set(ip, ipData);
  } else if (now > ipData.resetTime) {
    // 窗口已过期，重置计数
    ipData.count = 0;
    ipData.resetTime = now + RATE_LIMIT_CONFIG.windowMs;
  }

  // 增加请求计数
  ipData.count++;

  // 检查是否超过速率限制
  if (ipData.count > RATE_LIMIT_CONFIG.max) {
    // 返回速率限制错误
    res.status(429).json(RATE_LIMIT_CONFIG.message);
    return;
  }

  // 设置速率限制响应头
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT_CONFIG.max.toString());
  res.setHeader(
    "X-RateLimit-Remaining",
    (RATE_LIMIT_CONFIG.max - ipData.count).toString()
  );
  res.setHeader(
    "X-RateLimit-Reset",
    Math.floor(ipData.resetTime / 1000).toString()
  );

  // 继续处理请求
  next();
}
