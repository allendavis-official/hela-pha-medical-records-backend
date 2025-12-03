// Data Quality Service
// Business logic for data quality issue management

const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create data quality issue
 * @param {Object} issueData - Issue data
 * @param {string} creatorId - User creating the issue
 * @returns {Promise<Object>} Created issue
 */
async function createIssue(issueData, creatorId) {
  const issue = await prisma.dataQualityIssue.create({
    data: {
      issueType: issueData.issueType,
      severity: issueData.severity,
      entityType: issueData.entityType,
      entityId: issueData.entityId,
      description: issueData.description,
      ruleViolated: issueData.ruleViolated || null,
      status: "open",
      createdBy: creatorId,
      assignedTo: issueData.assignedTo || null,
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignee: issueData.assignedTo
        ? {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          }
        : undefined,
    },
  });

  return issue;
}

/**
 * Get issue by ID
 * @param {string} issueId - Issue ID
 * @returns {Promise<Object>} Issue details
 */
async function getIssueById(issueId) {
  const issue = await prisma.dataQualityIssue.findUnique({
    where: { id: issueId },
    include: {
      creator: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!issue) {
    throw new AppError("Data quality issue not found", 404);
  }

  return issue;
}

/**
 * Get issues with filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Issues with pagination
 */
async function getIssues(filters) {
  const {
    status = "open",
    severity,
    issueType,
    entityType,
    assignedTo,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (severity) {
    where.severity = severity;
  }

  if (issueType) {
    where.issueType = issueType;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (assignedTo) {
    where.assignedTo = assignedTo;
  }

  // Get total count
  const total = await prisma.dataQualityIssue.count({ where });

  // Get issues
  const issues = await prisma.dataQualityIssue.findMany({
    where,
    skip,
    take: limit,
    include: {
      creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      assignee: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { severity: "desc" }, // Critical first
      { createdAt: "desc" },
    ],
  });

  return {
    issues,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update issue
 * @param {string} issueId - Issue ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated issue
 */
async function updateIssue(issueId, updateData) {
  const existingIssue = await prisma.dataQualityIssue.findUnique({
    where: { id: issueId },
  });

  if (!existingIssue) {
    throw new AppError("Data quality issue not found", 404);
  }

  const updatedIssue = await prisma.dataQualityIssue.update({
    where: { id: issueId },
    data: {
      severity: updateData.severity,
      description: updateData.description,
      assignedTo: updateData.assignedTo,
    },
    include: {
      assignee: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return updatedIssue;
}

/**
 * Assign issue to user
 * @param {string} issueId - Issue ID
 * @param {string} userId - User to assign to
 * @returns {Promise<Object>} Updated issue
 */
async function assignIssue(issueId, userId) {
  const issue = await prisma.dataQualityIssue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new AppError("Data quality issue not found", 404);
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updatedIssue = await prisma.dataQualityIssue.update({
    where: { id: issueId },
    data: {
      assignedTo: userId,
      status: "in_progress",
    },
    include: {
      assignee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return updatedIssue;
}

/**
 * Resolve issue
 * @param {string} issueId - Issue ID
 * @param {string} resolution - Resolution notes
 * @returns {Promise<Object>} Resolved issue
 */
async function resolveIssue(issueId, resolution) {
  const issue = await prisma.dataQualityIssue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new AppError("Data quality issue not found", 404);
  }

  if (issue.status === "resolved") {
    throw new AppError("Issue is already resolved", 400);
  }

  const resolvedIssue = await prisma.dataQualityIssue.update({
    where: { id: issueId },
    data: {
      status: "resolved",
      resolution: resolution,
      resolvedAt: new Date(),
    },
  });

  return resolvedIssue;
}

/**
 * Dismiss issue
 * @param {string} issueId - Issue ID
 * @param {string} reason - Dismissal reason
 * @returns {Promise<Object>} Dismissed issue
 */
async function dismissIssue(issueId, reason) {
  const issue = await prisma.dataQualityIssue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new AppError("Data quality issue not found", 404);
  }

  const dismissedIssue = await prisma.dataQualityIssue.update({
    where: { id: issueId },
    data: {
      status: "dismissed",
      resolution: reason,
      resolvedAt: new Date(),
    },
  });

  return dismissedIssue;
}

/**
 * Get issue statistics
 * @returns {Promise<Object>} Issue statistics
 */
async function getIssueStatistics() {
  const [
    totalIssues,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    criticalIssues,
    severityDistribution,
    typeDistribution,
    avgResolutionTime,
  ] = await Promise.all([
    prisma.dataQualityIssue.count(),
    prisma.dataQualityIssue.count({ where: { status: "open" } }),
    prisma.dataQualityIssue.count({ where: { status: "in_progress" } }),
    prisma.dataQualityIssue.count({ where: { status: "resolved" } }),
    prisma.dataQualityIssue.count({
      where: {
        severity: "critical",
        status: { in: ["open", "in_progress"] },
      },
    }),
    prisma.dataQualityIssue.groupBy({
      by: ["severity"],
      _count: true,
      where: {
        status: { in: ["open", "in_progress"] },
      },
    }),
    prisma.dataQualityIssue.groupBy({
      by: ["issueType"],
      _count: true,
      where: {
        status: { in: ["open", "in_progress"] },
      },
    }),
    calculateAvgResolutionTime(),
  ]);

  return {
    totalIssues,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    criticalIssues,
    severityDistribution: severityDistribution.map((item) => ({
      severity: item.severity,
      count: item._count,
    })),
    typeDistribution: typeDistribution.map((item) => ({
      type: item.issueType,
      count: item._count,
    })),
    avgResolutionTimeHours: avgResolutionTime,
  };
}

/**
 * Get my assigned issues
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Assigned issues
 */
async function getMyIssues(userId) {
  const issues = await prisma.dataQualityIssue.findMany({
    where: {
      assignedTo: userId,
      status: { in: ["open", "in_progress"] },
    },
    include: {
      creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
  });

  return issues;
}

/**
 * Helper: Calculate average resolution time
 */
async function calculateAvgResolutionTime() {
  const resolvedIssues = await prisma.dataQualityIssue.findMany({
    where: {
      status: "resolved",
      resolvedAt: { not: null },
    },
    select: {
      createdAt: true,
      resolvedAt: true,
    },
    take: 100,
    orderBy: {
      resolvedAt: "desc",
    },
  });

  if (resolvedIssues.length === 0) return 0;

  const totalHours = resolvedIssues.reduce((sum, issue) => {
    const created = new Date(issue.createdAt);
    const resolved = new Date(issue.resolvedAt);
    const hours = (resolved - created) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  return Math.round((totalHours / resolvedIssues.length) * 10) / 10;
}

module.exports = {
  createIssue,
  getIssueById,
  getIssues,
  updateIssue,
  assignIssue,
  resolveIssue,
  dismissIssue,
  getIssueStatistics,
  getMyIssues,
};
