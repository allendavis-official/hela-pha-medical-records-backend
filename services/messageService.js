// Message Service
// Business logic for internal messaging system

const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

/**
 * Send a message
 * @param {Object} messageData - Message data
 * @param {string} senderId - Sender user ID
 * @returns {Promise<Object>} Created message
 */
async function sendMessage(messageData, senderId) {
  const { recipientId, subject, body } = messageData;

  // Verify recipient exists and is active
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, isActive: true, firstName: true, lastName: true },
  });

  if (!recipient) {
    throw new AppError("Recipient not found", 404);
  }

  if (!recipient.isActive) {
    throw new AppError("Cannot send message to inactive user", 400);
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      senderId,
      recipientId,
      subject: subject || null,
      body,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
        },
      },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
        },
      },
    },
  });

  return message;
}

/**
 * Get inbox messages for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Messages with pagination
 */
async function getInbox(userId, filters = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = filters;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    recipientId: userId,
    deletedByRecipient: false,
  };

  if (unreadOnly) {
    where.isRead = false;
  }

  const total = await prisma.message.count({ where });

  const messages = await prisma.message.findMany({
    where,
    skip,
    take: limitNum,
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    messages,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Get sent messages for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Messages with pagination
 */
async function getSentMessages(userId, filters = {}) {
  const { page = 1, limit = 20 } = filters;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    senderId: userId,
    deletedBySender: false,
  };

  const total = await prisma.message.count({ where });

  const messages = await prisma.message.findMany({
    where,
    skip,
    take: limitNum,
    include: {
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    messages,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Get message by ID
 * @param {string} messageId - Message ID
 * @param {string} userId - Requesting user ID
 * @returns {Promise<Object>} Message
 */
async function getMessageById(messageId, userId) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
          email: true,
        },
      },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
          email: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          subject: true,
          body: true,
          createdAt: true,
          sender: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  // Check if user is sender or recipient
  if (message.senderId !== userId && message.recipientId !== userId) {
    throw new AppError("You do not have permission to view this message", 403);
  }

  // Check if deleted
  if (
    (message.senderId === userId && message.deletedBySender) ||
    (message.recipientId === userId && message.deletedByRecipient)
  ) {
    throw new AppError("Message not found", 404);
  }

  return message;
}

/**
 * Mark message as read
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID (must be recipient)
 * @returns {Promise<Object>} Updated message
 */
async function markAsRead(messageId, userId) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.recipientId !== userId) {
    throw new AppError("Only recipient can mark message as read", 403);
  }

  if (message.isRead) {
    return message; // Already read
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updatedMessage;
}

/**
 * Mark message as unread
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID (must be recipient)
 * @returns {Promise<Object>} Updated message
 */
async function markAsUnread(messageId, userId) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.recipientId !== userId) {
    throw new AppError("Only recipient can mark message as unread", 403);
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      isRead: false,
      readAt: null,
    },
  });

  return updatedMessage;
}

/**
 * Delete message (soft delete)
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success
 */
async function deleteMessage(messageId, userId) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  // Check if user is sender or recipient
  if (message.senderId !== userId && message.recipientId !== userId) {
    throw new AppError(
      "You do not have permission to delete this message",
      403
    );
  }

  // Soft delete
  const updateData = {};
  if (message.senderId === userId) {
    updateData.deletedBySender = true;
  }
  if (message.recipientId === userId) {
    updateData.deletedByRecipient = true;
  }

  await prisma.message.update({
    where: { id: messageId },
    data: updateData,
  });

  // If both parties deleted, permanently delete
  if (
    (message.deletedBySender || message.senderId === userId) &&
    (message.deletedByRecipient || message.recipientId === userId)
  ) {
    await prisma.message.delete({
      where: { id: messageId },
    });
  }

  return true;
}

/**
 * Get unread count for user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
async function getUnreadCount(userId) {
  const count = await prisma.message.count({
    where: {
      recipientId: userId,
      isRead: false,
      deletedByRecipient: false,
    },
  });

  return count;
}

/**
 * Reply to a message
 * @param {string} messageId - Original message ID
 * @param {Object} replyData - Reply message data
 * @param {string} senderId - Sender user ID
 * @returns {Promise<Object>} Created reply message
 */
async function replyToMessage(messageId, replyData, senderId) {
  // Get original message
  const originalMessage = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!originalMessage) {
    throw new AppError("Original message not found", 404);
  }

  // Check if user is sender or recipient of original
  if (
    originalMessage.senderId !== senderId &&
    originalMessage.recipientId !== senderId
  ) {
    throw new AppError(
      "You can only reply to messages you sent or received",
      403
    );
  }

  // Determine recipient (reply to sender of original message if you're the recipient, or vice versa)
  const recipientId =
    originalMessage.senderId === senderId
      ? originalMessage.recipientId
      : originalMessage.senderId;

  // Create reply
  const reply = await prisma.message.create({
    data: {
      senderId,
      recipientId,
      subject:
        replyData.subject || `Re: ${originalMessage.subject || "(no subject)"}`,
      body: replyData.body,
      replyToId: messageId,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
        },
      },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          position: true,
        },
      },
    },
  });

  return reply;
}

module.exports = {
  sendMessage,
  getInbox,
  getSentMessages,
  getMessageById,
  markAsRead,
  markAsUnread,
  deleteMessage,
  getUnreadCount,
  replyToMessage,
};
