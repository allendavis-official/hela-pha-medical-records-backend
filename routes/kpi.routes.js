// KPI Routes
// Dashboard and analytics endpoints

const express = require("express");
const router = express.Router();
const kpiController = require("../controllers/kpiController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");

// All routes require authentication
router.use(authenticate);

// All users can view KPIs
const kpiReadPermission = checkPermission("kpi", "read");

// GET /api/kpi/dashboard - Main dashboard summary
router.get("/dashboard", kpiReadPermission, kpiController.getDashboard);

// GET /api/kpi/departments - Department performance
router.get(
  "/departments",
  kpiReadPermission,
  kpiController.getDepartmentPerformance
);

// GET /api/kpi/trends/patients - Patient volume trends
router.get(
  "/trends/patients",
  kpiReadPermission,
  kpiController.getPatientTrends
);

// GET /api/kpi/trends/encounters - Encounter volume trends
router.get(
  "/trends/encounters",
  kpiReadPermission,
  kpiController.getEncounterTrends
);

// GET /api/kpi/data-quality - Data quality metrics
router.get("/data-quality", kpiReadPermission, kpiController.getDataQuality);

module.exports = router;
