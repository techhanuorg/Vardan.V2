import fs from "fs";
import { GeminiProvider } from "./gemini.provider.js";
import { AiGateway } from "./ai.gateway.js";
import { db } from "../database.service.js";
import env from "../../config/env.js";
import logger from "../../utils/logger.js";

export type MultimodalResult = {
  text: string;
  type: "OCR" | "TRANSCRIPT" | "VISION" | "PDF_SUMMARY";
  fileId?: string;
};

export class MultimodalService {
  /**
   * Saves a File record to the database and returns the record ID.
   */
  private static async saveFileRecord(
    hospitalId: string,
    fileName: string,
    mimeType: string,
    size: number,
    localPath: string
  ): Promise<string> {
    const file = await db.file.create({
      data: {
        hospitalId,
        name: fileName,
        key: fileName,
        bucket: "local",
        mimeType,
        size,
        url: localPath,
      },
    });
    return file.id;
  }

  /**
   * Processes an image via Gemini Vision for OCR, classification, and prescription extraction.
   */
  public static async processImage(
    hospitalId: string,
    filePath: string,
    fileName: string,
    mimeType: string,
    phone?: string
  ): Promise<MultimodalResult> {
    try {
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString("base64");
      const fileSize = buffer.length;

      const fileId = await this.saveFileRecord(
        hospitalId,
        fileName,
        mimeType,
        fileSize,
        `/uploads/${fileName}`
      );

      const prompt = `You are a medical document OCR and vision expert working for a hospital.

Analyze this image carefully and:
1. Classify the document type: Prescription, Medical Report, Lab Report, Hospital Bill, ID Card, Medicine Strip, X-Ray, MRI, CT Scan, or Unknown.
2. Extract ALL visible text accurately.
3. If it is a PRESCRIPTION, structure the output with:
   - Patient Name, Doctor Name, Hospital Name, Date
   - Medicines: [Name | Dosage | Frequency | Duration]
   - Follow-up Date (if mentioned)
4. If it is a LAB REPORT or BLOOD TEST, list each parameter with its value and status (Normal / High / Low).
5. If it is UNKNOWN, politely describe what you see and ask the patient for clarification.

Always respond in the same language the user seems to prefer (Hindi, English, or Hinglish).
Never diagnose. Only extract and present information visible in the document.`;

      const result = await GeminiProvider.generateWithMedia(
        env.GEMINI_API_KEY,
        prompt,
        base64,
        mimeType
      );

      // Route extracted text back through AI Gateway for contextual response
      if (phone && result.text) {
        const aiResponse = await AiGateway.chat(
          hospitalId,
          phone,
          `[Patient sent a medical document/prescription image]\n\n${result.text}`
        );
        return { text: aiResponse, type: "OCR", fileId };
      }

      return { text: result.text, type: "OCR", fileId };
    } catch (error) {
      logger.error("Image OCR processing failed:", error);
      return {
        text: "I was unable to read this image. Please send a clearer photo or type your question.",
        type: "OCR",
      };
    }
  }

  /**
   * Transcribes a voice note via Gemini audio understanding and routes to AI Gateway.
   */
  public static async processVoice(
    hospitalId: string,
    filePath: string,
    fileName: string,
    mimeType: string,
    phone?: string
  ): Promise<MultimodalResult> {
    try {
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString("base64");
      const fileSize = buffer.length;

      const fileId = await this.saveFileRecord(
        hospitalId,
        fileName,
        mimeType,
        fileSize,
        `/uploads/${fileName}`
      );

      const prompt = `You are a multilingual medical voice transcription expert.

Listen to this voice message carefully and:
1. Transcribe the speech word-for-word (supports Hindi, English, Hinglish, and mixed language).
2. Correct any obvious transcription artefacts or filler sounds.
3. Detect the primary language used.
4. Summarize the patient's main request in one clear sentence.

Respond in this exact format:
[TRANSCRIPT]: <full corrected transcript>
[LANGUAGE]: <detected language>
[SUMMARY]: <one-line summary of patient request>`;

      const result = await GeminiProvider.generateWithMedia(
        env.GEMINI_API_KEY,
        prompt,
        base64,
        mimeType
      );

      // Parse transcript from structured response
      const transcriptMatch = result.text.match(/\[TRANSCRIPT\]:\s*([\s\S]*?)(?:\[LANGUAGE\]|$)/);
      const transcript = transcriptMatch ? transcriptMatch[1].trim() : result.text;

      // Route transcript through AI Gateway
      if (phone && transcript) {
        const aiResponse = await AiGateway.chat(hospitalId, phone, transcript);
        return { text: aiResponse, type: "TRANSCRIPT", fileId };
      }

      return { text: result.text, type: "TRANSCRIPT", fileId };
    } catch (error) {
      logger.error("Voice transcription failed:", error);
      return {
        text: "I was unable to understand this voice message. Please type your message or try sending again.",
        type: "TRANSCRIPT",
      };
    }
  }

  /**
   * Extracts text from a PDF and generates an AI-powered medical summary.
   */
  public static async processPdf(
    hospitalId: string,
    filePath: string,
    fileName: string,
    phone?: string
  ): Promise<MultimodalResult> {
    try {
      const buffer = fs.readFileSync(filePath);
      const fileSize = buffer.length;

      const fileId = await this.saveFileRecord(
        hospitalId,
        fileName,
        "application/pdf",
        fileSize,
        `/uploads/${fileName}`
      );

      // Extract text using pdf-parse (CommonJS module — dynamic import)
      let pdfText = "";
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse = (await import("pdf-parse" as any)).default;
        const data = await pdfParse(buffer);
        pdfText = data.text || "";
      } catch (pdfErr) {
        logger.warn("pdf-parse extraction failed:", pdfErr);
      }

      if (!pdfText || pdfText.trim().length < 20) {
        return {
          text: "This PDF appears to be image-based and could not be parsed as text. Please send a clearer scan or type the key details.",
          type: "PDF_SUMMARY",
          fileId,
        };
      }

      // Trim to 8 000 chars to stay within Gemini context limits
      const trimmedText = pdfText.trim().substring(0, 8000);

      const systemInstruction = `You are a medical document analyst assisting a hospital receptionist.

Analyze the following extracted PDF text and:
1. Identify the document type (Blood Report, Discharge Summary, Lab Report, Prescription, Medical Invoice, etc.).
2. Extract key findings in simple, non-technical language.
3. For lab reports: list each parameter with its value and whether it is Normal, High, or Low.
4. For prescriptions: extract all medicines, dosages, and follow-up dates.
5. Provide a brief overall summary.
6. Always end with: "Please consult your doctor for medical advice."
7. Never diagnose. Only summarize the information present.`;

      const result = await AiGateway.execute(
        hospitalId,
        null,
        systemInstruction,
        `PDF Document Content:\n\n${trimmedText}`,
        { type: "PDF_ANALYSIS" }
      );

      if (phone) {
        const aiResponse = await AiGateway.chat(
          hospitalId,
          phone,
          `[Patient uploaded a PDF medical document]\n\n${result.text}`
        );
        return { text: aiResponse, type: "PDF_SUMMARY", fileId };
      }

      return { text: result.text, type: "PDF_SUMMARY", fileId };
    } catch (error) {
      logger.error("PDF analysis failed:", error);
      return {
        text: "I was unable to process this PDF. Please try again or send the document as an image.",
        type: "PDF_SUMMARY",
      };
    }
  }

  /**
   * Auto-detects media type from MIME type and dispatches to the correct processor.
   */
  public static async classifyAndProcess(
    hospitalId: string,
    filePath: string,
    fileName: string,
    mimeType: string,
    phone: string
  ): Promise<string> {
    const mime = mimeType.toLowerCase();

    if (mime.startsWith("image/")) {
      const result = await this.processImage(hospitalId, filePath, fileName, mimeType, phone);
      return result.text;
    }

    if (
      mime.startsWith("audio/") ||
      mime.includes("ogg") ||
      mime.includes("opus") ||
      mime.includes("webm") ||
      mime.includes("mp4") ||
      mime.includes("mpeg")
    ) {
      const result = await this.processVoice(hospitalId, filePath, fileName, mimeType, phone);
      return result.text;
    }

    if (mime === "application/pdf") {
      const result = await this.processPdf(hospitalId, filePath, fileName, phone);
      return result.text;
    }

    // Unsupported type
    return "I received your file, but this file type is not supported. Please send a photo, voice message, or PDF document.";
  }
}
export default MultimodalService;
