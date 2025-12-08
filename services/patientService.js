// Patient Service
// Business logic for patient management

const { prisma } = require("../config/database");
const { generateMRN } = require("../utils/mrnGenerator");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create new patient
 * @param {Object} patientData - Patient information
 * @returns {Promise<Object>} Created patient
 */
async function createPatient(patientData) {
  // Generate unique MRN
  const mrn = await generateMRN();

  // Check for potential duplicates
  const duplicates = await findPotentialDuplicates(
    patientData.firstName,
    patientData.lastName,
    patientData.dateOfBirth
  );

  if (duplicates.length > 0) {
    console.warn("Potential duplicate patients found:", duplicates.length);
    // Note: Still create the patient but log the warning
  }

  // Validate age data
  if (!patientData.dateOfBirth && !patientData.ageEstimate) {
    throw new AppError("Either dateOfBirth or ageEstimate is required", 400);
  }

  // Convert dateOfBirth to Date object or null
  let dateOfBirth = null;
  if (patientData.dateOfBirth && patientData.dateOfBirth !== "") {
    dateOfBirth = new Date(patientData.dateOfBirth);
  }

  // Create patient
  const patient = await prisma.patient.create({
    data: {
      mrn,
      firstName: patientData.firstName,
      middleName: patientData.middleName || null,
      lastName: patientData.lastName,
      sex: patientData.sex,
      dateOfBirth: dateOfBirth,
      ageEstimate: patientData.ageEstimate || null,
      phoneNumber: patientData.phoneNumber || null,
      address: patientData.address || null,
      city: patientData.city || null,
      town: patientData.town || null,
      district: patientData.district || null,
      province: patientData.province || null,
      nextOfKinName: patientData.nextOfKinName || null,
      nextOfKinPhone: patientData.nextOfKinPhone || null,
      nextOfKinRelation: patientData.nextOfKinRelation || null,
    },
  });

  return {
    ...patient,
    potentialDuplicates: duplicates.length,
  };
}

/**
 * Get patient by ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Patient data with encounters
 */
async function getPatientById(patientId) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      encounters: {
        include: {
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
        orderBy: {
          admissionDate: "desc",
        },
        take: 10, // Last 10 encounters
      },
      recordFiles: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5, // Last 5 files
      },
    },
  });

  if (!patient) {
    throw new AppError("Patient not found", 404);
  }

  return patient;
}

/**
 * Get patient by MRN
 * @param {string} mrn - Medical Record Number
 * @returns {Promise<Object>} Patient data
 */
async function getPatientByMRN(mrn) {
  const patient = await prisma.patient.findUnique({
    where: { mrn },
    include: {
      encounters: {
        orderBy: { admissionDate: "desc" },
        take: 5,
      },
    },
  });

  if (!patient) {
    throw new AppError("Patient not found", 404);
  }

  return patient;
}

/**
 * Search patients
 * @param {Object} searchParams - Search parameters
 * @returns {Promise<Object>} Search results with pagination
 */
async function searchPatients(searchParams) {
  const {
    search = "",
    mrn = "",
    phone = "",
    page = 1,
    limit = 20,
  } = searchParams;

  // Convert to integers
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {};

  if (mrn) {
    where.mrn = {
      contains: mrn,
      mode: "insensitive",
    };
  }

  if (phone) {
    where.phoneNumber = {
      contains: phone,
    };
  }

  if (search && !mrn) {
    // Search by name
    where.OR = [
      {
        firstName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        lastName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        mrn: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // Get total count
  const total = await prisma.patient.count({ where });

  // Get patients
  const patients = await prisma.patient.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      middleName: true,
      lastName: true,
      sex: true,
      dateOfBirth: true,
      ageEstimate: true,
      phoneNumber: true,
      city: true,
      town: true,
      district: true,
      province: true,
      profileImage: true,
      createdAt: true,
    },
  });

  return {
    patients,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Update patient
 * @param {string} patientId - Patient ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated patient
 */
async function updatePatient(patientId, updateData) {
  // Check if patient exists
  const existingPatient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!existingPatient) {
    throw new AppError("Patient not found", 404);
  }

  // Don't allow updating MRN
  delete updateData.mrn;

  // Convert dateOfBirth to Date object or null
  let dateOfBirth = undefined; // Use undefined to not update if not provided
  if (updateData.dateOfBirth !== undefined) {
    if (updateData.dateOfBirth && updateData.dateOfBirth !== "") {
      dateOfBirth = new Date(updateData.dateOfBirth);
    } else {
      dateOfBirth = null;
    }
  }

  // Update patient
  const updatedPatient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      firstName: updateData.firstName,
      middleName: updateData.middleName,
      lastName: updateData.lastName,
      sex: updateData.sex,
      dateOfBirth: dateOfBirth,
      ageEstimate: updateData.ageEstimate,
      phoneNumber: updateData.phoneNumber,
      address: updateData.address,
      city: updateData.city,
      county: updateData.county,
      nextOfKinName: updateData.nextOfKinName,
      nextOfKinPhone: updateData.nextOfKinPhone,
      nextOfKinRelation: updateData.nextOfKinRelation,
    },
  });

  return updatedPatient;
}

/**
 * Delete patient (soft delete - for admin only)
 * @param {string} patientId - Patient ID
 * @returns {Promise<boolean>} Success status
 */
async function deletePatient(patientId) {
  // Check if patient has encounters
  const encounterCount = await prisma.encounter.count({
    where: { patientId },
  });

  if (encounterCount > 0) {
    throw new AppError(
      "Cannot delete patient with existing encounters. Please archive instead.",
      400
    );
  }

  // Delete patient
  await prisma.patient.delete({
    where: { id: patientId },
  });

  return true;
}

/**
 * Find potential duplicate patients
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {Date} dateOfBirth - Date of birth
 * @returns {Promise<Array>} Potential duplicates
 */
async function findPotentialDuplicates(firstName, lastName, dateOfBirth) {
  const where = {
    firstName: {
      equals: firstName,
      mode: "insensitive",
    },
    lastName: {
      equals: lastName,
      mode: "insensitive",
    },
  };

  // Only add dateOfBirth filter if it's a valid date
  if (dateOfBirth && dateOfBirth !== "" && dateOfBirth !== null) {
    where.dateOfBirth = new Date(dateOfBirth);
  }

  const duplicates = await prisma.patient.findMany({
    where,
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phoneNumber: true,
    },
    take: 5,
  });

  return duplicates;
}

/**
 * Get patient statistics
 * @returns {Promise<Object>} Patient statistics
 */
async function getPatientStatistics() {
  const total = await prisma.patient.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const registeredToday = await prisma.patient.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const registeredThisMonth = await prisma.patient.count({
    where: {
      createdAt: {
        gte: thisMonth,
      },
    },
  });

  const sexDistribution = await prisma.patient.groupBy({
    by: ["sex"],
    _count: true,
  });

  return {
    total,
    registeredToday,
    registeredThisMonth,
    sexDistribution: sexDistribution.map((item) => ({
      sex: item.sex,
      count: item._count,
    })),
  };
}

/**
 * Get patient encounter history
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} Encounter history
 */
async function getPatientEncounters(patientId) {
  const encounters = await prisma.encounter.findMany({
    where: { patientId },
    include: {
      department: true,
      attendingClinician: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      admissionDate: "desc",
    },
  });

  return encounters;
}

module.exports = {
  createPatient,
  getPatientById,
  getPatientByMRN,
  searchPatients,
  updatePatient,
  deletePatient,
  findPotentialDuplicates,
  getPatientStatistics,
  getPatientEncounters,
};
