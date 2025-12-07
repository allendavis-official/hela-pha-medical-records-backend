// Patient Routes
// Full CRUD operations for patient management

const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validatePatientRegistration } = require("../middleware/validation");
const { auditAction } = require("../middleware/audit");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  uploadPatientImage,
  uploadToCloudinary,
} = require("../middleware/upload");
const { prisma } = require("../config/database");

// All routes require authentication
router.use(authenticate);

// GET /api/patients - Search patients with pagination
router.get(
  "/",
  checkPermission("patient", "read"),
  patientController.searchPatients
);

// GET /api/patients/statistics/summary - Get patient statistics
router.get(
  "/statistics/summary",
  checkPermission("patient", "read"),
  patientController.getStatistics
);

// POST /api/patients/check-duplicates - Check for duplicate patients
router.post(
  "/check-duplicates",
  checkPermission("patient", "create"),
  patientController.checkDuplicates
);

// GET /api/patients/mrn/:mrn - Get patient by MRN
router.get(
  "/mrn/:mrn",
  checkPermission("patient", "read"),
  patientController.getPatientByMRN
);

// POST /api/patients - Create new patient
router.post(
  "/",
  checkPermission("patient", "create"),
  validatePatientRegistration,
  auditAction("create", "patient"),
  patientController.createPatient
);

// GET /api/patients/:id - Get patient by ID
router.get(
  "/:id",
  checkPermission("patient", "read"),
  patientController.getPatientById
);

// GET /api/patients/:id/encounters - Get patient encounters
router.get(
  "/:id/encounters",
  checkPermission("patient", "read"),
  patientController.getPatientEncounters
);

// PUT /api/patients/:id - Update patient
router.put(
  "/:id",
  checkPermission("patient", "update"),
  validatePatientRegistration,
  auditAction("update", "patient"),
  patientController.updatePatient
);

// DELETE /api/patients/:id - Delete patient (admin only)
router.delete(
  "/:id",
  checkPermission("patient", "delete"),
  auditAction("delete", "patient"),
  patientController.deletePatient
);

// POST /api/patients/:id/upload-image
router.post(
  "/:id/upload-image",
  authenticate,
  checkPermission("patient", "update"),
  uploadPatientImage,
  asyncHandler(async (req, res) => {
    const patientId = req.params.id;

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
        "hela-pha/patients"
      );

      // Update patient with image URL
      const updatedPatient = await prisma.patient.update({
        where: { id: patientId },
        data: {
          profileImage: result.secure_url,
        },
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          profileImage: true,
        },
      });

      res.json({
        success: true,
        message: "Patient image uploaded successfully",
        data: {
          imageUrl: result.secure_url,
          patient: updatedPatient,
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

module.exports = router;
