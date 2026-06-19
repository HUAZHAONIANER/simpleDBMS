export type PageId = number;
export type RowId = number;
export type TransactionId = number;
export const PAGE_SIZE = 4096;
export enum PageType {
  DATA_PAGE = "DATA_PAGE", // 数据页面
  INDEX_PAGE = "INDEX_PAGE", // 索引页面
  OVERFLOW_PAGE = "OVERFLOW_PAGE", // 溢出页面
  FREE_PAGE = "FREE_PAGE", // 空闲页面
}

export enum DataType {
  INTEGER = "INTEGER",
  BIGINT = "BIGINT",
  VARCHAR = "VARCHAR",
  BOOLEAN = "BOOLEAN",
  DECIMAL = "DECIMAL",
  DATE = "DATE",
  TIMESTAMP = "TIMESTAMP",
}

export interface FieldDefinition {
  name: string;
  type: DataType;
  length?: number; // VARCHAR长度
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue?: any;
}

export interface TableSchema {
  name: string;
  fields: FieldDefinition[];
  primaryKey?: string[];
  indexes?: string[];
}

export interface Record {
  [fieldName: string]: any;
}

export interface ResultSet {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

export interface PageHeader {
  pageId: PageId;
  pageType: PageType;
  freeSpace: number;
  recordCount: number;
  nextPage?: PageId;
  prevPage?: PageId;
}

export interface StorageEngine {
  createDatabase(name: string, config: any): Promise<void>;
  dropDatabase(name: string): Promise<void>;
  useDatabase(database: string): Promise<void>;
  listDatabases(): Promise<string[]>;
  getDatabaseStats(name: string): Promise<any>;
  createTable(schema: TableSchema): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  listTables(): Promise<string[]>;
  getTableSchema(tableName: string): Promise<TableSchema>;
  getTableStats(tableName: string): Promise<any>;
  insert(tableName: string, record: Record): Promise<RowId>;
  batchInsert(tableName: string, records: Record[]): Promise<RowId[]>;
  select(query: Query): Promise<ResultSet>;
  update(
    tableName: string,
    updates: Record,
    conditions?: Condition[]
  ): Promise<number>;
  delete(tableName: string, conditions?: Condition[]): Promise<number>;
  createIndex(options: {
    name: string;
    table: string;
    columns: string[];
    unique: boolean;
  }): Promise<void>;
  dropIndex(indexName: string): Promise<void>;
  listIndexes(tableName?: string): Promise<any[]>;
  getIndexStats(indexName: string): Promise<any>;
  beginTransaction(): Promise<TransactionId>;
  commit(transactionId: TransactionId): Promise<void>;
  rollback(transactionId: TransactionId): Promise<void>;
  close(): Promise<void>;
}

export interface Condition {
  column: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "like" | "in";
  value: any;
}

export interface Query {
  table: string;
  columns?: string[];
  conditions?: Condition[];
  joins?: Join[];
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
}

export interface Join {
  type: "inner" | "left" | "right" | "full";
  table: string;
  conditions: Condition[];
}

export interface OrderBy {
  column: string;
  direction: "asc" | "desc";
}

export interface Page {
  header: PageHeader;
  data: Buffer;
}

export interface BufferPool {
  getPage(pageId: PageId): Promise<Page>;
  createPage(type: PageType): Promise<Page>;
  releasePage(pageId: PageId): Promise<void>;
  flushPage(pageId: PageId): Promise<void>;
  getStats(): BufferPoolStats;
}

export interface BufferPoolStats {
  totalPages: number;
  usedPages: number;
  hitRate: number;
  missRate: number;
}

export interface Index {
  insert(key: any, rowId: RowId): Promise<void>;
  delete(key: any, rowId: RowId): Promise<void>;
  rangeScan(start: any, end: any): Promise<RowId[]>;
  pointQuery(key: any): Promise<RowId[]>;
}

export interface StorageConfig {
  dataDirectory: string;
  bufferPoolSize: number; // 缓冲区页面数量
  maxConnections: number;
  walEnabled: boolean;
  autoCommit: boolean;
}
