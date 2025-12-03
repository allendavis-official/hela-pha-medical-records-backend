// Encounter Controller
// HTTP request handlers for encounter management

const encounterService = require("../services/encounterService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/encounters
 * @desc    Create new encounter
 * @access  Private (admin, records_staff, clinician)
 */
const createEncounter = asyncHandler(async (req, res) => {
  const encounter = await encounterService.createEncounter(req.body);

  res.status(201).json({
    success: true,
    message: "Encounter created successfully",
    data: encounter,
  });
});

/**
 * @route   GET /api/encounters/:id
 * @desc    Get encounter by ID with all details
 * @access  Private
 */
const getEncounterById = asyncHandler(async (req, res) => {
  const encounter = await encounterService.getEncounterById(req.params.id);

  res.status(200).json({
    success: true,
    data: encounter,
  });
});

/**
 * @route   GET /api/encounters
 * @desc    Get encounters with filters and pagination
 * @access  Private
 */
const getEncounters = asyncHandler(async (req, res) => {
  const result = await encounterService.getEncounters(req.query);

  res.status(200).json({
    success: true,
    data: result.encounters,
    pagination: result.pagination,
  });
});

/**
 * @route   PUT /api/encounters/:id
 * @desc    Update encounter
 * @access  Private (admin, clinician)
 */
const updateEncounter = asyncHandler(async (req, res) => {
  const encounter = await encounterService.updateEncounter(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Encounter updated successfully",
    data: encounter,
  });
});

/**
 * @route   POST /api/encounters/:id/close
 * @desc    Close encounter
 * @access  Private (admin, clinician)
 */
const closeEncounter = asyncHandler(async (req, res) => {
  const encounter = await encounterService.closeEncounter(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Encounter closed successfully",
    data: encounter,
  });
});

/**
 * @route   POST /api/encounters/:id/assign-clinician
 * @desc    Assign clinician to encounter
 * @access  Private (admin, clinician)
 */
const assignClinician = asyncHandler(async (req, res) => {
  const { clinicianId } = req.body;

  if (!clinicianId) {
    return res.status(400).json({
      success: false,
      message: "Clinician ID is required",
    });
  }

  const encounter = await encounterService.assignClinician(
    req.params.id,
    clinicianId
  );

  res.status(200).json({
    success: true,
    message: "Clinician assigned successfully",
    data: encounter,
  });
});

/**
 * @route   GET /api/encounters/statistics/summary
 * @desc    Get encounter statistics
 * @access  Private
 */
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await encounterService.getEncounterStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  createEncounter,
  getEncounterById,
  getEncounters,
  updateEncounter,
  closeEncounter,
  assignClinician,
  getStatistics,
};
