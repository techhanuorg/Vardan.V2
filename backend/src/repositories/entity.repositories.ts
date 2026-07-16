import { BaseRepository } from "./base.repository.js";
import {
  Hospital,
  Doctor,
  Patient,
  Appointment,
  Conversation,
  KnowledgeBase,
  Campaign,
  Reminder,
  Prisma,
} from "@prisma/client";

export class HospitalRepository extends BaseRepository<
  Hospital,
  Prisma.HospitalCreateInput,
  Prisma.HospitalUpdateInput
> {
  constructor() {
    super("hospital");
  }
}

export class DoctorRepository extends BaseRepository<
  Doctor,
  Prisma.DoctorUncheckedCreateInput,
  Prisma.DoctorUncheckedUpdateInput
> {
  constructor() {
    super("doctor");
  }
}

export class PatientRepository extends BaseRepository<
  Patient,
  Prisma.PatientUncheckedCreateInput,
  Prisma.PatientUncheckedUpdateInput
> {
  constructor() {
    super("patient");
  }

  public async findByPatientId(hospitalId: string, patientId: string): Promise<Patient | null> {
    return this.getModel().findFirst({
      where: {
        hospitalId,
        patientId,
        OR: [{ deletedAt: null }, { deletedAt: undefined }],
      },
    });
  }
}

export class AppointmentRepository extends BaseRepository<
  Appointment,
  Prisma.AppointmentUncheckedCreateInput,
  Prisma.AppointmentUncheckedUpdateInput
> {
  constructor() {
    super("appointment");
  }

  public async findByAppointmentId(
    hospitalId: string,
    appointmentId: string
  ): Promise<Appointment | null> {
    return this.getModel().findFirst({
      where: {
        hospitalId,
        appointmentId,
        OR: [{ deletedAt: null }, { deletedAt: undefined }],
      },
    });
  }
}

export class ConversationRepository extends BaseRepository<
  Conversation,
  Prisma.ConversationUncheckedCreateInput,
  Prisma.ConversationUncheckedUpdateInput
> {
  constructor() {
    super("conversation");
  }

  public async findByPhone(hospitalId: string, phone: string): Promise<Conversation | null> {
    return this.getModel().findFirst({
      where: {
        hospitalId,
        phone,
        OR: [{ deletedAt: null }, { deletedAt: undefined }],
      },
    });
  }
}

export class KnowledgeRepository extends BaseRepository<
  KnowledgeBase,
  Prisma.KnowledgeBaseUncheckedCreateInput,
  Prisma.KnowledgeBaseUncheckedUpdateInput
> {
  constructor() {
    super("knowledgeBase");
  }
}

export class CampaignRepository extends BaseRepository<
  Campaign,
  Prisma.CampaignUncheckedCreateInput,
  Prisma.CampaignUncheckedUpdateInput
> {
  constructor() {
    super("campaign");
  }
}

export class ReminderRepository extends BaseRepository<
  Reminder,
  Prisma.ReminderUncheckedCreateInput,
  Prisma.ReminderUncheckedUpdateInput
> {
  constructor() {
    super("reminder");
  }
}
