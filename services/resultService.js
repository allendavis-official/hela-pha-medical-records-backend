// Result Service
// Business logic for lab and radiology results

const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create result for an order
 * @param {Object} resultData - Result data
 * @param {string} technicianId - Technician user ID
 * @returns {Promise<Object>} Created result
 */
async function createResult(resultData, technicianId) {
  // Verify order exists
  const order = await prisma.order.findUnique({
    where: { id: resultData.orderId },
    include: {
      encounter: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.status === "cancelled") {
    throw new AppError("Cannot add results to cancelled order", 400);
  }

  // Check if result already exists (allow multiple results for amendments)
  const existingResults = await prisma.result.count({
    where: { orderId: resultData.orderId },
  });

  if (existingResults > 0 && !resultData.isAmendment) {
    console.warn(
      `Order ${resultData.orderId} already has results. Creating amendment.`
    );
  }

  // Create result
  const result = await prisma.result.create({
    data: {
      orderId: resultData.orderId,
      resultType: resultData.resultType,
      resultData: resultData.resultData || null,
      resultText: resultData.resultText || null,
      attachments: resultData.attachments || null,
      enteredBy: technicianId,
      isAbnormal: resultData.isAbnormal || false,
      criticalFlag: resultData.criticalFlag || false,
    },
    include: {
      technician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      order: {
        include: {
          encounter: {
            select: {
              patient: {
                select: {
                  mrn: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Update order status to completed
  await prisma.order.update({
    where: { id: resultData.orderId },
    data: {
      status: "completed",
    },
  });

  return result;
}

/**
 * Get result by ID
 * @param {string} resultId - Result ID
 * @returns {Promise<Object>} Result with order details
 */
async function getResultById(resultId) {
  const result = await prisma.result.findUnique({
    where: { id: resultId },
    include: {
      technician: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      order: {
        include: {
          clinician: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          encounter: {
            include: {
              patient: {
                select: {
                  mrn: true,
                  firstName: true,
                  lastName: true,
                  sex: true,
                  dateOfBirth: true,
                },
              },
              department: true,
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new AppError("Result not found", 404);
  }

  return result;
}

/**
 * Get results for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Results
 */
async function getResultsByOrder(orderId) {
  const results = await prisma.result.findMany({
    where: { orderId },
    include: {
      technician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return results;
}

/**
 * Update result
 * @param {string} resultId - Result ID
 * @param {Object} updateData - Update data
 * @param {string} technicianId - Requesting technician ID
 * @returns {Promise<Object>} Updated result
 */
async function updateResult(resultId, updateData, technicianId) {
  const existingResult = await prisma.result.findUnique({
    where: { id: resultId },
  });

  if (!existingResult) {
    throw new AppError("Result not found", 404);
  }

  // Only the technician who entered it can update (unless admin)
  if (existingResult.enteredBy !== technicianId && !updateData.isAdmin) {
    throw new AppError("You can only update your own results", 403);
  }

  // If result is approved, don't allow updates
  if (existingResult.approvedBy) {
    throw new AppError("Cannot update approved results", 400);
  }

  // Update result
  const updatedResult = await prisma.result.update({
    where: { id: resultId },
    data: {
      resultData: updateData.resultData,
      resultText: updateData.resultText,
      attachments: updateData.attachments,
      isAbnormal: updateData.isAbnormal,
      criticalFlag: updateData.criticalFlag,
    },
    include: {
      technician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return updatedResult;
}

/**
 * Approve result
 * @param {string} resultId - Result ID
 * @param {string} approverId - Approver user ID
 * @returns {Promise<Object>} Approved result
 */
async function approveResult(resultId, approverId) {
  const existingResult = await prisma.result.findUnique({
    where: { id: resultId },
  });

  if (!existingResult) {
    throw new AppError("Result not found", 404);
  }

  if (existingResult.approvedBy) {
    throw new AppError("Result is already approved", 400);
  }

  // Approve result
  const approvedResult = await prisma.result.update({
    where: { id: resultId },
    data: {
      approvedBy: approverId,
      approvedAt: new Date(),
    },
    include: {
      technician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return approvedResult;
}

/**
 * Get critical/abnormal results
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Array>} Critical results
 */
async function getCriticalResults(filters = {}) {
  const { departmentId, limit = 50 } = filters;

  const where = {
    OR: [{ criticalFlag: true }, { isAbnormal: true }],
  };

  if (departmentId) {
    where.order = {
      encounter: {
        departmentId,
      },
    };
  }

  const results = await prisma.result.findMany({
    where,
    take: limit,
    include: {
      order: {
        include: {
          encounter: {
            include: {
              patient: {
                select: {
                  mrn: true,
                  firstName: true,
                  lastName: true,
                },
              },
              department: true,
            },
          },
        },
      },
      technician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return results;
}

/**
 * Get pending approvals
 * @returns {Promise<Array>} Results pending approval
 */
async function getPendingApprovals() {
  const results = await prisma.result.findMany({
    where: {
      approvedBy: null,
    },
    include: {
      technician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      order: {
        include: {
          encounter: {
            select: {
              patient: {
                select: {
                  mrn: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return results;
}

/**
 * Get result statistics
 * @returns {Promise<Object>} Result statistics
 */
async function getResultStatistics() {
  const total = await prisma.result.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const resultsToday = await prisma.result.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  const pendingApproval = await prisma.result.count({
    where: {
      approvedBy: null,
    },
  });

  const criticalResults = await prisma.result.count({
    where: {
      criticalFlag: true,
    },
  });

  const abnormalResults = await prisma.result.count({
    where: {
      isAbnormal: true,
    },
  });

  // Results by type
  const typeDistribution = await prisma.result.groupBy({
    by: ["resultType"],
    _count: true,
  });

  return {
    total,
    resultsToday,
    pendingApproval,
    criticalResults,
    abnormalResults,
    typeDistribution: typeDistribution.map((item) => ({
      type: item.resultType,
      count: item._count,
    })),
  };
}

module.exports = {
  createResult,
  getResultById,
  getResultsByOrder,
  updateResult,
  approveResult,
  getCriticalResults,
  getPendingApprovals,
  getResultStatistics,
};
