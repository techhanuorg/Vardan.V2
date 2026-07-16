import { db } from "../database.service.js";
import { AiGateway } from "./ai.gateway.js";
import logger from "../../utils/logger.js";

export class KnowledgeSearch {
  /**
   * Compiles hospital data records as context and resolves semantic queries using the AI brain.
   */
  public static async query(hospitalId: string, userQuery: string): Promise<string> {
    try {
      // 1. Fetch available Doctors
      const doctors = await db.doctor.findMany({
        where: { hospitalId, deletedAt: null },
        include: { department: true },
      });

      const docsBlock = doctors.map((d) => {
        return `- Dr. ${d.name}, Spec: ${d.specialization}, Dept: ${d.department.name}, Room: ${d.roomNumber}, Fees: ₹${d.fees.toString()}, Availability: ${JSON.stringify(d.availability)}`;
      }).join("\n");

      // 2. Fetch active FAQs
      const faqs = await db.fAQ.findMany({
        where: {
          knowledgeBase: { hospitalId },
          deletedAt: null,
        },
      });

      const faqsBlock = faqs.map((f) => {
        return `Q: ${f.question}\nA: ${f.answer}`;
      }).join("\n\n");

      // 3. Fetch general KnowledgeBase articles
      const articles = await db.knowledgeBase.findMany({
        where: { hospitalId, deletedAt: null },
      });

      const articlesBlock = articles.map((a) => {
        return `Title: ${a.title}\nCategory: ${a.category || "General"}\nContent: ${a.content}`;
      }).join("\n\n");

      // 4. Resolve hospital profile configurations from Settings key-value store
      const hospital = await db.hospital.findFirst({
        where: { id: hospitalId },
      });

      const settingKeys = ["phone", "email", "address", "timezone", "emergencyContact", "openingHours"];
      const settingRows = await db.setting.findMany({
        where: { hospitalId, key: { in: settingKeys } },
      });
      const settings: Record<string, string> = {};
      for (const s of settingRows) settings[s.key] = s.value;

      const hospBlock = hospital ? `
Hospital Name: ${hospital.name}
Phone: ${settings["phone"] || "N/A"}
Email: ${settings["email"] || "N/A"}
Address: ${settings["address"] || "N/A"}
Opening Hours: ${settings["openingHours"] || "N/A"}
Emergency Contact: ${settings["emergencyContact"] || "N/A"}
Timezone: ${settings["timezone"] || "UTC"}
` : "Hospital general profile info not logged.";

      // Assemble integrated context prompt
      const systemInstruction = `You are a helpful and polite Medical Receptionist Assistant. Use ONLY the following verified hospital context to answer the user query.
If the information is not available in the context block below, state clearly that you do not possess that information and do not hallucinate or make anything up.

[HOSPITAL CONTACT PROFILE]
${hospBlock}

[DOCTORS REGISTERED AND AVAILABILITY]
${docsBlock || "No clinician profiles logged."}

[FAQ RECORDS]
${faqsBlock || "No FAQ records."}

[KNOWLEDGE BASE DOCUMENTS]
${articlesBlock || "No articles."}

Branding: Always maintain professional branding and speak naturally in English, Hindi, or Hinglish depending on what the user asks.`;

      const response = await AiGateway.execute(
        hospitalId,
        null,
        systemInstruction,
        `Answer query: "${userQuery}"`,
        { type: "SUPPORT" }
      );

      return response.text;
    } catch (error) {
      logger.error("Failed executing knowledge base semantic search:", error);
      return "I apologize, but I am currently unable to query the hospital knowledge database. Please contact support.";
    }
  }
}
export default KnowledgeSearch;
