import { Request, Response } from "express";
import { StorageEngine } from "../../storage/core/types";
import { Logger } from "../../utils/Logger";

export class IndexController {
  private static storageEngine: StorageEngine;
  private static logger: Logger;

  static initialize(storageEngine: StorageEngine): void {
    this.storageEngine = storageEngine;
    this.logger = new Logger("IndexController");
  }

  static async createIndex(req: Request, res: Response): Promise<void> {
    const { name, table, columns, unique, database } = req.body;

    try {
      this.logger.info("Creating index", { name, table, database });

      // 切换到指定数据库
      if (database) {
        await this.storageEngine.useDatabase(database);
      }

      await this.storageEngine.createIndex({
        name,
        table,
        columns,
        unique: unique || false,
      });

      res.json({
        success: true,
        message: `Index ${name} created successfully`,
        index: name,
      });
    } catch (error: any) {
      this.logger.error("Failed to create index", { error, name, table });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          index: name,
        },
      });
    }
  }

  static async dropIndex(req: Request, res: Response): Promise<void> {
    const { name } = req.params;

    try {
      this.logger.info("Dropping index", { name });

      await this.storageEngine.dropIndex(name || "");

      res.json({
        success: true,
        message: `Index ${name} dropped successfully`,
        index: name,
      });
    } catch (error: any) {
      this.logger.error("Failed to drop index", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          index: name,
        },
      });
    }
  }

  static async listIndexes(req: Request, res: Response): Promise<void> {
    const { table, database } = req.query;

    try {
      this.logger.info("Listing indexes", { table, database });

      // 切换到指定数据库
      if (database && typeof database === "string") {
        await this.storageEngine.useDatabase(database);
      }

      const indexes = await this.storageEngine.listIndexes(table as string);

      res.json({
        success: true,
        indexes,
        count: indexes.length,
      });
    } catch (error: any) {
      this.logger.error("Failed to list indexes", { error, table, database });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
      });
    }
  }

  static async getIndexStats(req: Request, res: Response): Promise<void> {
    const { name } = req.params;

    try {
      this.logger.info("Getting index stats", { name });

      const stats = await this.storageEngine.getIndexStats(name || "");

      res.json({
        success: true,
        index: name,
        stats,
      });
    } catch (error: any) {
      this.logger.error("Failed to get index stats", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          index: name,
        },
      });
    }
  }
}
