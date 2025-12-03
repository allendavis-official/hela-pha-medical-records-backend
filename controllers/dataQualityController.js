// Data Quality Controller
// HTTP request handlers for data quality issues

const dataQualityService = require("../services/dataQualityService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/data-quality
 * @desc    Create data quality issue
 * @access  Private (admin, data_manager)
 */
const createIssue = asyncHandler(async (req, res) => {
  const issue = await dataQualityService.createIssue(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: "Data quality issue created successfully",
    data: issue,
  });
});

/**
 * @route   GET /api/data-quality/:id
 * @desc    Get issue by ID
 * @access  Private
 */
const getIssueById = asyncHandler(async (req, res) => {
  const issue = await dataQualityService.getIssueById(req.params.id);

  res.status(200).json({
    success: true,
    data: issue,
  });
});

/**
 * @route   GET /api/data-quality
 * @desc    Get issues with filters
 * @access  Private
 */
const getIssues = asyncHandler(async (req, res) => {
  const result = await dataQualityService.getIssues(req.query);

  res.status(200).json({
    success: true,
    data: result.issues,
    pagination: result.pagination,
  });
});

/**
 * @route   PUT /api/data-quality/:id
 * @desc    Update issue
 * @access  Private (admin, data_manager)
 */
const updateIssue = asyncHandler(async (req, res) => {
  const issue = await dataQualityService.updateIssue(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: "Issue updated successfully",
    data: issue,
  });
});

/**
 * @route   POST /api/data-quality/:id/assign
 * @desc    Assign issue to user
 * @access  Private (admin, data_manager)
 */
const assignIssue = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }

  const issue = await dataQualityService.assignIssue(req.params.id, userId);

  res.status(200).json({
    success: true,
    message: "Issue assigned successfully",
    data: issue,
  });
});

/**
 * @route   POST /api/data-quality/:id/resolve
 * @desc    Resolve issue
 * @access  Private (admin, data_manager, assigned user)
 */
const resolveIssue = asyncHandler(async (req, res) => {
  const { resolution } = req.body;

  if (!resolution) {
    return res.status(400).json({
      success: false,
      message: "Resolution notes are required",
    });
  }

  const issue = await dataQualityService.resolveIssue(
    req.params.id,
    resolution
  );

  res.status(200).json({
    success: true,
    message: "Issue resolved successfully",
    data: issue,
  });
});

/**
 * @route   POST /api/data-quality/:id/dismiss
 * @desc    Dismiss issue
 * @access  Private (admin, data_manager)
 */
const dismissIssue = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const issue = await dataQualityService.dismissIssue(req.params.id, reason);

  res.status(200).json({
    success: true,
    message: "Issue dismissed successfully",
    data: issue,
  });
});

/**
 * @route   GET /api/data-quality/statistics/summary
 * @desc    Get issue statistics
 * @access  Private
 */
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await dataQualityService.getIssueStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @route   GET /api/data-quality/my-issues
 * @desc    Get my assigned issues
 * @access  Private
 */
const getMyIssues = asyncHandler(async (req, res) => {
  const issues = await dataQualityService.getMyIssues(req.user.id);

  res.status(200).json({
    success: true,
    data: issues,
  });
});

module.exports = {
  createIssue,
  getIssueById,
  getIssues,
  updateIssue,
  assignIssue,
  resolveIssue,
  dismissIssue,
  getStatistics,
  getMyIssues,
};
