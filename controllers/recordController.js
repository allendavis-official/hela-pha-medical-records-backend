// Record Controller
// HTTP request handlers for file management

const recordService = require("../services/recordService");
const { asyncHandler } = require("../middleware/errorHandler");
const multer = require("multer");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
    }
  },
});

/**
 * @route   POST /api/records/upload
 * @desc    Upload file for patient
 * @access  Private (admin, records_staff)
 */
const uploadFile = [
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { patientId, documentType, physicalLocation } = req.body;

    if (!patientId || !documentType) {
      return res.status(400).json({
        success: false,
        message: "Patient ID and document type are required",
      });
    }

    const fileData = {
      patientId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype.split("/")[1],
      mimeType: req.file.mimetype,
      documentType,
      physicalLocation,
    };

    const recordFile = await recordService.uploadPatientFile(
      fileData,
      req.file.buffer,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: recordFile,
    });
  }),
];

/**
 * @route   GET /api/records/:id
 * @desc    Get file by ID
 * @access  Private
 */
const getFileById = asyncHandler(async (req, res) => {
  const file = await recordService.getFileById(req.params.id);

  res.status(200).json({
    success: true,
    data: file,
  });
});

/**
 * @route   GET /api/records/patient/:patientId
 * @desc    Get all files for a patient
 * @access  Private
 */
const getPatientFiles = asyncHandler(async (req, res) => {
  const files = await recordService.getPatientFiles(req.params.patientId);

  res.status(200).json({
    success: true,
    data: files,
  });
});

/**
 * @route   GET /api/records/:id/download
 * @desc    Get file download URL
 * @access  Private
 */
const getDownloadUrl = asyncHandler(async (req, res) => {
  const downloadUrl = await recordService.getFileDownloadUrl(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      downloadUrl,
    },
  });
});

/**
 * @route   DELETE /api/records/:id
 * @desc    Delete file
 * @access  Private (admin, records_staff)
 */
const deleteFile = asyncHandler(async (req, res) => {
  await recordService.deletePatientFile(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "File deleted successfully",
  });
});

/**
 * @route   POST /api/records/:id/checkout
 * @desc    Checkout physical chart
 * @access  Private (records_staff)
 */
const checkoutChart = asyncHandler(async (req, res) => {
  const file = await recordService.checkoutChart(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Chart checked out successfully",
    data: file,
  });
});

/**
 * @route   POST /api/records/:id/checkin
 * @desc    Checkin physical chart
 * @access  Private (records_staff)
 */
const checkinChart = asyncHandler(async (req, res) => {
  const file = await recordService.checkinChart(req.params.id);

  res.status(200).json({
    success: true,
    message: "Chart checked in successfully",
    data: file,
  });
});

/**
 * @route   PUT /api/records/:id/location
 * @desc    Update physical location
 * @access  Private (records_staff)
 */
const updateLocation = asyncHandler(async (req, res) => {
  const { location } = req.body;

  if (!location) {
    return res.status(400).json({
      success: false,
      message: "Location is required",
    });
  }

  const file = await recordService.updatePhysicalLocation(
    req.params.id,
    location
  );

  res.status(200).json({
    success: true,
    message: "Location updated successfully",
    data: file,
  });
});

/**
 * @route   GET /api/records/statistics/summary
 * @desc    Get file statistics
 * @access  Private
 */
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await recordService.getFileStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @route   GET /api/records
 * @desc    Search files
 * @access  Private
 */
const searchFiles = asyncHandler(async (req, res) => {
  const result = await recordService.searchFiles(req.query);

  res.status(200).json({
    success: true,
    data: result.files,
    pagination: result.pagination,
  });
});

module.exports = {
  uploadFile,
  getFileById,
  getPatientFiles,
  getDownloadUrl,
  deleteFile,
  checkoutChart,
  checkinChart,
  updateLocation,
  getStatistics,
  searchFiles,
};
