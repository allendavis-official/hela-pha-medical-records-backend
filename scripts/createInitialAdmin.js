// Initial Setup Script - Create First Admin User
// Run this ONCE after deploying to create the initial admin account
// Usage: node scripts/createInitialAdmin.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const readline = require("readline");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createInitialAdmin() {
  console.log("\n=================================================");
  console.log("   Hela PHA - Initial Admin Account Setup");
  console.log("=================================================\n");

  try {
    // Check if any users exist
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      console.log("⚠️  Users already exist in the database.");
      const proceed = await question(
        "Do you want to create another admin user? (yes/no): "
      );
      if (proceed.toLowerCase() !== "yes") {
        console.log("\nSetup cancelled.");
        rl.close();
        return;
      }
    }

    // Get admin role
    let adminRole = await prisma.role.findUnique({
      where: { name: "admin" },
    });

    // If roles don't exist, create them
    if (!adminRole) {
      console.log("\n📝 Creating system roles...");

      const roles = [
        { name: "admin" },
        { name: "clinician" },
        { name: "records_staff" },
        { name: "lab_tech" },
        { name: "radiographer" },
      ];

      for (const role of roles) {
        await prisma.role.upsert({
          where: { name: role.name },
          update: {},
          create: role,
        });
        console.log(`✅ Created role: ${role.name}`);
      }

      adminRole = await prisma.role.findUnique({
        where: { name: "admin" },
      });

      // Create permissions for admin
      await createAdminPermissions(adminRole.id);
    }

    console.log("\n📋 Please provide the admin user details:\n");

    // Get user input
    const firstName = await question("First Name: ");
    const lastName = await question("Last Name: ");
    const email = await question("Email: ");
    const phone = await question("Phone (optional): ");
    const password = await question("Password (min 8 characters): ");
    const confirmPassword = await question("Confirm Password: ");

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      console.log("\n❌ Error: All fields except phone are required.");
      rl.close();
      return;
    }

    if (password !== confirmPassword) {
      console.log("\n❌ Error: Passwords do not match.");
      rl.close();
      return;
    }

    if (password.length < 8) {
      console.log("\n❌ Error: Password must be at least 8 characters long.");
      rl.close();
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("\n❌ Error: Email already exists in the database.");
      rl.close();
      return;
    }

    // Hash password
    console.log("\n🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    console.log("👤 Creating admin user...");
    const adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        roleId: adminRole.id,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    console.log("\n✅ Success! Admin user created successfully!\n");
    console.log("=================================================");
    console.log("   LOGIN CREDENTIALS");
    console.log("=================================================");
    console.log(`Email:    ${adminUser.email}`);
    console.log(`Password: ${password}`);
    console.log(`Name:     ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`Role:     ${adminUser.role.name}`);
    console.log("=================================================\n");
    console.log("⚠️  IMPORTANT: Save these credentials securely!");
    console.log("   You can now login at: http://your-domain/login\n");
  } catch (error) {
    console.error("\n❌ Error creating admin user:", error.message);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

async function createAdminPermissions(adminRoleId) {
  console.log("\n🔐 Setting up admin permissions...");

  const resources = [
    "patient",
    "encounter",
    "clinicalNote",
    "labOrder",
    "user",
    "role",
  ];

  const actions = ["create", "read", "update", "delete", "close"];

  for (const resource of resources) {
    for (const action of actions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_resource_action: {
            roleId: adminRoleId,
            resource,
            action,
          },
        },
        update: {},
        create: {
          roleId: adminRoleId,
          resource,
          action,
        },
      });
    }
  }

  console.log("✅ Admin permissions created");
}

// Run the script
createInitialAdmin();
