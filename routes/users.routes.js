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
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadUserImage, uploadToCloudinary } = require("../middleware/upload");
const { prisma } = require("../config/database");

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

// POST /api/users/:id/deactivate - Deactivate user (soft delete)
router.post(
  "/:id/deactivate",
  checkPermission("user", "delete"),
  auditAction("deactivate", "user"),
  userController.deactivateUser
);

// DELETE /api/users/:id - Delete user (hard delete)
router.delete(
  "/:id",
  checkPermission("user", "delete"),
  auditAction("delete", "user"),
  userController.deleteUser
);

// POST /api/users/:id/upload-image
router.post(
  "/:id/upload-image",
  authenticate,
  checkPermission("user", "update"),
  uploadUserImage,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        req.file.buffer,
        "hela-pha/users"
      );

      // Update user with image URL
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profileImage: result.secure_url,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
        },
      });

      res.json({
        success: true,
        message: "Profile image uploaded successfully",
        data: {
          imageUrl: result.secure_url,
          user: updatedUser,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload image",
      });
    }
  })
);

// POST /api/users/change-password - Change own password
router.post(
  "/change-password",
  authenticate, // Just need to be authenticated
  auditAction("change_password", "user"),
  userController.changePassword
);

module.exports = router;
