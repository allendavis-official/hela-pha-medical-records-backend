// Patient Controller
// HTTP request handlers for patient management

const patientService = require("../services/patientService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/patients
 * @desc    Create new patient
 * @access  Private (admin, records_staff, clinician)
 */
const createPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);

  res.status(201).json({
    success: true,
    message: "Patient registered successfully",
    data: patient,
  });
});

/**
 * @route   GET /api/patients/:id
 * @desc    Get patient by ID
 * @access  Private
 */
const getPatientById = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.id);

  res.status(200).json({
    success: true,
    data: patient,
  });
});

/**
 * @route   GET /api/patients/mrn/:mrn
 * @desc    Get patient by MRN
 * @access  Private
 */
const getPatientByMRN = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatientByMRN(req.params.mrn);

  res.status(200).json({
    success: true,
    data: patient,
  });
});

/**
 * @route   GET /api/patients
 * @desc    Search patients with pagination
 * @access  Private
 */
const searchPatients = asyncHandler(async (req, res) => {
  const result = await patientService.searchPatients(req.query);

  res.status(200).json({
    success: true,
    data: result.patients,
    pagination: result.pagination,
  });
});

/**
 * @route   PUT /api/patients/:id
 * @desc    Update patient
 * @access  Private (admin, records_staff, clinician)
 */
const updatePatient = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: "Patient updated successfully",
    data: patient,
  });
});

/**
 * @route   DELETE /api/patients/:id
 * @desc    Delete patient
 * @access  Private (admin only)
 */
const deletePatient = asyncHandler(async (req, res) => {
  await patientService.deletePatient(req.params.id);

  res.status(200).json({
    success: true,
    message: "Patient deleted successfully",
  });
});

/**
 * @route   POST /api/patients/check-duplicates
 * @desc    Check for potential duplicate patients
 * @access  Private
 */
const checkDuplicates = asyncHandler(async (req, res) => {
  const { firstName, lastName, dateOfBirth } = req.body;

  const duplicates = await patientService.findPotentialDuplicates(
    firstName,
    lastName,
    dateOfBirth
  );

  res.status(200).json({
    success: true,
    data: {
      hasDuplicates: duplicates.length > 0,
      count: duplicates.length,
      duplicates,
    },
  });
});

/**
 * @route   GET /api/patients/statistics/summary
 * @desc    Get patient statistics
 * @access  Private
 */
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await patientService.getPatientStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @route   GET /api/patients/:id/encounters
 * @desc    Get patient encounter history
 * @access  Private
 */
const getPatientEncounters = asyncHandler(async (req, res) => {
  const encounters = await patientService.getPatientEncounters(req.params.id);

  res.status(200).json({
    success: true,
    data: encounters,
  });
});

module.exports = {
  createPatient,
  getPatientById,
  getPatientByMRN,
  searchPatients,
  updatePatient,
  deletePatient,
  checkDuplicates,
  getStatistics,
  getPatientEncounters,
};
