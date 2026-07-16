import rateLimit from "express-rate-limit";
import ApiResponse from "../utils/apiResponse.js";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    ApiResponse.error(res, "Too many requests, please try again later", undefined, 429);
  },
});

export default rateLimiter;
