// Encounter Routes
// Full CRUD operations for encounter management

const express = require("express");
const router = express.Router();
const encounterController = require("../controllers/encounterController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validateEncounterCreation } = require("../middleware/validation");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

// GET /api/encounters - Get encounters with filters
router.get(
  "/",
  checkPermission("encounter", "read"),
  encounterController.getEncounters
);

// GET /api/encounters/statistics/summary - Get statistics
router.get(
  "/statistics/summary",
  checkPermission("encounter", "read"),
  encounterController.getStatistics
);

// POST /api/encounters - Create new encounter
router.post(
  "/",
  checkPermission("encounter", "create"),
  validateEncounterCreation,
  auditAction("create", "encounter"),
  encounterController.createEncounter
);

// GET /api/encounters/:id - Get encounter by ID
router.get(
  "/:id",
  checkPermission("encounter", "read"),
  encounterController.getEncounterById
);

// PUT /api/encounters/:id - Update encounter
router.put(
  "/:id",
  checkPermission("encounter", "update"),
  auditAction("update", "encounter"),
  encounterController.updateEncounter
);

// POST /api/encounters/:id/close - Close encounter
router.post(
  "/:id/close",
  checkPermission("encounter", "close"),
  auditAction("close", "encounter"),
  encounterController.closeEncounter
);

// POST /api/encounters/:id/assign-clinician - Assign clinician
router.post(
  "/:id/assign-clinician",
  checkPermission("encounter", "update"),
  auditAction("assign_clinician", "encounter"),
  encounterController.assignClinician
);

module.exports = router;
