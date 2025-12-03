// Results Routes
// Full CRUD operations for lab and radiology results

const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validateResultEntry } = require("../middleware/validation");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

// GET /api/results/statistics/summary - Get statistics
router.get(
  "/statistics/summary",
  checkPermission("labOrder", "read"),
  resultController.getStatistics
);

// GET /api/results/critical/list - Get critical/abnormal results
router.get(
  "/critical/list",
  checkPermission("labOrder", "read"),
  resultController.getCriticalResults
);

// GET /api/results/pending-approval/list - Get pending approvals
router.get(
  "/pending-approval/list",
  checkPermission("labOrder", "update"),
  resultController.getPendingApprovals
);

// GET /api/results/order/:orderId - Get results for an order
router.get(
  "/order/:orderId",
  checkPermission("labOrder", "read"),
  resultController.getResultsByOrder
);

// POST /api/results - Create new result
router.post(
  "/",
  checkPermission("labOrder", "update"),
  validateResultEntry,
  auditAction("create", "result"),
  resultController.createResult
);

// GET /api/results/:id - Get result by ID
router.get(
  "/:id",
  checkPermission("labOrder", "read"),
  resultController.getResultById
);

// PUT /api/results/:id - Update result
router.put(
  "/:id",
  checkPermission("labOrder", "update"),
  validateResultEntry,
  auditAction("update", "result"),
  resultController.updateResult
);

// POST /api/results/:id/approve - Approve result
router.post(
  "/:id/approve",
  checkPermission("labOrder", "update"),
  auditAction("approve", "result"),
  resultController.approveResult
);

module.exports = router;
