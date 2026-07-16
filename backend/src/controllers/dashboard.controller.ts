import { Response } from "express";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class DashboardController {
  // ==========================================
  // PATIENTS CRUD
  // ==========================================
  public static async listPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const patients = await db.patient.findMany({
        where: { hospitalId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "Patients retrieved.", patients);
    } catch (e) {
      ApiResponse.error(res, "Failed to retrieve patients.", e, 500);
    }
  }

  public static async createPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { name, phone, gender, age, dob, address, email, bloodGroup } = req.body;
    try {
      const patient = await db.patient.create({
        data: {
          hospitalId,
          patientId: `P-${Date.now()}`,
          name,
          phone,
          gender,
          age: parseInt(age) || 0,
          dob: dob ? new Date(dob) : new Date("2000-01-01"),
          address: address || "",
          alternatePhone: "",
          email,
          bloodGroup,
          emergencyContact: {},
        },
      });
      ApiResponse.success(res, "Patient registered.", patient, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create patient.", e, 500);
    }
  }

  public static async updatePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { name, phone, gender, age, dob, address, alternatePhone, email, bloodGroup, medicalNotes } = req.body;
    try {
      const patient = await db.patient.update({
        where: { id },
        data: {
          name,
          phone,
          gender,
          age: age ? parseInt(age) : undefined,
          dob: dob ? new Date(dob) : undefined,
          address,
          alternatePhone,
          email,
          bloodGroup,
          medicalNotes,
        },
      });
      ApiResponse.success(res, "Patient details updated.", patient);
    } catch (e) {
      ApiResponse.error(res, "Failed to update patient.", e, 500);
    }
  }

  public static async deletePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.patient.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Patient soft deleted.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete patient.", e, 500);
    }
  }

  // ==========================================
  // DOCTORS CRUD
  // ==========================================
  public static async listDoctors(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const doctors = await db.doctor.findMany({
        where: { hospitalId, deletedAt: null },
        include: { department: true },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "Doctors retrieved.", doctors);
    } catch (e) {
      ApiResponse.error(res, "Failed to retrieve doctors.", e, 500);
    }
  }

  public static async createDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { name, departmentId, qualification, experience, fees, roomNumber, availability } = req.body;
    try {
      const doctor = await db.doctor.create({
        data: {
          hospitalId,
          name,
          departmentId,
          qualification,
          experience: parseInt(experience) || 0,
          fees: parseFloat(fees) || 0,
          roomNumber: roomNumber || "Consulting Room",
          availability: availability || {},
          specialization: qualification || "General",
        },
      });
      ApiResponse.success(res, "Doctor created.", doctor, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create doctor.", e, 500);
    }
  }

  public static async updateDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { name, departmentId, qualification, experience, fees, roomNumber, availability } = req.body;
    try {
      const doctor = await db.doctor.update({
        where: { id },
        data: {
          name,
          departmentId,
          qualification,
          experience: experience ? parseInt(experience) : undefined,
          fees: fees ? parseFloat(fees) : undefined,
          roomNumber,
          availability: availability || undefined,
        },
      });
      ApiResponse.success(res, "Doctor updated.", doctor);
    } catch (e) {
      ApiResponse.error(res, "Failed to update doctor.", e, 500);
    }
  }

  public static async deleteDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.doctor.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Doctor soft deleted.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete doctor.", e, 500);
    }
  }

  // ==========================================
  // DEPARTMENTS CRUD
  // ==========================================
  public static async listDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const departments = await db.department.findMany({
        where: { hospitalId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "Departments retrieved.", departments);
    } catch (e) {
      ApiResponse.error(res, "Failed to retrieve departments.", e, 500);
    }
  }

  public static async createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { name, description } = req.body;
    try {
      const dept = await db.department.create({
        data: {
          hospitalId,
          name,
          description,
        },
      });
      ApiResponse.success(res, "Department created.", dept, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create department.", e, 500);
    }
  }

  public static async updateDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { name, description } = req.body;
    try {
      const dept = await db.department.update({
        where: { id },
        data: { name, description },
      });
      ApiResponse.success(res, "Department updated.", dept);
    } catch (e) {
      ApiResponse.error(res, "Failed to update department.", e, 500);
    }
  }

  public static async deleteDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.department.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Department deleted.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete department.", e, 500);
    }
  }

  // ==========================================
  // APPOINTMENTS CRUD
  // ==========================================
  public static async listAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const appts = await db.appointment.findMany({
        where: { hospitalId, deletedAt: null },
        include: { patient: true, doctor: true, department: true },
        orderBy: { date: "desc" },
      });
      ApiResponse.success(res, "Appointments retrieved.", appts);
    } catch (e) {
      ApiResponse.error(res, "Failed to retrieve appointments.", e, 500);
    }
  }

  public static async createAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { patientId, doctorId, departmentId, date, reason } = req.body;
    try {
      const appt = await db.appointment.create({
        data: {
          hospitalId,
          appointmentId: `A-${Date.now()}`,
          patientId,
          doctorId,
          departmentId,
          date: new Date(date),
          reason: reason || "General Checkup",
          createdById: req.user.id,
        },
      });
      ApiResponse.success(res, "Appointment booked.", appt, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to book appointment.", e, 500);
    }
  }

  public static async updateAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { status, reason, date } = req.body;
    try {
      const appt = await db.appointment.update({
        where: { id },
        data: {
          status,
          reason,
          date: date ? new Date(date) : undefined,
        },
      });
      ApiResponse.success(res, "Appointment updated.", appt);
    } catch (e) {
      ApiResponse.error(res, "Failed to update appointment.", e, 500);
    }
  }

  // ==========================================
  // KNOWLEDGE BASE (FAQs) CRUD
  // ==========================================
  public static async listFaqs(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const faqs = await db.fAQ.findMany({
        where: {
          knowledgeBase: { hospitalId },
          deletedAt: null,
        },
        include: { knowledgeBase: true },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "FAQs retrieved.", faqs);
    } catch (e) {
      ApiResponse.error(res, "Failed to retrieve FAQs.", e, 500);
    }
  }

  public static async createFaq(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { question, answer } = req.body;
    try {
      let kb = await db.knowledgeBase.findFirst({
        where: { hospitalId, title: "Default FAQ", deletedAt: null },
      });
      if (!kb) {
        kb = await db.knowledgeBase.create({
          data: { hospitalId, title: "Default FAQ", content: "FAQ Knowledge Base" },
        });
      }
      const faq = await db.fAQ.create({
        data: {
          knowledgeBaseId: kb.id,
          question,
          answer,
        },
      });
      ApiResponse.success(res, "FAQ added.", faq, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to add FAQ.", e, 500);
    }
  }

  public static async updateFaq(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { question, answer } = req.body;
    try {
      const faq = await db.fAQ.update({
        where: { id },
        data: { question, answer },
      });
      ApiResponse.success(res, "FAQ updated.", faq);
    } catch (e) {
      ApiResponse.error(res, "Failed to update FAQ.", e, 500);
    }
  }

  public static async deleteFaq(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.fAQ.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "FAQ deleted.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete FAQ.", e, 500);
    }
  }

  // ==========================================
  // CAMPAIGNS CRUD
  // ==========================================
  public static async listCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const campaigns = await db.campaign.findMany({
        where: { hospitalId, deletedAt: null },
        include: { template: true },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "Campaigns list retrieved.", campaigns);
    } catch (e) {
      ApiResponse.error(res, "Failed to retrieve campaigns.", e, 500);
    }
  }

  public static async createCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { name, templateId, scheduledAt } = req.body;
    try {
      // Resolve/Scaffold default template if not provided
      let template = await db.template.findFirst({
        where: { hospitalId, deletedAt: null },
      });

      if (!template) {
        template = await db.template.create({
          data: {
            hospitalId,
            name: "Default template",
            type: "TEXT",
            content: "Broadcast reminder message",
          },
        });
      }

      const camp = await db.campaign.create({
        data: {
          hospitalId,
          name,
          templateId: templateId || template.id,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: "DRAFT",
        },
      });
      ApiResponse.success(res, "Campaign created.", camp, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create campaign.", e, 500);
    }
  }

  // ==========================================
  // SHEETS CONFIG CRUD
  // ==========================================
  public static async getSheetsConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const config = await db.googleSheetConfig.findFirst({
        where: { hospitalId },
      });
      ApiResponse.success(res, "Sheets config retrieved.", config);
    } catch (e) {
      ApiResponse.error(res, "Failed to get Sheets configuration.", e, 500);
    }
  }

  public static async saveSheetsConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { spreadsheetId, syncDirection, autoSync } = req.body;
    try {
      // Query config and decide safe upsert alternative strategy
      const existing = await db.googleSheetConfig.findFirst({
        where: { hospitalId },
      });

      let config;
      if (existing) {
        config = await db.googleSheetConfig.update({
          where: { id: existing.id },
          data: {
            spreadsheetId,
            syncDirection: syncDirection || "TWO_WAY",
            autoSync: autoSync ?? true,
          },
        });
      } else {
        config = await db.googleSheetConfig.create({
          data: {
            hospitalId,
            spreadsheetId,
            credentials: {},
            syncDirection: syncDirection || "TWO_WAY",
            autoSync: autoSync ?? true,
          },
        });
      }

      ApiResponse.success(res, "Sheets config updated.", config);
    } catch (e) {
      ApiResponse.error(res, "Failed to save Sheets config.", e, 500);
    }
  }

  // ==========================================
  // HOSPITAL SETTINGS CRUD
  // ==========================================
  public static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const hospital = await db.hospital.findFirst({
        where: { id: hospitalId },
      });
      const settings = await db.setting.findMany({
        where: { hospitalId },
      });
      ApiResponse.success(res, "Settings loaded.", { hospital, settings });
    } catch (e) {
      ApiResponse.error(res, "Failed to load settings.", e, 500);
    }
  }

  // ==========================================
  // AUDIT LOGS LIST
  // ==========================================
  public static async listLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const logs = await db.auditLog.findMany({
        where: { hospitalId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      ApiResponse.success(res, "Audit logs retrieved.", logs);
    } catch (e) {
      ApiResponse.error(res, "Failed to load audit logs.", e, 500);
    }
  }

  // ==========================================
  // AGGREGATED STATS (HOME DASHBOARD)
  // ==========================================
  public static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const patientCount = await db.patient.count({ where: { hospitalId, deletedAt: null } });
      const doctorCount = await db.doctor.count({ where: { hospitalId, deletedAt: null } });
      const appointmentCount = await db.appointment.count({ where: { hospitalId, deletedAt: null } });
      const device = await db.device.findFirst({ where: { hospitalId } });
      const waSession = await db.whatsAppSession.findFirst({ where: { hospitalId, sessionName: "default" } });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAppts = await db.appointment.findMany({
        where: {
          hospitalId,
          date: { gte: today },
          deletedAt: null,
        },
        include: { patient: true, doctor: true },
        take: 5,
        orderBy: { date: "asc" },
      });

      const todayNewPatients = await db.patient.count({
        where: {
          hospitalId,
          createdAt: { gte: today },
        },
      });

      ApiResponse.success(res, "Dashboard stats compiled.", {
        counts: {
          patients: patientCount,
          doctors: doctorCount,
          appointments: appointmentCount,
          todayNewPatients,
        },
        todayAppointments: todayAppts,
        whatsappStatus: waSession?.status || "DISCONNECTED",
        connectedDevice: device || null,
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load dashboard statistics.", e, 500);
    }
  }
}
export default DashboardController;
