// Record Service
// Business logic for file and document management

const { prisma } = require("../config/database");
const { uploadFile, getPresignedUrl, deleteFile } = require("../config/s3");
const { AppError } = require("../middleware/errorHandler");

/**
 * Upload file for patient
 * @param {Object} fileData - File information
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} uploaderId - User uploading the file
 * @returns {Promise<Object>} Created record file
 */
async function uploadPatientFile(fileData, fileBuffer, uploaderId) {
  // Verify patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: fileData.patientId },
  });

  if (!patient) {
    throw new AppError("Patient not found", 404);
  }

  try {
    // Upload to S3 (or mock if S3 not configured)
    let fileUrl;
    try {
      const uploadResult = await uploadFile(
        fileBuffer,
        fileData.fileName,
        fileData.mimeType,
        `patients/${fileData.patientId}`
      );
      fileUrl = uploadResult.url;
    } catch (error) {
      // If S3 fails, use a mock URL for testing
      console.warn("S3 upload failed, using mock URL:", error.message);
      fileUrl = `mock://storage/patients/${fileData.patientId}/${Date.now()}-${
        fileData.fileName
      }`;
    }

    // Create record in database
    const recordFile = await prisma.recordFile.create({
      data: {
        patientId: fileData.patientId,
        fileName: fileData.fileName,
        fileUrl: fileUrl,
        fileType: fileData.fileType,
        fileSize: fileBuffer.length,
        documentType: fileData.documentType,
        uploadedBy: uploaderId,
        physicalLocation: fileData.physicalLocation || null,
        checkoutStatus: "available",
      },
      include: {
        patient: {
          select: {
            mrn: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return recordFile;
  } catch (error) {
    throw new AppError(`File upload failed: ${error.message}`, 500);
  }
}

/**
 * Get file by ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} File record
 */
async function getFileById(fileId) {
  const file = await prisma.recordFile.findUnique({
    where: { id: fileId },
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

  if (!file) {
    throw new AppError("File not found", 404);
  }

  return file;
}

/**
 * Get files for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} Patient files
 */
async function getPatientFiles(patientId) {
  const files = await prisma.recordFile.findMany({
    where: { patientId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return files;
}

/**
 * Get file download URL
 * @param {string} fileId - File ID
 * @returns {Promise<string>} Download URL
 */
async function getFileDownloadUrl(fileId) {
  const file = await getFileById(fileId);

  // If mock URL, return as is
  if (file.fileUrl.startsWith("mock://")) {
    return file.fileUrl;
  }

  try {
    // Generate presigned URL (expires in 1 hour)
    const fileKey = file.fileUrl.split(".com/")[1]; // Extract key from URL
    const downloadUrl = await getPresignedUrl(fileKey, 3600);
    return downloadUrl;
  } catch (error) {
    console.warn("Failed to generate presigned URL:", error.message);
    return file.fileUrl; // Fallback to direct URL
  }
}

/**
 * Delete file
 * @param {string} fileId - File ID
 * @param {string} userId - User deleting the file
 * @returns {Promise<boolean>} Success status
 */
async function deletePatientFile(fileId, userId) {
  const file = await getFileById(fileId);

  // Try to delete from S3 (if not mock URL)
  if (!file.fileUrl.startsWith("mock://")) {
    try {
      const fileKey = file.fileUrl.split(".com/")[1];
      await deleteFile(fileKey);
    } catch (error) {
      console.warn("S3 deletion failed:", error.message);
      // Continue with database deletion even if S3 fails
    }
  }

  // Delete from database
  await prisma.recordFile.delete({
    where: { id: fileId },
  });

  return true;
}

/**
 * Checkout physical chart
 * @param {string} fileId - File ID
 * @param {string} userId - User checking out
 * @returns {Promise<Object>} Updated file record
 */
async function checkoutChart(fileId, userId) {
  const file = await getFileById(fileId);

  if (file.checkoutStatus === "checked_out") {
    throw new AppError("Chart is already checked out", 400);
  }

  const updatedFile = await prisma.recordFile.update({
    where: { id: fileId },
    data: {
      checkoutStatus: "checked_out",
      checkedOutBy: userId,
      checkedOutAt: new Date(),
    },
  });

  return updatedFile;
}

/**
 * Checkin physical chart
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} Updated file record
 */
async function checkinChart(fileId) {
  const file = await getFileById(fileId);

  if (file.checkoutStatus !== "checked_out") {
    throw new AppError("Chart is not checked out", 400);
  }

  const updatedFile = await prisma.recordFile.update({
    where: { id: fileId },
    data: {
      checkoutStatus: "available",
      checkedOutBy: null,
      checkedOutAt: null,
    },
  });

  return updatedFile;
}

/**
 * Update physical location
 * @param {string} fileId - File ID
 * @param {string} location - Physical location
 * @returns {Promise<Object>} Updated file record
 */
async function updatePhysicalLocation(fileId, location) {
  const updatedFile = await prisma.recordFile.update({
    where: { id: fileId },
    data: {
      physicalLocation: location,
    },
  });

  return updatedFile;
}

/**
 * Get file statistics
 * @returns {Promise<Object>} File statistics
 */
async function getFileStatistics() {
  const [
    totalFiles,
    totalSize,
    typeDistribution,
    checkedOutFiles,
    recentUploads,
  ] = await Promise.all([
    prisma.recordFile.count(),
    prisma.recordFile.aggregate({
      _sum: { fileSize: true },
    }),
    prisma.recordFile.groupBy({
      by: ["documentType"],
      _count: true,
    }),
    prisma.recordFile.count({
      where: { checkoutStatus: "checked_out" },
    }),
    prisma.recordFile.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    }),
  ]);

  return {
    totalFiles,
    totalSizeBytes: totalSize._sum.fileSize || 0,
    totalSizeMB: Math.round((totalSize._sum.fileSize || 0) / (1024 * 1024)),
    typeDistribution: typeDistribution.map((item) => ({
      type: item.documentType,
      count: item._count,
    })),
    checkedOutFiles,
    recentUploads,
  };
}

/**
 * Search files
 * @param {Object} filters - Search filters
 * @returns {Promise<Object>} Files with pagination
 */
async function searchFiles(filters) {
  const {
    patientId,
    documentType,
    checkoutStatus,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  const where = {};

  if (patientId) {
    where.patientId = patientId;
  }

  if (documentType) {
    where.documentType = documentType;
  }

  if (checkoutStatus) {
    where.checkoutStatus = checkoutStatus;
  }

  const [total, files] = await Promise.all([
    prisma.recordFile.count({ where }),
    prisma.recordFile.findMany({
      where,
      skip,
      take: limit,
      include: {
        patient: {
          select: {
            mrn: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return {
    files,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  uploadPatientFile,
  getFileById,
  getPatientFiles,
  getFileDownloadUrl,
  deletePatientFile,
  checkoutChart,
  checkinChart,
  updatePhysicalLocation,
  getFileStatistics,
  searchFiles,
};
