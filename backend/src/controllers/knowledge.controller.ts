import { Response } from "express";
import { db } from "../services/database.service.js";
import { KnowledgeSearch } from "../services/ai/knowledge.search.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class KnowledgeController {
  /**
   * GET /knowledge/search?q=query
   */
  public static async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      ApiResponse.error(res, "Search query parameter 'q' is required.", undefined, 400);
      return;
    }

    try {
      const response = await KnowledgeSearch.query(hospitalId, q);
      ApiResponse.success(res, "Semantic lookup completed.", { response });
    } catch (error) {
      ApiResponse.error(res, "Failed to resolve search query.", error, 500);
    }
  }

  /**
   * POST /knowledge/article
   */
  public static async createArticle(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;
    const { title, content, category } = req.body;

    if (!title || !content) {
      ApiResponse.error(res, "Article title and contents are required.", undefined, 400);
      return;
    }

    try {
      const article = await db.knowledgeBase.create({
        data: {
          hospitalId,
          title,
          content,
          category: category || "General",
        },
      });
      ApiResponse.success(res, "Knowledge base article created.", article, 201);
    } catch (error) {
      ApiResponse.error(res, "Failed to create knowledge base article.", error, 500);
    }
  }

  /**
   * PUT /knowledge/article/:id
   */
  public static async updateArticle(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { id } = req.params;
    const { title, content, category } = req.body;

    try {
      const article = await db.knowledgeBase.update({
        where: { id },
        data: { title, content, category },
      });
      ApiResponse.success(res, "Article modified.", article);
    } catch (error) {
      ApiResponse.error(res, "Failed to update article details.", error, 500);
    }
  }

  /**
   * DELETE /knowledge/article/:id
   */
  public static async deleteArticle(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { id } = req.params;

    try {
      await db.knowledgeBase.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Article archived successfully.");
    } catch (error) {
      ApiResponse.error(res, "Failed to archive article.", error, 500);
    }
  }
}
export default KnowledgeController;
