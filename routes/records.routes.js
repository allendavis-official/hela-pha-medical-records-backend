// Records Routes
// Full CRUD operations for file and document management

const express = require("express");
const router = express.Router();
const recordController = require("../controllers/recordController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

// GET /api/records - Search files
router.get(
  "/",
  checkPermission("record", "read"),
  recordController.searchFiles
);

// GET /api/records/statistics/summary - Get statistics
router.get(
  "/statistics/summary",
  checkPermission("record", "read"),
  recordController.getStatistics
);

// POST /api/records/upload - Upload file
router.post(
  "/upload",
  checkPermission("record", "create"),
  auditAction("upload", "record_file"),
  recordController.uploadFile
);

// GET /api/records/patient/:patientId - Get patient files
router.get(
  "/patient/:patientId",
  checkPermission("record", "read"),
  recordController.getPatientFiles
);

// GET /api/records/:id - Get file by ID
router.get(
  "/:id",
  checkPermission("record", "read"),
  recordController.getFileById
);

// GET /api/records/:id/download - Get download URL
router.get(
  "/:id/download",
  checkPermission("record", "read"),
  recordController.getDownloadUrl
);

// DELETE /api/records/:id - Delete file
router.delete(
  "/:id",
  checkPermission("record", "delete"),
  auditAction("delete", "record_file"),
  recordController.deleteFile
);

// POST /api/records/:id/checkout - Checkout chart
router.post(
  "/:id/checkout",
  checkPermission("record", "update"),
  auditAction("checkout", "record_file"),
  recordController.checkoutChart
);

// POST /api/records/:id/checkin - Checkin chart
router.post(
  "/:id/checkin",
  checkPermission("record", "update"),
  auditAction("checkin", "record_file"),
  recordController.checkinChart
);

// PUT /api/records/:id/location - Update location
router.put(
  "/:id/location",
  checkPermission("record", "update"),
  auditAction("update_location", "record_file"),
  recordController.updateLocation
);

module.exports = router;
