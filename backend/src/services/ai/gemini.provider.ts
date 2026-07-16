import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../../utils/logger.js";

export class GeminiProvider {
  /**
   * Dispatches generation task to Gemini 2.5 Flash
   */
  public static async generate(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    modelName = "gemini-1.5-flash" // fallback/mapping standard (or gemini-2.5-flash)
  ): Promise<{ text: string; tokens: number; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const result = await model.generateContent(combinedPrompt);
      const response = await result.response;
      const text = response.text();
      const latencyMs = Date.now() - startTime;

      // Estimate tokens based on char length (roughly 4 chars per token)
      const tokens = Math.ceil((systemPrompt.length + userPrompt.length + text.length) / 4);

      return { text, tokens, latencyMs };
    } catch (error) {
      logger.error("Gemini invocation error:", error);
      throw error;
    }
  }

  /**
   * Multimodal generation — accepts image or audio as base64 inlineData
   */
  public static async generateWithMedia(
    apiKey: string,
    prompt: string,
    mediaBase64: string,
    mediaMimeType: string,
    modelName = "gemini-1.5-flash"
  ): Promise<{ text: string; tokens: number; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: mediaMimeType, data: mediaBase64 } },
      ]);

      const response = await result.response;
      const text = response.text();
      const latencyMs = Date.now() - startTime;
      const tokens = Math.ceil((prompt.length + text.length) / 4);

      return { text, tokens, latencyMs };
    } catch (error) {
      logger.error("Gemini multimodal invocation error:", error);
      throw error;
    }
  }
}
export default GeminiProvider;
