// Order Service
// Business logic for lab and radiology orders

const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create order (lab or radiology)
 * @param {Object} orderData - Order data
 * @param {string} clinicianId - Ordering clinician ID
 * @returns {Promise<Object>} Created order
 */
async function createOrder(orderData, clinicianId) {
  // Verify encounter exists and is open
  const encounter = await prisma.encounter.findUnique({
    where: { id: orderData.encounterId },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!encounter) {
    throw new AppError("Encounter not found", 404);
  }

  if (encounter.status === "closed") {
    throw new AppError("Cannot create orders for closed encounter", 400);
  }

  // Create order
  const order = await prisma.order.create({
    data: {
      encounterId: orderData.encounterId,
      orderType: orderData.orderType,
      orderCategory: orderData.orderCategory || null,
      testName: orderData.testName,
      orderingClinician: clinicianId,
      priority: orderData.priority || "routine",
      specimenType: orderData.specimenType || null,
      notes: orderData.notes || null,
      status: "pending",
    },
    include: {
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      encounter: {
        select: {
          id: true,
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
  });

  return order;
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order with results
 */
async function getOrderById(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      clinician: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
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
      results: {
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
      },
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
}

/**
 * Get orders with filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Orders with pagination
 */
async function getOrders(filters) {
  const {
    encounterId,
    patientId,
    orderType,
    status = "all",
    priority,
    page = 1,
    limit = 20,
  } = filters;

  // Convert to integers
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {};

  if (encounterId) {
    where.encounterId = encounterId;
  }

  if (patientId) {
    where.encounter = {
      patientId: patientId,
    };
  }

  if (orderType) {
    where.orderType = orderType;
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  // Get total count
  const total = await prisma.order.count({ where });

  // Get orders
  const orders = await prisma.order.findMany({
    where,
    skip,
    take: limitNum,
    include: {
      clinician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      encounter: {
        select: {
          id: true, // ADD THIS - encounter ID
          patient: {
            select: {
              id: true, // This should already be here but make sure
              mrn: true,
              firstName: true,
              lastName: true,
              sex: true,
              dateOfBirth: true,
              ageEstimate: true,
            },
          },
        },
      },
      results: {
        select: {
          id: true,
          resultType: true,
          isAbnormal: true,
          criticalFlag: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    orders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data (collectedAt, etc.)
 * @returns {Promise<Object>} Updated order
 */
async function updateOrderStatus(orderId, status, additionalData = {}) {
  // Verify order exists
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw new AppError("Order not found", 404);
  }

  // Prepare update data
  const updateData = {
    status,
  };

  if (status === "collected" && additionalData.collectedAt) {
    updateData.collectedAt = new Date(additionalData.collectedAt);
  }

  // Update order
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
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
  });

  return updatedOrder;
}

/**
 * Cancel order
 * @param {string} orderId - Order ID
 * @param {string} clinicianId - Requesting clinician ID
 * @returns {Promise<Object>} Cancelled order
 */
async function cancelOrder(orderId, clinicianId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  // Only ordering clinician or admin can cancel
  if (order.orderingClinician !== clinicianId) {
    throw new AppError(
      "Only the ordering clinician can cancel this order",
      403
    );
  }

  if (order.status === "completed") {
    throw new AppError("Cannot cancel completed order", 400);
  }

  // Update status to cancelled
  const cancelledOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "cancelled",
    },
  });

  return cancelledOrder;
}

/**
 * Get pending orders (lab queue)
 * @param {string} orderType - Order type (lab or radiology)
 * @returns {Promise<Array>} Pending orders
 */
async function getPendingOrders(orderType) {
  const orders = await prisma.order.findMany({
    where: {
      orderType,
      status: {
        in: ["pending", "collected", "processing"],
      },
    },
    include: {
      clinician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      encounter: {
        select: {
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
    orderBy: [
      { priority: "desc" }, // stat > urgent > routine
      { createdAt: "asc" },
    ],
  });

  return orders;
}

/**
 * Get order statistics
 * @returns {Promise<Object>} Order statistics
 */
async function getOrderStatistics() {
  const totalOrders = await prisma.order.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ordersToday = await prisma.order.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  // Status distribution
  const statusDistribution = await prisma.order.groupBy({
    by: ["status"],
    _count: true,
  });

  // Order type distribution
  const typeDistribution = await prisma.order.groupBy({
    by: ["orderType"],
    _count: true,
  });

  // Priority distribution (pending only)
  const priorityDistribution = await prisma.order.groupBy({
    by: ["priority"],
    _count: true,
    where: {
      status: {
        in: ["pending", "collected", "processing"],
      },
    },
  });

  // Calculate average turnaround time for completed orders
  const completedOrders = await prisma.order.findMany({
    where: {
      status: "completed",
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: {
      results: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  let avgTurnaroundHours = 0;
  if (completedOrders.length > 0) {
    const turnaroundTimes = completedOrders
      .filter((order) => order.results.length > 0)
      .map((order) => {
        const orderTime = new Date(order.createdAt);
        const resultTime = new Date(order.results[0].createdAt);
        return (resultTime - orderTime) / (1000 * 60 * 60); // Convert to hours
      });

    if (turnaroundTimes.length > 0) {
      avgTurnaroundHours =
        turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length;
    }
  }

  return {
    totalOrders,
    ordersToday,
    statusDistribution: statusDistribution.map((item) => ({
      status: item.status,
      count: item._count,
    })),
    typeDistribution: typeDistribution.map((item) => ({
      type: item.orderType,
      count: item._count,
    })),
    priorityDistribution: priorityDistribution.map((item) => ({
      priority: item.priority,
      count: item._count,
    })),
    avgTurnaroundHours: Math.round(avgTurnaroundHours * 10) / 10,
  };
}

/**
 * Get orders for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} Patient orders
 */
async function getPatientOrders(patientId) {
  const orders = await prisma.order.findMany({
    where: {
      encounter: {
        patientId,
      },
    },
    include: {
      clinician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      encounter: {
        select: {
          id: true,
          encounterType: true,
          admissionDate: true,
        },
      },
      results: {
        select: {
          id: true,
          isAbnormal: true,
          criticalFlag: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders;
}

module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  getPendingOrders,
  getOrderStatistics,
  getPatientOrders,
};
