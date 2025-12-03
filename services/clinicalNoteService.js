// Clinical Note Service
// Business logic for clinical documentation

const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create clinical note
 * @param {Object} noteData - Note data
 * @param {string} clinicianId - Clinician user ID
 * @returns {Promise<Object>} Created note
 */
async function createClinicalNote(noteData, clinicianId) {
  // Verify encounter exists and is open
  const encounter = await prisma.encounter.findUnique({
    where: { id: noteData.encounterId },
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
    throw new AppError("Cannot add notes to closed encounter", 400);
  }

  // Validate vitals if provided
  if (noteData.vitals) {
    validateVitals(noteData.vitals);
  }

  // Create clinical note
  const clinicalNote = await prisma.clinicalNote.create({
    data: {
      encounterId: noteData.encounterId,
      clinicianId: clinicianId,
      noteType: noteData.noteType,
      vitals: noteData.vitals || null,
      noteText: noteData.noteText,
      attachments: noteData.attachments || null,
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

  return clinicalNote;
}

/**
 * Get clinical notes for an encounter
 * @param {string} encounterId - Encounter ID
 * @returns {Promise<Array>} Clinical notes
 */
async function getClinicalNotesByEncounter(encounterId) {
  // Verify encounter exists
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
  });

  if (!encounter) {
    throw new AppError("Encounter not found", 404);
  }

  const notes = await prisma.clinicalNote.findMany({
    where: { encounterId },
    include: {
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return notes;
}

/**
 * Get clinical note by ID
 * @param {string} noteId - Note ID
 * @returns {Promise<Object>} Clinical note
 */
async function getClinicalNoteById(noteId) {
  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
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
  });

  if (!note) {
    throw new AppError("Clinical note not found", 404);
  }

  return note;
}

/**
 * Update clinical note
 * @param {string} noteId - Note ID
 * @param {Object} updateData - Update data
 * @param {string} clinicianId - Requesting clinician ID
 * @returns {Promise<Object>} Updated note
 */
async function updateClinicalNote(noteId, updateData, clinicianId) {
  // Get existing note
  const existingNote = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    include: {
      encounter: true,
    },
  });

  if (!existingNote) {
    throw new AppError("Clinical note not found", 404);
  }

  // Check if encounter is closed
  if (existingNote.encounter.status === "closed") {
    throw new AppError("Cannot update notes for closed encounter", 400);
  }

  // Only the original clinician or admin can update
  if (existingNote.clinicianId !== clinicianId) {
    // Check if requester is admin (this check would be in middleware)
    throw new AppError("You can only update your own notes", 403);
  }

  // Validate vitals if provided
  if (updateData.vitals) {
    validateVitals(updateData.vitals);
  }

  // Update note
  const updatedNote = await prisma.clinicalNote.update({
    where: { id: noteId },
    data: {
      noteText: updateData.noteText,
      vitals: updateData.vitals,
      attachments: updateData.attachments,
    },
    include: {
      clinician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return updatedNote;
}

/**
 * Delete clinical note
 * @param {string} noteId - Note ID
 * @param {string} clinicianId - Requesting clinician ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteClinicalNote(noteId, clinicianId) {
  // Get existing note
  const existingNote = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
  });

  if (!existingNote) {
    throw new AppError("Clinical note not found", 404);
  }

  // Only the original clinician can delete (or admin via middleware)
  if (existingNote.clinicianId !== clinicianId) {
    throw new AppError("You can only delete your own notes", 403);
  }

  // Delete note
  await prisma.clinicalNote.delete({
    where: { id: noteId },
  });

  return true;
}

/**
 * Get latest vitals for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object|null>} Latest vitals
 */
async function getLatestVitals(patientId) {
  const latestNote = await prisma.clinicalNote.findFirst({
    where: {
      encounter: {
        patientId: patientId,
      },
      vitals: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      vitals: true,
      createdAt: true,
      clinician: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return latestNote;
}

/**
 * Get notes by type
 * @param {string} encounterId - Encounter ID
 * @param {string} noteType - Note type (admission, progress, discharge)
 * @returns {Promise<Array>} Clinical notes
 */
async function getNotesByType(encounterId, noteType) {
  const notes = await prisma.clinicalNote.findMany({
    where: {
      encounterId,
      noteType,
    },
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
  });

  return notes;
}

/**
 * Get clinical notes statistics
 * @returns {Promise<Object>} Statistics
 */
async function getClinicalNotesStatistics() {
  const total = await prisma.clinicalNote.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const createdToday = await prisma.clinicalNote.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  // Distribution by note type
  const typeDistribution = await prisma.clinicalNote.groupBy({
    by: ["noteType"],
    _count: true,
  });

  // Notes with vitals
  const notesWithVitals = await prisma.clinicalNote.count({
    where: {
      vitals: {
        not: null,
      },
    },
  });

  return {
    total,
    createdToday,
    notesWithVitals,
    typeDistribution: typeDistribution.map((item) => ({
      type: item.noteType,
      count: item._count,
    })),
  };
}

/**
 * Validate vitals data
 * @param {Object} vitals - Vitals object
 * @throws {AppError} If vitals are invalid
 */
function validateVitals(vitals) {
  const validFields = [
    "bloodPressureSystolic",
    "bloodPressureDiastolic",
    "temperature",
    "pulse",
    "respiratoryRate",
    "oxygenSaturation",
    "weight",
    "height",
    "bmi",
  ];

  // Check if vitals is an object
  if (typeof vitals !== "object" || vitals === null) {
    throw new AppError("Vitals must be an object", 400);
  }

  // Validate ranges (basic validation)
  if (vitals.bloodPressureSystolic) {
    const bp = Number(vitals.bloodPressureSystolic);
    if (bp < 50 || bp > 250) {
      throw new AppError(
        "Blood pressure systolic must be between 50 and 250",
        400
      );
    }
  }

  if (vitals.temperature) {
    const temp = Number(vitals.temperature);
    if (temp < 30 || temp > 45) {
      throw new AppError("Temperature must be between 30 and 45 Celsius", 400);
    }
  }

  if (vitals.pulse) {
    const pulse = Number(vitals.pulse);
    if (pulse < 30 || pulse > 250) {
      throw new AppError("Pulse must be between 30 and 250 bpm", 400);
    }
  }

  if (vitals.oxygenSaturation) {
    const spo2 = Number(vitals.oxygenSaturation);
    if (spo2 < 50 || spo2 > 100) {
      throw new AppError("Oxygen saturation must be between 50 and 100%", 400);
    }
  }

  return true;
}

/**
 * Get all clinical notes with pagination and filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Clinical notes with pagination
 */
async function getAllClinicalNotes(filters = {}) {
  const { noteType, page = 1, limit = 20 } = filters;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {};

  if (noteType) {
    where.noteType = noteType;
  }

  // Get total count
  const total = await prisma.clinicalNote.count({ where });

  // Get notes with related data
  const notes = await prisma.clinicalNote.findMany({
    where,
    skip,
    take: limitNum,
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
        include: {
          patient: {
            select: {
              id: true,
              mrn: true,
              firstName: true,
              lastName: true,
              sex: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    notes,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
}

module.exports = {
  createClinicalNote,
  getClinicalNotesByEncounter,
  getClinicalNoteById,
  updateClinicalNote,
  deleteClinicalNote,
  getLatestVitals,
  getNotesByType,
  getClinicalNotesStatistics,
  getAllClinicalNotes,
};
