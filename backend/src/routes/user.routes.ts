import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { requirePermission } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import {
  createUserSchema,
  updateUserSchema,
  patchUserStatusSchema,
} from "../validators/user.validator.js";

const router = Router();

// Apply auth middleware globally to all user routes
router.use(authenticate);

router.post("/", requirePermission("users.create"), validate({ body: createUserSchema }), UserController.createUser);
router.get("/", requirePermission("users.read"), UserController.listUsers);
router.get("/:id", UserController.getUserDetail);
router.put("/:id", requirePermission("users.edit"), validate({ body: updateUserSchema }), UserController.updateUser);
router.delete("/:id", requirePermission("users.delete"), UserController.deleteUser);
router.patch("/:id/status", requirePermission("users.edit"), validate({ body: patchUserStatusSchema }), UserController.changeStatus);

export default router;
