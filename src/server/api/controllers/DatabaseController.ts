import { Request, Response } from "express";
import { StorageEngine } from "../../storage/core/types";
import { Logger } from "../../utils/Logger";

export class DatabaseController {
  // storageEngine用于处理数据库操作
  private static storageEngine: StorageEngine;
  private static logger: Logger;

  static initialize(storageEngine: StorageEngine): void {
    this.storageEngine = storageEngine;
    this.logger = new Logger("DatabaseController");
  }

  static async createDatabase(req: Request, res: Response): Promise<void> {
    const { name, config } = req.body;

    try {
      this.logger.info("Creating database", { name, config });

      await this.storageEngine.createDatabase(name, config);

      res.json({
        success: true,
        message: `Database ${name} created successfully`,
        database: name,
      });
    } catch (error: any) {
      this.logger.error("Failed to create database", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          database: name,
        },
      });
    }
  }

  static async dropDatabase(req: Request, res: Response): Promise<void> {
    const { name } = req.params;

    try {
      this.logger.info("Dropping database", { name });

      if (!name) {
        throw new Error("Database name is required");
      }
      await this.storageEngine.dropDatabase(name);

      res.json({
        success: true,
        message: `Database ${name} dropped successfully`,
        database: name,
      });
    } catch (error: any) {
      this.logger.error("Failed to drop database", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          database: name,
        },
      });
    }
  }

  static async listDatabases(_req: Request, res: Response): Promise<void> {
    try {
      this.logger.info("Listing databases");

      const databases: string[] = await this.storageEngine.listDatabases();

      res.json({
        success: true,
        databases,
        count: databases.length,
      });
    } catch (error: any) {
      this.logger.error("Failed to list databases", { error });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
      });
    }
  }

  static async getDatabaseStats(req: Request, res: Response): Promise<void> {
    const { name } = req.params;

    try {
      this.logger.info("Getting database stats", { name });

      if (!name) {
        throw new Error("Database name is required");
      }
      const stats = await this.storageEngine.getDatabaseStats(name);

      res.json({
        success: true,
        database: name,
        stats,
      });
    } catch (error: any) {
      this.logger.error("Failed to get database stats", { error, name });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          database: name,
        },
      });
    }
  }
}
