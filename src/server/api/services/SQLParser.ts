import { ASTNode } from "../../sql/ast/ASTNode";
import { Logger } from "../../utils/Logger";

export class SQLParser {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("SQLParser");
  }

  async parse(sql: string): Promise<ASTNode> {
    try {
      this.logger.debug("Parsing SQL", { sql });

      // 简单的SQL解析实现
      // 实际项目中应该使用成熟的SQL解析库或自定义的解析器

      // 处理多个SQL语句，只取第一个
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (statements.length === 0) {
        throw new Error("Empty SQL statement");
      }

      // 使用第一个非空语句进行解析
      const statement = statements[0];

      // 移除可能的注释，使用正确的正则表达式
      let cleanSql = statement || "";

      // 移除块注释 (/* ... */)
      cleanSql = cleanSql.replace(/\/\*[\s\S]*?\*\//g, "");

      // 移除行注释 (-- ...) - 使用字符串方法替代正则表达式，避免换行符问题
      const lines = cleanSql.split("\n");
      const filteredLines = lines
        .map((line) => {
          const cleanLine = line ?? "";
          const parts = cleanLine.split("--");
          const firstPart = parts[0] ?? "";
          return firstPart.trim();
        })
        .filter((line) => line.length > 0);
      cleanSql = filteredLines.join(" ").trim();

      // 移除多余的空白字符，包括换行符
      cleanSql = cleanSql.replace(/\s+/g, " ").trim();

      if (!cleanSql) {
        throw new Error("Empty SQL statement after removing comments");
      }

      // 使用清理后的SQL语句来检查语句类型
      const trimmedSql = cleanSql.toUpperCase();

      this.logger.debug("Cleaned SQL:", { cleanSql, trimmedSql });

      // 解析SELECT语句
      if (trimmedSql.startsWith("SELECT")) {
        return this.parseSelect(cleanSql);
      }

      // 解析INSERT语句
      if (trimmedSql.startsWith("INSERT")) {
        const ast = this.parseInsert(cleanSql);
        this.logger.debug("Insert AST:", { ast });
        return ast;
      }

      // 解析UPDATE语句
      if (trimmedSql.startsWith("UPDATE")) {
        return this.parseUpdate(cleanSql);
      }

      // 解析DELETE语句
      if (trimmedSql.startsWith("DELETE")) {
        return this.parseDelete(cleanSql);
      }

      // 解析CREATE TABLE语句
      if (trimmedSql.startsWith("CREATE TABLE")) {
        return this.parseCreateTable(cleanSql);
      }

      // 解析DROP TABLE语句
      if (trimmedSql.startsWith("DROP TABLE")) {
        return this.parseDropTable(cleanSql);
      }

      // 解析其他CREATE语句
      if (trimmedSql.startsWith("CREATE")) {
        throw new Error(
          `CREATE statement not supported yet: ${trimmedSql.substring(0, 20)}...`
        );
      }

      // 解析其他DROP语句
      if (trimmedSql.startsWith("DROP")) {
        throw new Error(
          `DROP statement not supported yet: ${trimmedSql.substring(0, 20)}...`
        );
      }

      // 解析其他ALTER语句
      if (trimmedSql.startsWith("ALTER")) {
        throw new Error(
          `ALTER statement not supported yet: ${trimmedSql.substring(0, 20)}...`
        );
      }

      // 解析其他TRUNCATE语句
      if (trimmedSql.startsWith("TRUNCATE")) {
        throw new Error(
          `TRUNCATE statement not supported yet: ${trimmedSql.substring(0, 20)}...`
        );
      }

      // 解析其他BEGIN语句
      if (trimmedSql.startsWith("BEGIN")) {
        throw new Error(
          `BEGIN statement not supported yet: ${trimmedSql.substring(0, 20)}...`
        );
      }

      // 解析其他COMMIT语句
      if (trimmedSql.startsWith("COMMIT")) {
        throw new Error(
          `COMMIT statement not supported yet: ${trimmedSql.substring(0, 20)}...`
        );
      }

      // 解析其他ROLLBACK语句
      if (trimmedSql.startsWith("ROLLBACK")) {
        throw new Error(
          `ROLLBACK statement not supported yet: ${trimmedSql.substring(0, 20)}...`
        );
      }

      // 提供更友好的错误信息
      const firstWord = trimmedSql.split(/\s+/)[0];
      throw new Error(`Unsupported SQL statement: ${firstWord}`);
    } catch (error) {
      this.logger.error("SQL parsing failed", { error, sql });
      throw error;
    }
  }

  private parseSelect(sql: string): ASTNode {
    // 简单的SELECT语句解析，返回符合SelectNode定义的AST结构
    let tableName = "test_table";

    // 尝试从SQL中提取表名
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (fromMatch && fromMatch[1]) {
      tableName = fromMatch[1];
    }

    // 提取选择的列
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
    let selectList: any[] = [];
    if (selectMatch && selectMatch[1]) {
      const columns = selectMatch[1].split(",").map((col) => col.trim());
      selectList = columns.map((col) => {
        return {
          type: "SELECT_ELEMENT",
          expression: {
            type: "COLUMN",
            name: col,
            line: 1,
            column: 1,
          },
          line: 1,
          column: 1,
        };
      });
    } else {
      // 默认选择所有列
      selectList = [
        {
          type: "SELECT_ELEMENT",
          expression: {
            type: "STAR",
            line: 1,
            column: 1,
          },
          line: 1,
          column: 1,
        },
      ];
    }

    // 返回符合SelectNode定义的AST结构
    // 注意：这是一个简化的实现，实际项目中应该使用完整的AST构建
    return {
      type: "SELECT",
      line: 1,
      column: 1,
      selectList: selectList,
      fromClause: {
        type: "FROM_CLAUSE",
        line: 1,
        column: 1,
        table: {
          type: "TABLE",
          line: 1,
          column: 1,
          name: tableName,
          alias: undefined,
        },
        joins: [],
      },
      whereClause: undefined,
      groupByClause: undefined,
      havingClause: undefined,
      orderByClause: undefined,
      limitClause: undefined,
      accept: () => null,
    } as any;
  }

  private parseInsert(sql: string): ASTNode {
    // 简单的INSERT语句解析
    let tableName = "test_table";

    // 尝试从SQL中提取表名
    const intoMatch = sql.match(/INTO\s+(\w+)/i);
    if (intoMatch && intoMatch[1]) {
      tableName = intoMatch[1];
    }

    // 尝试解析列名
    const columnsMatch = sql.match(/\(([^)]+)\)\s+VALUES/);
    let columns: { name: string }[] = [];
    if (columnsMatch && columnsMatch[1]) {
      columns = columnsMatch[1].split(",").map((col) => {
        return { name: col.trim() };
      });
    }

    // 尝试解析值
    const valuesMatch = sql.match(/VALUES\s+\(([^)]+)\)/i);
    let values: { values: { value: any }[] }[] = [];
    if (valuesMatch && valuesMatch[1]) {
      const valueList = valuesMatch[1].split(",").map((val) => {
        val = val.trim();
        // 处理引号包裹的值
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          return { value: val.substring(1, val.length - 1) };
        }
        // 处理数字
        if (!isNaN(Number(val))) {
          return { value: Number(val) };
        }
        return { value: val };
      });
      values = [{ values: valueList }];
    }

    return {
      type: "INSERT",
      line: 1,
      column: 1,
      table: {
        type: "TABLE",
        line: 1,
        column: 1,
        name: tableName,
        alias: undefined,
      },
      columns,
      values,
      accept: () => null,
    } as any;
  }

  private parseUpdate(sql: string): ASTNode {
    // 简单的UPDATE语句解析
    let tableName = "test_table";

    // 尝试从SQL中提取表名
    const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (updateMatch && updateMatch[1]) {
      tableName = updateMatch[1];
    }

    return {
      type: "UPDATE",
      line: 1,
      column: 1,
      table: {
        type: "TABLE",
        line: 1,
        column: 1,
        name: tableName,
        alias: undefined,
      },
      assignments: [],
      whereClause: undefined,
      accept: () => null,
    } as any;
  }

  private parseDelete(sql: string): ASTNode {
    // 简单的DELETE语句解析
    let tableName = "test_table";

    // 尝试从SQL中提取表名
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (fromMatch && fromMatch[1]) {
      tableName = fromMatch[1];
    }

    return {
      type: "DELETE",
      line: 1,
      column: 1,
      table: {
        type: "TABLE",
        line: 1,
        column: 1,
        name: tableName,
        alias: undefined,
      },
      whereClause: undefined,
      accept: () => null,
    } as any;
  }

  private parseCreateTable(sql: string): ASTNode {
    // 简单的CREATE TABLE语句解析
    let tableName = "test_table";

    // 尝试从SQL中提取表名
    const tableMatch = sql.match(/CREATE\s+TABLE\s+(\w+)/i);
    if (tableMatch && tableMatch[1]) {
      tableName = tableMatch[1];
    }

    // 尝试解析表的列定义
    const columnsMatch = sql.match(/\(([^)]+)\)/);
    let columns: any[] = [];
    if (columnsMatch && columnsMatch[1]) {
      // 提取列定义字符串
      const columnsStr = columnsMatch[1];
      // 简单按逗号分割列定义
      const columnDefs = columnsStr.split(",").map((colDef) => colDef.trim());

      columns = columnDefs.map((colDef) => {
        // 解析列名和数据类型
        const colParts = colDef.split(/\s+/).filter(Boolean);
        if (colParts.length < 2) {
          throw new Error(`Invalid column definition: ${colDef}`);
        }

        const colName = colParts[0];
        let dataTypePart = colParts[1].toUpperCase();
        let dataType = dataTypePart;
        let length: number | undefined;

        // 处理带长度的数据类型，如VARCHAR(50)
        const typeMatch = dataTypePart.match(/(\w+)\((\d+)/);
        if (typeMatch) {
          dataType = typeMatch[1];
          length = Number(typeMatch[2]);
        } else {
          // 处理不带长度的数据类型，如INTEGER, BIGINT
          // 移除可能存在的右括号
          dataType = dataTypePart.replace(/\)/g, "");
        }

        // 解析约束
        const constraints = colParts.slice(2).map((constraint) => {
          const constType = constraint.toUpperCase();
          return { type: constType };
        });

        return {
          name: colName,
          dataType: {
            type: dataType,
            length: length,
          },
          constraints: constraints,
        };
      });
    }

    return {
      type: "CREATE_TABLE",
      line: 1,
      column: 1,
      table: {
        type: "TABLE",
        line: 1,
        column: 1,
        name: tableName,
        alias: undefined,
      },
      columns: columns,
      constraints: [],
      accept: () => null,
    } as any;
  }

  private parseDropTable(sql: string): ASTNode {
    // 简单的DROP TABLE语句解析
    let tableName = "test_table";

    // 尝试从SQL中提取表名
    const tableMatch = sql.match(/DROP\s+TABLE\s+(\w+)/i);
    if (tableMatch && tableMatch[1]) {
      tableName = tableMatch[1];
    }

    return {
      type: "DROP_TABLE",
      line: 1,
      column: 1,
      table: {
        type: "TABLE",
        line: 1,
        column: 1,
        name: tableName,
        alias: undefined,
      },
      accept: () => null,
    } as any;
  }
}
