import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with detailed error messages on validation failure.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: messages,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware factory that validates req.query against a Zod schema.
 * Returns 400 with detailed error messages on validation failure.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const messages = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: messages,
      });
      return;
    }
    // Store parsed values on res.locals for downstream access
    res.locals.parsedQuery = result.data;
    next();
  };
}
