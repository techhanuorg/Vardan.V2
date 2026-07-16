import { db } from "../database.service.js";

export interface PatientMemoryContext {
  name: string;
  age: number;
  gender: string;
  phone: string;
  preferredDoctor?: string;
  preferredLanguage?: string;
  medicalContext?: string;
  previousAppointments: string[];
}

export class ConversationMemoryManager {
  /**
   * Constructs the text payload representing the patient memory for system injection.
   */
  public static async getMemoryContext(hospitalId: string, phone: string): Promise<string> {
    try {
      const patient = await db.patient.findFirst({
        where: { hospitalId, phone, deletedAt: null },
        include: {
          appointments: {
            take: 3,
            orderBy: { date: "desc" },
            include: { doctor: true },
          },
        },
      });

      if (!patient) return "";

      const conversation = await db.conversation.findFirst({
        where: { hospitalId, phone, deletedAt: null },
        include: { memories: true },
      });

      const previousAppointments = patient.appointments.map((a) => {
        return `- Date: ${a.date.toISOString().split("T")[0]}, Doctor: ${a.doctor.name}, Status: ${a.status}`;
      });

      // Extract specific variables from key-value memories
      let preferredDoctor = "";
      let preferredLanguage = "";
      let medicalContext = "";

      if (conversation?.memories) {
        for (const mem of conversation.memories) {
          if (mem.memoryKey === "preferredDoctor") preferredDoctor = mem.memoryValue;
          if (mem.memoryKey === "preferredLanguage") preferredLanguage = mem.memoryValue;
          if (mem.memoryKey === "medicalContext") medicalContext = mem.memoryValue;
        }
      }

      return `
[PATIENT MEMORY PROFILE]
Name: ${patient.name}
Phone: ${patient.phone}
Gender: ${patient.gender}
Age: ${patient.age}
Preferred Doctor: ${preferredDoctor || "None specified"}
Preferred Language: ${preferredLanguage || "None specified"}
Medical History Context: ${medicalContext || "No history logged yet"}
Previous Appointments:
${previousAppointments.length > 0 ? previousAppointments.join("\n") : "No appointments recorded."}
`;
    } catch (e) {
      return "";
    }
  }

  /**
   * Persists a key-value pair memory for a conversation.
   */
  public static async setMemory(conversationId: string, key: string, value: string): Promise<void> {
    try {
      await db.conversationMemory.upsert({
        where: { conversationId_memoryKey: { conversationId, memoryKey: key } },
        create: { conversationId, memoryKey: key, memoryValue: value },
        update: { memoryValue: value },
      });
    } catch (e) {
      // Ignore database save errors
    }
  }
}
export default ConversationMemoryManager;
