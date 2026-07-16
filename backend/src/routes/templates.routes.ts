import { Router } from "express";
import { CampaignsController } from "../controllers/campaigns.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Secure globally
router.use(authenticate);

router.get("/", CampaignsController.listTemplates);
router.post("/", CampaignsController.createTemplate);
router.put("/:id", CampaignsController.updateTemplate);
router.delete("/:id", CampaignsController.deleteTemplate);

export default router;
