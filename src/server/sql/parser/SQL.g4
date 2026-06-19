/**
 * SQL语法定义文件
 * 基于ANTLR4的SQL解析器语法
 * 支持基本的SQL操作：CREATE, INSERT, SELECT, UPDATE, DELETE
 */

grammar SQL;

// Parser Rules

// 根规则
sqlStatement
    : ddlStatement
    | dmlStatement
    | transactionStatement
    ;

// 数据定义语言 (DDL)
ddlStatement
    : createTable
    | dropTable
    | createIndex
    | dropIndex
    ;

createTable
    : CREATE TABLE tableName=identifier '(' columnDefinition (',' columnDefinition)* (',' tableConstraint)* ')'
    ;

columnDefinition
    : columnName=identifier dataType (columnConstraint)*
    ;

columnConstraint
    : PRIMARY KEY
    | NOT NULL
    | NULL
    | UNIQUE
    | DEFAULT defaultValue=literal
    | AUTO_INCREMENT
    ;

tableConstraint
    : PRIMARY KEY '(' columnName (',' columnName)* ')'
    | FOREIGN KEY '(' columnName (',' columnName)* ')' REFERENCES tableName=identifier '(' columnName (',' columnName)* ')'
    | UNIQUE '(' columnName (',' columnName)* ')'
    ;

dropTable
    : DROP TABLE tableName=identifier
    ;

createIndex
    : CREATE INDEX indexName=identifier ON tableName=identifier '(' columnName (',' columnName)* ')'
    ;

dropIndex
    : DROP INDEX indexName=identifier ON tableName=identifier
    ;

// 数据操作语言 (DML)
dmlStatement
    : selectStatement
    | insertStatement
    | updateStatement
    | deleteStatement
    ;

selectStatement
    : SELECT selectList
      FROM tableName=identifier
      (joinClause)*
      (WHERE whereCondition=expression)?
      (GROUP BY groupByColumns=columnList)?
      (HAVING havingCondition=expression)?
      (ORDER BY orderByColumns=orderList)?
      (LIMIT limitValue=integerValue (OFFSET offsetValue=integerValue)?)?
    ;

selectList
    : '*'
    | columnList
    ;

columnList
    : columnElement (',' columnElement)*
    ;

columnElement
    : expression (AS alias=identifier)?
    ;

joinClause
    : joinType=joinType JOIN joinedTable=identifier ON joinCondition=expression
    ;

joinType
    : INNER
    | LEFT OUTER?
    | RIGHT OUTER?
    | FULL OUTER?
    ;

orderList
    : orderElement (',' orderElement)*
    ;

orderElement
    : expression (ASC | DESC)?
    ;

insertStatement
    : INSERT INTO tableName=identifier ('(' columnList ')')? VALUES insertValues
    ;

insertValues
    : '(' valueList ')' (',' '(' valueList ')')*
    ;

valueList
    : expression (',' expression)*
    ;

updateStatement
    : UPDATE tableName=identifier SET updateElement (',' updateElement)* (WHERE whereCondition=expression)?
    ;

updateElement
    : columnName=identifier '=' newValue=expression
    ;

deleteStatement
    : DELETE FROM tableName=identifier (WHERE whereCondition=expression)?
    ;

// 事务语句
transactionStatement
    : BEGIN TRANSACTION
    | COMMIT
    | ROLLBACK
    ;

// 表达式
expression
    : booleanExpression
    ;

booleanExpression
    : booleanExpression OR booleanExpression
    | booleanExpression AND booleanExpression
    | NOT booleanExpression
    | predicate
    ;

predicate
    : comparisonPredicate
    | betweenPredicate
    | inPredicate
    | likePredicate
    | isNullPredicate
    | valueExpression
    ;

comparisonPredicate
    : valueExpression comparisonOperator valueExpression
    ;

betweenPredicate
    : valueExpression NOT? BETWEEN valueExpression AND valueExpression
    ;

inPredicate
    : valueExpression NOT? IN '(' valueList ')'
    | valueExpression NOT? IN subquery
    ;

likePredicate
    : valueExpression NOT? LIKE pattern=valueExpression
    ;

isNullPredicate
    : valueExpression IS NOT? NULL
    ;

valueExpression
    : numericExpression
    ;

numericExpression
    : numericExpression '+' numericExpression
    | numericExpression '-' numericExpression
    | numericExpression '*' numericExpression
    | numericExpression '/' numericExpression
    | numericExpression '%' numericExpression
    | '-' numericExpression
    | primaryExpression
    ;

primaryExpression
    : literal
    | columnReference
    | functionCall
    | '(' expression ')'
    | caseExpression
    | castExpression
    ;

columnReference
    : (tableName=identifier '.')? columnName=identifier
    ;

functionCall
    : functionName=identifier '(' (expression (',' expression)*)? ')'
    ;

caseExpression
    : CASE expression? (WHEN expression THEN expression)+ (ELSE expression)? END
    ;

castExpression
    : CAST '(' expression AS dataType ')'
    ;

// 比较操作符
comparisonOperator
    : '='
    | '!='
    | '<>'
    | '<'
    | '<='
    | '>'
    | '>='
    ;

// 数据类型
dataType
    : INT
    | INTEGER
    | BIGINT
    | VARCHAR '(' length=integerValue ')'
    | CHAR '(' length=integerValue ')'
    | DECIMAL '(' precision=integerValue (',' scale=integerValue)? ')'
    | BOOLEAN
    | DATE
    | TIMESTAMP
    ;

// 字面量
literal
    : stringValue
    | numericValue
    | booleanValue
    | NULL
    ;

stringValue
    : STRING_LITERAL
    ;

numericValue
    : integerValue
    | decimalValue
    ;

integerValue
    : INTEGER_LITERAL
    ;

decimalValue
    : DECIMAL_LITERAL
    ;

booleanValue
    : TRUE
    | FALSE
    ;

// 标识符
identifier
    : IDENTIFIER
    | QUOTED_IDENTIFIER
    ;

// Lexer Rules

// 关键字
CREATE: 'CREATE' | 'create';
DROP: 'DROP' | 'drop';
TABLE: 'TABLE' | 'table';
INDEX: 'INDEX' | 'index';
SELECT: 'SELECT' | 'select';
FROM: 'FROM' | 'from';
WHERE: 'WHERE' | 'where';
ORDER: 'ORDER' | 'order';
BY: 'BY' | 'by';
GROUP: 'GROUP' | 'group';
HAVING: 'HAVING' | 'having';
LIMIT: 'LIMIT' | 'limit';
OFFSET: 'OFFSET' | 'offset';
INSERT: 'INSERT' | 'insert';
INTO: 'INTO' | 'into';
VALUES: 'VALUES' | 'values';
UPDATE: 'UPDATE' | 'update';
SET: 'SET' | 'set';
DELETE: 'DELETE' | 'delete';
JOIN: 'JOIN' | 'join';
INNER: 'INNER' | 'inner';
LEFT: 'LEFT' | 'left';
RIGHT: 'RIGHT' | 'right';
FULL: 'FULL' | 'full';
OUTER: 'OUTER' | 'outer';
ON: 'ON' | 'on';
AND: 'AND' | 'and';
OR: 'OR' | 'or';
NOT: 'NOT' | 'not';
AS: 'AS' | 'as';
ASC: 'ASC' | 'asc';
DESC: 'DESC' | 'desc';
TRUE: 'TRUE' | 'true';
FALSE: 'FALSE' | 'false';
NULL: 'NULL' | 'null';
IS: 'IS' | 'is';
LIKE: 'LIKE' | 'like';
BETWEEN: 'BETWEEN' | 'between';
IN: 'IN' | 'in';
EXISTS: 'EXISTS' | 'exists';
CASE: 'CASE' | 'case';
WHEN: 'WHEN' | 'when';
THEN: 'THEN' | 'then';
ELSE: 'ELSE' | 'else';
END: 'END' | 'end';
CAST: 'CAST' | 'cast';
PRIMARY: 'PRIMARY' | 'primary';
KEY: 'KEY' | 'key';
FOREIGN: 'FOREIGN' | 'foreign';
REFERENCES: 'REFERENCES' | 'references';
UNIQUE: 'UNIQUE' | 'unique';
DEFAULT: 'DEFAULT' | 'default';
AUTO_INCREMENT: 'AUTO_INCREMENT' | 'AUTOINCREMENT' | 'auto_increment' | 'autoincrement';
BEGIN: 'BEGIN' | 'begin';
TRANSACTION: 'TRANSACTION' | 'transaction';
COMMIT: 'COMMIT' | 'commit';
ROLLBACK: 'ROLLBACK' | 'rollback';

// 数据类型关键字
INT: 'INT' | 'int';
INTEGER: 'INTEGER' | 'integer';
BIGINT: 'BIGINT' | 'bigint';
VARCHAR: 'VARCHAR' | 'varchar';
CHAR: 'CHAR' | 'char';
DECIMAL: 'DECIMAL' | 'decimal';
BOOLEAN: 'BOOLEAN' | 'boolean';
DATE: 'DATE' | 'date';
TIMESTAMP: 'TIMESTAMP' | 'timestamp';

// 标识符
IDENTIFIER
    : [a-zA-Z_][a-zA-Z0-9_]*
    ;

QUOTED_IDENTIFIER
    : '`' (~[`\r\n])* '`'
    | '"' (~["\r\n])* '"'
    ;

// 字面量
STRING_LITERAL
    : '\'' (~['\''])* '\''
    ;

INTEGER_LITERAL
    : [0-9]+
    ;

DECIMAL_LITERAL
    : [0-9]+ '.' [0-9]+
    ;

// 操作符
PLUS: '+';
MINUS: '-';
ASTERISK: '*';
SLASH: '/';
PERCENT: '%';
EQ: '=';
NEQ: '!=' | '<>';
LT: '<';
LTE: '<=';
GT: '>';
GTE: '>=';
LPAREN: '(';
RPAREN: ')';
COMMA: ',';
DOT: '.';
SEMICOLON: ';';

// 空白字符
WS
    : [ \t\r\n]+ -> skip
    ;

// 注释
COMMENT
    : '--' ~[\r\n]* -> skip
    | '/*' .*? '*/' -> skip
    ;