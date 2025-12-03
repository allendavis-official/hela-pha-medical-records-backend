// User Routes
// Full CRUD operations for user management

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const {
  validateUserCreation,
  validateUserUpdate,
} = require("../middleware/validation");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

// GET /api/users/statistics/summary - Get user statistics
router.get(
  "/statistics/summary",
  checkPermission("user", "read"), // Admin only
  userController.getUserStatistics
);

// GET /api/users - Get all users
router.get(
  "/",
  checkPermission("user", "read"), // Admin only
  userController.getAllUsers
);

// POST /api/users - Create new user
router.post(
  "/",
  checkPermission("user", "create"), // Admin only
  validateUserCreation,
  auditAction("create", "user"),
  userController.createUser
);

// GET /api/users/:id - Get user by ID
router.get(
  "/:id",
  checkPermission("user", "read"), // Admin only
  userController.getUserById
);

// PUT /api/users/:id - Update user
router.put(
  "/:id",
  checkPermission("user", "update"), // Admin only
  validateUserUpdate,
  auditAction("update", "user"),
  userController.updateUser
);

// POST /api/users/:id/reset-password - Reset password
router.post(
  "/:id/reset-password",
  checkPermission("user", "update"), // Admin only
  auditAction("reset_password", "user"),
  userController.resetUserPassword
);

// DELETE /api/users/:id - Delete user (soft delete)
router.delete(
  "/:id",
  checkPermission("user", "delete"), // Admin only
  auditAction("delete", "user"),
  userController.deleteUser
);

module.exports = router;
