import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authenticate.js";
import {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/login", validate({ body: loginSchema }), AuthController.login);
router.post("/logout", authenticate, AuthController.logout);
router.post("/refresh", validate({ body: refreshSchema }), AuthController.refresh);
router.post("/forgot-password", validate({ body: forgotPasswordSchema }), AuthController.forgotPassword);
router.post("/reset-password", validate({ body: resetPasswordSchema }), AuthController.resetPassword);
router.post("/change-password", authenticate, validate({ body: changePasswordSchema }), AuthController.changePassword);
router.get("/profile", authenticate, AuthController.getProfile);
router.put("/profile", authenticate, validate({ body: updateProfileSchema }), AuthController.updateProfile);

export default router;
