// Orders Routes
// Full CRUD operations for lab and radiology orders

const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validateOrderCreation } = require("../middleware/validation");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

// GET /api/orders - Get orders with filters
router.get("/", checkPermission("labOrder", "read"), orderController.getOrders);

// GET /api/orders/statistics/summary - Get statistics
router.get(
  "/statistics/summary",
  checkPermission("labOrder", "read"),
  orderController.getStatistics
);

// GET /api/orders/pending/:orderType - Get pending orders (lab/radiology queue)
router.get(
  "/pending/:orderType",
  checkPermission("labOrder", "read"),
  orderController.getPendingOrders
);

// GET /api/orders/patient/:patientId - Get patient orders
router.get(
  "/patient/:patientId",
  checkPermission("labOrder", "read"),
  orderController.getPatientOrders
);

// POST /api/orders - Create new order
router.post(
  "/",
  checkPermission("labOrder", "create"),
  validateOrderCreation,
  auditAction("create", "order"),
  orderController.createOrder
);

// GET /api/orders/:id - Get order by ID
router.get(
  "/:id",
  checkPermission("labOrder", "read"),
  orderController.getOrderById
);

// PUT /api/orders/:id/status - Update order status
router.put(
  "/:id/status",
  checkPermission("labOrder", "update"),
  auditAction("update_status", "order"),
  orderController.updateOrderStatus
);

// POST /api/orders/:id/cancel - Cancel order
router.post(
  "/:id/cancel",
  checkPermission("labOrder", "create"), // Ordering clinician
  auditAction("cancel", "order"),
  orderController.cancelOrder
);

module.exports = router;
