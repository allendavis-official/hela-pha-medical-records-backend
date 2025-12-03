// Prisma Seed Script - Initial Data Setup
// Creates roles, departments, and admin user

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================
  // SEED ROLES
  // ============================================
  const roles = [
    {
      name: "admin",
      description:
        "Full system access - can manage users, view all data, configure system",
    },
    {
      name: "records_staff",
      description:
        "Patient registration, record management, scanning, chart tracking",
    },
    {
      name: "clinician",
      description: "Clinical notes, orders, patient care documentation",
    },
    {
      name: "lab_tech",
      description: "Lab order management, specimen tracking, result entry",
    },
    {
      name: "radiographer",
      description: "Radiology orders, imaging reports, result entry",
    },
    {
      name: "data_manager",
      description: "Data quality monitoring, issue management, audits",
    },
    {
      name: "viewer",
      description: "Read-only access to dashboards and KPIs",
    },
  ];

  console.log("Creating roles...");
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log("✅ Roles created");

  // ============================================
  // SEED DEPARTMENTS
  // ============================================
  const departments = [
    {
      name: "Outpatient Department",
      code: "OPD",
      description: "Outpatient services",
    },
    {
      name: "Inpatient Department",
      code: "IPD",
      description: "Inpatient admissions and ward care",
    },
    {
      name: "Emergency Department",
      code: "EMERG",
      description: "Emergency and trauma care",
    },
    {
      name: "Laboratory",
      code: "LAB",
      description: "Clinical laboratory services",
    },
    {
      name: "Radiology",
      code: "RAD",
      description: "Medical imaging and radiology",
    },
    {
      name: "Theatre",
      code: "THEATRE",
      description: "Surgical theatre operations",
    },
    { name: "Pharmacy", code: "PHARM", description: "Pharmaceutical services" },
    {
      name: "Maternity",
      code: "MAT",
      description: "Maternity and obstetric care",
    },
  ];

  console.log("Creating departments...");
  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
  }
  console.log("✅ Departments created");

  // ============================================
  // SEED ADMIN USER
  // ============================================
  const adminRole = await prisma.role.findUnique({
    where: { name: "admin" },
  });

  if (!adminRole) {
    throw new Error("Admin role not found");
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);

  console.log("Creating admin user...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@helapha.org" },
    update: {},
    create: {
      email: "admin@helapha.org",
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      phone: "+231-000-000-0000",
      roleId: adminRole.id,
      isActive: true,
    },
  });
  console.log("✅ Admin user created");

  // ============================================
  // SEED TEST USERS
  // ============================================
  const testUsers = [
    {
      email: "doctor@helapha.org",
      password: await bcrypt.hash("doctor123", 10),
      firstName: "John",
      lastName: "Doe",
      phone: "+231-555-0001",
      roleName: "clinician",
    },
    {
      email: "records@helapha.org",
      password: await bcrypt.hash("records123", 10),
      firstName: "Mary",
      lastName: "Johnson",
      phone: "+231-555-0002",
      roleName: "records_staff",
    },
    {
      email: "lab@helapha.org",
      password: await bcrypt.hash("lab123", 10),
      firstName: "David",
      lastName: "Smith",
      phone: "+231-555-0003",
      roleName: "lab_tech",
    },
    {
      email: "radiology@helapha.org",
      password: await bcrypt.hash("radio123", 10),
      firstName: "Sarah",
      lastName: "Williams",
      phone: "+231-555-0004",
      roleName: "radiographer",
    },
    {
      email: "datamanager@helapha.org",
      password: await bcrypt.hash("data123", 10),
      firstName: "James",
      lastName: "Brown",
      phone: "+231-555-0005",
      roleName: "data_manager",
    },
  ];

  console.log("Creating test users...");
  for (const user of testUsers) {
    const role = await prisma.role.findUnique({
      where: { name: user.roleName },
    });

    if (!role) {
      console.log(
        `⚠️  Role ${user.roleName} not found, skipping user ${user.email}`
      );
      continue;
    }

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        roleId: role.id,
        isActive: true,
      },
    });
  }
  console.log("✅ Test users created");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n📊 Seed Summary:");
  console.log(`   Roles: ${await prisma.role.count()}`);
  console.log(`   Departments: ${await prisma.department.count()}`);
  console.log(`   Users: ${await prisma.user.count()}`);

  console.log("\n🔐 Default Credentials:");
  console.log("   Admin: admin@helapha.org / admin123");
  console.log("   Doctor: doctor@helapha.org / doctor123");
  console.log("   Records: records@helapha.org / records123");
  console.log("   Lab: lab@helapha.org / lab123");
  console.log("   Radiology: radiology@helapha.org / radio123");
  console.log("   Data Manager: datamanager@helapha.org / data123");

  console.log("\n✅ Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
