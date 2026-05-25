// backend/scripts/checkUsers.js
// Verify that users exist in the database

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log("🔍 Checking database users...\n");

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (users.length === 0) {
      console.log("❌ No users found in database!");
      console.log("   Run seed script: node prisma/seed.js");
      return;
    }

    console.log(`✅ Found ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role.name}`);
      console.log(`   Active: ${user.isActive ? "Yes" : "No"}`);
      console.log("");
    });

    // Check specifically for admin user
    const admin = users.find((u) => u.email === "admin@helapha.org");
    if (admin) {
      console.log("✅ Admin user exists and is ready to use!");
      console.log("   Email: admin@helapha.org");
      console.log("   Password: admin123");
    } else {
      console.log("❌ Admin user NOT found!");
      console.log("   Run seed script to create admin user");
    }
  } catch (error) {
    console.error("❌ Database error:", error.message);
    console.log("\nMake sure DATABASE_URL is set correctly!");
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
