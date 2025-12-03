// Department Service
// Business logic for department management

const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

/**
 * Get all departments
 * @returns {Promise<Array>} List of departments
 */
async function getAllDepartments() {
  const departments = await prisma.department.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return departments;
}

/**
 * Get department by ID
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} Department data
 */
async function getDepartmentById(departmentId) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  return department;
}

/**
 * Create new department
 * @param {Object} departmentData - Department information
 * @returns {Promise<Object>} Created department
 */
async function createDepartment(departmentData) {
  // Check if department with same name exists
  const existing = await prisma.department.findFirst({
    where: {
      name: {
        equals: departmentData.name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new AppError("Department with this name already exists", 400);
  }

  // Check if code is provided and unique
  if (departmentData.code) {
    const existingCode = await prisma.department.findUnique({
      where: { code: departmentData.code },
    });

    if (existingCode) {
      throw new AppError("Department with this code already exists", 400);
    }
  }

  const department = await prisma.department.create({
    data: {
      name: departmentData.name,
      code: departmentData.code || null,
      description: departmentData.description || null,
    },
  });

  return department;
}

/**
 * Update department
 * @param {string} departmentId - Department ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated department
 */
async function updateDepartment(departmentId, updateData) {
  // Check if department exists
  const existing = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!existing) {
    throw new AppError("Department not found", 404);
  }

  // Check name uniqueness if updating name
  if (updateData.name && updateData.name !== existing.name) {
    const duplicate = await prisma.department.findFirst({
      where: {
        name: {
          equals: updateData.name,
          mode: "insensitive",
        },
        id: {
          not: departmentId,
        },
      },
    });

    if (duplicate) {
      throw new AppError("Department with this name already exists", 400);
    }
  }

  // Check code uniqueness if updating code
  if (updateData.code && updateData.code !== existing.code) {
    const duplicateCode = await prisma.department.findUnique({
      where: { code: updateData.code },
    });

    if (duplicateCode) {
      throw new AppError("Department with this code already exists", 400);
    }
  }

  const department = await prisma.department.update({
    where: { id: departmentId },
    data: {
      name: updateData.name,
      code: updateData.code,
      description: updateData.description,
    },
  });

  return department;
}

/**
 * Delete department
 * @param {string} departmentId - Department ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteDepartment(departmentId) {
  // Check if department has encounters
  const encounterCount = await prisma.encounter.count({
    where: { departmentId },
  });

  if (encounterCount > 0) {
    throw new AppError(
      "Cannot delete department with existing encounters",
      400
    );
  }

  await prisma.department.delete({
    where: { id: departmentId },
  });

  return true;
}

/**
 * Get department statistics
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} Department statistics
 */
async function getDepartmentStatistics(departmentId) {
  const totalEncounters = await prisma.encounter.count({
    where: { departmentId },
  });

  const openEncounters = await prisma.encounter.count({
    where: {
      departmentId,
      status: "open",
    },
  });

  const closedEncounters = await prisma.encounter.count({
    where: {
      departmentId,
      status: "closed",
    },
  });

  const encountersByType = await prisma.encounter.groupBy({
    by: ["encounterType"],
    where: { departmentId },
    _count: true,
  });

  return {
    totalEncounters,
    openEncounters,
    closedEncounters,
    encountersByType: encountersByType.map((item) => ({
      type: item.encounterType,
      count: item._count,
    })),
  };
}

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStatistics,
};
