import { Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class UserController {
  /**
   * POST /users (Owner Only / users.create permission)
   */
  public static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { email, name, password, phone, roleId } = req.body;
    const { hospitalId } = req.user;

    try {
      // Check duplicate
      const duplicate = await db.user.findFirst({
        where: { hospitalId, email, deletedAt: null },
      });

      if (duplicate) {
        ApiResponse.error(res, "Email already registered in this hospital.", undefined, 400);
        return;
      }

      // Check role validity
      const role = await db.role.findFirst({
        where: { id: roleId, hospitalId },
      });
      if (!role) {
        ApiResponse.error(res, "Selected role is invalid.", undefined, 400);
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await db.user.create({
        data: {
          email,
          name,
          phone,
          passwordHash,
          hospitalId,
          roleId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          role: { select: { name: true } },
        },
      });

      // Audit Log
      await db.auditLog.create({
        data: {
          hospitalId,
          userId: req.user.id,
          action: "USER_CREATE",
          entity: "User",
          entityId: newUser.id,
          payload: { email: newUser.email, role: newUser.role.name },
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "User created successfully.", newUser, 201);
    } catch (error) {
      ApiResponse.error(res, "Failed to create user.", error, 500);
    }
  }

  /**
   * GET /users (Owner Only / users.read permission)
   */
  public static async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      const users = await db.user.findMany({
        where: { hospitalId, deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          role: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      ApiResponse.success(res, "Users list retrieved.", users);
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve users.", error, 500);
    }
  }

  /**
   * GET /users/:id (Owner Only)
   */
  public static async getUserDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { id } = req.params;
    const { hospitalId } = req.user;

    try {
      const user = await db.user.findFirst({
        where: { id, hospitalId, deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          role: { select: { id: true, name: true } },
        },
      });

      if (!user) {
        ApiResponse.error(res, "User not found.", undefined, 404);
        return;
      }

      // Fetch login history
      const history = await db.auditLog.findMany({
        where: { hospitalId, userId: id, action: { in: ["LOGIN_SUCCESS", "LOGIN_FAILED"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      ApiResponse.success(res, "User details retrieved.", { user, loginHistory: history });
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve user details.", error, 500);
    }
  }

  /**
   * PUT /users/:id (Owner Only / users.edit permission)
   */
  public static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { id } = req.params;
    const { hospitalId } = req.user;
    const { name, phone, roleId, email } = req.body;

    try {
      const user = await db.user.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!user) {
        ApiResponse.error(res, "User not found.", undefined, 404);
        return;
      }

      if (roleId) {
        const role = await db.role.findFirst({ where: { id: roleId, hospitalId } });
        if (!role) {
          ApiResponse.error(res, "Selected role is invalid.", undefined, 400);
          return;
        }
      }

      const updatedUser = await db.user.update({
        where: { id },
        data: { name, phone, roleId, email },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: { select: { name: true } },
        },
      });

      await db.auditLog.create({
        data: {
          hospitalId,
          userId: req.user.id,
          action: "USER_UPDATE",
          entity: "User",
          entityId: id,
          payload: { role: updatedUser.role.name },
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "User updated successfully.", updatedUser);
    } catch (error) {
      ApiResponse.error(res, "Failed to update user.", error, 500);
    }
  }

  /**
   * DELETE /users/:id (Owner Only / users.delete permission)
   */
  public static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { id } = req.params;
    const { hospitalId } = req.user;

    try {
      const user = await db.user.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!user) {
        ApiResponse.error(res, "User not found.", undefined, 404);
        return;
      }

      // Soft delete the user
      await db.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: "INACTIVE", refreshTokenHash: null },
      });

      await db.auditLog.create({
        data: {
          hospitalId,
          userId: req.user.id,
          action: "USER_DELETE",
          entity: "User",
          entityId: id,
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, "User deleted successfully.");
    } catch (error) {
      ApiResponse.error(res, "Failed to delete user.", error, 500);
    }
  }

  /**
   * PATCH /users/:id/status (Owner Only / users.edit permission)
   */
  public static async changeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { id } = req.params;
    const { hospitalId } = req.user;
    const { status } = req.body;

    try {
      const user = await db.user.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!user) {
        ApiResponse.error(res, "User not found.", undefined, 404);
        return;
      }

      await db.user.update({
        where: { id },
        data: { status, refreshTokenHash: status === "ACTIVE" ? undefined : null },
      });

      await db.auditLog.create({
        data: {
          hospitalId,
          userId: req.user.id,
          action: "USER_STATUS_CHANGE",
          entity: "User",
          entityId: id,
          payload: { status },
          clientIp: req.ip,
        },
      });

      ApiResponse.success(res, `User status updated to ${status}.`);
    } catch (error) {
      ApiResponse.error(res, "Failed to change user status.", error, 500);
    }
  }
}

export default UserController;
