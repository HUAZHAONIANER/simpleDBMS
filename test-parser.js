// 简单的Node.js脚本，用于直接测试SQL解析器
const { SQLParser } = require('./dist/server/api/services/SQLParser');

async function testParser() {
  console.log('开始测试SQL解析器...');
  console.log('='.repeat(60));

  const parser = new SQLParser();

  const testCases = [
    {
      name: '单个SELECT语句',
      sql: 'SELECT * FROM users',
      expectedType: 'SELECT'
    },
    {
      name: '多个SQL语句',
      sql: 'SELECT * FROM users; SELECT * FROM orders;',
      expectedType: 'SELECT'
    },
    {
      name: '带注释的SQL语句',
      sql: '-- 这是注释\nSELECT * FROM users -- 行注释\n/* 块注释 */',
      expectedType: 'SELECT'
    },
    {
      name: 'INSERT语句',
      sql: 'INSERT INTO users (name, email) VALUES ("test", "test@example.com")',
      expectedType: 'INSERT'
    },
    {
      name: 'UPDATE语句',
      sql: 'UPDATE users SET name = "new_test" WHERE id = 1',
      expectedType: 'UPDATE'
    },
    {
      name: 'DELETE语句',
      sql: 'DELETE FROM users WHERE id = 1',
      expectedType: 'DELETE'
    },
    {
      name: 'CREATE TABLE语句',
      sql: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50))',
      expectedType: 'CREATE_TABLE'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n测试用例: ${testCase.name}`);
    console.log(`SQL: ${testCase.sql}`);

    try {
      const ast = await parser.parse(testCase.sql);
      console.log(`解析结果: ${ast.type}`);
      if (ast.tableName) {
        console.log(`表名: ${ast.tableName}`);
      }
      console.log(`预期: ${testCase.expectedType}`);
      console.log(`状态: ${ast.type === testCase.expectedType ? '通过' : '失败'}`);
    } catch (error) {
      console.log(`解析失败: ${error.message}`);
      console.log(`状态: 失败`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成！');
}

testParser().catch(console.error);
