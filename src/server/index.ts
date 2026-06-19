import { createApp } from "./api/app";
import { DatabaseController } from "./api/controllers/DatabaseController";
import { IndexController } from "./api/controllers/IndexController";
import { QueryController } from "./api/controllers/QueryController";
import { TableController } from "./api/controllers/TableController";
import { QueryOptimizer } from "./sql/optimizer/QueryOptimizer";
import { StorageEngineImpl } from "./storage/core/StorageEngineImpl";
import { Logger } from "./utils/Logger";

// 初始化日志
const logger = new Logger("server");

async function initializeDatabase(): Promise<void> {
  try {
    // 初始化存储引擎
    const storageEngine = new StorageEngineImpl("./data", "default");
    await storageEngine.initialize();

    // 初始化查询优化器
    const queryOptimizer = new QueryOptimizer();

    // 初始化控制器
    DatabaseController.initialize(storageEngine);
    TableController.initialize(storageEngine);
    IndexController.initialize(storageEngine);
    QueryController.initialize(storageEngine, queryOptimizer);

    logger.info("数据库服务初始化成功");
  } catch (error) {
    logger.error(
      `数据库服务初始化失败: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof Error && error.stack) {
      logger.error("错误堆栈:", error.stack);
    }
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  try {
    // 初始化数据库服务
    await initializeDatabase();

    // 创建Express应用
    const app = createApp();

    // 定义端口
    const PORT = process.env.PORT || 3001;

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`LightDBMS服务器已启动`);
      logger.info(`API地址: http://localhost:${PORT}/api`);
      logger.info(`健康检查: http://localhost:${PORT}/health`);
      logger.info(`环境: ${process.env.NODE_ENV || "development"}`);
    });

    // 处理未捕获的异常
    process.on("uncaughtException", (error) => {
      logger.error(`未捕获的异常: ${error.message}`, error.stack);
      process.exit(1);
    });

    // 处理未处理的Promise拒绝
    process.on("unhandledRejection", (reason, promise) => {
      logger.error(`未处理的Promise拒绝: ${reason}`, promise);
      process.exit(1);
    });

    // 处理SIGINT信号（Ctrl+C）
    process.on("SIGINT", () => {
      logger.info("收到SIGINT信号，正在关闭服务器...");
      process.exit(0);
    });
  } catch (error) {
    logger.error(
      `启动服务器失败: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof Error && error.stack) {
      logger.error("错误堆栈:", error.stack);
    }
    process.exit(1);
  }
}

// 启动服务器
startServer();
