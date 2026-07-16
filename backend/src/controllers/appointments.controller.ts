import { Response } from "express";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class AppointmentsController {
  /**
   * POST /appointments/book
   */
  public static async book(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;
    const { patientId, doctorId, date, reason } = req.body;

    if (!patientId || !doctorId || !date) {
      ApiResponse.error(res, "Patient ID, Doctor ID, and appointment date are required.", undefined, 400);
      return;
    }

    try {
      const appointmentDate = new Date(date);

      // Prevent double booking conflict check
      const conflict = await db.appointment.findFirst({
        where: {
          doctorId,
          date: appointmentDate,
          status: { in: ["PENDING", "CONFIRMED"] },
          deletedAt: null,
        },
      });

      if (conflict) {
        ApiResponse.error(res, "The requested slot is already booked for this clinician.", undefined, 409);
        return;
      }

      // Resolve doctor department
      const doctor = await db.doctor.findFirst({
        where: { id: doctorId, hospitalId },
      });

      if (!doctor) {
        ApiResponse.error(res, "Physician profile not found.", undefined, 404);
        return;
      }

      const appt = await db.appointment.create({
        data: {
          hospitalId,
          appointmentId: `A-${Date.now()}`,
          patientId,
          doctorId,
          departmentId: doctor.departmentId,
          date: appointmentDate,
          reason: reason || "General Consultation",
          createdById: req.user.id,
        },
      });

      ApiResponse.success(res, "Appointment booked successfully.", appt, 201);
    } catch (error) {
      ApiResponse.error(res, "Failed to book appointment.", error, 500);
    }
  }

  /**
   * POST /appointments/reschedule
   */
  public static async reschedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { appointmentId, newDate } = req.body;

    if (!appointmentId || !newDate) {
      ApiResponse.error(res, "Appointment ID and new date are required.", undefined, 400);
      return;
    }

    try {
      const targetDate = new Date(newDate);

      // Verify appointment details
      const appt = await db.appointment.findFirst({
        where: { id: appointmentId, hospitalId: req.user.hospitalId, deletedAt: null },
      });

      if (!appt) {
        ApiResponse.error(res, "Appointment slot not found.", undefined, 404);
        return;
      }

      // Check conflicts
      const conflict = await db.appointment.findFirst({
        where: {
          doctorId: appt.doctorId,
          date: targetDate,
          id: { not: appt.id },
          status: { in: ["PENDING", "CONFIRMED"] },
          deletedAt: null,
        },
      });

      if (conflict) {
        ApiResponse.error(res, "The requested new slot is already booked.", undefined, 409);
        return;
      }

      const updated = await db.appointment.update({
        where: { id: appt.id },
        data: { date: targetDate },
      });

      ApiResponse.success(res, "Appointment rescheduled.", updated);
    } catch (error) {
      ApiResponse.error(res, "Failed to reschedule appointment.", error, 500);
    }
  }

  /**
   * POST /appointments/cancel
   */
  public static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { appointmentId } = req.body;

    if (!appointmentId) {
      ApiResponse.error(res, "Appointment ID is required.", undefined, 400);
      return;
    }

    try {
      const appt = await db.appointment.findFirst({
        where: { id: appointmentId, hospitalId: req.user.hospitalId, deletedAt: null },
      });

      if (!appt) {
        ApiResponse.error(res, "Appointment record not found.", undefined, 404);
        return;
      }

      const updated = await db.appointment.update({
        where: { id: appt.id },
        data: { status: "CANCELLED" },
      });

      ApiResponse.success(res, "Appointment cancelled.", updated);
    } catch (error) {
      ApiResponse.error(res, "Failed to cancel appointment.", error, 500);
    }
  }

  /**
   * GET /appointments
   */
  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      ApiResponse.success(res, "Appointments list retrieved.", appts);
    } catch (error) {
      ApiResponse.error(res, "Failed to load appointments.", error, 500);
    }
  }

  /**
   * GET /appointments/:id
   */
  public static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { id } = req.params;

    try {
      const appt = await db.appointment.findFirst({
        where: { id, hospitalId: req.user.hospitalId, deletedAt: null },
        include: { patient: true, doctor: true, department: true },
      });

      if (!appt) {
        ApiResponse.error(res, "Appointment slot not found.", undefined, 404);
        return;
      }

      ApiResponse.success(res, "Appointment retrieved.", appt);
    } catch (error) {
      ApiResponse.error(res, "Failed to load appointment details.", error, 500);
    }
  }

  /**
   * GET /appointments/slots
   */
  public static async getSlots(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { doctorId } = req.query;

    if (!doctorId || typeof doctorId !== "string") {
      ApiResponse.error(res, "Doctor ID is required as query parameter.", undefined, 400);
      return;
    }

    try {
      // Find booked times for clinician
      const bookedAppts = await db.appointment.findMany({
        where: {
          doctorId,
          status: { in: ["PENDING", "CONFIRMED"] },
          deletedAt: null,
        },
        select: { date: true },
      });

      ApiResponse.success(res, "Booked time slots loaded.", bookedAppts.map((b) => b.date));
    } catch (error) {
      ApiResponse.error(res, "Failed to load active slots.", error, 500);
    }
  }
}
export default AppointmentsController;
