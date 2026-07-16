import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import ApiResponse from "../utils/apiResponse.js";

export interface RequestValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validate = (schemas: RequestValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        ApiResponse.error(
          res,
          "Validation failed",
          error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
          400
        );
        return;
      }
      next(error);
    }
  };
};

export default validate;
