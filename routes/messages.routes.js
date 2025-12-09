// Message Routes
// Internal messaging system routes

const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { authenticate } = require("../middleware/auth");
const { auditAction } = require("../middleware/audit");

// All routes require authentication
router.use(authenticate);

// GET /api/messages/inbox - Get inbox
router.get("/inbox", messageController.getInbox);

// GET /api/messages/sent - Get sent messages
router.get("/sent", messageController.getSentMessages);

// GET /api/messages/unread-count - Get unread count
router.get("/unread-count", messageController.getUnreadCount);

// POST /api/messages - Send a message
router.post("/", auditAction("send", "message"), messageController.sendMessage);

// GET /api/messages/:id - Get message by ID
router.get("/:id", messageController.getMessageById);

// POST /api/messages/:id/read - Mark as read
router.post("/:id/read", messageController.markAsRead);

// POST /api/messages/:id/unread - Mark as unread
router.post("/:id/unread", messageController.markAsUnread);

// POST /api/messages/:id/reply - Reply to message
router.post(
  "/:id/reply",
  auditAction("reply", "message"),
  messageController.replyToMessage
);

// DELETE /api/messages/:id - Delete message
router.delete(
  "/:id",
  auditAction("delete", "message"),
  messageController.deleteMessage
);

module.exports = router;
