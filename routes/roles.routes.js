// Role Routes
// Endpoints for role management

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { asyncHandler } = require("../middleware/errorHandler");
const { prisma } = require("../config/database");

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/roles
 * @desc    Get all roles
 * @access  Private (admin only)
 */
router.get(
  "/",
  checkPermission("user", "read"), // Admin only
  asyncHandler(async (req, res) => {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: roles,
    });
  })
);

/**
 * @route   GET /api/roles/:id
 * @desc    Get role by ID with permissions
 * @access  Private (admin only)
 */
router.get(
  "/:id",
  checkPermission("user", "read"), // Admin only
  asyncHandler(async (req, res) => {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: {
          select: {
            id: true,
            resource: true,
            action: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    res.status(200).json({
      success: true,
      data: role,
    });
  })
);

module.exports = router;
