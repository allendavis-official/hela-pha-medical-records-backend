// User Service
// Business logic for user management

const { prisma } = require("../config/database");
const bcrypt = require("bcrypt");
const { AppError } = require("../middleware/errorHandler");

/**
 * Get all users
 * @returns {Promise<Array>} List of all users
 */
async function getAllUsers() {
  const users = await prisma.user.findMany({
    include: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Map to exclude password from response
  return users.map((user) => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Exclude password from response
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
async function createUser(userData) {
  const { email, password, firstName, lastName, phone, roleId } = userData;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email already in use", 400);
  }

  // Verify role exists
  const role = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    throw new AppError("Invalid role ID", 400);
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
      roleId,
      isActive: true,
    },
    include: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Exclude password from response
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user
 */
async function updateUser(userId, updateData) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // If roleId is being changed, verify it exists
  if (updateData.roleId && updateData.roleId !== existingUser.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: updateData.roleId },
    });

    if (!role) {
      throw new AppError("Invalid role ID", 400);
    }
  }

  // Don't allow email or password updates via this endpoint
  delete updateData.email;
  delete updateData.password;

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      phone: updateData.phone,
      roleId: updateData.roleId,
      isActive: updateData.isActive,
    },
    include: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Exclude password from response
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
}

/**
 * Reset user password
 * @param {string} userId - User ID
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
async function resetUserPassword(userId, newPassword) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // Hash new password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  });

  return true;
}

/**
 * Hard delete user (permanently remove from database)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteUser(userId) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // Hard delete - permanently remove from database
  await prisma.user.delete({
    where: { id: userId },
  });

  return true;
}

/**
 * Soft delete user (deactivate account)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated user
 */
async function deactivateUser(userId) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // Soft delete by deactivating
  const deactivatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
    },
  });

  return deactivatedUser;
}

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics
 */
async function getUserStatistics() {
  const total = await prisma.user.count();

  const activeUsers = await prisma.user.count({
    where: { isActive: true },
  });

  const inactiveUsers = await prisma.user.count({
    where: { isActive: false },
  });

  // Group by role
  const roleDistribution = await prisma.user.groupBy({
    by: ["roleId"],
    _count: true,
    where: {
      isActive: true,
    },
  });

  // Get role details
  const roles = await prisma.role.findMany({
    where: {
      id: {
        in: roleDistribution.map((r) => r.roleId),
      },
    },
  });

  const roleStats = roleDistribution.map((item) => {
    const role = roles.find((r) => r.id === item.roleId);
    return {
      role: role ? role.name : "Unknown",
      count: item._count,
    };
  });

  return {
    total,
    activeUsers,
    inactiveUsers,
    roleDistribution: roleStats,
  };
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  deactivateUser,
  getUserStatistics,
};
