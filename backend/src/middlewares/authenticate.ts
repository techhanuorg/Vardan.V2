import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";



interface JwtPayload {
  userId: string;
  hospitalId: string;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ApiResponse.error(res, "Access denied. No token provided.", undefined, 401);
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await db.user.findFirst({
      where: {
        id: decoded.userId,
        hospitalId: decoded.hospitalId,
        deletedAt: null,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      ApiResponse.error(res, "User session invalid or expired.", undefined, 401);
      return;
    }

    if (user.status !== "ACTIVE") {
      ApiResponse.error(res, "Account status deactivated.", undefined, 403);
      return;
    }

    // Bind authenticated user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      hospitalId: user.hospitalId,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: user.role.permissions.map((p) => ({ name: p.name })),
      },
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      ApiResponse.error(res, "Token expired.", undefined, 401);
      return;
    }
    ApiResponse.error(res, "Invalid token authentication failed.", undefined, 401);
  }
};

export default authenticate;
