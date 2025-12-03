// Department Routes
// CRUD operations for department management

const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");

// All routes require authentication
router.use(authenticate);

// GET /api/departments - Get all departments
router.get("/", departmentController.getAllDepartments);

// GET /api/departments/:id - Get department by ID
router.get("/:id", departmentController.getDepartmentById);

// GET /api/departments/:id/statistics - Get department statistics
router.get("/:id/statistics", departmentController.getDepartmentStatistics);

// POST /api/departments - Create new department (admin only)
router.post(
  "/",
  checkPermission("department", "create"),
  departmentController.createDepartment
);

// PUT /api/departments/:id - Update department (admin only)
router.put(
  "/:id",
  checkPermission("department", "update"),
  departmentController.updateDepartment
);

// DELETE /api/departments/:id - Delete department (admin only)
router.delete(
  "/:id",
  checkPermission("department", "delete"),
  departmentController.deleteDepartment
);

module.exports = router;
