import { Response } from "express";
import path from "path";
import { db } from "../services/database.service.js";
import { MultimodalService } from "../services/ai/multimodal.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class MultimodalController {
  /**
   * POST /ocr/process
   * Accepts an uploaded image and returns OCR text + AI extraction.
   */
  public static async processOcr(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    if (!req.file) {
      ApiResponse.error(res, "No image file uploaded.", undefined, 400);
      return;
    }

    const { hospitalId } = req.user;
    const { filename, originalname, mimetype } = req.file;
    const filePath = path.join(process.cwd(), "uploads", filename);

    try {
      const result = await MultimodalService.processImage(
        hospitalId,
        filePath,
        filename,
        mimetype
      );
      ApiResponse.success(res, "OCR completed.", { result: result.text, fileId: result.fileId, originalName: originalname });
    } catch (error) {
      ApiResponse.error(res, "OCR processing failed.", error, 500);
    }
  }

  /**
   * POST /voice/transcribe
   * Accepts an audio file and returns AI-generated transcript.
   */
  public static async transcribeVoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    if (!req.file) {
      ApiResponse.error(res, "No audio file uploaded.", undefined, 400);
      return;
    }

    const { hospitalId } = req.user;
    const { filename, originalname, mimetype } = req.file;
    const filePath = path.join(process.cwd(), "uploads", filename);

    try {
      const result = await MultimodalService.processVoice(
        hospitalId,
        filePath,
        filename,
        mimetype
      );
      ApiResponse.success(res, "Voice transcribed.", { result: result.text, fileId: result.fileId, originalName: originalname });
    } catch (error) {
      ApiResponse.error(res, "Voice transcription failed.", error, 500);
    }
  }

  /**
   * POST /vision/analyze
   * Accepts any image and returns a full Gemini Vision analysis.
   */
  public static async analyzeVision(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    if (!req.file) {
      ApiResponse.error(res, "No image file uploaded.", undefined, 400);
      return;
    }

    const { hospitalId } = req.user;
    const { filename, originalname, mimetype } = req.file;
    const filePath = path.join(process.cwd(), "uploads", filename);

    try {
      const result = await MultimodalService.processImage(
        hospitalId,
        filePath,
        filename,
        mimetype
      );
      ApiResponse.success(res, "Vision analysis complete.", { result: result.text, fileId: result.fileId, originalName: originalname });
    } catch (error) {
      ApiResponse.error(res, "Vision analysis failed.", error, 500);
    }
  }

  /**
   * POST /pdf/analyze
   * Accepts a PDF and returns an AI-generated medical summary.
   */
  public static async analyzePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    if (!req.file) {
      ApiResponse.error(res, "No PDF file uploaded.", undefined, 400);
      return;
    }

    const { hospitalId } = req.user;
    const { filename, originalname } = req.file;
    const filePath = path.join(process.cwd(), "uploads", filename);

    try {
      const result = await MultimodalService.processPdf(hospitalId, filePath, filename);
      ApiResponse.success(res, "PDF analysed.", { result: result.text, fileId: result.fileId, originalName: originalname });
    } catch (error) {
      ApiResponse.error(res, "PDF analysis failed.", error, 500);
    }
  }

  /**
   * GET /files
   * Lists all uploaded files for the hospital.
   */
  public static async listFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const files = await db.file.findMany({
        where: { hospitalId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "Files listed.", files);
    } catch (error) {
      ApiResponse.error(res, "Failed to list files.", error, 500);
    }
  }

  /**
   * GET /files/:id
   * Returns details of a specific file.
   */
  public static async getFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      const file = await db.file.findFirst({
        where: { id, hospitalId: req.user.hospitalId, deletedAt: null },
      });
      if (!file) {
        ApiResponse.error(res, "File not found.", undefined, 404);
        return;
      }
      ApiResponse.success(res, "File retrieved.", file);
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve file.", error, 500);
    }
  }

  /**
   * DELETE /files/:id
   * Soft-deletes a specific file record.
   */
  public static async deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.file.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "File deleted.");
    } catch (error) {
      ApiResponse.error(res, "Failed to delete file.", error, 500);
    }
  }
}
export default MultimodalController;
