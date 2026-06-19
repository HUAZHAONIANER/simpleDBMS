import { SelectNode } from "../../sql/ast/ASTNode";
import { StorageEngine } from "../../storage/core/types";
import { Logger } from "../../utils/Logger";

export class QueryExecutor {
  private storageEngine: StorageEngine;
  private logger: Logger;

  constructor(storageEngine: StorageEngine) {
    this.storageEngine = storageEngine;
    this.logger = new Logger("QueryExecutor");
  }

  async executeSelect(
    ast: SelectNode,
    _plan: any
  ): Promise<{
    columns: string[];
    rows: any[];
    rowCount: number;
  }> {
    try {
      // 从fromClause获取表名
      const tableName = ast.fromClause?.table?.name || "unknown";
      this.logger.debug("Executing SELECT query", { tableName });

      // 提取选择的列
      let columns: string[];
      let hasStar = false;
      if (ast.selectList && ast.selectList.length > 0) {
        // 完整AST结构，提取选择的列
        columns = ast.selectList.map((selectElement: any) => {
          if (
            "expression" in selectElement &&
            selectElement.expression.type === "STAR"
          ) {
            // 处理SELECT *的情况
            hasStar = true;
            return "*";
          } else if (
            "expression" in selectElement &&
            "name" in selectElement.expression
          ) {
            return selectElement.expression.name;
          }
          return "*";
        });
      } else {
        // 默认选择所有列
        columns = ["*"];
        hasStar = true;
      }

      // 从存储引擎获取数据
      const result = await this.storageEngine.select({
        table: tableName,
        columns: hasStar ? ["*"] : columns,
        // 暂时不支持条件和排序，因为类型不匹配
      });

      return {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
      };
    } catch (error) {
      this.logger.error("SELECT query execution failed", { error, ast });
      throw error;
    }
  }

  async executeInsert(ast: any): Promise<number> {
    try {
      const tableName = ast.table?.name || ast.tableName;
      this.logger.debug("Executing INSERT query", { tableName });

      let insertedCount = 0;

      for (const valueList of ast.values || []) {
        const record: any = {};

        // 构建记录对象
        if (ast.columns && ast.columns.length > 0) {
          ast.columns.forEach((col: any, index: number) => {
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

        await this.storageEngine.insert(tableName, record);
        insertedCount++;
      }

      return insertedCount;
    } catch (error) {
      this.logger.error("INSERT query execution failed", { error, ast });
      throw error;
    }
  }

  async executeUpdate(ast: any): Promise<number> {
    try {
      const tableName = ast.table?.name || ast.tableName;
      this.logger.debug("Executing UPDATE query", { tableName });

      // 构建更新对象
      const updates: any = {};
      if (ast.assignments) {
        ast.assignments.forEach((assignment: any) => {
          updates[assignment.column] =
            assignment.value?.value || assignment.value;
        });
      }

      // 构建条件
      const conditions = ast.whereClause
        ? ast.whereClause.condition
        : undefined;

      return await this.storageEngine.update(tableName, updates, conditions);
    } catch (error) {
      this.logger.error("UPDATE query execution failed", { error, ast });
      throw error;
    }
  }

  async executeDelete(ast: any): Promise<number> {
    try {
      const tableName = ast.table?.name || ast.tableName;
      this.logger.debug("Executing DELETE query", { tableName });

      // 构建条件
      const conditions = ast.whereClause
        ? ast.whereClause.condition
        : undefined;

      return await this.storageEngine.delete(tableName, conditions);
    } catch (error) {
      this.logger.error("DELETE query execution failed", { error, ast });
      throw error;
    }
  }

  async executeCreateTable(ast: any): Promise<void> {
    try {
      const tableName = ast.table?.name || ast.tableName;
      this.logger.debug("Executing CREATE TABLE query", {
        tableName,
        astColumns: ast.columns,
      });

      // 构建表模式
      const schema: any = {
        name: tableName,
        fields:
          ast.columns?.map((col: any, index: number) => {
            const field = {
              name: col.name,
              type: col.dataType?.type || "STRING",
              length: col.dataType?.length,
              nullable: !col.constraints?.some(
                (c: any) => c.type === "NOT_NULL"
              ),
              primaryKey: col.constraints?.some(
                (c: any) => c.type === "PRIMARY_KEY"
              ),
              autoIncrement: col.constraints?.some(
                (c: any) => c.type === "AUTO_INCREMENT"
              ),
              defaultValue: col.constraints?.find(
                (c: any) => c.type === "DEFAULT"
              )?.defaultValue?.value,
            };
            this.logger.debug(`Column ${index}: ${JSON.stringify(field)}`);
            return field;
          }) || [],
        primaryKey:
          ast.constraints
            ?.filter((c: any) => c.type === "PRIMARY_KEY")
            ?.flatMap((c: any) => c.columns) || [],
      };

      this.logger.debug(`Final schema: ${JSON.stringify(schema)}`);

      await this.storageEngine.createTable(schema);
    } catch (error) {
      this.logger.error("CREATE TABLE query execution failed", { error, ast });
      throw error;
    }
  }

  async executeDropTable(ast: any): Promise<void> {
    try {
      const tableName = ast.table?.name || ast.tableName;
      this.logger.debug("Executing DROP TABLE query", {
        tableName,
      });

      await this.storageEngine.dropTable(tableName);
    } catch (error) {
      this.logger.error("DROP TABLE query execution failed", { error, ast });
      throw error;
    }
  }
}
