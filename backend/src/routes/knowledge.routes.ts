import { Router } from "express";
import { KnowledgeController } from "../controllers/knowledge.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply auth protection middleware globally
router.use(authenticate);

router.get("/search", KnowledgeController.search);
router.post("/article", KnowledgeController.createArticle);
router.put("/article/:id", KnowledgeController.updateArticle);
router.delete("/article/:id", KnowledgeController.deleteArticle);

export default router;
