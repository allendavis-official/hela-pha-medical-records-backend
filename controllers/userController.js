// User Controller
// HTTP request handlers for user management

const userService = require("../services/userService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();

  res.status(200).json({
    success: true,
    data: users,
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (admin only)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (admin only)
 */
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
  });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (admin only)
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: user,
  });
});

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password
 * @access  Private (admin only)
 */
const resetUserPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  await userService.resetUserPassword(req.params.id, password);

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete by deactivating)
 * @access  Private (admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);

  res.status(200).json({
    success: true,
    message: "User deactivated successfully",
  });
});

/**
 * @route   POST /api/users/:id/deactivate
 * @desc    Deactivate user account (soft delete)
 * @access  Private (admin only)
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.params.id);

  res.status(200).json({
    success: true,
    message: "User deactivated successfully",
    data: user,
  });
});

/**
 * @route   GET /api/users/statistics/summary
 * @desc    Get user statistics
 * @access  Private (admin only)
 */
const getUserStatistics = asyncHandler(async (req, res) => {
  const stats = await userService.getUserStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @route   POST /api/users/change-password
 * @desc    Change user password
 * @access  Private (authenticated user)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters",
    });
  }

  await userService.changePassword(req.user.id, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  deactivateUser,
  getUserStatistics,
  changePassword,
};
