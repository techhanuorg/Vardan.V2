import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional().nullable(),
  roleId: z.string().uuid("Invalid Role ID"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional().nullable(),
  roleId: z.string().uuid("Invalid Role ID").optional(),
  email: z.string().email("Invalid email format").optional(),
});

export const patchUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export default {
  createUserSchema,
  updateUserSchema,
  patchUserStatusSchema,
};
