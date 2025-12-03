// Department Controller
// HTTP request handlers for department management

const departmentService = require("../services/departmentService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   GET /api/departments
 * @desc    Get all departments
 * @access  Private
 */
const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentService.getAllDepartments();

  res.status(200).json({
    success: true,
    data: departments,
  });
});

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await departmentService.getDepartmentById(req.params.id);

  res.status(200).json({
    success: true,
    data: department,
  });
});

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Private (admin only)
 */
const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartment(req.body);

  res.status(201).json({
    success: true,
    message: "Department created successfully",
    data: department,
  });
});

/**
 * @route   PUT /api/departments/:id
 * @desc    Update department
 * @access  Private (admin only)
 */
const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.updateDepartment(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Department updated successfully",
    data: department,
  });
});

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete department
 * @access  Private (admin only)
 */
const deleteDepartment = asyncHandler(async (req, res) => {
  await departmentService.deleteDepartment(req.params.id);

  res.status(200).json({
    success: true,
    message: "Department deleted successfully",
  });
});

/**
 * @route   GET /api/departments/:id/statistics
 * @desc    Get department statistics
 * @access  Private
 */
const getDepartmentStatistics = asyncHandler(async (req, res) => {
  const stats = await departmentService.getDepartmentStatistics(req.params.id);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStatistics,
};
