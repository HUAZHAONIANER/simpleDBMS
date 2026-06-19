export abstract class ASTNode {
  constructor(
    public readonly type: string,
    public readonly line: number,
    public readonly column: number
  ) {}

  abstract accept<T>(visitor: ASTVisitor<T>): T;
}

export interface ASTVisitor<T> {
  visitCreateTable(node: CreateTableNode): T;
  visitDropTable(node: DropTableNode): T;
  visitCreateIndex(node: CreateIndexNode): T;
  visitDropIndex(node: DropIndexNode): T;
  visitSelect(node: SelectNode): T;
  visitInsert(node: InsertNode): T;
  visitUpdate(node: UpdateNode): T;
  visitDelete(node: DeleteNode): T;
  visitExpression(node: ExpressionNode): T;
  visitColumn(node: ColumnNode): T;
  visitTable(node: TableNode): T;
  visitLiteral(node: LiteralNode): T;
  visitAssignment(node: AssignmentNode): T;
  visitValueList(node: ValueListNode): T;
  visitLimitClause(node: LimitClauseNode): T;
  visitFromClause(node: FromClauseNode): T;
  visitJoin(node: JoinNode): T;
  visitWhereClause(node: WhereClauseNode): T;
  visitGroupByClause(node: GroupByClauseNode): T;
  visitHavingClause(node: HavingClauseNode): T;
  visitOrderByClause(node: OrderByClauseNode): T;
  visitOrderElement(node: OrderElementNode): T;
  visitFunctionCall(node: FunctionCallNode): T;
  visitBinaryExpression(node: BinaryExpressionNode): T;
  visitUnaryExpression(node: UnaryExpressionNode): T;
}

export class CreateTableNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly tableName: string,
    public readonly columns: ColumnDefinitionNode[],
    public readonly constraints: TableConstraintNode[]
  ) {
    super("CREATE_TABLE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitCreateTable(this);
  }
}

export class DropTableNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly tableName: string
  ) {
    super("DROP_TABLE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitDropTable(this);
  }
}

export class CreateIndexNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly indexName: string,
    public readonly tableName: string,
    public readonly columns: string[]
  ) {
    super("CREATE_INDEX", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitCreateIndex(this);
  }
}

export class DropIndexNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly indexName: string,
    public readonly tableName: string
  ) {
    super("DROP_INDEX", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitDropIndex(this);
  }
}

export class ColumnDefinitionNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly name: string,
    public readonly dataType: DataTypeNode,
    public readonly constraints: ColumnConstraintNode[]
  ) {
    super("COLUMN_DEFINITION", line, column);
  }

  accept<T>(_visitor: ASTVisitor<T>): T {
    throw new Error("ColumnDefinitionNode should not be visited directly");
  }
}

export class DataTypeNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly type: string,
    public readonly length?: number,
    public readonly precision?: number,
    public readonly scale?: number
  ) {
    super("DATA_TYPE", line, column);
  }

  accept<T>(_visitor: ASTVisitor<T>): T {
    throw new Error("DataTypeNode should not be visited directly");
  }
}

export class ColumnConstraintNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly type:
      | "PRIMARY_KEY"
      | "NOT_NULL"
      | "NULL"
      | "UNIQUE"
      | "DEFAULT"
      | "AUTO_INCREMENT",
    public readonly defaultValue?: LiteralNode
  ) {
    super("COLUMN_CONSTRAINT", line, column);
  }

  accept<T>(_visitor: ASTVisitor<T>): T {
    throw new Error("ColumnConstraintNode should not be visited directly");
  }
}

export class TableConstraintNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly type: "PRIMARY_KEY" | "FOREIGN_KEY" | "UNIQUE",
    public readonly columns: string[],
    public readonly referencedTable?: string,
    public readonly referencedColumns?: string[]
  ) {
    super("TABLE_CONSTRAINT", line, column);
  }

  accept<T>(_visitor: ASTVisitor<T>): T {
    throw new Error("TableConstraintNode should not be visited directly");
  }
}

export class SelectNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly selectList: SelectElementNode[],
    public readonly fromClause: FromClauseNode,
    public readonly whereClause?: WhereClauseNode,
    public readonly groupByClause?: GroupByClauseNode,
    public readonly havingClause?: HavingClauseNode,
    public readonly orderByClause?: OrderByClauseNode,
    public readonly limitClause?: LimitClauseNode
  ) {
    super("SELECT", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitSelect(this);
  }
}

export class SelectElementNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly expression: ExpressionNode,
    public readonly alias?: string
  ) {
    super("SELECT_ELEMENT", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitExpression(this.expression);
  }
}

export class FromClauseNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly table: TableNode,
    public readonly joins: JoinNode[]
  ) {
    super("FROM_CLAUSE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitFromClause(this);
  }
}

export class JoinNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly type: "INNER" | "LEFT" | "RIGHT" | "FULL",
    public readonly table: TableNode,
    public readonly condition: ExpressionNode
  ) {
    super("JOIN", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitJoin(this);
  }
}

export class WhereClauseNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly condition: ExpressionNode
  ) {
    super("WHERE_CLAUSE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitWhereClause(this);
  }
}

export class GroupByClauseNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly columns: ColumnNode[]
  ) {
    super("GROUP_BY_CLAUSE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitGroupByClause(this);
  }
}

export class HavingClauseNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly condition: ExpressionNode
  ) {
    super("HAVING_CLAUSE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitHavingClause(this);
  }
}

export class OrderByClauseNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly elements: OrderElementNode[]
  ) {
    super("ORDER_BY_CLAUSE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitOrderByClause(this);
  }
}

export class OrderElementNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly expression: ExpressionNode,
    public readonly direction: "ASC" | "DESC"
  ) {
    super("ORDER_ELEMENT", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitOrderElement(this);
  }
}

export class LimitClauseNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly limit: number,
    public readonly offset?: number
  ) {
    super("LIMIT_CLAUSE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitLimitClause(this);
  }
}

export class InsertNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly tableName: string,
    public readonly columns?: string[],
    public readonly values: ValueListNode[] = []
  ) {
    super("INSERT", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitInsert(this);
  }
}

export class ValueListNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly values: ExpressionNode[]
  ) {
    super("VALUE_LIST", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitValueList(this);
  }
}

export class UpdateNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly tableName: string,
    public readonly assignments: AssignmentNode[],
    public readonly whereClause?: WhereClauseNode
  ) {
    super("UPDATE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitUpdate(this);
  }
}

export class AssignmentNode extends ASTNode {
  constructor(
    line: number,
    col: number,
    public readonly columnName: string,
    public readonly value: ExpressionNode
  ) {
    super("ASSIGNMENT", line, col);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitAssignment(this);
  }
}

export class DeleteNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly tableName: string,
    public readonly whereClause?: WhereClauseNode
  ) {
    super("DELETE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitDelete(this);
  }
}

export class TableNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly name: string,
    public readonly alias?: string
  ) {
    super("TABLE", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitTable(this);
  }
}

export class ColumnNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly name: string,
    public readonly tableName?: string
  ) {
    super("COLUMN", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitColumn(this);
  }
}

export class LiteralNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly value: any,
    public readonly valueType: "STRING" | "NUMBER" | "BOOLEAN" | "NULL"
  ) {
    super("LITERAL", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitLiteral(this);
  }
}

export class FunctionCallNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly name: string,
    public readonly args: ExpressionNode[]
  ) {
    super("FUNCTION_CALL", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitFunctionCall(this);
  }
}

export class BinaryExpressionNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly left: ExpressionNode,
    public readonly operator: string,
    public readonly right: ExpressionNode
  ) {
    super("BINARY_EXPRESSION", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitBinaryExpression(this);
  }
}

export class UnaryExpressionNode extends ASTNode {
  constructor(
    line: number,
    column: number,
    public readonly operator: string,
    public readonly operand: ExpressionNode
  ) {
    super("UNARY_EXPRESSION", line, column);
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitUnaryExpression(this);
  }
}

export type ExpressionNode =
  | LiteralNode
  | ColumnNode
  | FunctionCallNode
  | BinaryExpressionNode
  | UnaryExpressionNode;

export class ASTUtils {
  static toString(node: ASTNode, indent: number = 0): string {
    const spaces = " ".repeat(indent * 2);
    let result = `${spaces}${node.type}`;

    if (node instanceof LiteralNode) {
      result += `: ${node.value}`;
    } else if (node instanceof ColumnNode) {
      result += `: ${node.tableName ? node.tableName + "." : ""}${node.name}`;
    } else if (node instanceof TableNode) {
      result += `: ${node.name}`;
    }

    return result;
  }

  static traverse(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);

    // 遍历子节点
    if (node instanceof SelectNode) {
      node.selectList.forEach((child) => this.traverse(child, callback));
      this.traverse(node.fromClause, callback);
      if (node.whereClause) this.traverse(node.whereClause, callback);
      if (node.groupByClause) this.traverse(node.groupByClause, callback);
      if (node.havingClause) this.traverse(node.havingClause, callback);
      if (node.orderByClause) this.traverse(node.orderByClause, callback);
    } else if (node instanceof BinaryExpressionNode) {
      this.traverse(node.left, callback);
      this.traverse(node.right, callback);
    } else if (node instanceof UnaryExpressionNode) {
      this.traverse(node.operand, callback);
    }
    // 其他节点类型的遍历逻辑...
  }

  static findNodesOfType(node: ASTNode, type: string): ASTNode[] {
    const results: ASTNode[] = [];
    this.traverse(node, (n) => {
      if (n.type === type) {
        results.push(n);
      }
    });
    return results;
  }
}
