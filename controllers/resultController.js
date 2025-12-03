// Result Controller
// HTTP request handlers for results

const resultService = require("../services/resultService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/results
 * @desc    Create result for order
 * @access  Private (lab_tech, radiographer, admin)
 */
const createResult = asyncHandler(async (req, res) => {
  const result = await resultService.createResult(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: "Result created successfully",
    data: result,
  });
});

/**
 * @route   GET /api/results/:id
 * @desc    Get result by ID
 * @access  Private
 */
const getResultById = asyncHandler(async (req, res) => {
  const result = await resultService.getResultById(req.params.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/results/order/:orderId
 * @desc    Get results for an order
 * @access  Private
 */
const getResultsByOrder = asyncHandler(async (req, res) => {
  const results = await resultService.getResultsByOrder(req.params.orderId);

  res.status(200).json({
    success: true,
    data: results,
  });
});

/**
 * @route   PUT /api/results/:id
 * @desc    Update result
 * @access  Private (technician who created it, admin)
 */
const updateResult = asyncHandler(async (req, res) => {
  const result = await resultService.updateResult(
    req.params.id,
    req.body,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: "Result updated successfully",
    data: result,
  });
});

/**
 * @route   POST /api/results/:id/approve
 * @desc    Approve result
 * @access  Private (admin, senior technician)
 */
const approveResult = asyncHandler(async (req, res) => {
  const result = await resultService.approveResult(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Result approved successfully",
    data: result,
  });
});

/**
 * @route   GET /api/results/critical/list
 * @desc    Get critical/abnormal results
 * @access  Private
 */
const getCriticalResults = asyncHandler(async (req, res) => {
  const results = await resultService.getCriticalResults(req.query);

  res.status(200).json({
    success: true,
    data: results,
  });
});

/**
 * @route   GET /api/results/pending-approval/list
 * @desc    Get results pending approval
 * @access  Private (admin, senior technician)
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
  const results = await resultService.getPendingApprovals();

  res.status(200).json({
    success: true,
    data: results,
  });
});

/**
 * @route   GET /api/results/statistics/summary
 * @desc    Get result statistics
 * @access  Private
 */
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await resultService.getResultStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  createResult,
  getResultById,
  getResultsByOrder,
  updateResult,
  approveResult,
  getCriticalResults,
  getPendingApprovals,
  getStatistics,
};
