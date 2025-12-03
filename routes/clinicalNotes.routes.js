// Clinical Notes Routes
// Full CRUD operations for clinical documentation

const express = require("express");
const router = express.Router();
const clinicalNoteController = require("../controllers/clinicalNoteController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validateClinicalNote } = require("../middleware/validation");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

router.get(
  "/",
  checkPermission("clinicalNote", "read"),
  clinicalNoteController.getAllClinicalNotes
);

// GET /api/clinical-notes/statistics/summary - Get statistics
router.get(
  "/statistics/summary",
  checkPermission("clinicalNote", "read"),
  clinicalNoteController.getStatistics
);

// GET /api/clinical-notes/patient/:patientId/latest-vitals - Get latest vitals
router.get(
  "/patient/:patientId/latest-vitals",
  checkPermission("clinicalNote", "read"),
  clinicalNoteController.getLatestVitals
);

// GET /api/clinical-notes/encounter/:encounterId - Get notes for encounter
router.get(
  "/encounter/:encounterId",
  checkPermission("clinicalNote", "read"),
  clinicalNoteController.getNotesByEncounter
);

// GET /api/clinical-notes/encounter/:encounterId/type/:noteType - Get notes by type
router.get(
  "/encounter/:encounterId/type/:noteType",
  checkPermission("clinicalNote", "read"),
  clinicalNoteController.getNotesByType
);

// POST /api/clinical-notes - Create clinical note
router.post(
  "/",
  checkPermission("clinicalNote", "create"),
  validateClinicalNote,
  auditAction("create", "clinical_note"),
  clinicalNoteController.createClinicalNote
);

// GET /api/clinical-notes/:id - Get note by ID
router.get(
  "/:id",
  checkPermission("clinicalNote", "read"),
  clinicalNoteController.getNoteById
);

// PUT /api/clinical-notes/:id - Update note
router.put(
  "/:id",
  checkPermission("clinicalNote", "update"),
  validateClinicalNote,
  auditAction("update", "clinical_note"),
  clinicalNoteController.updateClinicalNote
);

// DELETE /api/clinical-notes/:id - Delete note
router.delete(
  "/:id",
  checkPermission("clinicalNote", "delete"),
  auditAction("delete", "clinical_note"),
  clinicalNoteController.deleteClinicalNote
);

module.exports = router;
