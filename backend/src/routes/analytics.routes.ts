import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection globally
router.use(authenticate);

router.get("/dashboard", AnalyticsController.getDashboard);
router.get("/patients", AnalyticsController.getPatients);
router.get("/appointments", AnalyticsController.getAppointments);
router.get("/messages", AnalyticsController.getMessages);
router.get("/followups", AnalyticsController.getFollowUps);
router.get("/campaigns", AnalyticsController.getCampaigns);
router.get("/doctors", AnalyticsController.getDoctors);
router.get("/knowledge", AnalyticsController.getKnowledge);
router.get("/ai", AnalyticsController.getAi);
router.get("/export", AnalyticsController.exportReport);

export default router;
