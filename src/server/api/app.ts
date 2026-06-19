import { json, urlencoded } from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";
import { apiRouter } from "./routes/api";

export function createApp(): express.Application {
  const app = express();

  // 安全中间件
  app.use(
    helmet({
      contentSecurityPolicy: false, // 前端需要执行内联脚本
      crossOriginEmbedderPolicy: false, // 允许嵌入资源
    })
  );

  // CORS配置
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://yourdomain.com"]
          : ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  // 请求日志
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // 自定义请求日志
  app.use(requestLogger);

  // 请求解析
  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));

  // 压缩
  app.use(compression());

  // 速率限制
  app.use("/api/", rateLimiter);

  // 健康检查
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  // API路由
  app.use("/api", apiRouter);

  // 静态文件服务
  if (process.env.NODE_ENV === "production") {
    app.use(express.static("dist/client"));

    // 处理React路由
    app.get("*", (_req, res) => {
      res.sendFile("index.html", { root: "dist/client" });
    });
  }

  // 404处理 - 确保API请求返回JSON，而非HTML
  app.use((req, res) => {
    // 检查请求的Accept头，判断是否为API请求
    const isApiRequest =
      req.path.startsWith("/api") ||
      req.get("Accept")?.includes("application/json");

    if (isApiRequest) {
      res.status(404).json({
        error: "Not Found",
        message: `Cannot ${req.method} ${req.path}`,
        path: req.path,
      });
    } else {
      // 对于非API请求，返回404状态码
      res.status(404).send("Not Found");
    }
  });

  // 错误处理中间件（必须放在最后）
  app.use(errorHandler);

  return app;
}
