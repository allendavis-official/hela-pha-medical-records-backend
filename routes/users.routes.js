// User Routes
// Full CRUD operations for user management

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { auditAction } = require("../middleware/audit");
const { uploadUserImage } = require("../middleware/upload");
const { uploadToCloudinary } = require("../middleware/upload");
const { prisma } = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");

// All routes require authentication
router.use(authenticate);

// ========================================
// SELF-SERVICE ENDPOINTS (Any authenticated user)
// ========================================

// GET /api/users/me - Get own profile
router.get("/me", userController.getCurrentUser);

// PUT /api/users/me - Update own profile
router.put(
  "/me",
  auditAction("update", "own_profile"),
  userController.updateOwnProfile
);

// POST /api/users/me/upload-image - Upload own profile image
router.post(
  "/me/upload-image",
  uploadUserImage,
  asyncHandler(async (req, res) => {
    const userId = req.user.id; // Use authenticated user's ID

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
  auditAction("change_password", "user"),
  userController.changePassword
);

// ========================================
// ADMIN ENDPOINTS (Require permissions)
// ========================================

// GET /api/users - Get all users
router.get("/", checkPermission("user", "read"), userController.getAllUsers);

// POST /api/users - Create new user
router.post(
  "/",
  checkPermission("user", "create"),
  auditAction("create", "user"),
  userController.createUser
);

// GET /api/users/:id - Get specific user
router.get("/:id", checkPermission("user", "read"), userController.getUserById);

// PUT /api/users/:id - Update user (admin)
router.put(
  "/:id",
  checkPermission("user", "update"),
  auditAction("update", "user"),
  userController.updateUser
);

// POST /api/users/:id/upload-image - Upload image for any user (admin)
router.post(
  "/:id/upload-image",
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

// POST /api/users/:id/deactivate - Deactivate user
router.post(
  "/:id/deactivate",
  checkPermission("user", "delete"),
  auditAction("deactivate", "user"),
  userController.deactivateUser
);

// DELETE /api/users/:id - Delete user
router.delete(
  "/:id",
  checkPermission("user", "delete"),
  auditAction("delete", "user"),
  userController.deleteUser
);

module.exports = router;
