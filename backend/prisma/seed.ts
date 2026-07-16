import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Start seeding VARDAN database foundation...");

  // 1. Seed Core Permissions
  const permissions = [
    { name: "hospital:read", description: "Read hospital configurations" },
    { name: "hospital:write", description: "Modify hospital configurations" },
    { name: "patient:read", description: "Access patient records" },
    { name: "patient:write", description: "Create and update patient records" },
    { name: "appointment:read", description: "View appointments" },
    { name: "appointment:write", description: "Schedule and manage appointments" },
    { name: "ai:configure", description: "Modify AI agents and system prompts" },
    { name: "whatsapp:configure", description: "Manage WhatsApp session configs" },
    { name: "billing:read", description: "Read invoices and billing logs" },
    { name: "billing:write", description: "Create invoices and ledger records" },
  ];

  console.log("Seeding permissions...");
  const seededPermissions = [];
  for (const perm of permissions) {
    const record = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    seededPermissions.push(record);
  }

  // 2. Seed a Default Demo Hospital
  console.log("Seeding demo hospital...");
  const hospital = await prisma.hospital.upsert({
    where: { slug: "st-jude-ai" },
    update: {},
    create: {
      name: "St. Jude AI Hospital",
      slug: "st-jude-ai",
      domain: "stjude.hospital.ai",
    },
  });

  // 3. Seed Default Roles for the Hospital
  console.log("Seeding roles...");
  const adminRole = await prisma.role.upsert({
    where: {
      hospitalId_name: {
        hospitalId: hospital.id,
        name: "ADMIN",
      },
    },
    update: {},
    create: {
      name: "ADMIN",
      description: "Super Administrator with full portal access",
      hospitalId: hospital.id,
      permissions: {
        connect: seededPermissions.map((p) => ({ id: p.id })),
      },
    },
  });

  await prisma.role.upsert({
    where: {
      hospitalId_name: {
        hospitalId: hospital.id,
        name: "DOCTOR",
      },
    },
    update: {},
    create: {
      name: "DOCTOR",
      description: "Medical practitioner role",
      hospitalId: hospital.id,
      permissions: {
        connect: seededPermissions
          .filter((p) =>
            ["patient:read", "appointment:read", "appointment:write", "billing:read"].includes(
              p.name
            )
          )
          .map((p) => ({ id: p.id })),
      },
    },
  });

  await prisma.role.upsert({
    where: {
      hospitalId_name: {
        hospitalId: hospital.id,
        name: "STAFF",
      },
    },
    update: {},
    create: {
      name: "STAFF",
      description: "Hospital desk operator and registrar",
      hospitalId: hospital.id,
      permissions: {
        connect: seededPermissions
          .filter((p) =>
            ["patient:read", "patient:write", "appointment:read", "appointment:write"].includes(
              p.name
            )
          )
          .map((p) => ({ id: p.id })),
      },
    },
  });

  // 4. Seed Default Departments
  console.log("Seeding departments...");
  const departments = [
    { name: "General Medicine", description: "Primary checkups and wellness care" },
    { name: "Pediatrics", description: "Child medical services" },
    { name: "Cardiology", description: "Heart health diagnostics and surgeries" },
    { name: "Neurology", description: "Brain and nerve diagnostic care" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: {
        hospitalId_name: {
          hospitalId: hospital.id,
          name: dept.name,
        },
      },
      update: {},
      create: {
        name: dept.name,
        description: dept.description,
        hospitalId: hospital.id,
      },
    });
  }

  // 5. Seed Default Hospital Settings
  console.log("Seeding default hospital configurations...");
  const settings = [
    { key: "ai_triage_enabled", value: "true", type: "BOOLEAN", group: "AI" },
    { key: "max_appointments_per_slot", value: "5", type: "NUMBER", group: "SYSTEM" },
    {
      key: "whatsapp_notification_template",
      value: "Hello {{patient_name}}, this is to confirm...",
      type: "STRING",
      group: "WHATSAPP",
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: {
        hospitalId_key: {
          hospitalId: hospital.id,
          key: setting.key,
        },
      },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
        group: setting.group,
        hospitalId: hospital.id,
      },
    });
  }

  // 6. Seed a Default Admin User
  console.log("Seeding default admin user...");
  await prisma.user.upsert({
    where: {
      hospitalId_email: {
        hospitalId: hospital.id,
        email: "admin@stjudeai.org",
      },
    },
    update: {},
    create: {
      email: "admin@stjudeai.org",
      name: "Dr. Alex Rivers",
      passwordHash: "$2b$10$EPfG3R1S76g15F16aJ7/f.p119O4b1112/qW6A123k45e67r89o01", // Demo hash
      status: "ACTIVE",
      hospitalId: hospital.id,
      roleId: adminRole.id,
    },
  });

  console.log("🌱 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
