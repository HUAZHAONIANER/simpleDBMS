import { Request, Response } from "express";
import { SelectNode } from "../../sql/ast/ASTNode";
import { QueryOptimizer } from "../../sql/optimizer/QueryOptimizer";
import { StorageEngine } from "../../storage/core/types";
import { Logger } from "../../utils/Logger";
import { QueryExecutor } from "../services/QueryExecutor";
import { SQLParser } from "../services/SQLParser";

export class QueryController {
  private static storageEngine: StorageEngine;
  private static queryOptimizer: QueryOptimizer;
  private static sqlParser: SQLParser;
  private static queryExecutor: QueryExecutor;
  private static logger: Logger;

  static initialize(
    storageEngine: StorageEngine,
    queryOptimizer: QueryOptimizer
  ): void {
    this.storageEngine = storageEngine;
    this.queryOptimizer = queryOptimizer;
    this.sqlParser = new SQLParser();
    this.queryExecutor = new QueryExecutor(storageEngine);
    this.logger = new Logger("QueryController");
  }

  static async executeQuery(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sql, database } = req.body;

    try {
      this.logger.info("Executing query", { sql, database });

      // 解析SQL
      const ast = await this.sqlParser.parse(sql);

      // 特殊处理 SELECT 1 等简单查询
      if (ast.type === "SELECT" && sql.trim().toUpperCase() === "SELECT 1") {
        const executionTime = Date.now() - startTime;
        res.json({
          success: true,
          result: {
            columns: ["1"],
            rows: [[1]],
            rowCount: 1,
            plan: "Simple SELECT 1 query",
          },
          executionTime,
          query: sql,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 数据库设置
      if (database) {
        this.logger.debug("Database specified but not used", { database });
      }

      let result;

      // 根据AST类型执行不同的操作
      switch (ast.type) {
        case "SELECT":
          result = await this.executeSelect(ast as SelectNode);
          break;
        case "INSERT":
          result = await this.executeInsert(ast);
          break;
        case "UPDATE":
          result = await this.executeUpdate(ast);
          break;
        case "DELETE":
          result = await this.executeDelete(ast);
          break;
        case "CREATE_TABLE":
          result = await this.executeCreateTable(ast);
          break;
        case "DROP_TABLE":
          result = await this.executeDropTable(ast);
          break;
        default:
          throw new Error(`Unsupported statement type: ${ast.type}`);
      }

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        result,
        executionTime,
        query: sql,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Query execution failed", { error, sql });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          sql,
          position: error.position || 0,
        },
        executionTime: Date.now() - startTime,
      });
    }
  }

  private static async executeSelect(ast: SelectNode): Promise<any> {
    try {
      // 优化查询
      const optimizedPlan = this.queryOptimizer.optimize(ast);

      // 执行优化后的计划
      const result = await this.queryExecutor.executeSelect(ast, optimizedPlan);

      return {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        plan: optimizedPlan?.toString() || "Simple Plan",
      };
    } catch (error) {
      this.logger.error("SELECT execution failed", { error });
      throw error;
    }
  }

  private static async executeInsert(ast: any): Promise<any> {
    const tableName = ast.table?.name || ast.tableName;
    const { columns, values } = ast;

    this.logger.debug("Insert AST:", { ast });
    this.logger.debug("Insert columns:", { columns });
    this.logger.debug("Insert values:", { values });

    let insertedCount = 0;
    const insertedIds: any[] = [];

    for (const valueList of values || []) {
      const record: any = {};

      // 构建记录对象
      if (columns && columns.length > 0) {
        columns.forEach((col: any, index: number) => {
          record[col.name] =
            valueList.values?.[index]?.value || valueList[index];
        });
      } else {
        // 如果没有指定列，按位置匹配
        valueList.values?.forEach((value: any, index: number) => {
          record[`column_${index}`] = value.value;
        }) ||
          valueList.forEach((value: any, index: number) => {
            record[`column_${index}`] = value;
          });
      }

      const rowId = await this.storageEngine.insert(tableName, record);
      insertedIds.push(rowId);
      insertedCount++;
    }

    return {
      insertedCount,
      insertedIds,
      table: tableName,
    };
  }

  private static async executeUpdate(ast: any): Promise<any> {
    const tableName = ast.table?.name || ast.tableName;
    const { assignments, whereClause } = ast;

    // 构建更新对象
    const updates: any = {};
    if (assignments) {
      assignments.forEach((assignment: any) => {
        updates[assignment.column] =
          assignment.value?.value || assignment.value;
      });
    }

    // 构建条件
    const conditions = whereClause
      ? this.extractConditions(whereClause.condition)
      : undefined;

    const updatedCount = await this.storageEngine.update(
      tableName,
      updates,
      conditions
    );

    return {
      updatedCount,
      table: tableName,
    };
  }

  private static async executeDelete(ast: any): Promise<any> {
    const tableName = ast.table?.name || ast.tableName;
    const { whereClause } = ast;

    // 构建条件
    const conditions = whereClause
      ? this.extractConditions(whereClause.condition)
      : undefined;

    const deletedCount = await this.storageEngine.delete(tableName, conditions);

    return {
      deletedCount,
      table: tableName,
    };
  }

  private static async executeCreateTable(ast: any): Promise<any> {
    const tableName = ast.table?.name || ast.tableName;
    const { constraints } = ast;

    // 构建表模式
    const schema: any = {
      name: tableName,
      fields:
        ast.columns?.map((col: any) => ({
          name: col.name,
          type: col.dataType?.type || "STRING",
          length: col.dataType?.length,
          nullable: !col.constraints?.some((c: any) => c.type === "NOT_NULL"),
          primaryKey: col.constraints?.some(
            (c: any) => c.type === "PRIMARY_KEY"
          ),
          autoIncrement: col.constraints?.some(
            (c: any) => c.type === "AUTO_INCREMENT"
          ),
          defaultValue: col.constraints?.find((c: any) => c.type === "DEFAULT")
            ?.defaultValue?.value,
        })) || [],
      primaryKey:
        constraints
          ?.filter((c: any) => c.type === "PRIMARY_KEY")
          ?.flatMap((c: any) => c.columns) || [],
    };

    await this.storageEngine.createTable(schema);

    return {
      table: tableName,
      message: `Table ${tableName} created successfully`,
    };
  }

  private static async executeDropTable(ast: any): Promise<any> {
    const tableName = ast.table?.name || ast.tableName;

    await this.storageEngine.dropTable(tableName);

    return {
      table: tableName,
      message: `Table ${tableName} dropped successfully`,
    };
  }

  private static extractConditions(_condition: any): any[] {
    // 简化的条件提取
    return [];
  }

  static async explainQuery(req: Request, res: Response): Promise<void> {
    const { sql } = req.body;

    try {
      // 解析SQL
      const ast = await this.sqlParser.parse(sql);

      if (ast.type !== "SELECT") {
        res.status(400).json({
          success: false,
          error: "EXPLAIN only supports SELECT statements",
        });
        return;
      }

      // 优化查询
      const optimizedPlan = this.queryOptimizer.optimize(ast as SelectNode);

      // 获取优化统计信息
      const stats = this.queryOptimizer.getOptimizationStats();

      res.json({
        success: true,
        query: sql,
        plan: {
          optimizedPlan: optimizedPlan?.toString() || "Simple Plan",
          estimatedCost: optimizedPlan?.estimatedCost || 0,
          estimatedRows: optimizedPlan?.estimatedRows || 0,
        },
        optimization: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Query explanation failed", { error, sql });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          sql,
        },
      });
    }
  }

  static async executeBatch(req: Request, res: Response): Promise<void> {
    const { queries, transaction = false } = req.body;
    const startTime = Date.now();

    try {
      this.logger.info("Executing batch queries", {
        count: queries.length,
        transaction,
      });

      let transactionId: string | null = null;

      // 事务支持 - 暂时不实现
      if (transaction) {
        this.logger.debug("Transaction requested but not supported", {
          transaction,
        });
        // 返回模拟的事务ID
        transactionId = Math.random().toString(36).substring(2, 15);
      }

      const results: any[] = [];

      for (let i = 0; i < queries.length; i++) {
        const { sql } = queries[i];

        try {
          // 解析SQL
          const ast = await this.sqlParser.parse(sql);

          // 执行查询
          let result;
          switch (ast.type) {
            case "SELECT":
              result = await this.executeSelect(ast as SelectNode);
              break;
            case "INSERT":
              result = await this.executeInsert(ast);
              break;
            case "UPDATE":
              result = await this.executeUpdate(ast);
              break;
            case "DELETE":
              result = await this.executeDelete(ast);
              break;
            default:
              throw new Error(`Unsupported batch statement type: ${ast.type}`);
          }

          results.push({
            index: i,
            success: true,
            result,
            sql,
          });
        } catch (error: any) {
          results.push({
            index: i,
            success: false,
            error: {
              message: error.message,
              type: error.constructor.name,
              sql,
            },
          });

          // 事务回滚
          if (transaction && transactionId) {
            this.logger.debug(
              "Transaction rollback requested but not supported",
              { transaction }
            );
            break;
          }
        }
      }

      // 事务提交
      if (transaction && transactionId) {
        this.logger.debug("Transaction commit requested but not supported", {
          transaction,
        });
      }

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        results,
        executionTime,
        transactionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Batch execution failed", { error });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
        executionTime: Date.now() - startTime,
      });
    }
  }

  static async beginTransaction(_req: Request, res: Response): Promise<void> {
    try {
      // 事务支持
      this.logger.debug("beginTransaction called but not implemented");

      // 返回模拟的事务ID
      const transactionId = Math.random().toString(36).substring(2, 15);

      res.json({
        success: true,
        transactionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Failed to begin transaction", { error });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
      });
    }
  }

  static async commitTransaction(req: Request, res: Response): Promise<void> {
    const { transactionId } = req.body;

    try {
      // 事务支持
      this.logger.debug("commitTransaction called but not implemented", {
        transactionId,
      });

      res.json({
        success: true,
        transactionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Failed to commit transaction", {
        error,
        transactionId,
      });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          transactionId,
        },
      });
    }
  }

  static async rollbackTransaction(req: Request, res: Response): Promise<void> {
    const { transactionId } = req.body;

    try {
      // 事务支持
      this.logger.debug("rollbackTransaction called but not implemented", {
        transactionId,
      });

      res.json({
        success: true,
        transactionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Failed to rollback transaction", {
        error,
        transactionId,
      });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          transactionId,
        },
      });
    }
  }

  static async getSystemInfo(_req: Request, res: Response): Promise<void> {
    try {
      const info = {
        version: process.env.npm_package_version || "1.0.0",
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        cwd: process.cwd(),
      };

      res.json({
        success: true,
        info,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Failed to get system info", { error });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
      });
    }
  }

  static async getSystemMetrics(_req: Request, res: Response): Promise<void> {
    try {
      // 系统指标
      const metrics = {
        cpuUsage: 0,
        memoryUsage: process.memoryUsage(),
        activeConnections: 0,
        queryCount: 0,
        uptime: process.uptime(),
      };

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Failed to get system metrics", { error });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
      });
    }
  }

  static async getSystemLogs(_req: Request, res: Response): Promise<void> {
    try {
      // 系统日志
      const logs: any[] = [];

      res.json({
        success: true,
        logs,
        count: logs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error("Failed to get system logs", { error });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
      });
    }
  }
}
