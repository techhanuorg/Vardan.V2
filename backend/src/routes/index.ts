import { Router } from "express";
import healthRouter from "./health.js";
import versionRouter from "./version.js";
import authRouter from "./auth.routes.js";
import userRouter from "./user.routes.js";
import whatsappRouter from "./whatsapp.routes.js";
import aiRouter from "./ai.routes.js";
import dashboardRouter from "./dashboard.routes.js";
import appointmentsRouter from "./appointments.routes.js";
import followupsRouter from "./followups.routes.js";
import campaignsRouter from "./campaigns.routes.js";
import templatesRouter from "./templates.routes.js";
import knowledgeRouter from "./knowledge.routes.js";
import multimodalRouter from "./multimodal.routes.js";
import analyticsRouter from "./analytics.routes.js";
import tenantRouter from "./tenant.routes.js";
import superRouter from "./super.routes.js";
import { tenantResolver } from "../middlewares/tenantResolver.js";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Mounting base endpoints under v1 api
router.use("/health", healthRouter);
router.use("/version", versionRouter);
router.use("/tenant", tenantRouter);

// Enforce multi-tenant data isolation globally
router.use(tenantResolver);

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/whatsapp", whatsappRouter);
router.use("/ai", aiRouter);
router.use("/dashboard", dashboardRouter);
router.use("/super", superRouter);
router.use("/appointments", appointmentsRouter);
router.use("/followups", followupsRouter);
router.use("/campaigns", campaignsRouter);
router.use("/templates", templatesRouter);
router.use("/knowledge", knowledgeRouter);
router.use("/analytics", analyticsRouter);
router.use("/", multimodalRouter);

// Doctors CRUD root endpoints
router.get("/doctors", authenticate, DashboardController.listDoctors);
router.post("/doctors", authenticate, DashboardController.createDoctor);
router.put("/doctors/:id", authenticate, DashboardController.updateDoctor);
router.delete("/doctors/:id", authenticate, DashboardController.deleteDoctor);

// Departments CRUD root endpoints
router.get("/departments", authenticate, DashboardController.listDepartments);
router.post("/departments", authenticate, DashboardController.createDepartment);
router.put("/departments/:id", authenticate, DashboardController.updateDepartment);
router.delete("/departments/:id", authenticate, DashboardController.deleteDepartment);


export default router;
