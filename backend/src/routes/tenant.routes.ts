import { Router } from "express";
import { TenantController } from "../controllers/tenant.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Onboarding and branding are public endpoint categories
router.post("/onboard", TenantController.onboard);
router.get("/branding", TenantController.getBranding);

// Backups require authentication
router.post("/backup", authenticate, TenantController.backup);
router.post("/restore", authenticate, TenantController.restore);

export default router;
