import { Router } from "express";
import { DatabaseController } from "../controllers/DatabaseController";
import { IndexController } from "../controllers/IndexController";
import { QueryController } from "../controllers/QueryController";
import { TableController } from "../controllers/TableController";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validation";

const router = Router();

router.post(
  "/database/create",
  validateRequest({
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        config: { type: "object" },
      },
      required: ["name"],
    },
  }),
  asyncHandler((req, res) => DatabaseController.createDatabase(req, res))
);

router.delete(
  "/database/:name",
  asyncHandler((req, res) => DatabaseController.dropDatabase(req, res))
);

router.get(
  "/database/list",
  asyncHandler((req, res) => DatabaseController.listDatabases(req, res))
);

router.get(
  "/database/:name/stats",
  asyncHandler((req, res) => DatabaseController.getDatabaseStats(req, res))
);

router.post(
  "/query/execute",
  validateRequest({
    body: {
      type: "object",
      properties: {
        sql: { type: "string", minLength: 1 },
        database: { type: "string" },
        params: { type: "object" },
      },
      required: ["sql"],
    },
  }),
  asyncHandler((req, res) => QueryController.executeQuery(req, res))
);

router.post(
  "/query/explain",
  validateRequest({
    body: {
      type: "object",
      properties: {
        sql: { type: "string", minLength: 1 },
        database: { type: "string" },
      },
      required: ["sql"],
    },
  }),
  asyncHandler((req, res) => QueryController.explainQuery(req, res))
);

router.post(
  "/query/batch",
  validateRequest({
    body: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sql: { type: "string" },
              params: { type: "object" },
            },
            required: ["sql"],
          },
        },
        database: { type: "string" },
        transaction: { type: "boolean" },
      },
      required: ["queries"],
    },
  }),
  asyncHandler((req, res) => QueryController.executeBatch(req, res))
);

router.post(
  "/table/create",
  validateRequest({
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        database: { type: "string" },
        columns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              length: { type: "number" },
              nullable: { type: "boolean" },
              primaryKey: { type: "boolean" },
              autoIncrement: { type: "boolean" },
              defaultValue: {},
            },
            required: ["name", "type"],
          },
        },
        indexes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              columns: {
                type: "array",
                items: { type: "string" },
              },
              unique: { type: "boolean" },
            },
          },
        },
      },
      required: ["name", "columns"],
    },
  }),
  asyncHandler((req, res) => TableController.createTable(req, res))
);

router.delete(
  "/table/:name",
  asyncHandler((req, res) => TableController.dropTable(req, res))
);

router.get(
  "/table/list",
  asyncHandler((req, res) => TableController.listTables(req, res))
);

router.get(
  "/table/:name/schema",
  asyncHandler((req, res) => TableController.getTableSchema(req, res))
);

router.get(
  "/table/:name/stats",
  asyncHandler((req, res) => TableController.getTableStats(req, res))
);

router.get(
  "/table/:name/data",
  validateRequest({
    query: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 1000 },
        offset: { type: "number", minimum: 0 },
        columns: { type: "string" },
      },
    },
  }),
  asyncHandler((req, res) => TableController.getTableData(req, res))
);

/**
 * 索引管理端点
 */
router.post(
  "/index/create",
  validateRequest({
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        table: { type: "string", minLength: 1 },
        columns: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
        unique: { type: "boolean" },
        database: { type: "string" },
      },
      required: ["name", "table", "columns"],
    },
  }),
  asyncHandler((req, res) => IndexController.createIndex(req, res))
);

router.delete(
  "/index/:name",
  asyncHandler((req, res) => IndexController.dropIndex(req, res))
);

router.get(
  "/index/list",
  asyncHandler((req, res) => IndexController.listIndexes(req, res))
);

router.get(
  "/index/:name/stats",
  asyncHandler((req, res) => IndexController.getIndexStats(req, res))
);

router.post(
  "/transaction/begin",
  asyncHandler((req, res) => QueryController.beginTransaction(req, res))
);

router.post(
  "/transaction/commit",
  validateRequest({
    body: {
      type: "object",
      properties: {
        transactionId: { type: "string" },
      },
      required: ["transactionId"],
    },
  }),
  asyncHandler((req, res) => QueryController.commitTransaction(req, res))
);

router.post(
  "/transaction/rollback",
  validateRequest({
    body: {
      type: "object",
      properties: {
        transactionId: { type: "string" },
      },
      required: ["transactionId"],
    },
  }),
  asyncHandler((req, res) => QueryController.rollbackTransaction(req, res))
);

router.get(
  "/system/info",
  asyncHandler((req, res) => QueryController.getSystemInfo(req, res))
);

router.get(
  "/system/metrics",
  asyncHandler((req, res) => QueryController.getSystemMetrics(req, res))
);

router.get(
  "/system/logs",
  validateRequest({
    query: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["error", "warn", "info", "debug"] },
        limit: { type: "number", minimum: 1, maximum: 1000 },
        from: { type: "string" },
        to: { type: "string" },
      },
    },
  }),
  asyncHandler((req, res) => QueryController.getSystemLogs(req, res))
);

export { router as apiRouter };
