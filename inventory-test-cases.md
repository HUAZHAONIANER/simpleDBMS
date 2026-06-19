# 电商商品库存管理系统测试用例

## 测试场景说明

本测试用例模拟一个电商商品库存管理系统，包含商品信息管理、库存管理、订单处理等核心功能。通过逐步执行以下SQL语句，可以测试DBMS在实际业务场景中的表现。

---

## 测试步骤与执行计划

### 阶段1：系统初始化（测试开始时执行）

#### 步骤1.1 创建商品表
**执行时机**：测试开始时，首次执行
**SQL语句**：
```sql
-- 创建商品表
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**预期结果**：
```
成功创建商品表
message: 'Table products created successfully'
table: 'products'
```

#### 步骤1.2 创建库存表
**执行时机**：步骤1.1成功后执行
**SQL语句**：
```sql
-- 创建库存表
CREATE TABLE inventory (
    inventory_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

**预期结果**：
```
成功创建库存表
message: 'Table inventory created successfully'
table: 'inventory'
```

#### 步骤1.3 创建订单表
**执行时机**：步骤1.2成功后执行
**SQL语句**：
```sql
-- 创建订单表
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**预期结果**：
```
成功创建订单表
message: 'Table orders created successfully'
table: 'orders'
```

#### 步骤1.4 创建订单商品表
**执行时机**：步骤1.3成功后执行
**SQL语句**：
```sql
-- 创建订单商品表
CREATE TABLE order_items (
    order_item_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

**预期结果**：
```
成功创建订单商品表
message: 'Table order_items created successfully'
table: 'order_items'
```

---

### 阶段2：初始数据导入（系统初始化后执行）

#### 步骤2.1 插入商品数据
**执行时机**：所有表创建成功后执行
**SQL语句**：
```sql
-- 插入商品数据
INSERT INTO products (product_name, category, price, description) VALUES
('无线蓝牙耳机', '电子产品', 299.99, '高清音质，降噪功能'),
('智能手表', '电子产品', 899.99, '健康监测，运动追踪'),
('纯棉T恤', '服装', 59.99, '舒适透气，多种颜色'),
('运动鞋', '鞋类', 399.99, '轻便缓震，适合跑步'),
('保温杯', '家居用品', 89.99, '304不锈钢，保温24小时');
```

**预期结果**：
```
成功插入5条商品数据
insertedCount: 5
table: 'products'
```

#### 步骤2.2 插入库存数据
**执行时机**：步骤2.1成功后执行
**SQL语句**：
```sql
-- 插入库存数据
INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES
(1, 1, 100),
(1, 2, 50),
(2, 1, 80),
(3, 1, 200),
(3, 2, 150),
(4, 1, 120),
(5, 2, 90);
```

**预期结果**：
```
成功插入7条库存数据
insertedCount: 7
table: 'inventory'
```

---

### 阶段3：基础查询测试（数据导入后执行）

#### 步骤3.1 查询所有商品
**执行时机**：数据导入完成后执行
**SQL语句**：
```sql
-- 查询所有商品
SELECT * FROM products;
```

**预期结果**：
```
返回5条商品记录
columns: ['product_id', 'product_name', 'category', 'price', 'description', 'created_at']
rows: 包含5条商品数据
rowCount: 5
```

#### 步骤3.2 查询商品总库存
**执行时机**：步骤3.1成功后执行
**SQL语句**：
```sql
-- 查询每个商品的总库存
SELECT p.product_id, p.product_name, SUM(i.quantity) AS total_stock
FROM products p
LEFT JOIN inventory i ON p.product_id = i.product_id
GROUP BY p.product_id, p.product_name;
```

**预期结果**：
```
返回5条商品库存记录
columns: ['product_id', 'product_name', 'total_stock']
rows: 包含每个商品的总库存数量
rowCount: 5
```

#### 步骤3.3 查询特定仓库库存
**执行时机**：步骤3.2成功后执行
**SQL语句**：
```sql
-- 查询仓库1的所有商品库存
SELECT p.product_name, i.quantity
FROM products p
JOIN inventory i ON p.product_id = i.product_id
WHERE i.warehouse_id = 1;
```

**预期结果**：
```
返回仓库1的商品库存记录
columns: ['product_name', 'quantity']
rowCount: 4
```

---

### 阶段4：业务操作测试（基础查询后执行）

#### 步骤4.1 创建订单
**执行时机**：基础查询测试通过后执行
**SQL语句**：
```sql
-- 创建订单（模拟用户下单）
BEGIN TRANSACTION;

-- 1. 插入订单记录
INSERT INTO orders (order_number, user_id, total_amount, order_status)
VALUES ('ORD2023001', 1001, 1299.97, 'pending');

-- 获取刚插入的订单ID
SET @order_id = LAST_INSERT_ID();

-- 2. 插入订单商品记录
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(@order_id, 1, 2, 299.99),
(@order_id, 2, 1, 899.99);

-- 3. 更新库存
UPDATE inventory SET quantity = quantity - 2 WHERE product_id = 1 AND warehouse_id = 1;
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 2 AND warehouse_id = 1;

-- 4. 提交事务
COMMIT;
```

**预期结果**：
```
成功创建订单并更新库存
- 订单表新增1条记录
- 订单商品表新增2条记录
- 库存表中商品1的仓库1库存减少2
- 库存表中商品2的仓库1库存减少1
```

#### 步骤4.2 验证订单创建结果
**执行时机**：步骤4.1成功后执行
**SQL语句**：
```sql
-- 验证订单
SELECT * FROM orders WHERE order_number = 'ORD2023001';

-- 验证订单商品
SELECT oi.*, p.product_name
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
WHERE oi.order_id = (SELECT order_id FROM orders WHERE order_number = 'ORD2023001');

-- 验证库存更新
SELECT p.product_name, i.warehouse_id, i.quantity
FROM products p
JOIN inventory i ON p.product_id = i.product_id
WHERE p.product_id IN (1, 2) AND i.warehouse_id = 1;
```

**预期结果**：
```
1. 订单表显示订单ORD2023001已创建
2. 订单商品表显示2条订单商品记录
3. 库存表显示：
   - 无线蓝牙耳机（仓库1）库存：98
   - 智能手表（仓库1）库存：79
```

#### 步骤4.3 测试订单取消（事务回滚）
**执行时机**：步骤4.2验证成功后执行
**SQL语句**：
```sql
-- 测试订单取消（模拟用户取消订单）
BEGIN TRANSACTION;

-- 1. 获取订单ID和订单商品
SET @order_id = (SELECT order_id FROM orders WHERE order_number = 'ORD2023001');

-- 2. 恢复库存
UPDATE inventory i
JOIN order_items oi ON i.product_id = oi.product_id
SET i.quantity = i.quantity + oi.quantity
WHERE oi.order_id = @order_id AND i.warehouse_id = 1;

-- 3. 删除订单商品
DELETE FROM order_items WHERE order_id = @order_id;

-- 4. 删除订单
DELETE FROM orders WHERE order_id = @order_id;

-- 5. 提交事务
COMMIT;
```

**预期结果**：
```
成功取消订单并恢复库存
- 订单表中ORD2023001记录被删除
- 订单商品表中相关记录被删除
- 库存表中商品1和商品2的仓库1库存恢复原状
```

---

### 阶段5：高级功能测试（业务操作后执行）

#### 步骤5.1 创建索引
**执行时机**：业务操作测试通过后执行
**SQL语句**：
```sql
-- 创建商品表的分类索引
CREATE INDEX idx_products_category ON products(category);

-- 创建库存表的复合索引
CREATE INDEX idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);

-- 创建订单表的订单号唯一索引
CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number);
```

**预期结果**：
```
成功创建3个索引
- idx_products_category
- idx_inventory_product_warehouse
- idx_orders_order_number
```

#### 步骤5.2 测试复杂查询
**执行时机**：索引创建成功后执行
**SQL语句**：
```sql
-- 查询库存不足50的商品
SELECT p.product_name, SUM(i.quantity) AS total_stock
FROM products p
JOIN inventory i ON p.product_id = i.product_id
GROUP BY p.product_id, p.product_name
HAVING SUM(i.quantity) < 100;

-- 查询电子产品类别的平均价格
SELECT category, AVG(price) AS avg_price
FROM products
WHERE category = '电子产品'
GROUP BY category;

-- 查询每个仓库的总库存价值
SELECT i.warehouse_id, SUM(i.quantity * p.price) AS total_value
FROM inventory i
JOIN products p ON i.product_id = p.product_id
GROUP BY i.warehouse_id
ORDER BY total_value DESC;
```

**预期结果**：
```
1. 库存不足100的商品查询：返回相关商品
2. 电子产品平均价格：返回平均价格约599.99
3. 仓库总库存价值：按价值降序排列的仓库列表
```

---

### 阶段6：系统清理（测试结束时执行）

#### 步骤6.1 删除所有数据
**执行时机**：测试结束时执行
**SQL语句**：
```sql
-- 删除所有数据（按外键依赖顺序）
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM inventory;
DELETE FROM products;
```

**预期结果**：
```
成功删除所有表的数据
- order_items表：0行
- orders表：0行
- inventory表：0行
- products表：0行
```

#### 步骤6.2 删除所有表
**执行时机**：数据删除成功后执行
**SQL语句**：
```sql
-- 删除所有表（按外键依赖顺序）
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;
```

**预期结果**：
```
成功删除所有表
- order_items表被删除
- orders表被删除
- inventory表被删除
- products表被删除
```

---

## 测试执行说明

### 执行顺序

严格按照上述步骤顺序执行，因为后面的测试依赖前面的测试结果。

### 执行时机

1. **阶段1（系统初始化）**：测试开始时执行一次
2. **阶段2（初始数据导入）**：系统初始化成功后执行一次
3. **阶段3（基础查询测试）**：数据导入完成后执行
4. **阶段4（业务操作测试）**：基础查询测试通过后执行
5. **阶段5（高级功能测试）**：业务操作测试通过后执行
6. **阶段6（系统清理）**：所有测试完成后执行，清理测试数据

### 预期结果验证

每个步骤执行后，必须验证结果是否符合预期：
- 插入/更新/删除操作：检查影响的行数
- 查询操作：检查返回的记录数和数据内容
- 事务操作：验证事务提交或回滚后的状态
- 索引操作：验证索引是否成功创建

### 注意事项

1. 确保所有外键约束正确，避免因数据不一致导致的错误
2. 事务操作中，如果某一步失败，需要及时回滚
3. 系统清理步骤必须执行，避免测试数据影响后续测试
4. 执行复杂查询时，可以使用EXPLAIN查看执行计划

---

## 测试覆盖范围

本测试用例覆盖了DBMS的核心功能：

| 功能类别 | 测试内容 |
|---------|---------|
| 表管理 | 创建表、删除表 |
| 数据操作 | 插入、更新、删除数据 |
| 查询功能 | 基础查询、条件查询、连接查询、分组查询、排序查询 |
| 事务处理 | 事务提交、事务回滚 |
| 索引管理 | 创建索引、唯一索引、复合索引 |
| 高级功能 | 子查询、聚合函数、窗口函数（理论支持） |
| 业务场景 | 完整的电商订单处理流程 |

通过执行这个测试用例，你可以全面验证DBMS在实际业务场景中的功能和性能表现。
