import { Logger } from "../../utils/Logger";
import { PageManager } from "../page/PageManager";
import { RecordManager } from "./RecordManager";
import {
  Condition,
  Query,
  Record,
  ResultSet,
  RowId,
  StorageEngine,
  TableSchema,
} from "./types";

export class StorageEngineImpl implements StorageEngine {
  private pageManager: PageManager;
  private recordManager: RecordManager;
  private databases: Map<string, boolean> = new Map();
  private currentDatabase: string | null = null;
  private logger: Logger;

  constructor(dataDirectory: string, databaseName: string = "default") {
    this.logger = new Logger("StorageEngineImpl");
    this.pageManager = new PageManager(dataDirectory, databaseName);
    this.recordManager = new RecordManager(this.pageManager);
    this.currentDatabase = databaseName;
    this.databases.set(databaseName, true);
  }

  async initialize(): Promise<void> {
    try {
      await this.pageManager.initialize();
      this.logger.info("StorageEngine initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize StorageEngine", error);
      throw error;
    }
  }

  async createDatabase(name: string, config: any): Promise<void> {
    this.logger.info("Creating database", { name, config });
    this.databases.set(name, true);
    // 实际实现中应该创建数据库目录和元数据文件
  }

  async dropDatabase(name: string): Promise<void> {
    this.logger.info("Dropping database", { name });
    this.databases.delete(name);
    if (this.currentDatabase === name) {
      this.currentDatabase = null;
    }
  }

  async useDatabase(name: string): Promise<void> {
    this.logger.info("Using database", { name });
    if (!this.databases.has(name)) {
      throw new Error(`Database ${name} does not exist`);
    }
    this.currentDatabase = name;
    // 实际实现中应该切换到对应数据库的数据文件
  }

  async listDatabases(): Promise<string[]> {
    return Array.from(this.databases.keys());
  }

  async getDatabaseStats(name: string): Promise<any> {
    if (!this.databases.has(name)) {
      throw new Error(`Database ${name} does not exist`);
    }
    // 实际实现中应该返回数据库的详细统计信息
    return {
      name,
      tableCount: 0,
      recordCount: 0,
      size: 0,
    };
  }

  async createTable(schema: TableSchema): Promise<void> {
    this.logger.info("Creating table", { name: schema.name });
    this.recordManager.registerTable(schema);
    // 实际实现中应该创建表的元数据和初始页面
  }

  async dropTable(tableName: string): Promise<void> {
    this.logger.info("Dropping table", { name: tableName });
    // 实际实现中应该删除表的所有页面和元数据
  }

  async insert(tableName: string, record: Record): Promise<RowId> {
    this.logger.debug("Inserting record", { tableName });
    return await this.recordManager.insertRecord(tableName, record);
  }

  async batchInsert(tableName: string, records: Record[]): Promise<RowId[]> {
    this.logger.debug("Batch inserting records", {
      tableName,
      count: records.length,
    });
    const rowIds: RowId[] = [];
    for (const record of records) {
      const rowId = await this.recordManager.insertRecord(tableName, record);
      rowIds.push(rowId);
    }
    return rowIds;
  }

  async select(query: Query): Promise<ResultSet> {
    this.logger.debug("Selecting records", { table: query.table });
    const startTime = Date.now();

    let columns = query.columns || [];

    // 处理SELECT *的情况
    let useAllColumns = false;
    if (columns.includes("*")) {
      useAllColumns = true;
      columns = [];
    }

    const records = await this.recordManager.selectRecords(
      query.table,
      query.conditions,
      useAllColumns ? undefined : columns
    );

    // 转换为ResultSet格式
    let resultColumns: string[];
    if (useAllColumns) {
      resultColumns =
        records.length > 0 && records[0] ? Object.keys(records[0]) : [];
    } else {
      resultColumns =
        columns.length > 0
          ? columns
          : records.length > 0 && records[0]
            ? Object.keys(records[0])
            : [];
    }
    const rows = records.map((record) =>
      resultColumns.map((col) => record[col])
    );

    const executionTime = Date.now() - startTime;

    return {
      columns: resultColumns,
      rows,
      rowCount: records.length,
      executionTime,
    };
  }

  async query(
    tableName: string,
    options: any
  ): Promise<{ columns: string[]; rows: any[] }> {
    const result = await this.select({
      table: tableName,
      columns: options.columns,
      conditions: options.where,
      limit: options.limit,
      offset: options.offset,
    });

    return {
      columns: result.columns,
      rows: result.rows.map((row) => {
        const record: any = {};
        result.columns.forEach((col, index) => {
          record[col] = row[index];
        });
        return record;
      }),
    };
  }

  async update(
    tableName: string,
    updates: Record,
    conditions?: Condition[]
  ): Promise<number> {
    this.logger.debug("Updating records", { tableName });
    return await this.recordManager.updateRecords(
      tableName,
      updates,
      conditions
    );
  }

  async delete(tableName: string, conditions?: Condition[]): Promise<number> {
    this.logger.debug("Deleting records", { tableName });
    return await this.recordManager.deleteRecords(tableName, conditions);
  }

  async createIndex(options: {
    name: string;
    table: string;
    columns: string[];
    unique: boolean;
  }): Promise<void> {
    this.logger.info("Creating index", {
      indexName: options.name,
      tableName: options.table,
      columns: options.columns,
      unique: options.unique,
    });
    // 实际实现中应该创建索引结构
  }

  async dropIndex(indexName: string): Promise<void> {
    this.logger.info("Dropping index", { indexName });
    // 实际实现中应该删除索引结构
  }

  async listIndexes(tableName?: string): Promise<any[]> {
    this.logger.info("Listing indexes", { tableName });
    // 实际实现中应该返回索引列表
    return [];
  }

  async getIndexStats(indexName: string): Promise<any> {
    this.logger.info("Getting index stats", { indexName });
    // 实际实现中应该返回索引统计信息
    return {
      indexName,
      type: "B+Tree",
      recordCount: 0,
      size: 0,
    };
  }

  async beginTransaction(): Promise<number> {
    this.logger.debug("Beginning transaction");
    return Math.floor(Math.random() * 1000000); // 简单的事务ID生成
  }

  async commit(transactionId: number): Promise<void> {
    this.logger.debug("Committing transaction", { transactionId });
    // 实际实现中应该提交事务
  }

  async rollback(transactionId: number): Promise<void> {
    this.logger.debug("Rolling back transaction", { transactionId });
    // 实际实现中应该回滚事务
  }

  async listTables(): Promise<string[]> {
    this.logger.debug("Listing tables");
    // 返回所有已注册的表名
    return this.recordManager.getTableNames();
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    this.logger.debug("Getting table schema", { tableName });
    // 实际实现中应该返回表的完整结构
    throw new Error("Not implemented");
  }

  async getTableStats(tableName: string): Promise<any> {
    this.logger.debug("Getting table stats", { tableName });
    // 实际实现中应该返回表的统计信息
    return {
      tableName,
      recordCount: 0,
      indexCount: 0,
      size: 0,
    };
  }

  async getMetrics(): Promise<any> {
    this.logger.debug("Getting system metrics");
    const pageStats = await this.pageManager.getStats();

    return {
      database: this.currentDatabase,
      pageManager: pageStats,
      timestamp: new Date().toISOString(),
    };
  }

  async close(): Promise<void> {
    await this.pageManager.close();
    this.logger.info("StorageEngine closed");
  }
}
