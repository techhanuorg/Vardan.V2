import { Router } from "express";
import { AiController } from "../controllers/ai.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection middleware globally
router.use(authenticate);

router.post("/chat", AiController.chat);
router.post("/detect-intent", AiController.detectIntent);
router.post("/provider/switch", AiController.switchProvider);
router.get("/providers", AiController.listProviders);
router.get("/usage", AiController.getUsage);
router.get("/status", AiController.getStatus);

export default router;
