import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";
import ApiResponse from "../utils/apiResponse.js";
import env from "../config/env.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error(err, "Unhandled application error caught in middleware");

  const message = err.message || "An unexpected error occurred";
  const errors = env.NODE_ENV === "development" ? { stack: err.stack } : undefined;

  return ApiResponse.error(res, message, errors, 500);
};

export default errorHandler;
