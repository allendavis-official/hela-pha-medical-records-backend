// Clinical Note Controller
// HTTP request handlers for clinical notes

const clinicalNoteService = require("../services/clinicalNoteService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/clinical-notes
 * @desc    Create clinical note
 * @access  Private (clinician, admin)
 */
const createClinicalNote = asyncHandler(async (req, res) => {
  const note = await clinicalNoteService.createClinicalNote(
    req.body,
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: "Clinical note created successfully",
    data: note,
  });
});

/**
 * @route   GET /api/clinical-notes/encounter/:encounterId
 * @desc    Get all notes for an encounter
 * @access  Private
 */
const getNotesByEncounter = asyncHandler(async (req, res) => {
  const notes = await clinicalNoteService.getClinicalNotesByEncounter(
    req.params.encounterId
  );

  res.status(200).json({
    success: true,
    data: notes,
  });
});

/**
 * @route   GET /api/clinical-notes/:id
 * @desc    Get clinical note by ID
 * @access  Private
 */
const getNoteById = asyncHandler(async (req, res) => {
  const note = await clinicalNoteService.getClinicalNoteById(req.params.id);

  res.status(200).json({
    success: true,
    data: note,
  });
});

/**
 * @route   PUT /api/clinical-notes/:id
 * @desc    Update clinical note
 * @access  Private (clinician who created it, admin)
 */
const updateClinicalNote = asyncHandler(async (req, res) => {
  const note = await clinicalNoteService.updateClinicalNote(
    req.params.id,
    req.body,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: "Clinical note updated successfully",
    data: note,
  });
});

/**
 * @route   DELETE /api/clinical-notes/:id
 * @desc    Delete clinical note
 * @access  Private (clinician who created it, admin)
 */
const deleteClinicalNote = asyncHandler(async (req, res) => {
  await clinicalNoteService.deleteClinicalNote(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Clinical note deleted successfully",
  });
});

/**
 * @route   GET /api/clinical-notes/patient/:patientId/latest-vitals
 * @desc    Get latest vitals for a patient
 * @access  Private
 */
const getLatestVitals = asyncHandler(async (req, res) => {
  const vitals = await clinicalNoteService.getLatestVitals(
    req.params.patientId
  );

  res.status(200).json({
    success: true,
    data: vitals,
  });
});

/**
 * @route   GET /api/clinical-notes/encounter/:encounterId/type/:noteType
 * @desc    Get notes by type for an encounter
 * @access  Private
 */
const getNotesByType = asyncHandler(async (req, res) => {
  const notes = await clinicalNoteService.getNotesByType(
    req.params.encounterId,
    req.params.noteType
  );

  res.status(200).json({
    success: true,
    data: notes,
  });
});

/**
 * @route   GET /api/clinical-notes/statistics/summary
 * @desc    Get clinical notes statistics
 * @access  Private
 */
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await clinicalNoteService.getClinicalNotesStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @route   GET /api/clinical-notes
 * @desc    Get all clinical notes with filters and pagination
 * @access  Private
 */
const getAllClinicalNotes = asyncHandler(async (req, res) => {
  const result = await clinicalNoteService.getAllClinicalNotes(req.query);

  res.status(200).json({
    success: true,
    data: result.notes,
    pagination: result.pagination,
  });
});

module.exports = {
  createClinicalNote,
  getNotesByEncounter,
  getNoteById,
  updateClinicalNote,
  deleteClinicalNote,
  getLatestVitals,
  getNotesByType,
  getStatistics,
  getAllClinicalNotes,
};
