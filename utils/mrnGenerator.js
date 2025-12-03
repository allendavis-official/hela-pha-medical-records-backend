// Medical Record Number (MRN) Generator
// Generates unique patient identifiers

const { prisma } = require("../config/database");

/**
 * Generate unique MRN
 * Format: HELA-YYYYMMDD-XXXX (e.g., HELA-20231201-0001)
 * @returns {Promise<string>} Generated MRN
 */
async function generateMRN() {
  const prefix = "HELA";
  const today = new Date();
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, "");

  // Get count of patients created today
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const todayCount = await prisma.patient.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Generate sequential number
  const sequenceNumber = String(todayCount + 1).padStart(4, "0");

  const mrn = `${prefix}-${dateString}-${sequenceNumber}`;

  // Verify uniqueness (should always be unique, but double-check)
  const existing = await prisma.patient.findUnique({
    where: { mrn },
  });

  if (existing) {
    // If somehow exists, add random suffix
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `${mrn}-${randomSuffix}`;
  }

  return mrn;
}

/**
 * Validate MRN format
 * @param {string} mrn - MRN to validate
 * @returns {boolean} Is valid
 */
function validateMRN(mrn) {
  const mrnPattern = /^HELA-\d{8}-\d{4}(-\d+)?$/;
  return mrnPattern.test(mrn);
}

/**
 * Parse MRN to extract date
 * @param {string} mrn - MRN to parse
 * @returns {Object|null} Parsed data or null if invalid
 */
function parseMRN(mrn) {
  if (!validateMRN(mrn)) {
    return null;
  }

  const parts = mrn.split("-");
  const dateString = parts[1];

  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);

  return {
    prefix: parts[0],
    date: new Date(`${year}-${month}-${day}`),
    sequence: parseInt(parts[2], 10),
    full: mrn,
  };
}

module.exports = {
  generateMRN,
  validateMRN,
  parseMRN,
};
