// Database Configuration - Prisma Client Setup
// Handles database connection and provides global Prisma instance

const { PrismaClient } = require("@prisma/client");

// Create Prisma Client instance
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  errorFormat: "pretty",
});

/**
 * Connect to database
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("Database connection established");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

/**
 * Disconnect from database
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error disconnecting from database:", error);
    throw error;
  }
}

/**
 * Check database health
 * @returns {Promise<boolean>}
 */
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
};
