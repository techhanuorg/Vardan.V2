import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { MultimodalController } from "../controllers/multimodal.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();
router.use(authenticate);

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage — preserve extension
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  },
});

// 25 MB file limit
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
      "audio/ogg", "audio/mpeg", "audio/mp4", "audio/webm", "audio/aac",
      "audio/opus", "audio/x-m4a",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// OCR / image endpoints
router.post("/ocr/process", upload.single("file"), MultimodalController.processOcr);
router.post("/vision/analyze", upload.single("file"), MultimodalController.analyzeVision);

// Voice endpoints
router.post("/voice/transcribe", upload.single("file"), MultimodalController.transcribeVoice);

// PDF endpoints
router.post("/pdf/analyze", upload.single("file"), MultimodalController.analyzePdf);

// File management endpoints
router.get("/files", MultimodalController.listFiles);
router.get("/files/:id", MultimodalController.getFile);
router.delete("/files/:id", MultimodalController.deleteFile);

export default router;
