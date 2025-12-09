// Message Controller
// HTTP request handlers for internal messaging

const messageService = require("../services/messageService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route   POST /api/messages
 * @desc    Send a message
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: message,
  });
});

/**
 * @route   GET /api/messages/inbox
 * @desc    Get inbox messages
 * @access  Private
 */
const getInbox = asyncHandler(async (req, res) => {
  const result = await messageService.getInbox(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.messages,
    pagination: result.pagination,
  });
});

/**
 * @route   GET /api/messages/sent
 * @desc    Get sent messages
 * @access  Private
 */
const getSentMessages = asyncHandler(async (req, res) => {
  const result = await messageService.getSentMessages(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.messages,
    pagination: result.pagination,
  });
});

/**
 * @route   GET /api/messages/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await messageService.getUnreadCount(req.user.id);

  res.status(200).json({
    success: true,
    data: { count },
  });
});

/**
 * @route   GET /api/messages/:id
 * @desc    Get message by ID
 * @access  Private
 */
const getMessageById = asyncHandler(async (req, res) => {
  const message = await messageService.getMessageById(
    req.params.id,
    req.user.id
  );

  res.status(200).json({
    success: true,
    data: message,
  });
});

/**
 * @route   POST /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const message = await messageService.markAsRead(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Message marked as read",
    data: message,
  });
});

/**
 * @route   POST /api/messages/:id/unread
 * @desc    Mark message as unread
 * @access  Private
 */
const markAsUnread = asyncHandler(async (req, res) => {
  const message = await messageService.markAsUnread(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Message marked as unread",
    data: message,
  });
});

/**
 * @route   POST /api/messages/:id/reply
 * @desc    Reply to a message
 * @access  Private
 */
const replyToMessage = asyncHandler(async (req, res) => {
  const reply = await messageService.replyToMessage(
    req.params.id,
    req.body,
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: "Reply sent successfully",
    data: reply,
  });
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  await messageService.deleteMessage(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
});

module.exports = {
  sendMessage,
  getInbox,
  getSentMessages,
  getUnreadCount,
  getMessageById,
  markAsRead,
  markAsUnread,
  replyToMessage,
  deleteMessage,
};
