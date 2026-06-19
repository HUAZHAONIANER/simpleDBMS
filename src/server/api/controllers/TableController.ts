import { Request, Response } from "express";
import { StorageEngine } from "../../storage/core/types";
import { Logger } from "../../utils/Logger";

export class TableController {
  private static storageEngine: StorageEngine;
  private static logger: Logger;
  static initialize(storageEngine: StorageEngine): void {
    this.storageEngine = storageEngine;
    this.logger = new Logger("TableController");
  }

  static async createTable(req: Request, res: Response): Promise<void> {
    const { name, database, columns, indexes } = req.body;

    try {
      this.logger.info("Creating table", { name, database });

      // 切换到指定数据库
      if (database) {
        await this.storageEngine.useDatabase(database);
      }

      // 构建表模式
      const schema = {
        name,
        fields: columns,
        indexes: indexes || [],
      };

      await this.storageEngine.createTable(schema);

      res.json({
        success: true,
        message: `Table ${name} created successfully`,
        table: name,
      });
    } catch (error: any) {
      this.logger.error("Failed to create table", { error, name, database });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          table: name,
        },
      });
    }
  }

  static async dropTable(req: Request, res: Response): Promise<void> {
    const { name } = req.params;

    try {
      this.logger.info("Dropping table", { name });

      await this.storageEngine.dropTable(name || "");

      res.json({
        success: true,
        message: `Table ${name} dropped successfully`,
        table: name,
      });
    } catch (error: any) {
      this.logger.error("Failed to drop table", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          table: name,
        },
      });
    }
  }

  static async listTables(req: Request, res: Response): Promise<void> {
    const { database } = req.query;

    try {
      this.logger.info("Listing tables", { database });

      // 切换到指定数据库
      if (database && typeof database === "string") {
        await this.storageEngine.useDatabase(database);
      }

      // 模拟实现，因为StorageEngine没有listTables方法
      const tables: string[] = [];

      res.json({
        success: true,
        tables,
        count: tables.length,
      });
    } catch (error: any) {
      this.logger.error("Failed to list tables", { error, database });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
      });
    }
  }

  static async getTableSchema(req: Request, res: Response): Promise<void> {
    const { name } = req.params;

    try {
      this.logger.info("Getting table schema", { name });

      // 模拟实现
      const schema = {
        name,
        fields: [],
        indexes: [],
      };

      res.json({
        success: true,
        table: name,
        schema,
      });
    } catch (error: any) {
      this.logger.error("Failed to get table schema", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          table: name,
        },
      });
    }
  }

  static async getTableData(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const { limit = 100, offset = 0, columns } = req.query;

    try {
      this.logger.info("Getting table data", { name, limit, offset });

      const columnList =
        typeof columns === "string" ? columns.split(",") : undefined;

      // 使用select方法替代query方法
      const tableName = name || "";
      const result = await this.storageEngine.select({
        table: tableName,
        columns: columnList || [],
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        table: tableName,
        data: result.rows,
        columns: result.columns,
        rowCount: result.rowCount,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error: any) {
      this.logger.error("Failed to get table data", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          table: name,
        },
      });
    }
  }

  static async getTableStats(req: Request, res: Response): Promise<void> {
    const { name } = req.params;

    try {
      this.logger.info("Getting table stats", { name });

      // 模拟实现
      const stats = {
        rowCount: 0,
        indexCount: 0,
        size: 0,
      };

      res.json({
        success: true,
        table: name,
        stats,
      });
    } catch (error: any) {
      this.logger.error("Failed to get table stats", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          table: name,
        },
      });
    }
  }
}
