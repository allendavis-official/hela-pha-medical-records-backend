const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const departments = [
    { name: "Emergency Department", code: "ED" },
    { name: "Outpatient Department", code: "OPD" },
    { name: "Inpatient Ward", code: "IPD" },
    { name: "Surgery", code: "SURG" },
    { name: "Pediatrics", code: "PEDS" },
    { name: "Internal Medicine", code: "IM" },
    { name: "Laboratory", code: "LAB" },
    { name: "Radiology", code: "RAD" },
  ];

  for (const dept of departments) {
    const existing = await prisma.department.findFirst({
      where: { code: dept.code },
    });

    if (!existing) {
      await prisma.department.create({ data: dept });
      console.log(`✅ Created: ${dept.name}`);
    }
  }
  console.log("✅ Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
