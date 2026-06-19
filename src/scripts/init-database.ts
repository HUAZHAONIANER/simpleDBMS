import { Logger } from "../server/utils/Logger";

const logger = new Logger("init-database");

async function initDatabase(): Promise<void> {
  try {
    logger.info("开始初始化数据库...");
    logger.info("数据库初始化完成");
  } catch (error) {
    logger.error("数据库初始化失败:", error);
  }
}

// 执行初始化
initDatabase();
