import { GoogleSheetsService } from "./googleSheets.service.js";
import { db } from "./database.service.js";
import {
  patientValidationSchema,
  doctorValidationSchema,
  appointmentValidationSchema,
} from "../validators/database.validator.js";
import logger from "../utils/logger.js";

// General retry helper with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    logger.warn(`Operation failed, retrying in ${delay}ms... (Remaining retries: ${retries})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(operation, retries - 1, delay * 2);
  }
}

export class SheetSyncService {
  /**
   * Pushes all patients in the database to a Google Sheet (One-Way / Outbound Sync)
   */
  public static async syncPatientsToSheet(
    spreadsheetId: string,
    hospitalId: string
  ): Promise<void> {
    logger.info(`Syncing Patients from DB to Sheet ${spreadsheetId}`);
    const patients = await db.patient.findMany({
      where: { hospitalId, deletedAt: null },
    });

    const headers = [
      "ID",
      "Patient Business ID",
      "Name",
      "Gender",
      "Age",
      "DOB",
      "Phone",
      "Email",
      "Address",
      "Status",
    ];
    const rows = patients.map((p) => [
      p.id,
      p.patientId,
      p.name,
      p.gender,
      p.age.toString(),
      p.dob.toISOString(),
      p.phone,
      p.email || "",
      p.address,
      p.status,
    ]);

    await retryWithBackoff(() =>
      GoogleSheetsService.updateSheetValues(spreadsheetId, "Patients!A1", [headers, ...rows])
    );
  }

  /**
   * Pulls patients from a Google Sheet and upserts them in the Database (Two-Way or Inbound Sync)
   */
  public static async syncPatientsFromSheet(
    spreadsheetId: string,
    hospitalId: string
  ): Promise<void> {
    logger.info(`Syncing Patients from Sheet ${spreadsheetId} to DB`);
    const values = await retryWithBackoff(() =>
      GoogleSheetsService.getSheetValues(spreadsheetId, "Patients!A2:J")
    );

    for (const row of values) {
      if (row.length < 9) continue;
      const [id, patientId, name, gender, ageStr, dobStr, phone, email, address, status] = row;

      const parsedData = {
        hospitalId,
        patientId,
        name,
        gender,
        age: parseInt(ageStr, 10),
        dob: new Date(dobStr),
        phone,
        email: email || undefined,
        address,
        emergencyContact: { name: "N/A", phone: "N/A", relation: "N/A" },
        status: status || "ACTIVE",
      };

      const validation = patientValidationSchema.safeParse(parsedData);
      if (!validation.success) {
        logger.warn(
          { errors: validation.error.format(), row },
          "Validation failed for sheet patient row. Skipping."
        );
        continue;
      }

      await db.patient.upsert({
        where: { id: id || "temp-id-placeholder-non-existent" },
        create: parsedData,
        update: parsedData,
      });
    }
  }

  /**
   * Pushes all doctors in the database to a Google Sheet
   */
  public static async syncDoctorsToSheet(spreadsheetId: string, hospitalId: string): Promise<void> {
    logger.info(`Syncing Doctors from DB to Sheet ${spreadsheetId}`);
    const doctors = await db.doctor.findMany({
      where: { hospitalId, deletedAt: null },
    });

    const headers = [
      "ID",
      "Name",
      "Specialization",
      "Qualification",
      "Experience",
      "Fees",
      "Room Number",
      "Status",
    ];
    const rows = doctors.map((d) => [
      d.id,
      d.name,
      d.specialization,
      d.qualification,
      d.experience.toString(),
      d.fees.toString(),
      d.roomNumber,
      d.status,
    ]);

    await retryWithBackoff(() =>
      GoogleSheetsService.updateSheetValues(spreadsheetId, "Doctors!A1", [headers, ...rows])
    );
  }

  /**
   * Pulls doctors from a Google Sheet and upserts them in the Database
   */
  public static async syncDoctorsFromSheet(
    spreadsheetId: string,
    hospitalId: string
  ): Promise<void> {
    logger.info(`Syncing Doctors from Sheet ${spreadsheetId} to DB`);
    const values = await retryWithBackoff(() =>
      GoogleSheetsService.getSheetValues(spreadsheetId, "Doctors!A2:H")
    );

    // Retrieve a default department to assign synced doctors to
    const defaultDept = await db.department.findFirst({
      where: { hospitalId, deletedAt: null },
    });
    if (!defaultDept) {
      logger.warn("No departments defined for this hospital. Cannot sync doctors.");
      return;
    }

    for (const row of values) {
      if (row.length < 7) continue;
      const [id, name, specialization, qualification, expStr, feesStr, roomNumber, status] = row;

      const parsedData = {
        hospitalId,
        name,
        specialization,
        qualification,
        experience: parseInt(expStr, 10),
        fees: parseFloat(feesStr),
        roomNumber,
        departmentId: defaultDept.id,
        availability: {},
        status: status || "ACTIVE",
      };

      const validation = doctorValidationSchema.safeParse(parsedData);
      if (!validation.success) {
        logger.warn(
          { errors: validation.error.format(), row },
          "Validation failed for sheet doctor row. Skipping."
        );
        continue;
      }

      await db.doctor.upsert({
        where: { id: id || "temp-id-placeholder-non-existent" },
        create: parsedData,
        update: parsedData,
      });
    }
  }

  /**
   * Pushes all appointments in the database to a Google Sheet
   */
  public static async syncAppointmentsToSheet(
    spreadsheetId: string,
    hospitalId: string
  ): Promise<void> {
    logger.info(`Syncing Appointments from DB to Sheet ${spreadsheetId}`);
    const appointments = await db.appointment.findMany({
      where: { hospitalId, deletedAt: null },
      include: {
        patient: true,
        doctor: true,
      },
    });

    const headers = [
      "ID",
      "Appointment ID",
      "Patient Name",
      "Doctor Name",
      "Date",
      "Status",
      "Reason",
    ];
    const rows = appointments.map((a) => [
      a.id,
      a.appointmentId,
      a.patient.name,
      a.doctor.name,
      a.date.toISOString(),
      a.status,
      a.reason,
    ]);

    await retryWithBackoff(() =>
      GoogleSheetsService.updateSheetValues(spreadsheetId, "Appointments!A1", [headers, ...rows])
    );
  }

  /**
   * Pulls appointments from a Google Sheet and upserts them in the Database
   */
  public static async syncAppointmentsFromSheet(
    spreadsheetId: string,
    hospitalId: string
  ): Promise<void> {
    logger.info(`Syncing Appointments from Sheet ${spreadsheetId} to DB`);
    const values = await retryWithBackoff(() =>
      GoogleSheetsService.getSheetValues(spreadsheetId, "Appointments!A2:G")
    );

    // Fetch default user to associate as creator
    const defaultUser = await db.user.findFirst({
      where: { hospitalId },
    });
    if (!defaultUser) {
      logger.warn("No creator user available for sync association. Skipping.");
      return;
    }

    for (const row of values) {
      if (row.length < 7) continue;
      const [id, appointmentId, patientName, doctorName, dateStr, status, reason] = row;

      // Find matching patient and doctor by name
      const patient = await db.patient.findFirst({
        where: { hospitalId, name: patientName, deletedAt: null },
      });
      const doctor = await db.doctor.findFirst({
        where: { hospitalId, name: doctorName, deletedAt: null },
      });

      if (!patient || !doctor) {
        logger.warn(
          { patientName, doctorName },
          "Unable to match patient or doctor by name for appointment row. Skipping."
        );
        continue;
      }

      const parsedData = {
        appointmentId,
        hospitalId,
        patientId: patient.id,
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        date: new Date(dateStr),
        status: status || "PENDING",
        reason,
        createdById: defaultUser.id,
      };

      const validation = appointmentValidationSchema.safeParse(parsedData);
      if (!validation.success) {
        logger.warn(
          { errors: validation.error.format(), row },
          "Validation failed for sheet appointment row. Skipping."
        );
        continue;
      }

      await db.appointment.upsert({
        where: { id: id || "temp-id-placeholder-non-existent" },
        create: parsedData,
        update: parsedData,
      });
    }
  }
}

export default SheetSyncService;
