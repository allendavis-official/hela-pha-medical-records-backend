// User Controller
// HTTP request handlers for user management

const userService = require("../services/userService");
const { asyncHandler } = require("../middleware/errorHandler");

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
 * @route   GET /api/users/me
 * @desc    Get current user's own profile
 * @access  Private (any authenticated user)
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers(req.query);

  res.status(200).json({
    success: true,
    data: users,
  });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (admin)
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
 * @route   PUT /api/users/me
 * @desc    Update own profile
 * @access  Private (any authenticated user)
 */
const updateOwnProfile = asyncHandler(async (req, res) => {
  // Users can only update certain fields on their own profile
  const allowedFields = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    email: req.body.email,
    position: req.body.position,
  };

  // Remove undefined fields
  Object.keys(allowedFields).forEach((key) => {
    if (allowedFields[key] === undefined) {
      delete allowedFields[key];
    }
  });

  const user = await userService.updateUser(req.user.id, allowedFields);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
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
  createUser,
  getUserById,
  getCurrentUser,
  getAllUsers,
  updateUser,
  updateOwnProfile,
  deleteUser,
  deactivateUser,
  changePassword,
};
