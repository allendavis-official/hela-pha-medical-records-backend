// Data Quality Routes
// Full CRUD operations for data quality issues

const express = require("express");
const router = express.Router();
const dataQualityController = require("../controllers/dataQualityController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validateDataQualityIssue } = require("../middleware/validation");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

// GET /api/data-quality - Get issues with filters
router.get(
  "/",
  checkPermission("dataQuality", "read"),
  dataQualityController.getIssues
);

// GET /api/data-quality/statistics/summary - Get statistics
router.get(
  "/statistics/summary",
  checkPermission("dataQuality", "read"),
  dataQualityController.getStatistics
);

// GET /api/data-quality/my-issues - Get my assigned issues
router.get("/my-issues", authenticate, dataQualityController.getMyIssues);

// POST /api/data-quality - Create new issue
router.post(
  "/",
  checkPermission("dataQuality", "create"),
  validateDataQualityIssue,
  auditAction("create", "data_quality_issue"),
  dataQualityController.createIssue
);

// GET /api/data-quality/:id - Get issue by ID
router.get(
  "/:id",
  checkPermission("dataQuality", "read"),
  dataQualityController.getIssueById
);

// PUT /api/data-quality/:id - Update issue
router.put(
  "/:id",
  checkPermission("dataQuality", "update"),
  validateDataQualityIssue,
  auditAction("update", "data_quality_issue"),
  dataQualityController.updateIssue
);

// POST /api/data-quality/:id/assign - Assign issue
router.post(
  "/:id/assign",
  checkPermission("dataQuality", "update"),
  auditAction("assign", "data_quality_issue"),
  dataQualityController.assignIssue
);

// POST /api/data-quality/:id/resolve - Resolve issue
router.post(
  "/:id/resolve",
  checkPermission("dataQuality", "update"),
  auditAction("resolve", "data_quality_issue"),
  dataQualityController.resolveIssue
);

// POST /api/data-quality/:id/dismiss - Dismiss issue
router.post(
  "/:id/dismiss",
  checkPermission("dataQuality", "update"),
  auditAction("dismiss", "data_quality_issue"),
  dataQualityController.dismissIssue
);

module.exports = router;
