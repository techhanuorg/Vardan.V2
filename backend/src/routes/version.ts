import { Router, Request, Response } from "express";
import ApiResponse from "../utils/apiResponse.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  return ApiResponse.success(res, "API Version retrieved successfully", {
    version: "1.0.0",
    release: "Alpha Project Foundation",
  });
});

export default router;
