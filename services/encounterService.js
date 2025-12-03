// Encounter Service
// Business logic for encounter management (OPD/IPD/Emergency)

const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create new encounter
 * @param {Object} encounterData - Encounter information
 * @returns {Promise<Object>} Created encounter
 */
async function createEncounter(encounterData) {
  // Verify patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: encounterData.patientId },
  });

  if (!patient) {
    throw new AppError("Patient not found", 404);
  }

  // Verify department exists
  const department = await prisma.department.findUnique({
    where: { id: encounterData.departmentId },
  });

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  // Verify clinician if provided
  if (encounterData.attendingClinicianId) {
    const clinician = await prisma.user.findUnique({
      where: { id: encounterData.attendingClinicianId },
    });

    if (!clinician) {
      throw new AppError("Attending clinician not found", 404);
    }
  }

  // Check if patient has open encounter
  const openEncounter = await prisma.encounter.findFirst({
    where: {
      patientId: encounterData.patientId,
      status: "open",
    },
  });

  if (openEncounter) {
    console.warn(
      `Patient ${encounterData.patientId} already has open encounter ${openEncounter.id}`
    );
    // Allow multiple open encounters (patient can be in OPD and IPD simultaneously)
  }

  // Create encounter
  const encounter = await prisma.encounter.create({
    data: {
      patientId: encounterData.patientId,
      departmentId: encounterData.departmentId,
      attendingClinicianId: encounterData.attendingClinicianId || null,
      encounterType: encounterData.encounterType,
      chiefComplaint: encounterData.chiefComplaint || null,
      diagnosis: encounterData.diagnosis || null,
      status: "open",
      admissionDate: new Date(),
    },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          sex: true,
          dateOfBirth: true,
          ageEstimate: true,
        },
      },
      department: true,
      attendingClinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return encounter;
}

/**
 * Get encounter by ID
 * @param {string} encounterId - Encounter ID
 * @returns {Promise<Object>} Encounter with all related data
 */
async function getEncounterById(encounterId) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          sex: true,
          dateOfBirth: true,
          ageEstimate: true,
          phoneNumber: true,
        },
      },
      department: true,
      attendingClinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      clinicalNotes: {
        include: {
          clinician: {
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
      orders: {
        include: {
          clinician: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          results: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!encounter) {
    throw new AppError("Encounter not found", 404);
  }

  return encounter;
}

/**
 * Get all encounters with filters and pagination
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Encounters with pagination
 */
async function getEncounters(filters) {
  const {
    patientId,
    departmentId,
    status = "open",
    encounterType,
    page = 1,
    limit = 20,
  } = filters;

  // Convert to integers
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {};

  if (patientId) {
    where.patientId = patientId;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (encounterType) {
    where.encounterType = encounterType;
  }

  // Get total count
  const total = await prisma.encounter.count({ where });

  // Get encounters
  const encounters = await prisma.encounter.findMany({
    where,
    skip,
    take: limitNum,
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          sex: true,
          dateOfBirth: true,
          ageEstimate: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      attendingClinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      admissionDate: "desc",
    },
  });

  return {
    encounters,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Update encounter
 * @param {string} encounterId - Encounter ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated encounter
 */
async function updateEncounter(encounterId, updateData) {
  // Check if encounter exists
  const existingEncounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
  });

  if (!existingEncounter) {
    throw new AppError("Encounter not found", 404);
  }

  // Don't allow updating certain fields if encounter is closed
  if (existingEncounter.status === "closed") {
    throw new AppError("Cannot update closed encounter", 400);
  }

  // Update encounter
  const updatedEncounter = await prisma.encounter.update({
    where: { id: encounterId },
    data: {
      attendingClinicianId: updateData.attendingClinicianId,
      chiefComplaint: updateData.chiefComplaint,
      diagnosis: updateData.diagnosis,
      outcome: updateData.outcome,
    },
    include: {
      patient: true,
      department: true,
      attendingClinician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return updatedEncounter;
}

/**
 * Close encounter
 * @param {string} encounterId - Encounter ID
 * @param {Object} closeData - Closure data (outcome, diagnosis)
 * @returns {Promise<Object>} Closed encounter
 */
async function closeEncounter(encounterId, closeData) {
  // Check if encounter exists
  const existingEncounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
  });

  if (!existingEncounter) {
    throw new AppError("Encounter not found", 404);
  }

  if (existingEncounter.status === "closed") {
    throw new AppError("Encounter is already closed", 400);
  }

  // Close encounter
  const closedEncounter = await prisma.encounter.update({
    where: { id: encounterId },
    data: {
      status: "closed",
      dischargeDate: new Date(),
      outcome: closeData.outcome || null,
      diagnosis: closeData.diagnosis || existingEncounter.diagnosis,
    },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
        },
      },
      department: true,
    },
  });

  return closedEncounter;
}

/**
 * Get encounter statistics
 * @returns {Promise<Object>} Encounter statistics
 */
async function getEncounterStatistics() {
  const totalOpen = await prisma.encounter.count({
    where: { status: "open" },
  });

  const totalClosed = await prisma.encounter.count({
    where: { status: "closed" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const admissionsToday = await prisma.encounter.count({
    where: {
      admissionDate: {
        gte: today,
      },
    },
  });

  const dischargeToday = await prisma.encounter.count({
    where: {
      dischargeDate: {
        gte: today,
      },
    },
  });

  // Get distribution by encounter type
  const typeDistribution = await prisma.encounter.groupBy({
    by: ["encounterType"],
    _count: true,
    where: {
      status: "open",
    },
  });

  // Get distribution by department
  const departmentDistribution = await prisma.encounter.groupBy({
    by: ["departmentId"],
    _count: true,
    where: {
      status: "open",
    },
  });

  // Get department details
  const departments = await prisma.department.findMany({
    where: {
      id: {
        in: departmentDistribution.map((d) => d.departmentId),
      },
    },
  });

  const departmentStats = departmentDistribution.map((item) => {
    const dept = departments.find((d) => d.id === item.departmentId);
    return {
      department: dept ? dept.name : "Unknown",
      count: item._count,
    };
  });

  return {
    totalOpen,
    totalClosed,
    admissionsToday,
    dischargeToday,
    typeDistribution: typeDistribution.map((item) => ({
      type: item.encounterType,
      count: item._count,
    })),
    departmentDistribution: departmentStats,
  };
}

/**
 * Assign clinician to encounter
 * @param {string} encounterId - Encounter ID
 * @param {string} clinicianId - Clinician user ID
 * @returns {Promise<Object>} Updated encounter
 */
async function assignClinician(encounterId, clinicianId) {
  // Verify clinician exists and has clinician role
  const clinician = await prisma.user.findUnique({
    where: { id: clinicianId },
    include: { role: true },
  });

  if (!clinician) {
    throw new AppError("Clinician not found", 404);
  }

  if (clinician.role.name !== "clinician" && clinician.role.name !== "admin") {
    throw new AppError("User is not a clinician", 400);
  }

  // Update encounter
  const encounter = await prisma.encounter.update({
    where: { id: encounterId },
    data: {
      attendingClinicianId: clinicianId,
    },
    include: {
      attendingClinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return encounter;
}

module.exports = {
  createEncounter,
  getEncounterById,
  getEncounters,
  updateEncounter,
  closeEncounter,
  getEncounterStatistics,
  assignClinician,
};
