import { NextFunction, Request, Response } from "express";

// 验证规则类型
type ValidationRules = {
  body?: any;
  query?: any;
  params?: any;
};

export function validateRequest(
  rules: ValidationRules
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // 验证请求体
    if (rules.body) {
      const bodyErrors = validateObject(req.body, rules.body, "body");
      errors.push(...bodyErrors);
    }

    // 验证查询参数
    if (rules.query) {
      const queryErrors = validateObject(req.query, rules.query, "query");
      errors.push(...queryErrors);
    }

    // 验证路径参数
    if (rules.params) {
      const paramsErrors = validateObject(req.params, rules.params, "params");
      errors.push(...paramsErrors);
    }

    // 如果有错误，返回400 Bad Request
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "请求格式验证失败",
          details: errors,
        },
      });
      return;
    }

    // 验证通过，继续处理请求
    next();
  };
}

function validateObject(obj: any, schema: any, location: string): string[] {
  const errors: string[] = [];

  // 检查对象类型
  if (schema.type && typeof obj !== schema.type) {
    errors.push(`${location} should be ${schema.type}`);
    return errors;
  }

  // 检查必填字段
  if (schema.required) {
    for (const requiredField of schema.required) {
      if (obj[requiredField] === undefined || obj[requiredField] === null) {
        errors.push(`${location}.${requiredField} is required`);
      }
    }
  }

  // 检查属性
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const fieldValue = obj[fieldName];

      // 如果字段不存在且不是必填，跳过
      if (fieldValue === undefined && !schema.required?.includes(fieldName)) {
        continue;
      }

      // 检查字段类型
      if (
        (fieldSchema as any).type &&
        fieldValue !== null &&
        typeof fieldValue !== (fieldSchema as any).type
      ) {
        errors.push(
          `${location}.${fieldName} should be ${(fieldSchema as any).type}`
        );
      }

      // 检查字符串长度
      if ((fieldSchema as any).type === "string") {
        if (
          (fieldSchema as any).minLength &&
          fieldValue.length < (fieldSchema as any).minLength
        ) {
          errors.push(
            `${location}.${fieldName} should be at least ${(fieldSchema as any).minLength} characters long`
          );
        }
        if (
          (fieldSchema as any).maxLength &&
          fieldValue.length > (fieldSchema as any).maxLength
        ) {
          errors.push(
            `${location}.${fieldName} should be at most ${(fieldSchema as any).maxLength} characters long`
          );
        }
      }

      // 检查数字范围
      if ((fieldSchema as any).type === "number") {
        if (
          (fieldSchema as any).min !== undefined &&
          fieldValue < (fieldSchema as any).min
        ) {
          errors.push(
            `${location}.${fieldName} should be at least ${(fieldSchema as any).min}`
          );
        }
        if (
          (fieldSchema as any).max !== undefined &&
          fieldValue > (fieldSchema as any).max
        ) {
          errors.push(
            `${location}.${fieldName} should be at most ${(fieldSchema as any).max}`
          );
        }
      }

      // 递归验证对象属性
      if (
        (fieldSchema as any).type === "object" &&
        fieldValue !== null &&
        typeof fieldValue === "object"
      ) {
        const nestedErrors = validateObject(
          fieldValue,
          fieldSchema,
          `${location}.${fieldName}`
        );
        errors.push(...nestedErrors);
      }
    }
  }

  return errors;
}
