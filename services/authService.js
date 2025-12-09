// Authentication Service
// Business logic for user authentication

const bcrypt = require("bcryptjs");
const { prisma } = require("../config/database");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../config/jwt");
const { logAuthEvent } = require("../middleware/audit");

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} ipAddress - Request IP
 * @param {string} userAgent - Request user agent
 * @returns {Promise<Object>} User data and tokens
 */
async function login(email, password, ipAddress, userAgent) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      role: true,
    },
  });

  if (!user) {
    await logAuthEvent(null, "login", false, ipAddress, userAgent, {
      email,
      reason: "User not found",
    });
    throw new Error("Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    await logAuthEvent(user.id, "login", false, ipAddress, userAgent, {
      reason: "Account inactive",
    });
    throw new Error("Account is inactive. Please contact administrator.");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    await logAuthEvent(user.id, "login", false, ipAddress, userAgent, {
      reason: "Invalid password",
    });
    throw new Error("Invalid email or password");
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    roleName: user.role.name,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
  });

  // Log successful login
  await logAuthEvent(user.id, "login", true, ipAddress, userAgent, null);

  // Return user data (without password)
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profileImage: user.profileImage,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
      lastLogin: user.lastLogin,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token
 */
async function refreshAccessToken(refreshToken) {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new Error("User not found or inactive");
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roleName: user.role.name,
    });

    return {
      accessToken,
    };
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
}

/**
 * Get current user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile
 */
async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      isActive: true,
      profileImage: true,
      position: true,
      lastLogin: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Change password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
async function changePassword(userId, currentPassword, newPassword) {
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return true;
}

/**
 * Logout user (for audit trail)
 * @param {string} userId - User ID
 * @param {string} ipAddress - Request IP
 * @param {string} userAgent - Request user agent
 */
async function logout(userId, ipAddress, userAgent) {
  await logAuthEvent(userId, "logout", true, ipAddress, userAgent, null);
  return true;
}

module.exports = {
  login,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  logout,
};
