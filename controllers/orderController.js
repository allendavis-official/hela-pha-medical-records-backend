// Order Controller
// HTTP request handlers for orders

const orderService = require("../services/orderService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private (clinician, admin)
 */
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: order,
  });
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);

  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * @route   GET /api/orders
 * @desc    Get orders with filters
 * @access  Private
 */
const getOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getOrders(req.query);

  res.status(200).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (lab_tech, radiographer, admin)
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, collectedAt } = req.body;

  const order = await orderService.updateOrderStatus(req.params.id, status, {
    collectedAt,
  });

  res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: order,
  });
});

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (ordering clinician, admin)
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    data: order,
  });
});

/**
 * @route   GET /api/orders/pending/:orderType
 * @desc    Get pending orders (lab queue)
 * @access  Private (lab_tech, radiographer)
 */
const getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getPendingOrders(req.params.orderType);

  res.status(200).json({
    success: true,
    data: orders,
  });
});

/**
 * @route   GET /api/orders/statistics/summary
 * @desc    Get order statistics
 * @access  Private
 */
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await orderService.getOrderStatistics();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @route   GET /api/orders/patient/:patientId
 * @desc    Get patient orders
 * @access  Private
 */
const getPatientOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getPatientOrders(req.params.patientId);

  res.status(200).json({
    success: true,
    data: orders,
  });
});

module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  getPendingOrders,
  getStatistics,
  getPatientOrders,
};
