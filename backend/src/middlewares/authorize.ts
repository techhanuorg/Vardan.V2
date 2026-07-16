import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/index.js";
import { ApiResponse } from "../utils/apiResponse.js";

/**
 * Gatekeeper enforcing specific permission strings. Owners bypass this check.
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized request.", undefined, 401);
      return;
    }

    const { role } = req.user;

    // Hospital owner role bypasses all granular checks
    if (role.name === "Owner" || role.name === "ADMIN") {
      return next();
    }

    const hasPermission = role.permissions.some((p) => p.name === permission);
    if (!hasPermission) {
      ApiResponse.error(
        res,
        `Forbidden. Required permission "${permission}" is missing.`,
        undefined,
        403
      );
      return;
    }

    next();
  };
};

/**
 * Gatekeeper enforcing specific roles.
 */
export const requireRole = (roleName: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized request.", undefined, 401);
      return;
    }

    if (req.user.role.name !== roleName) {
      ApiResponse.error(res, `Forbidden. Role "${roleName}" required.`, undefined, 403);
      return;
    }

    next();
  };
};

export default {
  requirePermission,
  requireRole,
};
