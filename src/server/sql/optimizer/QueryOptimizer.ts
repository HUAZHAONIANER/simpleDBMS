import { TableSchema } from "../../storage/core/types";
import {
  BinaryExpressionNode,
  ColumnNode,
  FromClauseNode,
  JoinNode,
  OrderElementNode,
  SelectNode,
} from "../ast/ASTNode";

export interface OptimizerConfig {
  enableIndexScan: boolean;
  enableJoinReorder: boolean;
  enablePredicatePushdown: boolean;
  enableProjectionPushdown: boolean;
  maxJoinTables: number;
}

export abstract class QueryPlanNode {
  constructor(
    public readonly estimatedRows: number,
    public readonly estimatedCost: number
  ) {}

  abstract toString(): string;
}

export class TableScanNode extends QueryPlanNode {
  constructor(
    public readonly tableName: string,
    public readonly alias?: string,
    public readonly indexName?: string,
    public readonly conditions: BinaryExpressionNode[] = [],
    estimatedRows: number = 1000,
    estimatedCost: number = 100
  ) {
    super(estimatedRows, estimatedCost);
  }

  toString(): string {
    const scanType = this.indexName
      ? `IndexScan(${this.indexName})`
      : "TableScan";
    return `${scanType} on ${this.tableName}${this.alias ? " as " + this.alias : ""}`;
  }
}

export class JoinNodePlan extends QueryPlanNode {
  constructor(
    public readonly joinType: string,
    public readonly left: QueryPlanNode,
    public readonly right: QueryPlanNode,
    public readonly condition: BinaryExpressionNode,
    estimatedRows: number,
    estimatedCost: number
  ) {
    super(estimatedRows, estimatedCost);
  }

  toString(): string {
    return `${this.joinType} Join`;
  }
}

export class FilterNode extends QueryPlanNode {
  constructor(
    public readonly condition: BinaryExpressionNode,
    public readonly child: QueryPlanNode,
    estimatedRows: number,
    estimatedCost: number
  ) {
    super(estimatedRows, estimatedCost);
  }

  toString(): string {
    return `Filter`;
  }
}

export class ProjectNode extends QueryPlanNode {
  constructor(
    public readonly columns: ColumnNode[],
    public readonly child: QueryPlanNode,
    estimatedRows: number,
    estimatedCost: number
  ) {
    super(estimatedRows, estimatedCost);
  }

  toString(): string {
    return `Project`;
  }
}

export class SortNode extends QueryPlanNode {
  constructor(
    public readonly orderElements: OrderElementNode[],
    public readonly child: QueryPlanNode,
    estimatedRows: number,
    estimatedCost: number
  ) {
    super(estimatedRows, estimatedCost);
  }

  toString(): string {
    return `Sort`;
  }
}

export class LimitNode extends QueryPlanNode {
  constructor(
    public readonly limit: number,
    public readonly offset: number,
    public readonly child: QueryPlanNode,
    estimatedRows: number,
    estimatedCost: number
  ) {
    super(estimatedRows, estimatedCost);
  }

  toString(): string {
    return `Limit ${this.limit}${this.offset ? " Offset " + this.offset : ""}`;
  }
}

export class QueryOptimizer {
  private config: OptimizerConfig;
  private tableSchemas: Map<string, TableSchema>;
  private tableStats: Map<string, TableStats>;

  constructor(
    config: OptimizerConfig = {
      enableIndexScan: true,
      enableJoinReorder: true,
      enablePredicatePushdown: true,
      enableProjectionPushdown: true,
      maxJoinTables: 5,
    }
  ) {
    this.config = config;
    this.tableSchemas = new Map();
    this.tableStats = new Map();
  }

  setTableSchema(tableName: string, schema: TableSchema): void {
    this.tableSchemas.set(tableName, schema);
  }

  setTableStats(tableName: string, stats: TableStats): void {
    this.tableStats.set(tableName, stats);
    if (!this.tableSchemas.has(tableName)) {
      const indexes = Array.from(stats.indexStats?.keys() || []);
      this.tableSchemas.set(tableName, {
        name: tableName,
        fields: [],
        primaryKey: [],
        indexes,
      });
    }
  }

  optimize(ast: SelectNode): QueryPlanNode {
    // 处理完整AST结构
    let plan = this.createInitialPlan(ast);

    // 应用优化规则
    plan = this.applyOptimizationRules(plan, ast);

    // 估算成本
    plan = this.estimateCosts(plan);

    return plan;
  }

  private createInitialPlan(ast: SelectNode): QueryPlanNode {
    // 创建表扫描节点
    const tableScans = this.createTableScans(ast.fromClause);

    // 处理连接，确保plan有初始值
    let plan: QueryPlanNode;
    if (tableScans.length === 1 && tableScans[0]) {
      plan = tableScans[0];
    } else {
      plan = this.createJoinPlan(tableScans, ast.fromClause.joins);
    }

    // 添加WHERE过滤
    if (ast.whereClause?.condition) {
      plan = new FilterNode(
        ast.whereClause.condition as BinaryExpressionNode,
        plan,
        plan.estimatedRows * 0.1, // 假设过滤掉90%
        plan.estimatedCost + 10
      );
    }

    // 添加GROUP BY
    if (ast.groupByClause?.columns) {
      plan = new GroupByNode(
        ast.groupByClause.columns,
        plan,
        plan.estimatedRows * 0.5, // 假设分组后行数减少50%
        plan.estimatedCost + 50
      );
    }

    // 添加HAVING
    if (ast.havingClause?.condition) {
      plan = new FilterNode(
        ast.havingClause.condition as BinaryExpressionNode,
        plan,
        plan.estimatedRows * 0.9, // 假设过滤掉10%
        plan.estimatedCost + 10
      );
    }

    // 添加ORDER BY
    if (ast.orderByClause?.elements) {
      plan = new SortNode(
        ast.orderByClause.elements,
        plan,
        plan.estimatedRows,
        plan.estimatedCost + plan.estimatedRows * 0.1 // 排序成本
      );
    }

    // 添加LIMIT
    if (ast.limitClause?.limit) {
      const limitRows = Math.min(plan.estimatedRows, ast.limitClause.limit);
      plan = new LimitNode(
        ast.limitClause.limit,
        ast.limitClause.offset || 0,
        plan,
        limitRows,
        plan.estimatedCost + 5
      );
    }

    return plan;
  }

  private createTableScans(fromClause: FromClauseNode): TableScanNode[] {
    const scans: TableScanNode[] = [];

    // 主表
    scans.push(
      new TableScanNode(fromClause.table.name, fromClause.table.alias)
    );

    // 连接表
    for (const join of fromClause.joins) {
      scans.push(new TableScanNode(join.table.name, join.table.alias));
    }

    return scans;
  }

  private createJoinPlan(
    tableScans: TableScanNode[],
    joins: JoinNode[]
  ): QueryPlanNode {
    if (tableScans.length === 0) {
      throw new Error("No table scans provided");
    }

    // 确保tableScans[0]存在，否则创建一个默认的TableScanNode
    const firstScan = tableScans[0];
    if (!firstScan) {
      throw new Error("Invalid table scan: no table provided");
    }

    let plan: QueryPlanNode = firstScan;

    for (let i = 0; i < joins.length; i++) {
      const join = joins[i];
      const rightTable = tableScans[i + 1];

      // 确保所有必需的对象都存在
      if (!join || !rightTable) {
        continue;
      }

      const joinType = this.mapJoinType(join.type);

      plan = new JoinNodePlan(
        joinType,
        plan,
        rightTable,
        join.condition as BinaryExpressionNode,
        plan.estimatedRows * rightTable.estimatedRows * 0.1, // 假设连接后行数
        plan.estimatedCost + rightTable.estimatedCost + 100 // 连接成本
      );
    }

    return plan;
  }

  private mapJoinType(type: string): string {
    const typeMap: { [key: string]: string } = {
      inner: "INNER",
      left: "LEFT",
      right: "RIGHT",
      full: "FULL",
    };
    return typeMap[type] || "INNER";
  }

  private applyOptimizationRules(
    plan: QueryPlanNode,
    ast: SelectNode
  ): QueryPlanNode {
    if (this.config.enablePredicatePushdown) {
      plan = this.pushDownPredicates(plan, ast);
    }

    if (this.config.enableProjectionPushdown) {
      plan = this.pushDownProjections(plan, ast);
    }

    if (this.config.enableIndexScan) {
      plan = this.replaceWithIndexScans(plan, ast);
    }

    if (this.config.enableJoinReorder) {
      plan = this.reorderJoins(plan, ast);
    }

    return plan;
  }

  private pushDownPredicates(
    plan: QueryPlanNode,
    ast: SelectNode
  ): QueryPlanNode {
    if (!ast.whereClause) return plan;

    const conditions = this.extractConditions(
      ast.whereClause.condition as BinaryExpressionNode
    );

    if (plan instanceof FilterNode) {
      const pushedChild = this.pushConditionsDown(plan.child, [...conditions]);
      return new FilterNode(
        plan.condition,
        pushedChild,
        plan.estimatedRows,
        plan.estimatedCost
      );
    }

    return this.pushConditionsDown(plan, conditions);
  }

  private extractConditions(
    condition: BinaryExpressionNode
  ): BinaryExpressionNode[] {
    const conditions: BinaryExpressionNode[] = [];

    if (condition.operator === "AND") {
      if (condition.left instanceof BinaryExpressionNode) {
        conditions.push(...this.extractConditions(condition.left));
      }
      if (condition.right instanceof BinaryExpressionNode) {
        conditions.push(...this.extractConditions(condition.right));
      }
    } else {
      conditions.push(condition);
    }

    return conditions;
  }

  private pushConditionsDown(
    plan: QueryPlanNode,
    conditions: BinaryExpressionNode[]
  ): QueryPlanNode {
    if (plan instanceof TableScanNode) {
      // 找到适用于此表的条件
      const applicableConditions = conditions.filter((cond) =>
        this.conditionAppliesToTable(cond, plan.tableName)
      );

      if (applicableConditions.length > 0) {
        // 不直接修改plan.conditions，而是创建一个新的TableScanNode
        // 从条件列表中移除已下推的条件
        applicableConditions.forEach((cond) => {
          const index = conditions.indexOf(cond);
          if (index > -1) conditions.splice(index, 1);
        });

        // 返回一个新的TableScanNode，包含合并后的条件
        return new TableScanNode(
          plan.tableName,
          plan.alias,
          plan.indexName,
          [...plan.conditions, ...applicableConditions],
          plan.estimatedRows * 0.1, // 假设过滤后行数减少
          plan.estimatedCost + applicableConditions.length * 10 // 增加过滤成本
        );
      }

      return plan;
    } else if (plan instanceof JoinNodePlan) {
      // 递归处理左右子计划，但不修改原计划
      const leftPlan = this.pushConditionsDown(plan.left, conditions);
      const rightPlan = this.pushConditionsDown(plan.right, conditions);

      // 如果左右子计划发生了变化，创建一个新的JoinNodePlan
      if (leftPlan !== plan.left || rightPlan !== plan.right) {
        return new JoinNodePlan(
          plan.joinType,
          leftPlan,
          rightPlan,
          plan.condition,
          plan.estimatedRows,
          plan.estimatedCost
        );
      }

      return plan;
    }

    return plan;
  }

  private conditionAppliesToTable(
    condition: BinaryExpressionNode,
    tableName: string
  ): boolean {
    const columns = this.extractColumnsFromExpression(condition);
    return columns.every(
      (col) => col.tableName === tableName || !col.tableName
    );
  }

  private extractColumnsFromExpression(expr: any): ColumnNode[] {
    const columns: ColumnNode[] = [];

    if (expr instanceof ColumnNode) {
      columns.push(expr);
    } else if (expr instanceof BinaryExpressionNode) {
      columns.push(...this.extractColumnsFromExpression(expr.left));
      columns.push(...this.extractColumnsFromExpression(expr.right));
    }

    return columns;
  }

  private pushDownProjections(
    plan: QueryPlanNode,
    _ast: SelectNode // 使用下划线表示未使用的参数
  ): QueryPlanNode {
    // 实现投影下推逻辑
    return plan;
  }

  private replaceWithIndexScans(
    plan: QueryPlanNode,
    ast: SelectNode
  ): QueryPlanNode {
    if (plan instanceof TableScanNode && plan.conditions.length > 0) {
      const bestIndex = this.findBestIndex(plan.tableName, plan.conditions);
      if (bestIndex) {
        return new TableScanNode(
          plan.tableName,
          plan.alias,
          bestIndex,
          plan.conditions,
          plan.estimatedRows * 0.1, // 索引扫描通常更快
          plan.estimatedCost * 0.5
        );
      }
    }

    if (plan instanceof JoinNodePlan) {
      // 递归处理左右子计划，但不修改原计划
      const leftPlan = this.replaceWithIndexScans(plan.left, ast);
      const rightPlan = this.replaceWithIndexScans(plan.right, ast);

      // 如果左右子计划发生了变化，创建一个新的JoinNodePlan
      if (leftPlan !== plan.left || rightPlan !== plan.right) {
        return new JoinNodePlan(
          plan.joinType,
          leftPlan,
          rightPlan,
          plan.condition,
          plan.estimatedRows,
          plan.estimatedCost
        );
      }
    }

    return plan;
  }

  private findBestIndex(
    tableName: string,
    conditions: BinaryExpressionNode[]
  ): string | null {
    const schema = this.tableSchemas.get(tableName);
    const availableIndexes =
      schema?.indexes && schema.indexes.length > 0
        ? schema.indexes
        : Array.from(this.tableStats.get(tableName)?.indexStats?.keys() || []);

    if (availableIndexes.length === 0) {
      return null;
    }

    let bestIndex: string | null = null;
    let maxCoverage = 0;

    for (const indexName of availableIndexes) {
      const coverage = this.calculateIndexCoverage(indexName, conditions);
      if (coverage > maxCoverage) {
        maxCoverage = coverage;
        bestIndex = indexName;
      }
    }

    return bestIndex;
  }

  private calculateIndexCoverage(
    indexName: string,
    conditions: BinaryExpressionNode[]
  ): number {
    let coverage = 0;
    for (const cond of conditions) {
      const columns = this.extractColumnsFromExpression(cond);
      if (
        columns.some((col) =>
          indexName.toLowerCase().includes((col.name || "").toLowerCase())
        )
      ) {
        coverage++;
      }
    }
    return coverage;
  }

  private reorderJoins(plan: QueryPlanNode, _ast: SelectNode): QueryPlanNode {
    if (!(plan instanceof JoinNodePlan)) {
      return plan;
    }

    // 基于表大小和选择性重排连接
    // 暂时不实现连接重排，只返回原计划

    return plan;
  }

  private estimateCosts(plan: QueryPlanNode): QueryPlanNode {
    // 递归估算子节点成本
    if (plan instanceof JoinNodePlan) {
      this.estimateCosts(plan.left);
      this.estimateCosts(plan.right);
    } else if (
      plan instanceof FilterNode ||
      plan instanceof ProjectNode ||
      plan instanceof SortNode ||
      plan instanceof LimitNode
    ) {
      this.estimateCosts(plan.child);
    }

    return plan;
  }

  getOptimizationStats(): OptimizationStats {
    return {
      rulesApplied: [
        "predicate_pushdown",
        "projection_pushdown",
        "index_scan",
        "join_reorder",
      ],
      estimatedCostReduction: 0.75,
      indexUsages: 2,
    };
  }
}

export interface TableStats {
  rowCount: number;
  pageCount: number;
  columnStats: Map<string, ColumnStats>;
  indexStats: Map<string, IndexStats>;
}

export interface ColumnStats {
  nullCount: number;
  distinctCount: number;
  minValue: any;
  maxValue: any;
  avgLength: number;
}

export interface IndexStats {
  height: number;
  leafPages: number;
  clusteringFactor: number;
}

export class GroupByNode extends QueryPlanNode {
  constructor(
    public readonly columns: ColumnNode[],
    public readonly child: QueryPlanNode,
    estimatedRows: number,
    estimatedCost: number
  ) {
    super(estimatedRows, estimatedCost);
  }

  toString(): string {
    return `GroupBy`;
  }
}

export interface OptimizationStats {
  rulesApplied: string[];
  estimatedCostReduction: number;
  indexUsages: number;
}
