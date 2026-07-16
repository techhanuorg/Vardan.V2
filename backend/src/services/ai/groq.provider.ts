import Groq from "groq-sdk";
import logger from "../../utils/logger.js";

export class GroqProvider {
  /**
   * Dispatches generation task to Groq Cloud endpoint
   */
  public static async generate(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    modelName = "llama3-8b-8192"
  ): Promise<{ text: string; tokens: number; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: modelName,
      });

      const text = completion.choices[0]?.message?.content || "";
      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens || Math.ceil((systemPrompt.length + userPrompt.length + text.length) / 4);

      return { text, tokens, latencyMs };
    } catch (error) {
      logger.error("Groq invocation error:", error);
      throw error;
    }
  }
}
export default GroqProvider;
