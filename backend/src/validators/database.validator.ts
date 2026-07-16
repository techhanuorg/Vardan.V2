import { z } from "zod";

// Base timestamp validations
export const timestampSchema = z.object({
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional(),
});

// Hospital Validation Schema
export const hospitalValidationSchema = z.object({
  name: z.string().min(2, "Hospital name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Invalid slug format"),
  domain: z
    .string()
    .min(3, "Domain name must be at least 3 characters")
    .regex(/^[a-z0-9.-]+$/, "Invalid domain format"),
});

// User Validation Schema
export const userValidationSchema = z.object({
  email: z.string().email("Invalid email format"),
  passwordHash: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  roleId: z.string().uuid("Invalid Role ID"),
});

// Role Validation Schema
export const roleValidationSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  hospitalId: z.string().uuid("Invalid Hospital ID"),
});

// Permission Validation Schema
export const permissionValidationSchema = z.object({
  name: z.string().min(2, "Permission name must be at least 2 characters"),
  description: z.string().optional().nullable(),
});

// Doctor Validation Schema
export const doctorValidationSchema = z.object({
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  userId: z.string().uuid("Invalid User ID").optional().nullable(),
  name: z.string().min(2, "Doctor name must be at least 2 characters"),
  departmentId: z.string().uuid("Invalid Department ID"),
  qualification: z.string().min(2, "Qualification required"),
  experience: z.number().int().nonnegative("Experience must be a positive integer"),
  fees: z.number().positive("Fees must be positive"),
  photo: z.string().url("Invalid photo URL").optional().nullable(),
  availability: z.any(), // JSON schedules
  roomNumber: z.string().min(1, "Room number required"),
  specialization: z.string().min(2, "Specialization required"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// Department Validation Schema
export const departmentValidationSchema = z.object({
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  name: z.string().min(2, "Department name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// Patient Validation Schema
export const patientValidationSchema = z.object({
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  patientId: z.string().min(2, "Patient business ID required"),
  name: z.string().min(2, "Patient name must be at least 2 characters"),
  gender: z.string().min(1, "Gender required"),
  age: z.number().int().nonnegative("Age must be non-negative"),
  dob: z.coerce.date(),
  phone: z.string().min(6, "Phone must be at least 6 digits"),
  alternatePhone: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  bloodGroup: z.string().optional().nullable(),
  emergencyContact: z.object({
    name: z.string().min(2, "Contact name required"),
    phone: z.string().min(6, "Contact phone required"),
    relation: z.string().min(2, "Relation required"),
  }),
  registrationDate: z.coerce.date().default(() => new Date()),
  medicalNotes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "DISCHARGED", "INACTIVE"]).default("ACTIVE"),
});

// Appointment Validation Schema
export const appointmentValidationSchema = z.object({
  appointmentId: z.string().min(2, "Appointment business ID required"),
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  patientId: z.string().uuid("Invalid Patient ID"),
  doctorId: z.string().uuid("Invalid Doctor ID"),
  departmentId: z.string().uuid("Invalid Department ID"),
  date: z.coerce.date(),
  slotId: z.string().uuid("Invalid slot ID").optional().nullable(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NOSHOW"]).default("PENDING"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  createdById: z.string().uuid("Invalid Creator ID"),
  notes: z.string().optional().nullable(),
});

// Conversation Validation Schema
export const conversationValidationSchema = z.object({
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  phone: z.string().min(6, "Phone must be at least 6 digits"),
  intent: z.string().optional().nullable(),
  language: z.string().default("en"),
  currentAgentId: z.string().uuid("Invalid Agent ID").optional().nullable(),
  context: z.any(),
});

// KnowledgeBase Validation Schema
export const knowledgeBaseValidationSchema = z.object({
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.string().optional().nullable(),
});

// Campaign Validation Schema
export const campaignValidationSchema = z.object({
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  name: z.string().min(2, "Campaign name must be at least 2 characters"),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED"]).default("DRAFT"),
  templateId: z.string().uuid("Invalid Template ID"),
  scheduledAt: z.coerce.date().optional().nullable(),
  sentAt: z.coerce.date().optional().nullable(),
});

// Reminder Validation Schema
export const reminderValidationSchema = z.object({
  hospitalId: z.string().uuid("Invalid Hospital ID"),
  patientId: z.string().uuid("Invalid Patient ID"),
  type: z.string().min(2, "Type required"),
  message: z.string().min(5, "Message required"),
  scheduledAt: z.coerce.date(),
  status: z.enum(["PENDING", "SENT", "FAILED"]).default("PENDING"),
});
