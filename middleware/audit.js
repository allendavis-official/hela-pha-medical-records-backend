// Audit Trail Middleware
// Logs all user actions for compliance and security

const { prisma } = require("../config/database");

/**
 * Log incoming requests (for debugging)
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    if (process.env.NODE_ENV === "development") {
      console.log(JSON.stringify(logData));
    }
  });

  next();
}

/**
 * Create audit log entry
 * @param {Object} data - Audit log data
 */
async function createAuditLog(data) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        beforeValue: data.beforeValue || null,
        afterValue: data.afterValue || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw error - audit logging should not break the application
  }
}

/**
 * Middleware to audit specific actions
 * @param {string} action - Action name (create, update, delete, etc.)
 * @param {string} entityType - Entity type (patient, encounter, etc.)
 */
function auditAction(action, entityType) {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override res.json to capture response
    res.json = function (data) {
      if (req.user && res.statusCode < 400) {
        // Log successful actions
        const auditData = {
          userId: req.user.id,
          action,
          entityType,
          entityId: data?.data?.id || req.params.id || null,
          beforeValue: req.auditBefore || null,
          afterValue: data?.data || null,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        };

        createAuditLog(auditData);
      }

      return originalJson.call(this, data);
    };

    // Override res.send as fallback
    res.send = function (data) {
      if (req.user && res.statusCode < 400) {
        const auditData = {
          userId: req.user.id,
          action,
          entityType,
          entityId: req.params.id || null,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        };

        createAuditLog(auditData);
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Capture "before" state for update/delete operations
 * @param {string} entityType - Entity type
 * @param {Function} getFn - Function to get current entity
 */
function captureBeforeState(entityType, getFn) {
  return async (req, res, next) => {
    try {
      const entity = await getFn(req);
      req.auditBefore = entity;
    } catch (error) {
      console.error("Failed to capture before state:", error);
    }
    next();
  };
}

/**
 * Log authentication events
 */
async function logAuthEvent(
  userId,
  action,
  success,
  ipAddress,
  userAgent,
  details = null
) {
  try {
    await createAuditLog({
      userId: userId || "anonymous",
      action,
      entityType: "auth",
      entityId: null,
      beforeValue: null,
      afterValue: { success, details },
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to log auth event:", error);
  }
}

/**
 * Log data quality events
 */
async function logDataQualityEvent(userId, issueId, action, details) {
  try {
    await createAuditLog({
      userId,
      action,
      entityType: "data_quality_issue",
      entityId: issueId,
      afterValue: details,
      ipAddress: null,
      userAgent: null,
    });
  } catch (error) {
    console.error("Failed to log data quality event:", error);
  }
}

/**
 * Get audit logs for an entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {number} limit - Number of logs to return
 */
async function getAuditLogs(entityType, entityId, limit = 50) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
    });
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return [];
  }
}

/**
 * Get user activity history
 * @param {string} userId - User ID
 * @param {number} limit - Number of logs to return
 */
async function getUserActivity(userId, limit = 100) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
    });
  } catch (error) {
    console.error("Failed to get user activity:", error);
    return [];
  }
}

module.exports = {
  requestLogger,
  createAuditLog,
  auditAction,
  captureBeforeState,
  logAuthEvent,
  logDataQualityEvent,
  getAuditLogs,
  getUserActivity,
};
