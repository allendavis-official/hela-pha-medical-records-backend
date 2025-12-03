// KPI Controller
// HTTP request handlers for dashboard and analytics

const kpiService = require("../services/kpiService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   GET /api/kpi/dashboard
 * @desc    Get comprehensive dashboard summary
 * @access  Private
 */
const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await kpiService.getDashboardSummary();

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

/**
 * @route   GET /api/kpi/departments
 * @desc    Get department performance metrics
 * @access  Private
 */
const getDepartmentPerformance = asyncHandler(async (req, res) => {
  const departments = await kpiService.getDepartmentPerformance();

  res.status(200).json({
    success: true,
    data: departments,
  });
});

/**
 * @route   GET /api/kpi/trends/patients
 * @desc    Get patient volume trends
 * @access  Private
 */
const getPatientTrends = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trends = await kpiService.getPatientVolumeTrends(days);

  res.status(200).json({
    success: true,
    data: trends,
  });
});

/**
 * @route   GET /api/kpi/trends/encounters
 * @desc    Get encounter volume trends
 * @access  Private
 */
const getEncounterTrends = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trends = await kpiService.getEncounterVolumeTrends(days);

  res.status(200).json({
    success: true,
    data: trends,
  });
});

/**
 * @route   GET /api/kpi/data-quality
 * @desc    Get data quality metrics
 * @access  Private
 */
const getDataQuality = asyncHandler(async (req, res) => {
  const metrics = await kpiService.getDataQualityMetrics();

  res.status(200).json({
    success: true,
    data: metrics,
  });
});

module.exports = {
  getDashboard,
  getDepartmentPerformance,
  getPatientTrends,
  getEncounterTrends,
  getDataQuality,
};
