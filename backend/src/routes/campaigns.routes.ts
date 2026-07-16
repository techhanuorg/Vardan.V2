import { Router } from "express";
import { CampaignsController } from "../controllers/campaigns.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Secure globally
router.use(authenticate);

router.get("/", CampaignsController.list);
router.post("/", CampaignsController.create);
router.put("/:id", CampaignsController.update);
router.delete("/:id", CampaignsController.delete);

router.get("/:id", CampaignsController.getById);
router.get("/:id/logs", CampaignsController.getLogs);

router.post("/:id/start", CampaignsController.start);
router.post("/:id/pause", CampaignsController.pause);
router.post("/:id/resume", CampaignsController.resume);
router.post("/:id/cancel", CampaignsController.cancel);

export default router;
