import { Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../services/database.service.js";
import { env } from "../config/env.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";
import { Prisma } from "@prisma/client";


// Helper to generate access and refresh tokens
const generateTokens = (userId: string, hospitalId: string, rememberMe = false) => {
  const accessToken = jwt.sign({ userId, hospitalId }, env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId, hospitalId }, env.JWT_REFRESH_SECRET, {
    expiresIn: rememberMe ? "30d" : "7d",
  });
  return { accessToken, refreshToken };
};

export class AuthController {
  /**
   * POST /auth/login
   */
  public static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password, rememberMe } = req.body;

    try {
      // Find hospital by domain/host (fallback to first in system for demo/local)
      const user = await db.user.findFirst({
        where: { email, deletedAt: null },
        include: { hospital: true },
      });

      if (!user) {
        ApiResponse.error(res, "Invalid email or password.", undefined, 401);
        return;
      }

      // Check account lockout
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        ApiResponse.error(
          res,
          `Account is locked. Try again after ${user.lockedUntil.toISOString()}`,
          undefined,
          403
        );
        return;
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        const attempts = user.failedLoginAttempts + 1;
        const updates: Prisma.UserUpdateInput = { failedLoginAttempts: attempts };

        if (attempts >= 5) {
          updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
          updates.failedLoginAttempts = 0;
        }

        await db.user.update({ where: { id: user.id }, data: updates });

        // Audit Log
        await db.auditLog.create({
          data: {
            hospitalId: user.hospitalId,
            userId: user.id,
            action: "LOGIN_FAILED",
            entity: "User",
            entityId: user.id,
            clientIp: req.ip,
          },
        });

        ApiResponse.error(res, "Invalid email or password.", undefined, 401);
        return;
      }

      // Check status
      if (user.status !== "ACTIVE") {
        ApiResponse.error(res, "Account is deactivated or suspended.", undefined, 403);
        return;
      }

      // Success - Reset attempts and locked state
      const { accessToken, refreshToken } = generateTokens(user.id, user.hospitalId, rememberMe);
      const salt = await bcrypt.genSalt(10);
      const refreshTokenHash = await bcrypt.hash(refreshToken, salt);

      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          refreshTokenHash,
        },
      });

      // Audit Log
      await db.auditLog.create({
        data: {
          hospitalId: user.hospitalId,
          userId: user.id,
          action: "LOGIN_SUCCESS",
          entity: "User",
          entityId: user.id,
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "Login successful.", { accessToken, refreshToken });
    } catch (error) {
      ApiResponse.error(res, "Login failed.", error instanceof Error ? error.message : error, 500);
    }
  }

  /**
   * POST /auth/logout
   */
  public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    try {
      await db.user.update({
        where: { id: req.user.id },
        data: { refreshTokenHash: null },
      });

      await db.auditLog.create({
        data: {
          hospitalId: req.user.hospitalId,
          userId: req.user.id,
          action: "LOGOUT",
          entity: "User",
          entityId: req.user.id,
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "Logout successful.");
    } catch (error) {
      ApiResponse.error(res, "Logout failed.", error, 500);
    }
  }

  /**
   * POST /auth/refresh
   */
  public static async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
        hospitalId: string;
      };

      const user = await db.user.findFirst({
        where: { id: decoded.userId, hospitalId: decoded.hospitalId, deletedAt: null },
      });

      if (!user || !user.refreshTokenHash) {
        ApiResponse.error(res, "Invalid session refresh token.", undefined, 401);
        return;
      }

      // Validate refresh token rotation
      const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isValid) {
        // Compromised refresh token -> revoke sessions entirely
        await db.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: null },
        });
        ApiResponse.error(res, "Session compromised. All sessions revoked.", undefined, 401);
        return;
      }

      // Rotate tokens
      const tokens = generateTokens(user.id, user.hospitalId);
      const salt = await bcrypt.genSalt(10);
      const newRefreshHash = await bcrypt.hash(tokens.refreshToken, salt);

      await db.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: newRefreshHash },
      });

      ApiResponse.success(res, "Tokens refreshed successfully.", tokens);
    } catch (error) {
      ApiResponse.error(res, "Refresh failed.", error, 401);
    }
  }

  /**
   * POST /auth/forgot-password
   */
  public static async forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email } = req.body;

    try {
      const user = await db.user.findFirst({
        where: { email, deletedAt: null },
      });

      if (!user) {
        // Obfuscate user check results to prevent account enumeration scanning
        ApiResponse.success(res, "If user exists, a reset code will be transmitted.");
        return;
      }

      // Scaffold mock recovery code (Phase 3 spec requires reset flows without implementing actual email client)
      const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

      // In real scenarios, send this via email/SMS, but we output it to mock/audit logs for programmatic sync
      await db.auditLog.create({
        data: {
          hospitalId: user.hospitalId,
          userId: user.id,
          action: "PASSWORD_RESET_REQUEST",
          entity: "User",
          entityId: user.id,
          payload: { resetToken: token },
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "Reset passcode dispatched.", { resetToken: token });
    } catch (error) {
      ApiResponse.error(res, "Password recovery failed.", error, 500);
    }
  }

  /**
   * POST /auth/reset-password
   */
  public static async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, token, newPassword } = req.body;

    try {
      const user = await db.user.findFirst({
        where: { email, deletedAt: null },
      });

      if (!user) {
        ApiResponse.error(res, "Reset request invalid.", undefined, 400);
        return;
      }

      // Verify token via audit logs for mock purposes
      const auditReset = await db.auditLog.findFirst({
        where: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUEST",
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // 30 mins window
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const payload = auditReset?.payload as Record<string, string> | null;
      if (!auditReset || !payload || payload.resetToken !== token) {
        ApiResponse.error(res, "Verification code incorrect or expired.", undefined, 400);
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          refreshTokenHash: null, // Revoke current logins
        },
      });

      await db.auditLog.create({
        data: {
          hospitalId: user.hospitalId,
          userId: user.id,
          action: "PASSWORD_RESET_COMPLETE",
          entity: "User",
          entityId: user.id,
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "Password reset successfully.");
    } catch (error) {
      ApiResponse.error(res, "Password reset failed.", error, 500);
    }
  }

  /**
   * POST /auth/change-password
   */
  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await db.user.findFirst({
        where: { id: req.user.id },
      });

      if (!user) {
        ApiResponse.error(res, "User not found.", undefined, 404);
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        ApiResponse.error(res, "Current password incorrect.", undefined, 400);
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash, refreshTokenHash: null },
      });

      await db.auditLog.create({
        data: {
          hospitalId: user.hospitalId,
          userId: user.id,
          action: "PASSWORD_CHANGE",
          entity: "User",
          entityId: user.id,
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "Password changed successfully.");
    } catch (error) {
      ApiResponse.error(res, "Password change failed.", error, 500);
    }
  }

  /**
   * GET /auth/profile
   */
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    try {
      const user = await db.user.findFirst({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      ApiResponse.success(res, "Profile retrieved.", user);
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve profile.", error, 500);
    }
  }

  /**
   * PUT /auth/profile
   */
  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { name, phone, email } = req.body;

    try {
      const updatedUser = await db.user.update({
        where: { id: req.user.id },
        data: { name, phone, email },
        select: { id: true, email: true, name: true, phone: true },
      });

      await db.auditLog.create({
        data: {
          hospitalId: req.user.hospitalId,
          userId: req.user.id,
          action: "PROFILE_UPDATE",
          entity: "User",
          entityId: req.user.id,
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "Profile updated successfully.", updatedUser);
    } catch (error) {
      ApiResponse.error(res, "Failed to update profile.", error, 500);
    }
  }
}

export default AuthController;
