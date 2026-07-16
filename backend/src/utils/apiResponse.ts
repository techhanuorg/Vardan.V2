import { Response } from "express";

export interface ApiResponsePayload<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export class ApiResponse {
  static success<T>(res: Response, message: string, data?: T, statusCode = 200): Response {
    const payload: ApiResponsePayload<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(payload);
  }

  static error(res: Response, message: string, errors?: unknown, statusCode = 500): Response {
    const payload: ApiResponsePayload<never> = {
      success: false,
      message,
      errors,
    };
    return res.status(statusCode).json(payload);
  }
}
export default ApiResponse;
