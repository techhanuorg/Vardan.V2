import { Router } from "express";
import { FollowUpsController } from "../controllers/followups.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection middleware globally
router.use(authenticate);

router.get("/", FollowUpsController.list);
router.post("/create", FollowUpsController.create);
router.put("/:id", FollowUpsController.update);
router.delete("/:id", FollowUpsController.delete);

export default router;
